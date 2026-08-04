# Catalog, Media, and Compatibility

## Status

Implemented in source. This document preserves the approved catalog, curation,
media, and compatibility design; `docs/logic/` owns current behavior.

## Activity catalog

An activity has:

- English dashboard name and Vietnamese recipient label where needed;
- optional description;
- optional expected duration in minutes;
- zero or more suitable time-of-day tags;
- associated places; and
- archive metadata.

Duration is guidance. It warns when an offered slot is shorter than the expected
duration but does not create itinerary segments in the MVP.

## Place catalog

A place has:

- name;
- address;
- validated Google Maps URL;
- optional owner note shown to recipients;
- associated activities;
- suitable time-of-day tags;
- one cover media revision;
- an ordered gallery of media revisions; and
- archive metadata.

The complete catalog is visible only in the owner dashboard. A recipient sees
only place snapshots enabled for their invitation.

Time-of-day tags are curation hints, not verified business hours. The UI must not
claim a place is open or available without a real data source, which is outside
MVP scope.

## Compatibility rules

The builder computes warnings for:

- activity duration longer than an offered slot;
- activity time tags that do not match a slot label;
- place time tags that do not match a slot label; and
- an activity with no enabled compatible place.

Missing duration or tags mean unknown, not incompatible. Warnings are private to
the owner. The owner may override them per invitation slot/activity or
slot/place pairing and must explicitly acknowledge each override before
activation. Recipients see only choices the owner ultimately enabled, without
warning language or implied venue guarantees.

## Archive behavior

Activities and places are archive-only in the MVP. Archiving removes a record
from new-picker defaults but does not change an invitation snapshot or break a
confirmed card. Restoring an archived catalog item is allowed.

No catalog permanent-delete UI is shipped in MVP. Unreferenced media cleanup is
an internal retention operation, not catalog deletion.

## Image input and publication

Development uses clearly marked placeholder photography. Production catalog
media is owner-supplied photography.

Publication is atomic:

1. upload to temporary private storage;
2. validate file type, dimensions, and configured size limit;
3. decode and normalize orientation;
4. strip EXIF and other unnecessary metadata;
5. create the complete responsive variant set;
6. publish one immutable media revision only when all required variants exist;
7. delete the raw upload; and
8. retain prior published revisions while referenced by an invitation snapshot.

If processing fails, no partial revision becomes selectable. Replacing a photo
creates a new immutable revision. Existing snapshots continue referencing the
old revision.

## Output contract

- AVIF is preferred with WebP fallback through a semantic responsive image
  structure.
- Generate bounded thumbnail, card, and detail/gallery sizes rather than
  serving one full-size asset everywhere.
- Record intrinsic dimensions to prevent layout shift.
- Load a visible cover with appropriate priority; lazy-load gallery images and
  do not fetch detail-sized assets before they are needed.
- Do not retain the camera original. The owner must re-upload their external
  original if a future format or crop requires reprocessing.

Only garbage-collect a published media revision after proving that no catalog
record, invitation snapshot, confirmation, or pending job references it.

## Portability boundary

Convex File Storage owns MVP media. Application code owns the media manifest and
variant semantics so a later commercial migration can copy objects to another
storage provider without changing domain records or public components.
