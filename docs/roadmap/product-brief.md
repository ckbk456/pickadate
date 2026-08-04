# Pick-a-Date Product Brief

## Status

Proposed. This document records Khang Cao's initial direction and is protected;
do not broaden or alter it without consultation.

## Intended outcome

Khang can send someone a simple invitation to go on a date. The invitee can
select a suitable time and preferred activities, receive suggested places, and
arrive at a shared plan. Both people then receive the same email confirmation.

## Initial product flow

1. Khang creates and shares an invitation.
2. The invitee selects or proposes a time.
3. The invitee selects preferred activities.
4. The application suggests suitable places.
5. A final choice is confirmed.
6. Both participants receive an email confirmation.

## Current exclusions

None of the flow above is implemented. The current repository is only the
application and agentic-workflow foundation.

## Decisions required before implementation

- Invitation identity: anonymous link, named recipient, account, or another
  model; link forwarding and expiration must be considered.
- Scheduling: single time, multiple options, time zone handling, edits, and
  conflict resolution.
- Activity agreement: who proposes, whether both people vote, and how a final
  choice is reached.
- Place context: city or meeting area, travel radius, price range, availability,
  accessibility needs, and the provider/data source.
- Confirmation lifecycle: who can finalize, edit, cancel, or resend and how both
  participants see the same version.
- Email safety: consent, sender identity, deliverability, retries, duplicate
  prevention, abuse controls, and retention of personal data.

These are product and privacy choices, not reasons to pre-emptively add accounts,
a database, maps, or an email provider.
