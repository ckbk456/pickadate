# MVP Acceptance Criteria

## Status

Approved behavior-level acceptance contract; not yet executed. These scenarios
define what implementation must prove. Each shipped slice moves relevant cases
into automated tests and its owning durable manual guide. A scenario is Pending
until evidence exists for a named commit and environment.

## Owner authentication

### AC-AUTH-01 — Allowlisted owner

Given a Google identity with a verified email equal to normalized `OWNER_EMAIL`,
when the user signs in and calls a protected Convex function, then the dashboard
and function are available.

### AC-AUTH-02 — Every other identity rejected

Given no identity, an unverified email, or a different Google account, when any
protected query, mutation, or action is called directly, then the server rejects
it without returning owner or invitation data. Client navigation behavior alone
does not satisfy this criterion.

## Catalog and media

### AC-CAT-01 — Archive preserves history

Given an activity or place referenced by an invitation snapshot, when the owner
archives the catalog record, then it disappears from new-picker defaults while
the existing Active or Confirmed invitation remains unchanged.

### AC-CAT-02 — Atomic media publication

Given an owner upload, when any required AVIF/WebP variant fails, then no partial
media revision becomes selectable and temporary data is recoverable or cleaned.
When processing succeeds, the raw upload and EXIF are absent and all recorded
variants resolve at their intended intrinsic dimensions.

### AC-CAT-03 — Efficient recipient media

Given a recipient opens the place list, then card-sized images load without
eagerly downloading the full gallery. Given they open details, gallery assets
lazy-load and closing details restores their prior selection, focus, and scroll.

## Builder and activation

### AC-BUILD-01 — Snapshot independence

Given an invitation copied from the catalog, when the master activity or place
changes, then the invitation does not change. When the owner directly edits the
Draft or Active invitation copy, then that copy changes without modifying the
master catalog.

### AC-BUILD-02 — Activation is complete or rejected

Given any missing activation invariant, when the owner attempts activation,
then the invitation remains Draft and the dashboard links directly to every
blocking field. Given all invariants and acknowledged overrides, activation
creates one current bearer credential and exposes the minimal Active projection.

### AC-BUILD-03 — Slug is decorative

Given a valid UUID bearer credential, when the slug is missing or changed, then
the same invitation resolves. Given only a slug without the current credential,
then no invitation details resolve.

## Private-link behavior

### AC-LINK-01 — Generic unavailable response

Given a Draft, revoked, malformed, erased, or unknown credential, when a public
read occurs, then every case returns the same generic unavailable experience and
no recipient, option, or lifecycle-history details.

### AC-LINK-02 — Rotation revokes immediately

Given an Active invitation and local recipient progress, when the owner rotates
the link, then the old link stops resolving immediately, the new link preserves
server invitation history, and old-generation local progress is not loaded by
the new link.

### AC-LINK-03 — Metadata and outbound privacy

Given any private route, when a crawler reads metadata or a user follows a Maps
link, then the preview remains generic, indexing is discouraged, and the private
route is not sent as an HTTP referrer. No read request can confirm or mutate.

## Recipient selection

### AC-REC-01 — Confirmation without email

Given a valid slot, activity, place, and required optional answers with no email,
when the recipient confirms, then confirmation succeeds and only the owner email
is scheduled.

### AC-REC-02 — Local-only unfinished choices

Given an unconfirmed flow, when the recipient selects options or types an email,
then no partial choice or email is written to Convex and the dashboard reveals no
open, presence, last-viewed, or draft information.

### AC-REC-03 — Realtime owner edit

Given an Active page is open, when the owner changes the invitation copy, then
the recipient sees the update without refresh. Still-valid choices persist;
only invalid dependent choices clear; an accessible Vietnamese explanation is
shown; and confirmation remains disabled until the draft is valid again.

### AC-REC-04 — Time expires authoritatively

Given a page opened before a slot's start and left open, when the authoritative
time reaches `startAt`, then the slot cannot be confirmed even if the client has
not refreshed. It disappears or becomes unavailable, and an invitation with no
future slots becomes Expired.

### AC-REC-05 — Accessible responsive flow

Given current iOS Safari, Android Chrome, a common in-app browser, keyboard-only
desktop use, 200% zoom, or reduced motion, then the primary flow remains legible
and operable; focus behavior is correct; selection is not color-only; and no
required content or action depends on animation, hover, or carousel gestures.

## Atomic confirmation and booking conflicts

### AC-CONF-01 — One transaction

Given the owner edits while the recipient confirms, when the requests race, then
the database contains either one complete confirmation valid against the winning
current revision or no confirmation. It never contains a mismatched slot,
activity, place, or partially changed lifecycle.

### AC-CONF-02 — Duplicate tap idempotency

Given two identical confirmation requests for one link generation, when both are
submitted, then one immutable plan exists and at most one email event per
audience/template is scheduled. The second response safely returns the existing
result.

### AC-CONF-03 — Confirmed slot exclusivity

Given two Active invitations offer overlapping time ranges, when one validly
confirms, then the other cannot confirm an overlapping range. Its conflicting
slots are removed atomically; its open page updates; and it becomes Expired only
when no future slot remains.

### AC-CONF-04 — Public projection shrinks

Given an invitation is Confirmed, when its public card is read, then only the
final slot, one plan item, enabled optional answers, and necessary Calendar/Maps
data are returned. Unused activities, places, slots, overrides, owner-only note
fields, and recipient email are absent.

## Cancellation, archive, and erasure

### AC-LIFE-01 — Confirmation is immutable

Given a Confirmed invitation, when the owner views it, then time, plan, and
answers cannot be edited. The only plan-changing operation is Mark cancelled;
rescheduling requires a new invitation.

### AC-LIFE-02 — Cancellation updates both views

Given a Confirmed card is open, when the owner cancels, then the recipient view
updates live to a clear cancellation state, retains the former plan for context,
and removes or marks the calendar action obsolete.

### AC-LIFE-03 — Archive is not lifecycle

Given an Active or upcoming Confirmed invitation, when archive eligibility is
evaluated, then archive is rejected. Eligible Draft or terminal/history records
retain their lifecycle status and gain only `archivedAt`.

### AC-LIFE-04 — Permanent invitation erasure

Given the owner completes guarded erasure, then the credential is revoked before
personal data is removed, pending jobs cannot later send it, master catalog data
remains, and the public route becomes the generic unavailable state.

## Email

### AC-EMAIL-01 — Commit before provider call

Given a valid confirmation and a Resend outage, when confirmation is submitted,
then the immutable Confirmed state succeeds and the dashboard shows pending or
failed delivery. Provider failure never rolls back or duplicates the plan.

### AC-EMAIL-02 — Correct recipients and content

Given no recipient email, only the owner copy is scheduled. Given a recipient
email, exactly one owner and one recipient copy are scheduled with the same final
facts and audience-appropriate Calendar links. No open/click tracking is added.

### AC-EMAIL-03 — Retry and retention

Given a retryable failure, retries use the same idempotency key and cannot create
duplicate sends. After event end, or terminal cancellation delivery success or
permanent failure, the application-held recipient email is purged while the
minimum sanitized delivery record remains.

## Calendar and Maps

### AC-INT-01 — Calendar is manual and editable

Given a Confirmed card, when either Calendar button is used, then an encoded
Google Calendar composer opens with exact start/end, location, activity, Maps
link, enabled optional answers, and durable invitation link. The recipient title
uses the owner name and the owner title uses the recipient name. No Calendar API,
OAuth scope, automatic write, or `.ics` route is involved.

### AC-INT-02 — Safe URL construction

Given names, notes, addresses, or URLs containing spaces, Vietnamese characters,
ampersands, or line breaks, then Calendar and Maps actions remain correctly
encoded and cannot inject a new URL scheme, parameter, or markup.

## Release truthfulness

The MVP cannot be called complete from automated checks alone. The handoff must
separately report source validation, exact-head CI, Google OAuth, Resend API,
real inbox delivery, device/browser, accessibility judgment, deployment, and
production smoke-test status. Unrun gates remain Pending.
