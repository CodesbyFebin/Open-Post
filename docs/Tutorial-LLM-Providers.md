# Tutorial: LLM Providers

Open Post uses an AI provider for **Compose → Draft with AI** (`POST /api/generate`) and for autopilot. Pick one with `AI_PROVIDER`. Autopilot can override it with its own **AI provider** setting.

| `AI_PROVIDER` | Default model (`AI_MODEL` overrides) | Env vars | Endpoint called |
| --- | --- | --- | --- |
| `heuristic` *(default)* | — | none | none (offline) |
| `openai` | `gpt-4o-mini` | `OPENAI_API_KEY`, optional `OPENAI_BASE_URL` | `{base}/chat/completions`, JSON mode |
| `anthropic` | `claude-3-5-haiku-latest` | `ANTHROPIC_API_KEY` | `https://api.anthropic.com/v1/messages` |
| `gemini` | `gemini-1.5-flash` | `GEMINI_API_KEY` | `…/v1beta/models/{model}:generateContent` |
| `ollama` | `llama3.1` | `OLLAMA_URL` (default `http://localhost:11434`) | `{url}/api/generate`, `format: json` |

`AI_API_KEY` is accepted as a generic fallback key for whichever provider is selected. Model names change over time, so set `AI_MODEL` to a model your account can use.

## What the model is asked for

A JSON object with a `content` field (the core post), `platformOverrides` (`x`, `linkedin`, `reddit.title`/`reddit.content`, `bluesky`) and `tags`. The prompt includes the persona and the pillar, and it tells the model **not to invent statistics, customers or testimonials**. Open Post extracts the first `{…}` block from the reply, so models that add extra text still work.

## Fallback

If the call fails (missing key, HTTP error, invalid JSON), the heuristic engine produces the post instead. The result includes `generatedBy: "heuristic"` and `fallbackReason`, e.g. `openai: OpenAI HTTP 401: …`. The Compose screen and the Queue show this reason.

## OpenAI

```env
AI_PROVIDER=openai
OPENAI_API_KEY=sk-...
# AI_MODEL=gpt-4o-mini
```

**OpenAI-compatible servers** (LiteLLM, vLLM, LM Studio, OpenRouter and similar): set `OPENAI_BASE_URL` to their `/v1` base and `AI_MODEL` to their model name. The server must support `response_format: {"type":"json_object"}`.

## Anthropic

```env
AI_PROVIDER=anthropic
ANTHROPIC_API_KEY=sk-ant-...
```

## Google Gemini

Create a key in Google AI Studio.

```env
AI_PROVIDER=gemini
GEMINI_API_KEY=...
```

## Ollama (fully local)

```bash
# on the machine running Ollama
ollama pull llama3.1
ollama serve            # listens on :11434
```

```env
AI_PROVIDER=ollama
OLLAMA_URL=http://localhost:11434
# AI_MODEL=llama3.1
```

**Docker:** inside the container, `localhost` is the container itself. On Docker Desktop, use `OLLAMA_URL=http://host.docker.internal:11434`. On Linux, add `extra_hosts: ["host.docker.internal:host-gateway"]` to the service, and make Ollama listen on all interfaces (`OLLAMA_HOST=0.0.0.0`).

## Test it

```bash
curl -s -X POST localhost:3000/api/generate -H 'Content-Type: application/json' \
  -d '{"topic":"Why small tools win","persona":"technical_architect"}' | head -c 400
```

Check `generatedBy` in the response.
