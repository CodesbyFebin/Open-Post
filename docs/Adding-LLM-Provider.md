# Extending: Add an LLM Provider

Providers are branches of `call(provider, prompt, { env, fetch })` in `src/llm/index.js`. Each branch returns the model's **raw text**. `generate()` then runs `parseJson()`, which extracts the first `{…}` block, checks that `content` is present, maps `twitter` to `x`, and defaults `tags`. Any error falls back to `heuristic()` and sets `fallbackReason`.

## Example: Mistral

```js
const DEFAULT_MODELS = { ..., mistral: 'mistral-small-latest' };

// inside call():
if (provider === 'mistral') {
  const key = env.MISTRAL_API_KEY || env.AI_API_KEY; if (!key) throw new Error('MISTRAL_API_KEY not set');
  const d = await json(await fetch('https://api.mistral.ai/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
    body: JSON.stringify({ model, messages: [{ role: 'user', content: prompt }], response_format: { type: 'json_object' } }),
  }), 'Mistral');
  return d.choices[0].message.content;
}
```

(Mistral's API is OpenAI-compatible, so `AI_PROVIDER=openai` with `OPENAI_BASE_URL=https://api.mistral.ai/v1` already works without any code. This example only shows the pattern.)

## Then

1. Add a case to the provider loop in `test/autopilot.test.js` with a faked response.
2. Add the option to the `apProvider` `<select>` in `public/index.html`.
3. Update `openapi.yaml` (the `Autopilot.provider` enum), `.env.example` and [Tutorial: LLM Providers](Tutorial-LLM-Providers).

## Prompt

`buildPrompt()` holds the shared prompt. Keep the rule that forbids invented statistics, customers and testimonials.
