# Roadmap

Roadmap documents describe proposed work. They do not override the current
contracts in `docs/logic/`.

## Approved MVP locks

- [`product-brief.md`](product-brief.md): protected product promise, actors, MVP
  path, principles, and boundaries
- [`mvp-product-contract.md`](mvp-product-contract.md): success, complete owner
  and recipient journeys, activation, confirmation, and non-goals
- [`domain-model-and-lifecycle.md`](domain-model-and-lifecycle.md): entities,
  snapshots, time, lifecycle, archive, links, and concurrency
- [`owner-dashboard-and-auth.md`](owner-dashboard-and-auth.md): dashboard,
  builder, owner authorization, live editing, and operations
- [`recipient-experience.md`](recipient-experience.md): mobile public flow,
  local progress, realtime invalidation, and accessibility
- [`catalog-media-and-compatibility.md`](catalog-media-and-compatibility.md):
  catalog fields, curation warnings, archive, and image processing
- [`privacy-notifications-and-integrations.md`](privacy-notifications-and-integrations.md):
  bearer-link privacy, no tracking, email, Calendar, and Maps
- [`technical-architecture.md`](technical-architecture.md): target stack,
  application boundaries, jobs, failure behavior, and portability
- [`environment-setup.md`](environment-setup.md): local, Google Cloud, Convex,
  Resend, Vercel, and secret setup contract
- [`acceptance-criteria.md`](acceptance-criteria.md): testable auth, catalog,
  lifecycle, recipient, confirmation, email, integration, and release behavior
- [`implementation-plan.md`](implementation-plan.md): vertical slices,
  validation gates, and definition of done

These documents are approved implementation direction, not current behavior.
As each slice ships, move its durable invariants into one owning `docs/logic/`
document and add the matching `testing/MANUAL TO-DO/` guide in the same PR.
