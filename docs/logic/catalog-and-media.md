# Catalog and Media

## Status

Activity/place catalog and media publication are implemented. Photography,
responsive rendering, and EXIF acceptance remain human-test pending.

## Catalog

- Activities store a name, optional description/duration, suitable time tags,
  and archive timestamp.
- Places store name, address, owner note, Google Maps URL, associated activity
  IDs, suitable time tags, cover path, gallery paths, and archive timestamp.
- Google Maps URLs are restricted to HTTPS Google Maps hosts.
- Catalog archive/restore never rewrites invitation snapshots.
- A development-only starter catalog uses three local generated photographs.

## Invitation snapshots

Creating a Draft copies the selected master catalog fields into invitation-owned
activity/place options. Later master edits do not propagate. Builder subset
toggles edit only the snapshot; disabling the last place disables that activity
instead of saving an enabled activity with no places.

## Media pipeline

1. The authenticated dashboard uploads one temporary original to Convex File
   Storage.
2. An authenticated Convex Node action downloads it once and uses Sharp
   auto-orientation, keeping the processing runtime independent of the web host.
3. It writes AVIF and WebP variants for thumbnail, card, and detail purposes.
4. Convex validates format, size, dimensions, aspect ratio, uniqueness, and
   completeness before one atomic publication.
5. Successful publication deletes the temporary source; output re-encoding
   omits original EXIF. Failed publication deletes proven temporary variants and
   marks the asset failed.

Place records currently store the selected published WebP card/detail URLs. The
media asset record retains both formats for later `<picture>` expansion without
changing the publication contract.
