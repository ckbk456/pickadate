# Pick-a-Date

Pick-a-Date is a private, single-owner web app for inviting one person on a
curated date. The owner offers exact available times plus a subset of personal
activities and places. The recipient chooses one time/activity/place, optional
outfit color and transport preference, then confirms the immutable plan.

## Implemented MVP

- Google-only Convex Auth with a verified owner allowlist
- English desktop-first invitation/catalog/settings dashboard
- Autosaving six-step builder, protected mobile preview, live Active edits
- UUID bearer links with decorative slugs and immediate rotation
- Vietnamese mobile-first recipient flow with local-only unfinished choices
- Atomic idempotent confirmation and overlapping-slot invalidation
- Read-only final/cancelled date card, Google Maps, and Google Calendar composer
- Convex File Storage media pipeline with AVIF/WebP responsive variants
- Resend confirmation/cancellation jobs with idempotency, retry, and retention
- Archive/restore plus guarded invitation erasure

Visual, device, accessibility, Google OAuth, Resend inbox, deployment, and
production acceptance remain separate pending manual gates.

## Local development

Requirements: Node.js 24.17.0 from `.nvmrc` and npm.

```bash
npm ci
cp .env.example .env.local
npm run auth:keys
npm run convex:env:sync
npx convex dev
npm run dev
```

Use the environment contract in
[`docs/roadmap/environment-setup.md`](docs/roadmap/environment-setup.md). Never
commit `.env.local` or print secrets. The auth-key script supports safe rotation
and Convex sync; `npm run auth:keys:push` sends existing JWT/JWKS values to the
selected development deployment.

## Validation

```bash
npm run lint
npm run typecheck
npm test
npm run build
npm run check
```

`npm run check` is the complete local/CI source gate. Backend changes also run
`npx convex codegen --typecheck disable` against the selected development
deployment before the final check.

## Project map

- [`AGENTS.md`](AGENTS.md): repository operating rules
- [`docs/logic/README.md`](docs/logic/README.md): implemented behavior
- [`docs/roadmap/README.md`](docs/roadmap/README.md): protected decisions and release sequence
- [`testing/MANUAL TO-DO/README.md`](testing/MANUAL%20TO-DO/README.md): pending human/provider acceptance
- [`src/app`](src/app): Next.js routes
- [`src/components`](src/components): dashboard and recipient UI
- [`src/lib/domain`](src/lib/domain): deterministic domain logic
- [`convex`](convex): schema, auth, lifecycle, email, media, and scheduled jobs

## Environment status

The repository is connected to a Convex development deployment and the Google
OAuth/owner/JWT/JWKS variables can be synchronized with the included scripts.
Resend variables are intentionally absent until provider testing. No production
deployment or production provider configuration is claimed.
