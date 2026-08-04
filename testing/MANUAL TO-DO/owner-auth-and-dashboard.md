# Owner Auth and Dashboard Manual Testing

## Status

All scenarios are **Pending human/provider run**.

## Google OAuth

1. Sign in with the allowlisted verified Google account and open `/dashboard`.
2. Sign out, use a different Google account, and confirm the owner-only state is
   rejected both in navigation and a direct protected Convex call.
3. Confirm the Google consent screen requests identity only and no Calendar
   permission.
4. Verify missing/mismatched `OWNER_EMAIL` produces a distinct actionable state.

## Dashboard

1. Inspect desktop navigation, compact breakpoint, and mobile bottom navigation.
2. Edit display name and reload; fixed timezone remains Asia/Ho_Chi_Minh.
3. Build a Draft through all six steps and verify quiet Saving/Saved/error states.
4. Open the protected preview; interact through choices and verify it cannot
   activate, confirm, email, or call a provider.
5. Activate, copy/share, live edit, rotate, cancel, reopen Expired, archive,
   restore, and guarded erase using disposable data.
6. Confirm Active/upcoming/history grouping and that Archived is never a status.

Result: **Pending human/provider run**.
