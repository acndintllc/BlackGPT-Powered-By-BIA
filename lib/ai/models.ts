/**
 * Stable, app-level id for the Qwen model served through our OpenAI-compatible
 * proxy. This value is persisted on chats and sent by the client, so it must
 * stay constant even if the upstream id changes — override the upstream id with
 * `QWEN_MODEL_ID` instead.
 */
export const QWEN_MAX_MODEL_ID = "qwen/qwen3.8-max";

/** The model id sent upstream to the proxy. */
export const QWEN_MAX_PROVIDER_MODEL_ID =
  process.env.QWEN_MODEL_ID ?? "qwen3.8-max";

export const DEFAULT_CHAT_MODEL = QWEN_MAX_MODEL_ID;

export type ModelCapabilities = {
  tools: boolean;
  vision: boolean;
  reasoning: boolean;
};

/**
 * Where a model is served from.
 * - `gateway`: routed through the Vercel AI Gateway (default).
 * - `proxy`: routed through our OpenAI-compatible proxy.
 */
export type ModelSource = "gateway" | "proxy";

export type ChatModel = {
  id: string;
  name: string;
  provider: string;
  description: string;
  gatewayOrder?: string[];
  reasoningEffort?: "none" | "minimal" | "low" | "medium" | "high";
  source?: ModelSource;
  /** Upstream model id, when it differs from the app-level `id`. */
  providerModelId?: string;
  /**
   * Statically declared capabilities. Required for `proxy` models, which are
   * not discoverable through the AI Gateway capability endpoint.
   */
  capabilities?: ModelCapabilities;
};

export const titleModel: ChatModel = {
  description: "Fast model for title generation",
  id: QWEN_MAX_MODEL_ID,
  name: "Qwen 3.8 Max",
  provider: "qwen",
  providerModelId: QWEN_MAX_PROVIDER_MODEL_ID,
  source: "proxy",
};

export const chatModels: ChatModel[] = [
  {
    capabilities: { reasoning: false, tools: true, vision: false },
    description: "Qwen flagship model, served via the BIA proxy",
    id: QWEN_MAX_MODEL_ID,
    name: "Qwen 3.8 Max",
    provider: "qwen",
    providerModelId: QWEN_MAX_PROVIDER_MODEL_ID,
    source: "proxy",
  },
  {
    description: "Fast and capable model with tool use",
    gatewayOrder: ["bedrock", "deepinfra"],
    id: "deepseek/deepseek-v3.2",
    name: "DeepSeek V3.2",
    provider: "deepseek",
  },
  {
    description: "Moonshot AI flagship model",
    gatewayOrder: ["fireworks", "bedrock"],
    id: "moonshotai/kimi-k2.5",
    name: "Kimi K2.5",
    provider: "moonshotai",
  },
  {
    description: "Compact reasoning model",
    gatewayOrder: ["groq", "bedrock"],
    id: "openai/gpt-oss-20b",
    name: "GPT OSS 20B",
    provider: "openai",
    reasoningEffort: "low",
  },
  {
    description: "Open-source 120B parameter model",
    gatewayOrder: ["fireworks", "bedrock"],
    id: "openai/gpt-oss-120b",
    name: "GPT OSS 120B",
    provider: "openai",
    reasoningEffort: "low",
  },
  {
    description: "Fast non-reasoning model with tool use",
    gatewayOrder: ["xai"],
    id: "xai/grok-4.1-fast-non-reasoning",
    name: "Grok 4.1 Fast",
    provider: "xai",
  },
];

export async function getCapabilities(): Promise<
  Record<string, ModelCapabilities>
> {
  const results = await Promise.all(
    chatModels.map(async (model) => {
      // Proxy-served models are not listed by the AI Gateway, so probing it
      // would report no capabilities and silently disable tool calling.
      if (model.capabilities) {
        return [model.id, model.capabilities];
      }

      try {
        const res = await fetch(
          `https://ai-gateway.vercel.sh/v1/models/${model.id}/endpoints`,
          { next: { revalidate: 86_400 } }
        );
        if (!res.ok) {
          return [model.id, { reasoning: false, tools: false, vision: false }];
        }

        const json = await res.json();
        const endpoints = json.data?.endpoints ?? [];
        const params = new Set(
          endpoints.flatMap(
            (e: { supported_parameters?: string[] }) =>
              e.supported_parameters ?? []
          )
        );
        const inputModalities = new Set(
          json.data?.architecture?.input_modalities ?? []
        );

        return [
          model.id,
          {
            reasoning: params.has("reasoning"),
            tools: params.has("tools"),
            vision: inputModalities.has("image"),
          },
        ];
      } catch {
        return [model.id, { reasoning: false, tools: false, vision: false }];
      }
    })
  );

  return Object.fromEntries(results);
}

export const isDemo = process.env.IS_DEMO === "1";

type GatewayModel = {
  id: string;
  name: string;
  type?: string;
  tags?: string[];
};

export type GatewayModelWithCapabilities = ChatModel & {
  capabilities: ModelCapabilities;
};

export async function getAllGatewayModels(): Promise<
  GatewayModelWithCapabilities[]
> {
  try {
    const res = await fetch("https://ai-gateway.vercel.sh/v1/models", {
      next: { revalidate: 86_400 },
    });
    if (!res.ok) {
      return [];
    }

    const json = await res.json();
    return (json.data ?? [])
      .filter((m: GatewayModel) => m.type === "language")
      .map((m: GatewayModel) => ({
        capabilities: {
          reasoning: m.tags?.includes("reasoning") ?? false,
          tools: m.tags?.includes("tool-use") ?? false,
          vision: m.tags?.includes("vision") ?? false,
        },
        description: "",
        id: m.id,
        name: m.name,
        provider: m.id.split("/")[0],
      }));
  } catch {
    return [];
  }
}

export function getActiveModels(): ChatModel[] {
  return chatModels;
}

/**
 * Gateway routing and reasoning-effort hints are only meaningful for models
 * served by the AI Gateway. Models routed through the OpenAI-compatible proxy
 * take their model id and credentials from the proxy provider instead, so they
 * get no provider-specific options.
 */
export function getProviderOptions(model: ChatModel | undefined) {
  if (!model || model.source === "proxy") {
    return {};
  }

  return {
    ...(model.gatewayOrder && {
      gateway: { order: model.gatewayOrder },
    }),
    ...(model.reasoningEffort && {
      openai: { reasoningEffort: model.reasoningEffort },
    }),
  };
}

export function getModelById(modelId: string): ChatModel | undefined {
  return chatModels.find((model) => model.id === modelId);
}

/** True when the model is served by the OpenAI-compatible proxy. */
export function isProxyModel(modelId: string): boolean {
  return getModelById(modelId)?.source === "proxy";
}

export const allowedModelIds = new Set(chatModels.map((m) => m.id));

export const modelsByProvider = chatModels.reduce(
  (acc, model) => {
    if (!acc[model.provider]) {
      acc[model.provider] = [];
    }
    acc[model.provider].push(model);
    return acc;
  },
  {} as Record<string, ChatModel[]>
);

export type ModelAvailability = "healthy" | "impacted" | "unknown";

type GatewayEndpoint = {
  provider_name?: string;
  status?: number;
  uptime_last_15m?: number;
  uptime_last_1h?: number;
  latency_last_1h?: {
    p50?: number;
    p95?: number;
  };
};

const PROVIDER_IMPACTED_UPTIME_THRESHOLD = 99;
const PROVIDER_IMPACTED_P50_MS = 10_000;
const PROVIDER_IMPACTED_P95_MS = 30_000;

function isEndpointImpacted(endpoint: GatewayEndpoint) {
  return (
    (endpoint.status !== undefined && endpoint.status !== 0) ||
    (endpoint.uptime_last_15m !== undefined &&
      endpoint.uptime_last_15m < PROVIDER_IMPACTED_UPTIME_THRESHOLD) ||
    (endpoint.uptime_last_1h !== undefined &&
      endpoint.uptime_last_1h < PROVIDER_IMPACTED_UPTIME_THRESHOLD) ||
    (endpoint.latency_last_1h?.p50 !== undefined &&
      endpoint.latency_last_1h.p50 > PROVIDER_IMPACTED_P50_MS) ||
    (endpoint.latency_last_1h?.p95 !== undefined &&
      endpoint.latency_last_1h.p95 > PROVIDER_IMPACTED_P95_MS)
  );
}

export async function getModelAvailability(
  modelId: string
): Promise<ModelAvailability> {
  const model = chatModels.find((item) => item.id === modelId);

  if (!model) {
    return "unknown";
  }

  // Endpoint health is only observable for gateway-routed models.
  if (model.source === "proxy") {
    return "unknown";
  }

  try {
    const res = await fetch(
      `https://ai-gateway.vercel.sh/v1/models/${model.id}/endpoints`,
      { next: { revalidate: 60 } }
    );
    if (!res.ok) {
      return "unknown";
    }

    const json = await res.json();
    const endpoints = (json.data?.endpoints ?? []) as GatewayEndpoint[];

    if (endpoints.length === 0) {
      return "unknown";
    }

    return endpoints.some(isEndpointImpacted) ? "impacted" : "healthy";
  } catch {
    return "unknown";
  }
}
