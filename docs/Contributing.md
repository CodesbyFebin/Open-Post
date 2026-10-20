# Contributing

The full guide is in [CONTRIBUTING.md](https://github.com/CodesbyFebin/Open-Post/blob/main/CONTRIBUTING.md). In short:

```bash
git clone https://github.com/CodesbyFebin/Open-Post.git && cd Open-Post
npm install && cp .env.example .env
npm run dev        # http://localhost:3000
npm test && npm run lint
```

Site development:

```bash
cd site && npm install && NEXT_PUBLIC_BASE_PATH= npx next dev
```

## Ground rules

- Add no new runtime dependencies unless they're clearly needed.
- Never store or return secrets.
- No seeded or fake data, and no invented metrics.
- Every driver change or bug fix comes with a test.
- Keep docs in sync: `README.md`, `docs/`, `openapi.yaml`, `.env.example`, `CHANGELOG.md`.

## Good first contributions

Mastodon or Threads drivers ([Extending: Add a Channel Driver](Extending-Channel-Drivers)), image uploads, dashboard translations, and more tests.

Report security issues privately ([SECURITY.md](https://github.com/CodesbyFebin/Open-Post/blob/main/SECURITY.md)). Everyone who takes part follows the [Code of Conduct](https://github.com/CodesbyFebin/Open-Post/blob/main/CODE_OF_CONDUCT.md).
