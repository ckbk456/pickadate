# Application Foundation

## Status

Current and implemented. Automated source validation is green; human visual,
device, accessibility, OAuth, inbox, and deployment acceptance remains pending.

## Runtime and structure

- Next.js 16 App Router, React 19, and strict TypeScript run from the repository
  root. There is no nested application.
- Convex owns persistent state, realtime subscriptions, authorization, scheduled
  jobs, and file storage. Generated bindings under `convex/_generated/` are
  committed.
- Node.js 24.17.0 and npm are the supported local and CI baseline.
- `src/app` owns pages and route handlers; `src/components` owns dashboard and
  recipient UI; `src/lib/domain` owns deterministic domain helpers.

## Routes

- `/` and `/sign-in`: English Google-only owner entry.
- `/dashboard`: protected invitation management.
- `/dashboard/activities`, `/dashboard/places`, `/dashboard/settings`: protected
  catalog and owner configuration.
- `/dashboard/invitations/new` and `/dashboard/invitations/[id]`: protected
  builder and lifecycle surfaces.
- `/preview/[id]`: protected inert recipient preview using real recipient
  components.
- `/i/[token]/[[...slug]]`: Vietnamese private recipient experience. The token
  authorizes; the slug is decorative.

## Privacy and rendering invariants

- Private invitation routes emit generic Vietnamese metadata, `noindex`,
  `no-referrer`, private/no-store caching, and never mutate on GET.
- Missing or unavailable public credentials converge on generic recipient
  states; they do not reveal lifecycle history.
- There is no analytics, open tracking, presence write, recipient account, or
  partial recipient draft persistence on the server.
- Recipient selections persist only in browser local storage scoped by token and
  link generation.

## Validation

`npm run check` runs lint, TypeScript, deterministic tests, and a production
build. Convex code generation is run separately when the backend contract
changes. Automated checks do not replace the manual/provider gates.
