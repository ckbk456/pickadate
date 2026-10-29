# Application Foundation Manual Testing

## Status

All scenarios are **Pending human run**. Automated `npm run check` evidence does
not prove this guide.

## Setup

- Record commit/PR head, tester, browser, device, environment, and date.
- Use one owned development server. Port 3000 is the configured OAuth origin;
  if another project owns it, stop that process yourself or update both local
  `SITE_URL` and the Google OAuth origin before testing.
- Never paste a private invitation URL into screenshots or public artifacts.

## Scenarios

1. `/` and `/sign-in` render the English owner entry with no missing asset.
2. A missing `NEXT_PUBLIC_CONVEX_URL` produces the explicit configuration state.
3. Keyboard focus remains visible and logical at desktop and narrow widths.
4. At 200% zoom no primary control or required text is lost.
5. Reduced-motion mode removes nonessential motion without changing behavior.
6. A private route emits generic metadata, noindex, no-referrer, and no-store
   behavior without leaking names, time, activity, place, address, or images.

Result: **Pending human run**.
