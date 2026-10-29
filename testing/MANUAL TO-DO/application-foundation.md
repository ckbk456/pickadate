# Application Foundation Manual Testing

## Status

All scenarios are **Pending human run**. Automated `npm run check` evidence does
not prove this guide.

## Setup

- Record commit/PR head, tester, browser, device, environment, and date.
- Use Node.js 26.13.0 LTS and npm 12.2.1, then install with `npm ci`.
- Use one owned development server and its recorded HTTPS development origin.
  Keep local and Convex `SITE_URL` aligned with that origin. Never stop another
  project's server to obtain a port. Google OAuth must return to this app.
- Never paste a private invitation URL into screenshots or public artifacts.

## Scenarios

1. `/` and `/sign-in` render the English owner entry with no missing asset.
2. A missing `NEXT_PUBLIC_CONVEX_URL` produces the explicit configuration state.
3. Keyboard focus remains visible and logical at desktop and narrow widths.
4. At 200% zoom no primary control or required text is lost.
5. Reduced-motion mode removes nonessential motion without changing behavior.
6. A private route emits generic metadata, noindex, no-referrer, and no-store
   behavior without leaking names, time, activity, place, address, or images.

## Dependency-upgrade regression checks

After the October 2026 runtime and dependency refresh, repeat Google sign-in,
owner catalog CRUD, image upload, invitation activation, recipient confirmation,
realtime cancellation, and local-choice persistence. Check current iOS Safari
and Android Chrome. Record provider delivery separately; passing source checks
does not prove any of these browser or provider scenarios.

Result: **Pending human run**.
