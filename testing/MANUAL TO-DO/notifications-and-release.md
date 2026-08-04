# Notifications and Release Manual Testing

## Status

All scenarios are **Pending provider/deployment/human run**.

## Email and integrations

1. Configure a development Resend API key, verified sender, and tracking-disabled
   domain settings. Do not use production recipients for the first run.
2. Confirm without recipient email: exactly one owner delivery is scheduled.
3. Confirm with recipient email: exactly one owner and one recipient copy contain
   matching exact plan facts and audience-appropriate Calendar links.
4. Simulate provider failure; final plan remains committed, delivery becomes
   pending/failed, Retry reuses the idempotency key, and no duplicate arrives.
5. Cancel a confirmed invitation with recipient email and inspect the cancellation
   copy. Verify recipient email purges at the documented terminal boundary.
6. Open Calendar buttons for owner and recipient. Confirm exact times/location,
   editable composer, counterpart title, Maps link, optional answers, and durable
   invitation link. Confirm there is no `.ics` download or Calendar scope.

## Release gates

Record these independently: exact-head CI, Google OAuth, Resend API response, real
inbox receipt, device/browser matrix, accessibility judgment, visual acceptance,
deployment, production HTTP smoke test, and owner acceptance. Leave every unrun
gate Pending.

Result: **Pending provider/deployment/human run**.
