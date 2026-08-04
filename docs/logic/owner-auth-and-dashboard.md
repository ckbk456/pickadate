# Owner Authentication and Dashboard

## Status

Implemented in source and synchronized to the named Convex development
deployment. Real Google OAuth acceptance is pending a human run.

## Authorization

- Convex Auth uses Google identity scopes only. The app never requests Google
  Calendar scopes.
- Every protected Convex function calls `assertOwner()`, which requires an
  authenticated identity, a verified email, and normalized equality with
  `OWNER_EMAIL`.
- Next.js proxy protection improves navigation but is not the authorization
  boundary. The dashboard separately distinguishes signed out, unverified,
  misconfigured, and forbidden identities.
- Only one owner exists. There is no registration, role management, or owner
  invitation flow.

## Dashboard behavior

- The English dashboard is desktop-first with a responsive compact/mobile
  navigation.
- Invitations are grouped into in-progress, upcoming, and history. Archive is a
  separate attribute and never a lifecycle status.
- The six-step invitation builder autosaves recipient copy, exact time slots,
  activity/place subsets, optional modules, preview, and readiness state.
- The protected preview renders the real recipient flow in a phone-sized frame
  and uses an inert confirmation callback.
- Active invitations expose copy/share, link rotation, cancellation, and live
  editing. Confirmed invitations are read-only except cancellation.
- Expired invitations can explicitly return to Draft. Eligible records can be
  archived/restored. Permanent erasure requires the exact phrase
  `ERASE INVITATION` plus a browser confirmation.

## Failure behavior

- Autosave operations serialize against the latest known invitation revision.
  Newer local edits remain dirty until their own snapshot is saved.
- Stale revisions fail closed instead of overwriting newer state.
- Provider delivery failure is displayed independently from confirmation state.
