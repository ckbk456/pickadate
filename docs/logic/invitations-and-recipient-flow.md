# Invitations and Recipient Flow

## Status

Implemented with deterministic domain and lifecycle tests. Mobile/browser,
keyboard, zoom, reduced-motion, visual, and concurrent-device acceptance remains
pending human verification.

## Lifecycle and private link

- Invitation states are Draft, Active, Confirmed, Expired, and Cancelled.
- Drafts have no public credential. Activation validates the complete snapshot,
  prunes past slots, creates a UUIDv4 credential and SHA-256 lookup digest, and
  increments link generation/revision.
- The UUID credential is the bearer authorization. The optional slug never
  participates in lookup.
- Rotation replaces the credential immediately and uses expected revision plus
  expected generation to prevent double rotation.
- Active reads expose only future slots and enabled snapshot choices. Confirmed
  reads expose only the immutable plan and required Calendar/Maps fields.
- Unknown, malformed, Draft, revoked, and erased credentials share one generic
  unavailable response. Expired or pre-confirmation cancelled links share one
  generic ended response.

## Recipient experience

- The Vietnamese mobile-first flow is introduction, exact time, one activity,
  one filtered place, optional color/transport/email, review, and final card.
- Place details use a native modal dialog: full-screen on narrow viewports and a
  bounded dialog on wider screens. Opening/closing it does not change selection.
- Outfit color supports named presets and cryptographic client-side random
  selection for “choose for me.” Transport stores only pickup, meet there, or
  decide later; no address is requested.
- Optional email remains local until confirmation. All unfinished choices remain
  local and are never visible to the owner.
- Realtime updates reconcile by stable option IDs, preserve valid choices, clear
  invalid dependents, and announce the change in Vietnamese.

## Atomic confirmation

- Confirmation validates the current credential generation, invitation revision,
  future exact slot, activity/place relationship, required optional modules, and
  email format in one mutation.
- A device-stable UUID confirmation key makes duplicate taps idempotent.
- Confirming one slot atomically rejects existing confirmed overlaps, prunes
  overlapping slots from other Active invitations, and expires those left with
  no future slot.
- The committed plan uses ordered `planItems` with MVP maximum one. It is
  immutable; rescheduling requires a new invitation.
- Confirmed cancellation retains former plan context, removes Calendar action,
  and updates the open recipient page in realtime.
