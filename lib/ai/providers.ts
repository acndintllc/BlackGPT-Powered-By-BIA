import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import { customProvider, gateway } from "ai";
import { isTestEnvironment } from "../constants";
import { getModelById, titleModel } from "./models";

export const myProvider = isTestEnvironment
  ? (() => {
      const {
        chatModel,
        titleModel: mockTitleModel,
      } = require("./models.mock");
      return customProvider({
        languageModels: {
          "chat-model": chatModel,
          "title-model": mockTitleModel,
        },
      });
    })()
  : null;

/**
 * Default base URL for the BIA OpenAI-compatible proxy. Point
 * `AI_PROXY_BASE_URL` at your own deployment to override it.
 */
const DEFAULT_PROXY_BASE_URL =
  "https://dashscope-intl.aliyuncs.com/compatible-mode/v1";

let cachedProxyProvider: ReturnType<typeof createOpenAICompatible> | null =
  null;

/**
 * Lazily construct the proxy provider so that a deployment that only uses
 * gateway models does not need the proxy credentials configured.
 */
function getProxyProvider() {
  if (cachedProxyProvider) {
    return cachedProxyProvider;
  }

  const apiKey = process.env.AI_PROXY_API_KEY;

  if (!apiKey) {
    throw new Error(
      "AI_PROXY_API_KEY is not set. It is required to reach the OpenAI-compatible proxy."
    );
  }

  cachedProxyProvider = createOpenAICompatible({
    apiKey,
    baseURL: process.env.AI_PROXY_BASE_URL ?? DEFAULT_PROXY_BASE_URL,
    name: "bia-proxy",
  });

  return cachedProxyProvider;
}

export function getLanguageModel(modelId: string) {
  if (isTestEnvironment && myProvider) {
    return myProvider.languageModel(modelId);
  }

  const model = getModelById(modelId);

  if (model?.source === "proxy") {
    return getProxyProvider()(model.providerModelId ?? model.id);
  }

  return gateway.languageModel(modelId);
}

export function getTitleModel() {
  if (isTestEnvironment && myProvider) {
    return myProvider.languageModel("title-model");
  }

  if (titleModel.source === "proxy") {
    return getProxyProvider()(titleModel.providerModelId ?? titleModel.id);
  }

  return gateway.languageModel(titleModel.id);
}
