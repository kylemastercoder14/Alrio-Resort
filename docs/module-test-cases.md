# Alrio Private Resort Test Cases

This is the current manual functional-regression checklist for the Alrio Private Resort application. It is a test plan, not evidence that a feature has passed. Record the result, date, and notes for every run.

**Status values:** `Not run`, `In Progress`, `Passed`, `Failed`, `Blocked`, or `N/A`
**Date format:** `YYYY-MM-DD`

## Current product scope

- This is a dedicated system for **Alrio Private Resort**, not a marketplace or multi-tenant SaaS product.
- A reservation reserves the **whole resort** for its date range. Rooms, services, amenities, and packages are inclusion/catalog records; they are not separately bookable inventory.
- Guest accounts and staff accounts have separate access flows. Guest sign-in returns to `/`; staff sign-in returns to `/resort/dashboard`.
- Payments use **PayMongo**. Polar subscriptions, plans, trials, and onboarding are out of scope.
- New guest registration goes to the guest account/profile flow. Staff accounts are created through a staff invitation.

## Suggested test data

Use an administrator, a limited-permission staff member, a suspended staff member, an active guest, a disabled guest, a registered guest, a manual walk-in guest, an overlapping reservation, an invoice, a finance entry with receipt, and PayMongo **test-mode** credentials. Do not use production keys or real guest data.

## Public website and guest experience

| Feature / test case | Status | Date tested | Remarks / notes |
| --- | --- | --- | --- |
| Landing page — hero, sticky/scrolled header, availability selector, amenities, gallery, activities, testimonials, contact section, map, and footer render without errors. | Passed | 2026-10-03 | Core landing sections and navigation rendered successfully. |
| Availability selector — stay type, dates/flexible dates, and guest selectors open above surrounding content, scroll correctly, preserve padding, and work on narrow screens. | Passed | 2026-10-04 | Selector overlays, scroll areas, and fit-content panels behaved correctly in desktop QA. |
| Dedicated-resort messaging — no destination/partner/marketplace wording remains in primary guest booking paths. | Passed | 2026-10-04 | Primary booking copy consistently refers to Alrio Private Resort. |
| Gallery and testimonials — supplied content, carousel controls, image layout, and responsive behavior work without clipping or horizontal overflow. | Passed | 2026-10-05 | Gallery layout, View All control, and testimonial navigation rendered without clipping. |
| Contact form — validation, consent, success/error toast, and inquiry persistence work; the embedded Alrio map points to the resort. | Passed | 2026-10-06 | Form validation and toast feedback worked; the supplied Google Maps embed loaded. |
| Notifications — guest notification page loads a correct empty state and later displays only the signed-in guest's notifications. | Passed | 2026-10-06 | Signed-in guest saw the expected empty-state view with no unrelated data. |
| Responsive smoke test — primary public pages and controls are usable on mobile, tablet, and desktop. | In Progress | 2026-10-31 | Desktop coverage completed; final device and breakpoint pass remains. |

## Authentication, recovery, and invitations

| Feature / test case | Status | Date tested | Remarks / notes |
| --- | --- | --- | --- |
| Guest sign-up — valid guest registration creates one guest account without a confirm-password field and redirects to `/account`. | Passed | 2026-10-07 | Guest account was created and redirected to the profile page. |
| Guest sign-up validation — duplicate email, invalid email, weak/invalid password, and server errors show clear react-hot-toast messages without leaking sensitive data. | Passed | 2026-10-07 | Invalid and duplicate inputs produced safe top-center toast feedback. |
| Guest sign-in — valid guest credentials redirect to `/`; invalid email and incorrect password show the intended specific, safe feedback. | Passed | 2026-10-08 | Guest sign-in returned to the public home page; invalid credentials were handled safely. |
| Staff invitation acceptance — valid invitation token creates/links a staff profile with the invited role and redirects to `/resort/dashboard`. | Passed | 2026-10-08 | Invited staff completed registration and reached the resort dashboard. |
| Staff sign-in routing — active staff sign in to `/resort/dashboard`; guest accounts do not receive staff access. | Passed | 2026-10-09 | Staff and guest redirects followed their separate access paths. |
| Invitation safety — expired, revoked, reused, malformed, or email-mismatched tokens cannot create staff access. | Passed | 2026-10-09 | Invalid invitation states were rejected without creating staff access. |
| Password recovery — forgot-password and reset-password pages use the shared auth UI; valid reset works and invalid/expired tokens are safe. | Passed | 2026-10-10 | Recovery UI and reset validation completed successfully. |
| Disabled/suspended accounts — disabled guests and suspended staff cannot authenticate or access protected routes, and receive an appropriate state. | Passed | 2026-10-10 | Disabled guest and suspended staff protections were enforced. |
| Sign out/session — sign out clears access; protected routes redirect correctly after logout or expiry. | Passed | 2026-10-11 | Session cleanup and protected-route redirects worked as expected. |

## Guest account and profile

| Feature / test case | Status | Date tested | Remarks / notes |
| --- | --- | --- | --- |
| Guest account page — profile layout, Alrio-specific content, editable profile prompts, and dialog layering/focus behavior are correct. | Passed | 2026-10-12 | Account page content and modal layering matched the guest profile design. |
| Avatar upload — UploadThing upload persists the image in the database, survives refresh, and updates the landing header/avatar immediately or after query invalidation. | Passed | 2026-10-12 | Uploaded avatar persisted and refreshed correctly in the account and header. |
| Avatar fallback — initials use the first character of first and last name with the intended zinc background when no image exists. | Passed | 2026-10-13 | Fallback initials and zinc styling rendered for a profile without an image. |
| Profile preferences — dialogs enforce their character limits, show remaining characters, save correctly, and preserve values after refresh. | Passed | 2026-10-13 | Dialog edits saved, retained character limits, and persisted after refresh. |
| Preferred time — the select control matches the normal input sizing and persists the selected value. | Passed | 2026-10-14 | Preferred-time select matched the input height and saved correctly. |
| Location — province and city cascading choices load from PSGC, pin the selected city on OpenStreetMap, and store no unnecessary barangay/exact-address data. | Passed | 2026-10-14 | Province/city cascade and OpenStreetMap pin were verified with saved location data. |
| Guest account authorization — a guest can only read or update their own profile and uploaded assets. | Passed | 2026-10-15 | Profile requests were restricted to the authenticated guest. |

## Staff access, roles, and departments

| Feature / test case | Status | Date tested | Remarks / notes |
| --- | --- | --- | --- |
| Roles — administrator can create, edit, and delete dynamic roles with permissions; duplicate names show a concise react-hot-toast error. | Passed | 2026-10-15 | Dynamic role CRUD and duplicate-name feedback were verified. |
| Role enforcement — a limited staff role cannot access or mutate unauthorized routes/procedures by changing the URL or request. | Passed | 2026-10-16 | Permission guards blocked limited staff from restricted routes and mutations. |
| Staff users — administrator can invite, resend, revoke, suspend, and reactivate staff; badges accurately show Invited, Active, and Suspended states. | Passed | 2026-10-16 | Staff lifecycle actions updated status and table badges correctly. |
| Invitation actions — pending invitations show no fabricated staff activity; resend/revoke actions display a visible loading state and refresh the table. | Passed | 2026-10-17 | Pending-invitation actions displayed progress and refreshed state without fake activity. |
| Staff activity logs — each staff member sees only their own recorded sign-in, sign-out, and authorized actions in the timeline; timeline connector aligns with all nodes. | Passed | 2026-10-17 | Per-user activity timeline recorded session and authorized action events. |
| Staff profile images — user table, header, and account settings display the saved staff avatar with initials fallback. | Passed | 2026-10-18 | Staff avatar persistence and initials fallback were confirmed across admin views. |
| Staff account settings — staff/admin account page follows the resort admin visual system and allows only permitted profile changes. | Passed | 2026-10-18 | Resort account settings used the shared admin layout and respected permissions. |
| Departments — create, edit, archive, restore, and list departments; archived status uses destructive styling and restore requires confirmation. | Passed | 2026-10-19 | Department archive/restore confirmation and destructive badge behavior worked. |
| Department staffing — assign staff and one department head; routing tooltip explains its purpose and assignments persist after refresh. | Passed | 2026-10-19 | Department head assignment, member counts, and routing tooltip were verified. |

## Guest management

| Feature / test case | Status | Date tested | Remarks / notes |
| --- | --- | --- | --- |
| Guests page — standalone parent navigation item, KPI cards, search, pagination, and table show registered guest information accurately. | Passed | 2026-10-20 | Guests module loaded as a top-level page with expected KPIs and table controls. |
| Guest status — administrator can disable and reactivate a guest with confirmation; disabled state is visibly destructive and blocks guest access. | Passed | 2026-10-20 | Disable/reactivate confirmation updated account status and access correctly. |
| Guest details — guest avatar, contact, location, profile completeness, reservation count, next stay, and registration date match stored data. | Passed | 2026-10-21 | Displayed guest fields matched saved account and reservation information. |
| Guest access control — non-authorized staff cannot alter guest account status or expose guest data outside permitted screens. | Passed | 2026-10-21 | Guest-management mutations were blocked for staff without permission. |

## Exclusive whole-resort reservations

| Feature / test case | Status | Date tested | Remarks / notes |
| --- | --- | --- | --- |
| Create booking — staff can select a registered guest or manually enter a walk-in guest; selected guest details populate correctly. | Passed | 2026-10-22 | Registered and manual guest booking paths populated and saved correctly. |
| Whole-resort inventory — booking form reserves `Whole Alrio Private Resort`, contains no room-selection requirement, and clearly states all rooms/facilities are included. | Passed | 2026-10-22 | Booking form consistently used the exclusive whole-resort inventory model. |
| Date availability — checkout must be after check-in; overlapping non-cancelled whole-resort reservations are rejected; cancelled bookings no longer block dates. | Passed | 2026-10-23 | Date validation and overlap protection were confirmed with test reservations. |
| Booking summary — nights, guest counts, resort total, deposit, balance due, and internal notes remain correct after save and refresh. | Passed | 2026-10-23 | Summary amounts, notes, and balance persisted after booking save. |
| Calendar — each booking appears as one connected date range; the event card has a black left border, status dot/label matches the legend, and colors distinguish all reservation statuses. | Passed | 2026-10-24 | Connected range events, status dots, and legend colors matched the selected reservation state. |
| Calendar sheet — opening an event shows the selected booking, not a create-booking call to action; changing status and payment does not unexpectedly close the sheet. | Passed | 2026-10-24 | Booking sheet remained open during status and payment updates. |
| Manual payments — staff can record no payment, a deposit/partial payment, or a full payment; amounts, balance, payment state, and activity history reconcile. | Passed | 2026-10-25 | Deposit and full-payment scenarios updated amounts, balance, and activity correctly. |
| Reservation lifecycle — Pending, Confirmed, Checked in, Checked out, and Canceled transitions are validated, logged, and reflected in calendar/KPIs. | Passed | 2026-10-25 | Status transitions were reflected in calendar cards and booking activity. |
| Reservation authorization — only staff with reservation permissions can create, edit status, or record payments. | Passed | 2026-10-26 | Reservation mutations were protected by the expected staff permissions. |

## Resort inclusions and services catalog

| Feature / test case | Status | Date tested | Remarks / notes |
| --- | --- | --- | --- |
| Rooms — list, create, edit, status, capacity, images, and inclusion details persist; rooms are catalog/inclusion data rather than individually bookable inventory. | Passed | 2026-10-26 | Room records and images persisted as resort inclusion/catalog data. |
| Services offered — create, edit, activate/deactivate, provider, price, billing type, duration, and internal notes persist without horizontal table overflow. | Passed | 2026-10-27 | Service details, status changes, and truncation behavior were verified. |
| Amenities — seeded amenities have accurate guest descriptions and internal notes; create/edit/activate/deactivate/sort behavior persists. | Passed | 2026-10-27 | Seeded amenity copy and management states were reviewed and saved. |
| Packages — table uses the shared list pattern; package inclusions, price, status, visibility, and descriptions persist. | Passed | 2026-10-28 | Package rows followed the shared table pattern and retained saved details. |
| Guest-facing consistency — published rooms, services, amenities, and packages appear as Alrio inclusions/content where intended and do not imply separate room checkout. | Passed | 2026-10-28 | Public content presented catalog records as inclusions, not individual inventory. |

## Invoices, PayMongo, and reminders

| Feature / test case | Status | Date tested | Remarks / notes |
| --- | --- | --- | --- |
| Invoice list — KPIs, filters, search, pagination, totals, balances, and statuses match resort-scoped data. | Passed | 2026-10-28 | Invoice KPIs, search, filters, and balances matched scoped test data. |
| Create invoice — create from valid reservation/folio charges or valid manual line items; code, subtotal, tax, total, balance, and guest linkage calculate once. | Passed | 2026-10-28 | Invoice creation calculated and stored expected line-item totals. |
| Invoice lifecycle — authorized draft/sent/paid/overdue/void transitions update balances and activity without duplicate finance records. | Passed | 2026-10-29 | Invoice state changes updated balances and activity as expected. |
| Public invoice — tokenized invoice page exposes only its intended invoice, has correct totals/status, and safely rejects invalid/foreign tokens. | Passed | 2026-10-29 | Public token page showed only the linked invoice and rejected invalid tokens. |
| PayMongo checkout — invoice/reservation payment starts a PayMongo checkout with the expected amount/currency/reference and returns to success or canceled pages safely. | Passed | 2026-10-30 | Test checkout created the expected PayMongo session and return path. |
| PayMongo webhook — `POST /api/paymongo/webhook` verifies the signature, accepts `checkout_session.payment.paid`, is idempotent, and settles only the linked reservation/invoice. | Passed | 2026-10-30 | Signed payment webhook settled the linked record once in test mode. |
| QR Ph — when QR Ph is enabled for the PayMongo account, supported checkout/payment events settle the same payment exactly once. | In Progress | 2026-10-31 | Awaiting QR Ph test configuration and end-to-end settlement verification. |
| Payment reconciliation — a successful webhook/payment marks the correct invoice/reservation paid or partially paid, records method/reference, and updates finance exactly once. | Passed | 2026-10-30 | Payment method, reference, balances, and finance linkage reconciled once. |
| Payment reminders — manual reminders and authorized scheduled processing respect cadence/pause state, send only eligible unpaid invoices, and record outcome/error details. | Passed | 2026-10-31 | Reminder eligibility, pause state, and audit feedback were verified. |

## Finance

| Feature / test case | Status | Date tested | Remarks / notes |
| --- | --- | --- | --- |
| Revenue and expenses — create, edit, delete, categorize, assign department, set Pending/Cleared, and attach a receipt; list totals persist after refresh. | Passed | 2026-10-28 | Finance entry CRUD, status, department, and receipt metadata persisted. |
| Invoice/payment linkage — paid invoice or reservation payments create the expected finance entry once and are not double-counted as manual revenue. | Passed | 2026-10-29 | Linked payments created a single finance result without duplicate revenue. |
| Cash flow — inflow, outflow, net cash flow, trends, and period filters reconcile with cleared finance data and linked payments. | Passed | 2026-10-29 | Cash-flow summaries and period filters matched cleared test entries. |
| Money status — cash, bank, e-wallet, and petty-cash balances classify entries correctly; reconciliation produces a traceable adjustment. | Passed | 2026-10-30 | Account classifications and reconciliation adjustment trail were verified. |
| Receipts — receipt list/search/filter/review/pagination/view behavior works and each file remains restricted to its finance entry/resort. | Passed | 2026-10-30 | Receipt filters and attachment access were scoped to the correct finance records. |
| Exports — CSV, PDF, TXT, and XLSX exports honor selected period/data scope; download and failed-export retry work without duplicate or foreign records. | Passed | 2026-10-31 | Export format, period, download, and retry states were checked with test data. |
| Finance permissions — unauthorized staff cannot view, export, reconcile, or mutate finance data through UI or direct requests. | In Progress | 2026-10-31 | Final limited-role API and export/reconciliation denial pass remains. |

## Operations, HR, analytics, and platform safety

| Feature / test case | Status | Date tested | Remarks / notes |
| --- | --- | --- | --- |
| Reception — find reservation/guest, check in/out, manage folio charges, record payment, create requests, and save shift notes. | Passed | 2026-10-22 | Reception workflow and reservation state updates completed successfully. |
| Housekeeping, maintenance, laundry, and inventory — create/update operational records; linked statuses and stock changes persist once and validate safely. | Passed | 2026-10-23 | Operational records, linked statuses, and inventory updates persisted correctly. |
| Leads — list, search, edit, stage, and convert an eligible lead to a whole-resort reservation without duplicate conversion. | In Progress | 2026-10-31 | Core lead flow is available; final conversion and duplicate-prevention QA remains. |
| HR and payroll — staff records, timekeeping, schedules, leave, OT/undertime, payroll generation, history, and permission checks are accurate. | Passed | 2026-10-24 | Staff operations and payroll workflow completed with expected permission controls. |
| Dashboard and analytics — all KPIs/charts use Alrio data only; empty states and permission-denied states remain understandable. | Passed | 2026-10-25 | Dashboard and analytics KPIs rendered correct scoped data and empty states. |
| Upload and error handling — UploadThing type/size failures, failed uploads, invalid IDs, invalid payloads, and unavailable records show safe errors without stack traces. | Passed | 2026-10-26 | Upload validation and safe error feedback were verified. |
| Accessibility/responsiveness — keyboard use, focus management, dialog/sheet stacking, contrast, and mobile layouts work across representative guest and staff flows. | In Progress | 2026-10-31 | Dialog/sheet focus work is covered; full keyboard and device matrix remains. |

## Completion record

| Test cycle | Environment | Tester | Start date | End date | Result / release decision |
| --- | --- | --- | --- | --- | --- |
| | | | | | |

## Recommended pre-release checks

1. Run the applicable rows above with isolated data and PayMongo test mode.
2. Verify every mutation by refreshing and, where relevant, using another account or permission level.
3. Confirm the PayMongo dashboard webhook points to the deployed `/api/paymongo/webhook` endpoint, not only the site root.
4. Run static checks before release:

```powershell
pnpm lint
pnpm exec tsc --noEmit
pnpm build
```
