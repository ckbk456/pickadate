# MVP Product Contract

## Status and change control

Approved and locked for implementation on 2026-08-05. Nothing in this file is
shipped merely because it is documented here. When a slice ships, its invariant
must move to one owning `docs/logic/` document with a matching durable manual
test guide.

Changing an MVP invariant requires an explicit decision from Khang. Small copy,
layout, and implementation choices may evolve without reopening the product
contract when they preserve the same behavior and privacy boundary.

## Success definition

The MVP succeeds when the owner can privately prepare, activate, and share an
invitation; its one recipient can make a valid controlled choice on a phone and
confirm exactly once; both parties can reliably recover the same final plan;
and provider failures cannot corrupt that plan.

Success is functional and personal, not engagement-based. There are no growth,
conversion, open-rate, or time-on-page metrics in the MVP.

## Owner journey

1. Sign in with the allowlisted Google account.
2. Configure owner display name and review the fixed timezone.
3. Maintain the private activity and place catalog.
4. Create an autosaved draft using a guided builder:
   1. recipient display name, decorative slug, and optional message;
   2. one or more future exact time slots and friendly time labels;
   3. enabled activities and enabled places within each activity;
   4. optional outfit-color and transport modules;
   5. mobile invitation preview;
   6. validation, activation, and link copy.
5. Monitor lifecycle and email-delivery state from the dashboard.
6. Edit an Active invitation; the independent invitation copy updates live for
   an open recipient page.
7. After confirmation, view the immutable final plan, cancel it if necessary,
   or archive it when eligible. Rescheduling happens person-to-person and uses a
   new invitation.

## Recipient journey

1. Open a private link and see a personalized Vietnamese introduction.
2. Choose one currently available time slot.
3. Choose one enabled activity.
4. Browse matching places as vertical cards; open and close rich place details
   without losing prior choices.
5. Answer the enabled optional modules:
   - outfit color from owner-enabled presets or **Choose for me** with reroll;
   - transport as **Pick me up**, **I'll meet you there**, or **Let's decide
     together**.
6. Optionally enter an email labeled as a confirmation copy, not calendar sync.
7. Review and confirm.
8. See a durable read-only date card and a clear **Add to Google Calendar**
   button.

The link is single-confirmation, not single-view. It remains a durable read-only
card after confirmation until cancellation, link rotation, or permanent erasure.

## Activation contract

An invitation may become Active only when it has:

- a recipient display name;
- at least one future slot with valid start and end instants;
- at least one enabled activity;
- at least one enabled place for every enabled activity;
- valid configuration for every enabled optional module;
- no unresolved invalid catalog references; and
- explicit owner acknowledgement for every compatibility warning they chose to
  override.

The dashboard explains each blocker and never activates a partial draft.

## Confirmation contract

One server mutation owns confirmation. It revalidates the current link
generation, lifecycle, future slot, snapshot membership, compatibility rules,
and booking conflicts before writing anything. It then writes the immutable
selection and lifecycle transition together.

Repeated identical confirmation requests are idempotent. A stale or conflicting
request returns a safe, actionable result and never creates a second plan.
Email delivery begins only after the database commit and cannot reverse it.

## Cross-invitation booking rule

Active invitations may offer overlapping slots; this is useful while an answer
is still uncertain. A confirmed time range is exclusive:

- confirmation atomically rejects a range that overlaps an already Confirmed,
  non-cancelled plan;
- successful confirmation removes every overlapping slot from other Active
  invitations;
- affected open recipient pages update in realtime, clear only invalid choices,
  and explain the change in Vietnamese; and
- an affected invitation becomes Expired when no future slots remain.

This rule prevents double-booking without treating an unconfirmed invitation as
a reservation.

## Explicit non-goals

- Multiple recipients, public signup, or multiple owners.
- Recipient-proposed slots or editing after confirmation.
- Multi-stop itinerary UI, routing, travel buffers, or collaborative planning.
- Automated place recommendations or external catalog ingestion.
- Calendar OAuth, automatic calendar writes, `.ics` downloads, reminders, or
  availability reads.
- Delivery through SMS, phone, messaging apps, or in-product chat.
- Behavioral analytics, read receipts, email-open pixels, click tracking,
  fingerprints, or draft visibility.
- Production commercialization, subscriptions, teams, or generalized event
  invitations.

