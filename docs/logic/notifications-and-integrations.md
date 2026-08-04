# Notifications and Integrations

## Status

Calendar/Maps generation and the Resend job system are implemented. Real Resend
API and inbox delivery are pending because provider secrets are not configured
in the development environment.

## Calendar and Maps

- Confirmed cards use a Google Calendar template URL. There is no Calendar API,
  calendar OAuth scope, automatic calendar write, or `.ics` route.
- The composer includes the exact UTC interval, Asia/Ho_Chi_Minh context,
  activity, place/address, Maps URL, enabled optional answers, and durable private
  invitation URL.
- Calendar titles name the counterpart for the owner/recipient audience.
- Maps actions open only the stored allowlisted HTTPS Maps URL with
  `rel=noreferrer`.

## Transactional email

- Confirmation commits before any provider work. The mutation schedules an
  internal post-commit event.
- Owner confirmation always targets `OWNER_NOTIFICATION_EMAIL` when present,
  otherwise `OWNER_EMAIL`. Recipient confirmation/cancellation is scheduled only
  when the recipient supplied an email at confirmation.
- Stable event/audience/template idempotency keys are reused across a maximum of
  four attempts with bounded backoff and crash-recovery leases.
- Delivery rows expose pending/delivered/failed status and sanitized failure code
  to the owner. A manual retry resets the bounded attempt cycle while keeping the
  same provider idempotency key.
- Application HTML contains no open/click tracking. Resend account/domain tracking
  settings remain a provider-level manual gate.
- Recipient email is purged after the event ends or cancellation delivery reaches
  a terminal state. Permanent erasure deletes queued delivery state before the
  invitation.

## Configuration boundary

The repository contains no provider secrets. `RESEND_API_KEY`,
`RESEND_FROM_EMAIL`, and optional `OWNER_NOTIFICATION_EMAIL` must be configured
in Convex for a provider-development run. Missing configuration produces a
visible terminal delivery failure without rolling back confirmation.
