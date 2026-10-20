# Project Structure

```
Open-Post/
├── server.js              # entrypoint: .env → store → service → app.listen → scheduler
├── cli.js                 # `node cli.js tick` one-shot fill + dispatch
├── src/
│   ├── app.js             # Express routes, API_TOKEN auth, CORS, static files, error handler
│   ├── service.js         # OpenPost class: domain logic, validation, retries, autopilot, analytics
│   ├── scheduler.js       # in-process interval scheduler
│   ├── store.js           # node:sqlite / better-sqlite3 / JSON document store
│   ├── drivers/index.js   # channel drivers, OAuth 1.0a signer, Bluesky facets, credentialStatus
│   └── llm/index.js       # providers, personas, prompt, JSON parsing, heuristic engine
├── public/                # dashboard: index.html, app.js, app.css, logo.svg (no build step)
├── test/                  # node --test suites + helpers (temp store, fake fetch, webhook receiver)
├── docs/                  # these docs (mirrored to the GitHub Wiki)
├── site/                  # Next.js static landing site → GitHub Pages
├── assets/                # logo, banner, social preview, screenshots
├── scripts/publish-wiki.sh# copy docs/ into the wiki repo
├── openapi.yaml           # OpenAPI 3.1 spec
├── llms.txt               # summary for LLM tools
├── Dockerfile, docker-compose.yml, .env.example
└── .github/               # CI, Pages deploy, Dependabot, issue/PR templates, FUNDING
```

## npm scripts

| Script | Command |
| --- | --- |
| `start` | `node server.js` |
| `dev` | `node --watch server.js` |
| `tick` | `node cli.js tick` |
| `test` | `node --test test/*.test.js` |
| `lint` | `eslint .` |
