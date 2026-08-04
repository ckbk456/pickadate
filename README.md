# Pick-a-Date

Pick-a-Date is a personal web application for inviting someone on a date and
planning the details together. The repository currently contains a clean
Next.js application foundation; scheduling, activity selection, place
recommendations, and email confirmation are product direction, not shipped
features yet.

## Local development

Requirements:

- Node.js 24.17.0 (see `.nvmrc`)
- npm 11 or a compatible npm release

```bash
npm ci
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). The development server is a
long-running owned process; stop the exact process you started when finished.

## Validation

```bash
npm run lint
npm run build
npm run check
```

`npm run check` is the current full pull-request gate. No automated test suite
is configured yet, so do not report test coverage or test success.

## Project map

- [`AGENTS.md`](AGENTS.md): repository rules for Codex and contributors
- [`docs/README.md`](docs/README.md): active product and engineering documents
- [`docs/logic/application-foundation.md`](docs/logic/application-foundation.md): current shipped behavior
- [`docs/roadmap/product-brief.md`](docs/roadmap/product-brief.md): protected initial product direction
- [`testing/MANUAL TO-DO/README.md`](testing/MANUAL%20TO-DO/README.md): active human verification surface
- [`src/app`](src/app): Next.js App Router source

## Current scope

The application currently renders a responsive product-foundation page. It has
no accounts, invitation persistence, place-provider integration, email delivery,
deployment target, or production data.
