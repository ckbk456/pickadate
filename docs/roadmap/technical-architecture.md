# Technical Architecture

## Status

Implemented target architecture. Current behavior is indexed by
`docs/logic/README.md`; manual/provider/deployment gates remain pending.

## Target stack

| Concern | MVP choice | Boundary |
| --- | --- | --- |
| Web application | Next.js App Router + React + TypeScript | Public invitation and owner dashboard |
| Application backend | Convex | Data, queries, mutations, actions, realtime, scheduled jobs |
| Owner auth | Convex Auth + Google OAuth | One verified allowlisted owner |
| Media | Convex File Storage | Temporary uploads and published AVIF/WebP revisions |
| Email | Resend | Transactional confirmation/cancellation only |
| Hosting | Vercel Hobby | Personal MVP web deployment |
| Calendar | Google Calendar template URL | User-initiated editable event, no API |
| Maps | Owner-supplied Google Maps URL | Outbound link only |

The implementation converts the current JavaScript foundation to TypeScript as
one deliberate slice, including configs, source extensions, lint/build commands,
and documentation. The repository has one root application; do not recreate the
old nested `./pick-a-date/` project or maintain parallel JS and TS application
layers.

## Application boundaries

### Next.js

- Owns routing, rendering, generic metadata, headers, public and dashboard UI,
  local recipient drafts, and Calendar/Maps link presentation.
- Never exposes owner secrets or trusts client-side lifecycle calculations.
- May protect dashboard navigation through middleware, but Convex remains the
  authorization authority.

### Convex

- Owns the domain state machine and every authoritative timestamp.
- Public functions accept the bearer credential and return purpose-built minimal
  projections.
- Protected functions call the centralized owner assertion.
- Mutations own atomic activation, live edits, confirmation, overlap
  invalidation, cancellation, rotation, archive, and erasure.
- Actions/jobs own image processing and Resend calls. Provider calls never occur
  inside the confirmation transaction.

### Resend

- Receives only the fields required to render the transaction.
- Uses application-generated idempotency keys.
- Delivery responses are sanitized before persistence or logging.

## Realtime model

Convex subscriptions update Active invitation projections and final lifecycle
state. Client reconciliation uses stable snapshot option IDs plus an invitation
revision. Realtime transport is not evidence of selection or presence; no open
or heartbeat write is allowed.

## Background work

- Confirmation/cancellation enqueues idempotent delivery after commit.
- Email retry uses bounded attempts and visible terminal failure.
- Scheduled expiry/purge improves timeliness, but every read/mutation independently
  enforces time and lifecycle validity.
- Media cleanup only processes proven-unreferenced immutable revisions.
- Jobs use stable event IDs and re-check current state before side effects.

## Failure model

- Provider failure leaves domain state committed and recoverable.
- Realtime disconnect falls back to a visible reconnect/retry state without
  discarding local recipient progress.
- A stale confirmation refreshes options or shows the finalized card.
- Missing media uses an intentional placeholder and never breaks confirmation.
- Calendar and Maps URL construction uses strict encoding and allowlisted URL
  schemes/hosts where appropriate.

## Portability

Vercel hosts the MVP but does not own core state, media semantics, background
logic, or identity rules. Avoid Vercel databases, Blob, analytics, edge-only
domain code, or deployment-specific request contracts. A future Cloudflare web
host should require an adapter/deployment change, not a domain rewrite.

Convex is an intentional MVP backend dependency. Keep provider calls behind
small application modules and keep domain validation as testable pure TypeScript
where practical.

## Environment separation

- Local web app connects only to the Convex development deployment.
- Preview deployments use non-production provider configuration unless a later
  explicit environment contract says otherwise.
- Production receives separate Convex, Google OAuth, Resend, and hosting secrets.
- Never reuse Google OAuth client secrets or Convex deployment secrets across
  development and production merely for convenience.

## Validation layers

- Static: lint, TypeScript, production build.
- Domain: deterministic tests for validation, lifecycle, overlap, link, and
  Calendar serialization behavior.
- Convex: tests for authorization, public projections, concurrency-safe
  transitions, and idempotent job scheduling.
- Browser: targeted mobile recipient and desktop dashboard journeys.
- Human/provider: real Google OAuth, real email delivery, responsive/visual,
  accessibility judgment, in-app browsers, and final deployment.

No single layer proves the others.
