# Recipient Experience

## Status

Approved implementation contract; not yet shipped. This document owns the
public invitation flow, final date card, language, responsive behavior, and
recipient-side persistence.

## Route and entry behavior

The canonical private route contains the UUIDv4 bearer credential and may
contain a decorative slug. Server metadata is always generic Vietnamese brand
copy such as **Bạn có một lời mời**. It never includes recipient name, message,
time, activity, place, address, or photography.

The page sends `noindex` directives and a `Referrer-Policy: no-referrer` header.
Preview crawlers may perform read-only GET requests but can never mutate,
reserve, or confirm an invitation.

## Mobile-first flow

1. **Introduction** — recipient display name, optional personal message, and a
   primary **Lên kế hoạch buổi hẹn** action.
2. **Time** — exact localized date/time grouped or decorated by the owner's
   friendly morning/afternoon/night/late labels.
3. **Activity** — one clear selectable card per enabled activity.
4. **Place** — vertical place cards filtered by activity; a compact grid is
   allowed at wider breakpoints. There is no carousel or view toggle in MVP.
5. **Optional details** — outfit color and transport only when enabled.
6. **Confirmation copy** — optional recipient email with explicit purpose.
7. **Review** — one complete summary and one deliberate confirm action.
8. **Date card** — durable read-only plan and Google Calendar action.

Selections persist across steps, place-detail open/close, reloads, and temporary
network failure on the same device. They do not sync across devices.

## Place details

Selecting **View details** opens an accessible full-screen sheet on narrow
screens and a dialog on wider screens. It contains the place cover, lazy-loaded
gallery, name, address, time-of-day tags, optional owner note, and a Google Maps
link. Closing it restores focus and scroll position and never clears progress.

The Google Maps link opens only the stored Maps URL. It does not append the
invitation URL or recipient information.

## Optional modules

### Outfit color

The recipient chooses from presets enabled on that invitation. **Choose for me**
selects and reveals one enabled preset at random. The recipient may reroll or
choose manually before confirmation. Randomness is playful UI state, not a
security or fairness mechanism.

### Transport

Choices are semantically:

- Pick me up.
- I'll meet you there.
- Let's decide together.

The application never asks for or stores a pickup address. Coordination remains
person-to-person.

## Recipient email

Email is optional and labeled **Email me a confirmation** in Vietnamese. It is
not required for confirmation or the Google Calendar button. It remains local
until the recipient presses Confirm; unfinished email input is never transmitted.

## Realtime invalidation

An Active invitation may change while open. The UI subscribes to a minimal
public projection and reconciles by stable option ID:

- preserve every still-valid choice;
- clear only a removed or newly invalid dependent choice;
- announce the change accessibly in Vietnamese; and
- prevent review/confirmation until the new state is valid.

Past slots disappear at their start instant even if the page has been open for
hours. If no slots remain, the flow becomes an ended state.

## Confirmed and exceptional states

After confirmation, public data is reduced to the finalized slot, one plan
item, enabled optional answers, and necessary Calendar/Maps data. Unused options
are no longer public.

- **Confirmed:** celebratory but restrained read-only date card.
- **Cancelled after confirmation:** cancellation banner plus former plan for
  context; calendar action is removed or clearly marked obsolete.
- **Expired/cancelled before confirmation:** generic ended message without
  unused invitation details.
- **Revoked/deleted/draft/unknown:** the same generic unavailable state.
- **Offline/transient failure:** preserve local choices and offer retry.

## Accessibility and browser contract

- Semantic form controls, visible focus, and full keyboard operation.
- Focus trapping and restoration for dialog/sheet behavior.
- Status and selection never depend on color alone.
- Minimum comfortable touch targets and no hover-only information.
- Logical heading/error announcement order and zoom-safe layouts.
- Respect reduced motion; confirmation must not rely on animation.
- Target current iOS Safari, Android Chrome, and common messaging-app in-app
  browsers. Dashboard browser support may be narrower, but public confirmation
  cannot require a desktop browser.

