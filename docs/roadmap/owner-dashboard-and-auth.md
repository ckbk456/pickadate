# Owner Dashboard and Authentication

## Status

Implemented in source. This document preserves the approved dashboard,
authorization, and owner-operation design; `docs/logic/` owns current behavior.

## Authentication boundary

- Use Convex Auth with Google OAuth.
- Google is configured as an External app in Testing for development, with the
  owner account as a test user.
- Request only identity scopes: `openid`, email, and profile.
- Do not enable Google Calendar API or request calendar scopes.
- A shared server helper such as `assertOwner()` normalizes the authenticated
  email, requires a verified identity, compares it with `OWNER_EMAIL`, and is
  called by every protected Convex query, mutation, and action.
- Next.js route protection improves navigation but is not an authorization
  boundary. Hiding dashboard controls in the client is never sufficient.

There is no public registration, invitation to become an owner, role model, or
account-management UI in the MVP.

## Dashboard information architecture

The English dashboard is desktop-first and responsive. Its primary surfaces are:

- **Invitations:** operational list grouped by Draft, Active, upcoming
  Confirmed, and history; archive is a filter, not a lifecycle status.
- **Create invitation:** guided autosaving builder with persistent validation.
- **Invitation detail:** preview, lifecycle, delivery state, safe actions, and
  final plan when confirmed.
- **Activities:** create, edit, associate with places, and archive.
- **Places:** create, edit, manage photography/metadata, associate activities,
  and archive.
- **Settings:** owner display name, allowlisted identity summary, and fixed
  timezone display.

## Builder behavior

The builder follows the six steps in the product contract. Autosave is visible
but quiet: show saving, saved, and actionable error states without blocking
navigation between complete steps.

The owner can enable or disable an entire activity and independently enable or
disable places under that activity. Place selections are constrained to the
invitation-owned snapshot. Validation prevents an enabled activity with zero
enabled places.

The preview uses the real recipient components at a phone-sized viewport with
safe preview data. Preview never activates, confirms, sends email, or calls a
provider.

## Live editing

Draft and Active invitations may be edited. An Active invitation increments its
revision on every meaningful option change. Open recipient pages subscribe to
the minimal public projection and update without refresh.

If an edit removes a selected slot, activity, or place, the recipient keeps
every still-valid answer and sees a clear Vietnamese explanation next to the
cleared choice. Confirmed invitations disable all editing controls except
**Mark cancelled**.

## Owner operations

- Activate a valid Draft.
- Copy the current private link and use the platform share control when
  available. The app does not send the invitation itself.
- Rotate the link with an explicit warning that the old link stops working and
  on-device recipient progress is invalidated.
- Cancel an unconfirmed or confirmed invitation with confirmation.
- Return an Expired invitation to Draft explicitly.
- Archive eligible records without deleting them.
- Permanently erase an invitation through a guarded, typed-confirmation action.
- See confirmation and cancellation email delivery as pending, delivered, or
  failed with a safe retry control.

The dashboard never exposes recipient open state, last-viewed time, partial
choices, device information, or email engagement.

## Status labels

User-facing lifecycle labels are Draft, Active, Confirmed, Expired, and
Cancelled. Archived is shown as a separate badge/filter where relevant. There
is no Sent state because link sharing occurs outside the application.

## Required error handling

- Authentication failure and allowlist rejection are distinct, actionable
  owner-only states.
- Provider and network failures preserve the local form and expose safe retry.
- Stale edits refresh against the current revision instead of overwriting newer
  data.
- Destructive actions state exactly what remains recoverable.
- Delivery failure never implies confirmation failure.
