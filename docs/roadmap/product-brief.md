# Pick-a-Date Product Brief

## Status

Approved product direction. Khang Cao approved this brief on 2026-08-05. The
features are not implemented until their owning `docs/logic/` documents say so.
Changing an actor, confirmation authority, privacy boundary, or MVP non-goal
requires Khang's approval.

## Product promise

Pick-a-Date is Khang's private, single-owner invitation tool. Khang curates a
catalog, offers one recipient a controlled set of suitable date plans, and
shares a private link. The recipient chooses one offered time, one activity,
and one matching place. Their confirmation finalizes the plan.

The product adds care and personality to an invitation; it does not replace the
conversation between the two people.

## Actors

- **Owner:** Khang, authenticated with one allowlisted Google account.
- **Recipient:** exactly one person per invitation, using a private bearer link
  without an account.
- **Service providers:** Convex for application data, realtime updates, auth,
  jobs, and media; Resend for transactional email; Google Calendar and Google
  Maps only through user-initiated links.

## Locked MVP path

1. The owner maintains activities, places, and place photography.
2. The owner creates an invitation with a recipient display name and optional
   message.
3. The owner offers exact start/end slots, each with a friendly label such as
   morning, afternoon, night, or late.
4. The owner enables a subset of activities and matching places and may enable
   outfit-color and transport questions.
5. The owner activates the invitation and manually shares its private link.
6. The recipient chooses one still-valid slot, one activity, and one place,
   answers enabled optional questions, reviews the plan, and confirms.
7. Confirmation atomically finalizes the plan. Both views become read-only and
   update in realtime.
8. The owner always receives a confirmation email. The recipient receives one
   only when they provided an email address.
9. Each person can open an editable, prefilled Google Calendar event from a
   clear button. Pick-a-Date never creates the event automatically.

## Experience principles

- The invitation is Vietnamese and mobile-first. The dashboard is English and
  desktop-first, while remaining usable at narrow widths.
- The tone is warm, playful, and confident—not intense, childish, wedding-like,
  or guilt-driven.
- Owner photography and clear choices carry the experience. Motion is brief,
  purposeful, and reduced when the device requests reduced motion.
- A recipient's unfinished choices belong to their device. The owner cannot
  observe opens, partial choices, or engagement behavior.

## MVP boundaries

- One owner and one recipient per invitation.
- One activity plus one place per confirmed plan.
- The domain stores ordered plan items and enforces a maximum of one so a future
  itinerary planner does not require replacing the confirmation model.
- Fixed `Asia/Ho_Chi_Minh` timezone, stored explicitly for future expansion.
- Manual link sharing and Google-only calendar handoff.
- No recipient account, multi-owner workspace, voting, chat, collaborative
  editing, proposed times, auto calendar sync, Calendar API, `.ics` experience,
  Maps catalog import, public catalog, analytics, tracking, marketing email,
  SMS, or generic questionnaire builder.

## Canonical detail

The supporting locks below own implementation-level decisions. This brief wins
if another roadmap document accidentally broadens the product:

- [`mvp-product-contract.md`](mvp-product-contract.md)
- [`domain-model-and-lifecycle.md`](domain-model-and-lifecycle.md)
- [`owner-dashboard-and-auth.md`](owner-dashboard-and-auth.md)
- [`recipient-experience.md`](recipient-experience.md)
- [`catalog-media-and-compatibility.md`](catalog-media-and-compatibility.md)
- [`privacy-notifications-and-integrations.md`](privacy-notifications-and-integrations.md)
- [`technical-architecture.md`](technical-architecture.md)
- [`environment-setup.md`](environment-setup.md)
- [`acceptance-criteria.md`](acceptance-criteria.md)
- [`implementation-plan.md`](implementation-plan.md)
