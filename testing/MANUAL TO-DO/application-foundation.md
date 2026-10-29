# Application Foundation Manual Testing

## Scope

The informational `/` route, responsive layout, copy boundaries, keyboard focus,
and the handoff between the branded shell and future product work.

## Setup And Safety

- Record the commit or PR head SHA and tester before starting.
- Use the local environment at `http://localhost:3000` unless a specific preview
  environment is named.
- Run `npm ci`, then start one owned `npm run dev` process.
- No account, provider, personal data, or external side effect is required.

## Functional Scenarios

1. Open `/` directly and confirm the Pick-a-Date foundation page renders.
2. Confirm the product-flow link moves to the four-stage preview.
3. Confirm copy says scheduling, recommendations, and email are not connected.
4. Reload the route and confirm there is no application error or missing asset.

Result: **Pending human run**.

## Integrated Human-Interface Sweep

- Check one representative desktop width and one narrow phone width.
- Navigate all links with the keyboard and confirm visible focus.
- Check content at 200% browser zoom without loss of important information.
- Enable reduced motion and confirm navigation does not force smooth scrolling.
- Check readable contrast and that status is expressed in text, not color alone.

Result: **Pending human run**.

## Automated Baseline

`npm run check` owns lint and production build validation. It does not prove
visual quality, keyboard behavior, responsive behavior, or real-device support.

## Completion

Record pass, fail, or blocked for every scenario; attach only sanitized evidence
under `testing/artifacts/`; stop the exact development server started for the run.
