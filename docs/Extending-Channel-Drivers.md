# Extending: Add a Channel Driver

Every driver lives in `src/drivers/index.js` and is a plain async function:

```js
async function publishFoo(channel, post, { fetch, env }) → { remoteId, url, ...extra }   // or throw Error
```

- `channel`: `{ id, type, name, handle, envPrefix, config, enabled }`
- `post`: `{ id, content, platformOverrides, tags, scheduledFor, ... }`
- `fetch`: always use the injected one, so tests can fake it
- `env`: read secrets through `envFor(channel, env)`

## Step by step (example: Mastodon)

**1. Write the function**

```js
async function publishMastodon(channel, post, { fetch, env }) {
  const get = envFor(channel, env);
  const { text } = textFor(post, 'mastodon');          // uses platformOverrides.mastodon or content
  if ([...text].length > 500) throw new Error('Mastodon post exceeds 500 characters');
  const res = await fetch(`${get('INSTANCE')}/api/v1/statuses`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${get('ACCESS_TOKEN')}`, 'Idempotency-Key': post.id },
    body: JSON.stringify({ status: text }),
  });
  const data = await ok(res, 'Mastodon API');           // throws with status + body on non-2xx
  return { remoteId: data.id, url: data.url };
}
```

**2. Register it** in the three tables at the top of the file, and in `DRIVERS`:

```js
const DEFAULT_PREFIX = { ..., mastodon: 'MASTODON' };
const REQUIRED = { ..., mastodon: ['INSTANCE', 'ACCESS_TOKEN']('INSTANCE',-'ACCESS_TOKEN') };   // each inner array is one valid credential set
const DRIVERS = { ..., mastodon: publishMastodon };
```

`TYPES` comes from `DEFAULT_PREFIX`, so the API validation, `/api/config` and the dashboard's type picker pick the new type up automatically.

**3. Test it** in `test/drivers.test.js`:

```js
test('Mastodon driver posts a status', async () => {
  const f = fakeFetch({ '/api/v1/statuses': [200, { id: '1', url: 'https://m.example/@me/1' }] });
  const r = await drivers.publish({ id: 'c', name: 'm', type: 'mastodon' }, post('hi'),
    { env: { MASTODON_INSTANCE: 'https://m.example', MASTODON_ACCESS_TOKEN: 't' }, fetch: f });
  assert.equal(r.url, 'https://m.example/@me/1');
  assert.equal(JSON.parse(f.calls[0].init.body).status, 'hi');
});
```

**4. Document it**: add the env vars to `.env.example`, `openapi.yaml` (the `ChannelInput.type` enum), a `docs/Setup-*.md` page, and `docs/Channels.md`. Optionally add a per-platform box and preview to `public/index.html` and `public/app.js`.

## Rules

- Never cut text short silently. Throw an error that names the limit.
- Throw errors that tell the user what to fix (which variable, which limit, the platform's message).
- Return `url: null` rather than guessing a URL.
- Don't log secrets.
