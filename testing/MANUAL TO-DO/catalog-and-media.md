# Catalog and Media Manual Testing

## Status

All scenarios are **Pending human run**.

## Catalog

1. Seed the placeholder catalog, then create/edit/archive/restore one activity and
   one place with Google Maps URL, address, note, tags, duration, and associations.
2. Create a Draft, then change/archive master records; verify the Draft snapshot
   does not change.
3. In a Draft/Active snapshot, disable a place and the final place under an
   activity; verify the latter disables the activity rather than saving an empty
   enabled activity.

## Media

1. Upload a JPEG/PNG/HEIC/WebP with orientation and EXIF metadata.
2. Verify the dashboard reports upload, processing, and ready states.
3. Inspect Convex storage: exactly six AVIF/WebP variants are published and the
   temporary source is absent.
4. Verify intrinsic dimensions/aspect ratio, auto-orientation, and EXIF removal.
5. Force an interrupted/invalid upload and confirm no partial revision becomes
   selectable and temporary files are cleaned.
6. Inspect place list vs details network behavior: card assets load first; gallery
   assets load only after details.

Result: **Pending human run**.
