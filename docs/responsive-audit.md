# Responsive audit — 4 November 2026

## Scope

Reviewed the route inventory (60 page entry points), shared layouts, navigation,
dialogs, tables, cards, and fixed-width/grid patterns across public, authentication,
checkout, documentation, and resort management code. This is a source audit with
browser checks of the accessible pages listed below, not a claim that every route
has been exercised with production data.

## Changes

- Landing header: added a mobile/tablet menu, removed the mobile logo spacer,
  reduced small-screen action spacing, and delayed desktop navigation until it fits.
- Mobile menu: links to Alrio sections, closes after navigation, and keeps sign-in
  and reservations accessible. Reservation links also work away from the homepage.
- Resort header/sidebar: added a mobile navigation sheet using the existing
  permission-filtered sidebar. Reduced small-screen header and content spacing.
- Landing page: reduced mobile hero typography, allowed hero actions to wrap,
  reduced booking-section gutters, stacked the inventory heading/actions, and
  added missing mobile gutters to the lower content and room-detail header.
- Search controls: mobile panels stay within the viewport below the fixed header;
  explicit close buttons and Escape dismissal are available. Desktop panels retain
  their above/below placement. Scroll heights account for available viewport space.
- Search calendar: smaller cells on narrow screens, stacked months, and weekday
  alignment. Flexible-date content retains its natural height and can scroll.
- Shared tables: toolbars wrap and wide tables scroll locally instead of compressing
  all columns or being clipped by the page.
- Shared dialogs/popovers/cards: bounded dialog height, scrollable dialog content,
  bounded popover width, and shrinkable cards/KPI values.
- Checkout and marketplace: delayed wide sidebar layouts until larger breakpoints.
- Receipts/exports: search controls shrink and wide row layouts activate at a
  breakpoint that accommodates the resort sidebar and summary panel.
- HR/reservation calendars: wide weekly/monthly grids scroll inside their panels.

## Browser checks

Measured document scroll width against document client width using the running
application. Browser scrollbar width is excluded from these comparisons.

| Page | Viewport widths checked | Result |
| --- | --- | --- |
| Home | 320, 375, 768, 1024, 1440 px | No horizontal page overflow |
| Gallery | 320, 768, 1440 px | No horizontal page overflow |
| Search (empty inventory) | 320, 768, 1440 px | No horizontal page overflow |
| Sign in | 320, 768, 1440 px | No horizontal page overflow |
| Sign up | 320, 768, 1440 px | No horizontal page overflow |

Also opened the mobile navigation, navigated to the booking section, and opened
the mobile date panel. Confirmed the panel fits the viewport. Checked desktop
footer dropdown positioning and added an available-height limit after finding
that a tall panel could extend under the fixed header.

## Verification and remaining limits

- Targeted ESLint checks passed without errors. Existing unused-variable warnings
  remain in the export and HR modules.
- Diff whitespace checks passed.
- The full TypeScript check fails on existing schema migration mismatches, including
  removed static roles, businessName, subscription fields, and legacy staff fields.
  A clean production build cannot currently be certified.
- Checkout/documentation/partner and protected-route requests timed out during
  development compilation, so those layouts were reviewed in source rather than
  reported as successfully browser-tested.
- Protected resort screens require a working authenticated session and configured
  resort data for full interaction and populated-table verification. Their mobile
  navigation and shared layout changes still require that end-to-end check.
- Mobile Safari, real touch devices, and virtual-keyboard behavior have not been
  tested. They should be included before production release.
