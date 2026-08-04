# MVP Implementation Plan

## Status

Source implementation is complete on the named dependent MVP branch. Each slice
is owned by `docs/logic/` and a durable manual guide. Provider, visual, device,
accessibility, deployment, and production gates remain pending until performed.

## Integration rule

Draft PR #1 (`codex/bootstrap-agentic-workflow`) already owns the Next.js and
repository-workflow foundation. Do not scaffold a second replacement from stale
`master`. It removes the nested `./pick-a-date/` prototype: the application,
package manifest, source, documentation, and configuration all live directly at
the repository root. Finish and merge that foundation with the locked roadmap,
then create each implementation branch from the latest `origin/master`.

If work must begin before a dependency merges, use an explicitly dependent
branch and PR; do not imply its validation applies to `master`.

## Slice 0 — Lock and research

Deliver:

- approved roadmap contracts;
- Mobbin-backed visual research and an original visual direction;
- current provider setup contract; and
- updated foundation copy that no longer contradicts the product.

Gate: documentation link check, lint/build on the final foundation tree, review
of unresolved external prerequisites, and no claim that roadmap behavior ships.

## Slice 1 — TypeScript and Convex foundation

Deliver:

- deliberate JS-to-TypeScript conversion;
- Convex development project wiring and schema foundation;
- domain constants/validators and deterministic test harness;
- generic public invitation shell with privacy headers; and
- environment validation without committed secrets.

Gate: lint, TypeScript, production build, domain tests, no secret in client
bundle, and manual generic-metadata/referrer verification.

## Slice 2 — Owner authentication and dashboard shell

Deliver:

- Convex Auth Google sign-in;
- centralized server-side owner assertion;
- allowlist enforcement in every protected function;
- English responsive dashboard navigation/settings; and
- auth/manual-test documentation.

Gate: automated unauthenticated/wrong-owner rejection plus human Google OAuth
test in development. Middleware/UI checks do not substitute for Convex tests.

## Slice 3 — Catalog and media

Deliver:

- activity and place CRUD with archive/restore;
- associations, time tags, duration, Maps URL, address, and note;
- temporary upload, AVIF/WebP variant processing, atomic publication, and safe
  placeholders; and
- owner catalog UI.

Gate: field/domain tests, authorization tests, failed-processing cleanup,
responsive image inspection, EXIF removal, and human catalog usability review.

## Slice 4 — Invitation builder and lifecycle

Deliver:

- autosaving six-step builder and mobile preview;
- independent invitation snapshots and subset toggles;
- exact slots/friendly labels and compatibility warnings/overrides;
- activation validation, public credential, slug, copy/share, rotation;
- Draft/Active/Expired/Cancelled lifecycle plus archive/erasure; and
- minimal public Active projection.

Gate: lifecycle, expiration, snapshot, overlap, rotation, erasure, and public
projection tests; human desktop builder and privacy review.

## Slice 5 — Recipient selection flow

Deliver:

- Vietnamese mobile-first time/activity/place flow;
- vertical cards and accessible detail sheet/dialog;
- optional color/transport modules;
- device-local draft persistence; and
- realtime option reconciliation/invalidation.

Gate: deterministic selection rules, no partial-choice writes, responsive and
keyboard tests, current iOS Safari/Android Chrome/in-app-browser human sweep, and
reduced-motion/zoom checks.

## Slice 6 — Atomic confirmation and date card

Deliver:

- review screen and one atomic, idempotent confirmation mutation;
- overlap claim/invalidation behavior;
- immutable ordered `planItems` with V1 maximum one;
- reduced Confirmed public projection and realtime cancellation;
- owner dashboard final-plan update; and
- correctly encoded owner/recipient Google Calendar links.

Gate: race, stale-page, double-tap, past-slot, overlap, and cancellation tests;
human calendar composition and final-card review. No Calendar API is involved.

## Slice 7 — Transactional email and retention

Deliver:

- Resend confirmation/cancellation templates;
- post-commit idempotent jobs, retry state, and owner delivery status;
- optional recipient-email ingestion only at confirmation;
- purge scheduling and guarded permanent erasure; and
- sanitized operational logging.

Gate: mocked job/idempotency tests, provider-development test, separately
authorized real delivery, failure recovery, and retention inspection. A provider
API response alone does not prove inbox delivery.

## Slice 8 — Release hardening

Deliver:

- complete logic/manual documentation ownership;
- accessibility, privacy, mobile performance, broken-link, and error-state pass;
- production environment and deployment runbook;
- clean CI at the exact PR head; and
- deployment-ready handoff.

Gate: final automated check, manual device/browser matrix, Lighthouse-style
performance investigation without adding tracking, owner acceptance, then
separate explicit authority for merge, provider production configuration, DNS,
and deployment.

## Definition of done

The app is finished only when all MVP slices are implemented, current logic and
manual guides match the code, automated gates pass at the exact final head,
required human/provider scenarios are truthfully recorded, no owned process is
left running, and the owner receives a deployment-ready handoff. Merged,
deployed, and production-verified remain separate states.
