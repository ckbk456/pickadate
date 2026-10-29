# Privacy, Notifications, and Integrations

## Status

Implemented in source. This document preserves the approved privacy,
notification, and integration design; `docs/logic/` owns current behavior.

## Privacy stance

An invitation URL is a bearer secret. Anyone holding the current UUID credential
can view the invitation, make unconfirmed local selections, and attempt its one
confirmation. The decorative slug provides no security.

The product is intentionally private, not anonymous to the owner. The UI must
explain that forwarding the link grants access. There is no recipient identity
verification in MVP.

## Public-data minimization

- Draft, revoked, malformed, erased, and unknown credentials reveal no
  invitation data and use the same generic response.
- Active reads return only fields needed for the current recipient flow.
- Confirmed reads return only the final plan and enabled answers, not unused
  options.
- Server-rendered metadata and social previews are generic and contain no
  recipient or plan details.
- Private routes send `noindex` and `Referrer-Policy: no-referrer`.
- Slug UI warns against names, emails, or other personal information.
- Application and provider-facing logs redact bearer credentials, full private
  paths, recipient emails, and provider payloads where practical.

## No-tracking contract

Do not collect or derive:

- invitation opens, page views, or last-viewed timestamps;
- partial choices, abandoned flows, or time spent;
- email opens or clicks;
- IP-based identity, device fingerprints, or advertising identifiers; or
- analytics events disguised as operational logs.

Allowed operational records are lifecycle transitions, sanitized failures, and
email delivery attempts/results. They must be necessary to operate or recover
the invitation.

## Local draft contract

Unfinished recipient choices, including email, stay on the device. Storage is
namespaced by link generation, contains no unnecessary server data, and clears
on confirmation, cancellation, expiry, rotation, or deletion. A shared-device
notice is appropriate near the optional email field or in privacy help.

## Transactional email

Resend sends only confirmation and cancellation transactions.

- Confirmation commits first.
- One idempotency key is derived from invitation, lifecycle event, audience, and
  template version.
- A retryable background job sends the owner copy unconditionally and the
  recipient copy only when an email was supplied.
- Delivery states are pending, delivered, or failed, with attempt metadata.
- Retry cannot duplicate a delivery and provider failure cannot change the
  invitation lifecycle.
- Cancellation email is sent only when the app still holds a recipient email.
- No marketing list, contact import, open pixel, or click tracking is enabled.

The application purges its recipient-email value after the event ends, or after
a terminal cancellation delivery succeeds or permanently fails. Resend may
retain provider delivery records under its own policy; the application must not
claim it can erase provider-controlled records instantly.

## Google Calendar handoff

The app creates an encoded Google Calendar template URL and opens Google's
editable event composer. No OAuth, Calendar API, sync, `.ics`, or server-side
calendar write exists.

The event contains:

- exact start/end time and `Asia/Ho_Chi_Minh` timezone semantics;
- location name and address;
- activity and Google Maps link;
- enabled outfit-color and transport answers; and
- the durable invitation link.

The recipient title is **Date with [owner display name]**. The owner's title is
**Date with [recipient display name]**. Putting the bearer link in the event is
an explicit user-initiated disclosure to Google; the button remains optional and
the event is editable before save.

## Google Maps handoff

Maps is a validated owner-supplied outbound URL only. Pick-a-Date does not query
Maps, infer opening hours, import saved lists, or transmit the invitation URL.
The no-referrer policy prevents the browser from sending the private page as the
HTTP referrer.

## Abuse and mutation safety

- Public GET/read operations never mutate state.
- Confirmation uses one deliberate POST/mutation with CSRF-appropriate origin
  handling and server validation.
- Rate-limit malformed lookups and confirmation attempts without recording
  behavioral profiles.
- Return generic public errors that do not reveal whether a recipient name,
  email, slug, or previous credential exists.
- Permanent deletion invalidates the bearer credential before erasing data.
