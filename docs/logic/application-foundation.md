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
- Node.js 26.13.0 LTS and npm 12.2.1 are the supported local and CI baseline.
- `npm run typecheck` uses TypeScript 7 through the `@typescript/native` npm
  alias. The `typescript` alias uses the official TypeScript 6 compatibility
  package for Next.js and ESLint integrations that require the compiler API.
  Both remain strictly checked; no build or lint errors are suppressed.
- Direct dependencies are pinned to reviewed stable versions. The lockfile also
  pins transitive dependencies; update both together and run `npm audit` plus
  the complete source gate before deployment.
- npm 12 allows install scripts only for the explicitly recorded esbuild and
  unrs-resolver versions in `allowScripts`; new script-bearing versions require
  review. CI uses the same npm release and clean-install path.
- Next.js 16.4.3 supplies ESLint 10 rule-context compatibility. Its React, import,
  and accessibility plugins still declare ESLint 9 peer ranges, so npm emits
  upstream peer warnings even though the configured lint gate passes.
- Convex Auth still brings deprecated Lucia/Oslo packages transitively. A clean
  advisory scan does not establish that these packages are actively maintained;
  replacing the authentication stack is a separate migration.
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
build. Vitest uses an explicit ESM configuration and the Convex test module
glob includes generated JavaScript while excluding declarations and test files.
Convex code generation is run separately when the backend contract
changes. Automated checks do not replace the manual/provider gates.
