<div align="center">
  <img alt="BlackGPT" src="app/(chat)/opengraph-image.png">
  <h1 align="center">BlackGPT</h1>
</div>

<p align="center">
    BlackGPT is an AI assistant from <strong>The Bureau of BIA</strong> (Black Internet Alliance), powered by Ascend. Built with Next.js and the AI SDK.
</p>

<p align="center">
  <a href="#features"><strong>Features</strong></a> ·
  <a href="#model-providers"><strong>Model Providers</strong></a> ·
  <a href="#deploy-your-own"><strong>Deploy Your Own</strong></a> ·
  <a href="#running-locally"><strong>Running locally</strong></a>
</p>
<br/>

## Features

- [Next.js](https://nextjs.org) App Router
  - Advanced routing for seamless navigation and performance
  - React Server Components (RSCs) and Server Actions for server-side rendering and increased performance
- [AI SDK](https://ai-sdk.dev/docs/introduction)
  - Unified API for generating text, structured objects, and tool calls with LLMs
  - Hooks for building dynamic chat and generative user interfaces
  - Supports OpenAI, Anthropic, Google, xAI, and other model providers via AI Gateway
- [shadcn/ui](https://ui.shadcn.com)
  - Styling with [Tailwind CSS](https://tailwindcss.com)
  - Component primitives from [Radix UI](https://radix-ui.com) for accessibility and flexibility
- Data Persistence
  - [Neon Serverless Postgres](https://vercel.com/marketplace/neon) for saving chat history and user data
  - [Vercel Blob](https://vercel.com/storage/blob) for efficient file storage
- [Auth.js](https://authjs.dev)
  - Simple and secure authentication

## Model Providers

BlackGPT serves its default model, **Qwen 3.8 Max**, through the BIA OpenAI-compatible proxy. The remaining curated models still route through the [Vercel AI Gateway](https://vercel.com/docs/ai-gateway).

Models are declared in `lib/ai/models.ts`. Each entry carries a `source`:

- `proxy` — routed through the OpenAI-compatible proxy configured in `lib/ai/providers.ts`.
- `gateway` (default) — routed through the Vercel AI Gateway, with optional per-model provider ordering.

### Proxy Configuration

The proxy is configured entirely through environment variables:

| Variable | Required | Default | Purpose |
| --- | --- | --- | --- |
| `AI_PROXY_API_KEY` | yes | — | Bearer token for the OpenAI-compatible proxy. |
| `AI_PROXY_BASE_URL` | no | `https://dashscope-intl.aliyuncs.com/compatible-mode/v1` | Proxy base URL. |
| `QWEN_MODEL_ID` | no | `qwen3.8-max` | Upstream model id sent to the proxy. |

The app-level model id (`qwen/qwen3.8-max`) is persisted on chats and sent by the
client, so it stays fixed. If the upstream id changes, set `QWEN_MODEL_ID` — no
data migration is needed.

Because proxy-served models are not listed by the AI Gateway's capability
endpoint, their capabilities are declared statically on the model entry.

### AI Gateway Authentication

**For Vercel deployments**: Authentication is handled automatically via OIDC tokens.

**For non-Vercel deployments**: You need to provide an AI Gateway API key by setting the `AI_GATEWAY_API_KEY` environment variable in your `.env.local` file.

With the [AI SDK](https://ai-sdk.dev/docs/introduction), you can also switch to direct LLM providers like [OpenAI](https://openai.com), [Anthropic](https://anthropic.com), [Cohere](https://cohere.com/), and [many more](https://ai-sdk.dev/providers/ai-sdk-providers) with just a few lines of code.

## Deploy Your Own

You can deploy your own version of BlackGPT to Vercel with one click:

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/templates/next.js/chatbot)

## Running locally

You will need to use the environment variables [defined in `.env.example`](.env.example) to run BlackGPT. It's recommended you use [Vercel Environment Variables](https://vercel.com/docs/projects/environment-variables) for this, but a `.env` file is all that is necessary.

> Note: You should not commit your `.env` file or it will expose secrets that will allow others to control access to your various AI and authentication provider accounts.

1. Install Vercel CLI: `npm i -g vercel`
2. Link local instance with Vercel and GitHub accounts (creates `.vercel` directory): `vercel link`
3. Download your environment variables: `vercel env pull`

```bash
pnpm install
pnpm db:migrate # Setup database or apply latest database changes
pnpm dev
```

BlackGPT should now be running on [localhost:3000](http://localhost:3000).
