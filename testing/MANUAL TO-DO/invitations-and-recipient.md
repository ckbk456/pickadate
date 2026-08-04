# Invitation and Recipient Manual Testing

## Status

All scenarios are **Pending human run**. Lifecycle unit tests do not prove device,
realtime, visual, keyboard, or provider behavior.

## Recipient journey

1. Open a private link on current iOS Safari, Android Chrome, and one messaging
   in-app browser at a narrow viewport.
2. Complete time, activity, place, details dialog, color random/manual choice,
   transport, optional email, review, and confirmation.
3. Repeat without email and confirm the same final plan/calendar access works.
4. Reload and temporarily go offline before confirmation; local choices and email
   remain, no partial data appears in the dashboard, and retry is clear.
5. Test keyboard-only desktop, focus trap/restoration, 200% zoom, visible focus,
   reduced motion, and non-color selection indicators.

## Live and lifecycle behavior

1. With one recipient page open, edit Active slot/activity/place choices. Verify
   still-valid choices remain, only invalid dependencies clear, and Vietnamese
   status text announces the change.
2. Rotate the link; old link becomes generic unavailable and new generation does
   not load old local progress.
3. Leave a page open across slot start; past time cannot confirm and disappears.
4. Double-tap Confirm and race an owner edit; only one valid immutable plan exists.
5. Confirm overlapping invitations: the winner finalizes, competing slots prune,
   and an empty competitor expires.
6. Cancel after confirmation: former plan remains, Calendar action is removed,
   and the recipient page updates live.

Result: **Pending human run**.
