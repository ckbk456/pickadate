# Application Foundation

## Status

Current and implemented.

## Runtime and structure

- The repository is a Next.js 16 App Router application using React 19 and
  JavaScript.
- `src/app/layout.js` owns root metadata and document structure.
- `src/app/page.js` owns the `/` route.
- `src/app/globals.css` owns the current visual foundation and responsive rules.
- Node.js 24.17.0 and npm are the supported local/CI baseline.

## Current behavior

The `/` route renders a responsive, informational Pick-a-Date foundation page.
It previews four planned product stages: time selection, activity selection,
place suggestions, and shared confirmation. The page has no form controls and
does not claim those capabilities are available.

## Invariants and boundaries

- The initial page must remain usable at narrow and desktop widths.
- Navigation must remain keyboard reachable with visible focus.
- Reduced-motion preferences must not force smooth scrolling or transitions.
- Product-direction copy must distinguish planned features from implemented
  behavior.
- There is no persistence, authentication, invitation link, availability model,
  recommendation engine, email delivery, analytics, or deployment contract.
- Secrets and `NEXT_PUBLIC_*` configuration must not be introduced until a real
  integration has an explicit security and environment contract.

## Failure behavior

There are no runtime provider calls. Build or render failures surface through
Next.js; there is no application-specific error handling yet.
