# Domain Model and Lifecycle

## Status

Implemented in source. This document preserves the approved entity, snapshot,
time, link, and lifecycle design; `docs/logic/` owns current behavior.

## Ownership model

The MVP has one logical owner. Every protected document is owner-scoped even if
the initial database contains only one owner. Owner identity comes from a
verified Google identity whose normalized email matches the server-side
allowlist.

Logical entities:

| Entity | Purpose | Important fields |
| --- | --- | --- |
| `ownerSettings` | Private owner profile | normalized email, display name, timezone |
| `activities` | Reusable catalog items | name, description, optional duration, time tags, `archivedAt` |
| `places` | Reusable place records | name, address, Maps URL, note, activity links, time tags, media references, `archivedAt` |
| `mediaAssets` | Published image variant sets | immutable revision, dimensions, AVIF/WebP storage IDs, state |
| `invitations` | Stable invitation identity and lifecycle | internal ID, link generation, token digest, slug, status, archive fields, revisions, timestamps |
| `invitationOptions` | Independent editable invitation copy | recipient copy, slots, activity/place snapshots, optional-module config, acknowledged overrides |
| `confirmations` | Immutable chosen plan | selected slot, ordered plan items, optional answers, recipient email until purged |
| `emailDeliveries` | Idempotent transactional delivery | event type, audience, idempotency key, provider ID, attempt/result timestamps |
| `invitationEvents` | Minimal operational history | state transition or delivery event, timestamp, sanitized reason |

Names describe domain ownership; Convex may embed a bounded value or normalize
it when query and mutation behavior justify that choice. The public API must not
mirror database documents directly.

## Catalog and invitation snapshots

Activating or refreshing a draft copies the enabled catalog fields into an
invitation-owned snapshot. The snapshot includes stable local option IDs,
display fields, compatibility metadata, and media revision references.

- Later master-catalog edits never propagate automatically.
- The owner may edit the invitation-owned copy while Draft or Active.
- Those direct invitation edits propagate live to the recipient.
- Removing an option must invalidate only the dependent recipient choice.
- Confirmed snapshots and confirmations are immutable.
- Archived catalog records remain valid in existing invitation snapshots.

This is a copy-on-invite model, not a live foreign-key view of the catalog.

## Plan model

A confirmation stores `planItems` as an ordered collection. Each item contains
an immutable activity snapshot and place snapshot rather than nullable master
catalog IDs. MVP domain validation enforces `MAX_PLAN_ITEMS = 1`.

Duration is optional activity curation metadata. It powers warnings and future
itinerary planning but does not split the chosen slot or create multiple calendar
events in the MVP. The whole selected slot is reserved.

## Time representation

- Store every slot as UTC `startAt` and `endAt` instants plus the invitation's
  IANA timezone and friendly label.
- The MVP writes `Asia/Ho_Chi_Minh`; do not infer timezone from a browser.
- Require `endAt > startAt`; cross-midnight slots are valid.
- A slot stops being confirmable at its `startAt` instant.
- Enforce time validity during every public read and confirmation. Scheduled
  expiry is a convenience, not the authority.
- Friendly labels are invitation copy, not a replacement for exact date/time.

## Invitation lifecycle

Lifecycle status is exactly one of:

```text
Draft -> Active -> Confirmed
  |        |          |
  |        +-------> Cancelled
  |        +-------> Expired
  +---------------> Cancelled

Expired -> Draft (explicit owner action only)
Confirmed -> Cancelled
```

- **Draft:** private, editable, never exposed by a public link.
- **Active:** public link resolves and valid options can be confirmed.
- **Confirmed:** immutable final plan; link resolves to a read-only card.
- **Expired:** no future confirmable slots; public link shows a generic ended
  state without unused private options.
- **Cancelled:** terminal. A confirmed card shows a cancellation banner and the
  former final plan; an unconfirmed invite reveals no unused options.

Cancellation is never undone. A new arrangement uses a new invitation. An
Expired invitation may be explicitly returned to Draft, edited, and reactivated;
it is never silently revived.

## Archive and deletion

Archive is a presentation field (`archivedAt`), not a lifecycle status. Archive
is allowed for Draft, Expired, Cancelled, or a Confirmed invitation after its
event has ended. Active and upcoming Confirmed invitations remain visible in
the main operational dashboard.

Catalog records are archive-only in the MVP. Invitation permanent deletion is
a separate guarded privacy action that:

- invalidates the public credential first;
- cancels pending notification and retention jobs where possible;
- removes recipient data, invitation snapshots, and confirmation data;
- preserves independent master catalog records; and
- leaves only the minimum sanitized tombstone needed to prevent replay or
  duplicate background work.

## Public-link lifecycle

- The database uses a stable internal Convex ID.
- The public path carries a randomly generated UUIDv4 bearer credential.
- The optional slug is decorative. It never authorizes, resolves, or changes
  which invitation is loaded.
- Store and index a one-way digest of the bearer credential rather than exposing
  it in internal relations where feasible.
- Rotation creates a new credential and increments `linkGeneration`; the prior
  credential becomes invalid immediately.
- Recipient local draft storage is keyed by link generation and cleared after
  confirmation, cancellation, expiry, rotation, or deletion.

All unavailable Draft, revoked, malformed, erased, or unknown links receive the
same generic public response.

## Concurrency rules

Owner edits and recipient confirmation may race. The confirmation mutation uses
the current invitation revision and all authoritative data in one transaction.
It either commits a complete valid confirmation or writes nothing. A mutation
never trusts availability, membership, lifecycle, recipient email, or computed
calendar data supplied by the browser.
