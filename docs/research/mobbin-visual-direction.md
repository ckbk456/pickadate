# Mobbin Visual-Direction Research

## Status

Research completed 2026-08-05. References were inspected visually through the
Mobbin integration. They support an original Pick-a-Date direction; they are not
templates to copy and do not represent shipped behavior.

## Question

Which established mobile and dashboard patterns best support a private,
one-recipient date invitation that feels personal and playful without becoming
childish, pressuring, or visually confused with a marketplace?

## Recipient-flow evidence

- [Zocdoc's booking flow](https://mobbin.com/flows/fcd6461e-af19-4ca9-9864-8b21c286888c)
  groups available times into large, legible choices and separates selection,
  review, and confirmation.
- [IKEA's appointment flow](https://mobbin.com/flows/64df5892-fc18-4edb-ba02-8b365b63bebe)
  states timezone near time choices and turns success into a durable booking
  receipt with complete details.
- [Square Go's booking flow](https://mobbin.com/flows/7ab7c8e8-808e-475e-a543-1d2314dd47da)
  makes the final review deliberate and exposes Add to Calendar after booking;
  its held-time countdown is intentionally rejected for this product.
- [Expedia's activity search](https://mobbin.com/flows/df23f41b-38a8-45cd-a4b1-932a3737a574)
  and [Peerspace's board detail](https://mobbin.com/flows/615ef85e-7a5a-4bd9-8678-9820c9245e63)
  validate image-led vertical comparison, while their ratings, price, filters,
  favorites, and marketplace density are unnecessary here.
- [Booking.com's attraction photos](https://mobbin.com/flows/7ae19730-c635-4423-b5e6-640d76f79bd5)
  and [Swiggy's gallery flow](https://mobbin.com/flows/f35fbfd3-5ccf-45f0-4598-a1b9-da72038f8eb7)
  separate focused photo exploration from the underlying selection context.

## Dashboard evidence

- [Upwork's guided creation](https://mobbin.com/flows/0c0b3422-ee47-4889-b0f0-93fff6d38aa3)
  uses a persistent step rail, explicit save/continue behavior, revisitable
  completed steps, and preview.
- [Zillow's review screen](https://mobbin.com/screens/8743e2d5-d864-47c4-b7ec-43bd57df810d)
  groups readiness issues and puts Edit beside the exact incomplete section.
- [GoDaddy's preview flow](https://mobbin.com/flows/7924eb00-3622-46af-bef8-72ffff3d0fe6)
  separates live preview from the readiness checklist instead of hiding both in
  one final error state.
- Square's [catalog list](https://mobbin.com/flows/8ed94467-945e-4a34-9534-16f8b958437e),
  [archive flow](https://mobbin.com/flows/ff4ee601-a888-4ccd-bd97-e0a9eb94a78e),
  and [item editor](https://mobbin.com/flows/704c683f-a08f-4344-a5d5-3c7ed8d2356d)
  make thumbnail scanning, recoverable archive semantics, consequence copy, and
  focused full-page editing clear.
- [Runway's asset library](https://mobbin.com/flows/e2919d27-3f8b-4cde-93d6-dfb6c53196dc)
  shows efficient visual scanning, but folders, view toggles, and deep media
  taxonomy would be excess infrastructure for this catalog.

## Tone evidence

- [Bevel's greeting](https://mobbin.com/screens/a5169edf-768f-440f-a785-d257651e4d6b)
  demonstrates quiet personalization, restrained decoration, and one confident
  action.
- [Headway's greeting](https://mobbin.com/screens/8485651d-3131-408d-920c-8204f784393c)
  uses one accent-colored name and one playful element rather than decorating
  every surface.
- [Commons' welcome screen](https://mobbin.com/screens/fabf6cee-e5b8-464d-af9b-9fe7aeb034f7)
  supports an authored editorial voice through strong typography, whitespace,
  and one tactile visual.
- [Lugg's confirmation](https://mobbin.com/screens/d2465ca8-a428-4152-bfa5-fe037efab0b6)
  gives completion an emotional beat before practical detail, while
  [Grab's confirmation](https://mobbin.com/screens/6184757f-a516-462d-bf13-7a43770d25a8)
  provides a strong venue and metadata hierarchy.
- [(Not Boring) Camera's colorways](https://mobbin.com/screens/f5092866-ab68-4479-ace6-8ee348e7c2c5)
  and [lululemon's set builder](https://mobbin.com/screens/144c55b4-6658-41bf-9865-2795d39fc383)
  make colors tangible through named swatches and selection rings rather than
  tiny color-only dots.

## Recommended Pick-a-Date direction

### Invitation

- Warm neutral canvas, mature display typography, one confident accent color,
  and owner photography as the dominant expressive material.
- Personalized opening with one short sentence and one obvious action.
- Calm, progressive choice screens: date heading, friendly period label, exact
  range, then generous tap targets.
- Activity-first filtering followed by image-led vertical place cards. Place
  details use a full-screen mobile sheet with a stable selection action.
- Review is visually distinct from confirmation. Confirmation begins with one
  short satisfying moment, then becomes a practical durable date card with an
  immediately visible Calendar action.
- Outfit colors use large named swatches, a non-color selection indicator, and
  a secondary **Choose for me** action that resolves into a normal selection.

### Dashboard

- Workmanlike and quieter than the invitation, but share typography, color, and
  image treatment so they feel like one product.
- A compact persistent six-step builder rail, autosave state, direct preview,
  and readiness issues with local Edit links.
- A sticky phone preview or side panel at desktop widths; do not make preview a
  state-losing modal.
- Thumbnail-forward catalog lists with simple Active/Archived filters and
  explicit archive actions. No standalone media library, folders, pricing,
  inventory, or marketplace taxonomy.

## Rejected patterns

- Hearts, cupid/rose/kiss motifs, wedding scripts, or full red/pink gradients.
- Emoji/stickers on every step, rainbow controls, bubbly nested cards, persistent
  confetti, or game-like progress rewards.
- Countdowns, scarcity, pleading copy, or any guilt-producing confirmation.
- Full appointment calendars for a small curated set of slots.
- Marketplace ratings, discounts, favorites, maps, filters, or price comparison.
- Carousels as the only discovery mechanism or photo viewing that implicitly
  selects a place.
- Dense business-form styling carried from the dashboard into the invitation.

## Selected direction

Khang selected the third generated direction on 2026-08-05 and requested a
warmer pastel palette in place of its electric blue. The revised mobile place
selection screen is the implementation reference:

- [`assets/pick-a-date-recipient-visual-target.png`](assets/pick-a-date-recipient-visual-target.png)
- source pixels: 853 x 1844, representing a 390 x 844 mobile CSS viewport at
  approximately 2.19x density
- structural signature: personalized color-block masthead, vertical progress
  rail, bold exact-time row, image-led vertical place choices, structural
  selected state, and a reachable bottom action
- palette signature: warm cream/oat, sun-washed terracotta, muted sage, deep
  aubergine/cocoa, pale butter, and restrained dusty lavender

The image is a direction, not a literal component specification. Production UI
must preserve its hierarchy and tone while using semantic controls, responsive
content, real data, accessible contrast, and the approved recipient flow.
