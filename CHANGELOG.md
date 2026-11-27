# Changelog

## Phase 0 — Foundation

- Repo: pnpm workspaces, Turborepo, strict TypeScript, ESLint, Prettier.
- Assets organised into the PLAN.md layout; logo traced to SVG; favicons and app icons generated.
- Fonts self-hosted: Satoshi (400, 500, 700, 900) — Poppins dropped 2026-11-13 — plus a Plus Jakarta Sans ₦-only subset because Satoshi has no ₦ glyph.
- @hv/ui: design tokens (Tailwind v4 theme), 58 generated icon components, 480 px WebP illustrations, grey placeholders; `assets/ASSETS_TODO.md`.

## Phase 1 — MVP (in progress)

- Orders always go through (2026-11-27, owner): checkout no longer refuses a bag for stock. What's in stock is held;
  an order for more is accepted and flagged "Ordered more than was in stock" in the dashboard, with each short line
  recording how many were held. Only a product taken off sale stops an order (it's removed from the bag).
- Ankara by the piece (2026-11-27, owner): Ankara comes in 6-yard pieces and is sold one piece at a time; prices
  read "per piece (6 yards)"; new Ankara defaults to piece in the dashboard; the 34 live Ankara products were
  switched from yard to piece (a mesh priced per yard stays by the yard). Homepage photography (hero, category doors,
  the Harries Vogue standard, wholesale) and the aso-ebi footer photograph are in; the green ready-to-wear photo
  uses the delivered alt1 (the other two were rejected for proportions).
- Sale-day hardening (2026-11-27): the bank-transfer page can no longer turn into an error page. Its status check
  no longer reloads the page's data (one failed reload on a weak signal, often on return from the bank app, used to
  swap the account details for "Something snagged"); the details are kept on the phone and shown even if a check or
  reload fails; Track an order shows the account while a transfer is awaited. Error pages offer "Try again".
  API: Firestore reads retry passing errors, one shared Google sign-in per isolate, settings cached for a minute,
  one read per order check instead of three, the catalogue rebuilt only when an order sells something out, and
  per-shopper limits raised for shared mobile addresses. Dashboard lists refresh less often to stay inside
  Firestore's daily reads. New transfer-mode browser test (qa/playwright.transfer.config.ts).
- Redesign (2026-11-26, owner's references: drop.code, OMÉ, Ameya): bold sentence-case headlines in Satoshi
  instead of Futura capitals; light header with the logo and a single-line menu; soft grey hero panel with the shop's
  seal; arched doors into each line; new arrivals as grey tiles with pill tabs and a round + to add; the promise as a
  photo panel; rounded buttons, chips, tiles and fields across the shop; a plain ink footer. Colours unchanged.
- New homepage and line pages (2026-11-26, owner's copy): global wholesale and retail positioning; hero, three
  category cards, the wholesale and global advantage, new arrivals with quick add, the Harries Vogue standard, a
  wholesale concierge (WhatsApp or email quote) and questions answered on the site. New menu and announcement bar;
  local details (showrooms, hours, dispatch) moved to the footer. Where the copy disagreed with the owner's
  questionnaire, the questionnaire wins (shipping abroad is arranged on WhatsApp; no named couriers or opening days).
- Lingerie became Ankara (2026-11-26): line, menu, search, dashboard; /lingerie redirects to /ankara; anything
  stored as "lingerie" reads as Ankara. Ankara is cut by the yard like other fabric.
- Line pages: shoppers choose Grid (default), Large or Shelf, remembered in a cookie; the shop's own sort menu,
  filters (in stock, price, colour, size, how it's sold, fibre) in a sidebar on desktop and a sheet on phones,
  instant and kept in the URL. Every dropdown and checkbox on the shop and in the dashboard is now the shop's own
  (shared accessible Listbox in @hv/ui).
- Cloth starts at 2 yards everywhere (was a 5-yard default on the shelf and product pages).
- Checkout under load: the storefront now passes each shopper's address to the API, so the order and search limits
  apply per shopper instead of one limit shared by the whole site. Phone numbers are accepted in more forms
  (234…, +234 0…, 00 44…, missing leading 0, dots and brackets). Catalogue cache keys moved to v3.
- New image prompts for the homepage in `assets/GENERATION_PROMPTS.md` section 1A; `corepack pnpm images` also
  builds `assets/photography/home/`.
- Stock counts hidden from customers (2026-11-23, owner's decision): no yards or pieces left on any page, no "Almost gone"
  tag, and the public catalogue and checkout errors no longer carry a count. Less than the minimum cut shows as Sold out.
- Product photos (2026-11-23): JPG, PNG, WebP, AVIF and HEIC accepted where the device can read them; if AVIF encoding
  fails or takes too long the photo saves as WebP instead of failing. The upload check now accepts AVIF files that name
  the format as a compatible brand, and a browser encoder's output is verified before it is used.
- Dashboard Stock screen rebuilt so photos, text, counts and controls line up at every width.

- Dashboard refresh (2026-11-20): labelled sidebar with who is signed in on desktop, an icon-and-label rail on tablets
  (they used to get the stretched phone layout), a top bar naming the screen and a bottom bar on phones; softer cards,
  larger titles, ink highlight for the current screen. Phone fixes: order items no longer squeezed, order actions in
  full-width rows (main action first), transfer buttons full width, product options in two tidy rows, save bar and
  toasts placed right at every width. "Waiting for transfer" stands out in yellow.
- Pay by bank transfer (2026-11-20, until Paystack is verified): `PAYMENT_MODE=transfer` in production. Checkout places the
  order and holds the items 24 hours; the order page shows the shop's account (from settings/store, never the repo) with
  copy buttons and a WhatsApp button that sends the receipt message ready-written ("WhatsApp is for receipts only").
  Dashboard: "Waiting for transfer" list on Orders, with Money received / Not paid (owner and manager).
- Owner can cancel a paid or packed order and record the bank-transfer refund from the dashboard, choosing whether to
  restock (cut fabric can't go back); owner-only, one transaction, and a late Paystack confirmation can't revive it.
- Checkout "Send me offers" tick box (off by default); saved on the order and shown in the dashboard.
- Our shops page (/about): pinned-poster design with live shop clocks and a visit planner.
- Home redesign (2026-11-18): magazine-cover hero, scrolling story with a fixed photograph stage, season campaign,
  picture tiles for the three lines, live price sheet, yard-tape slip. Copy rewritten to sell the outcome (docs/VOICE.md).
- Headlines in Futura via "HV Display" (Jost stands in until a Futura PT web licence is bought).
- Generated campaign, banner and product stand-in photographs; `corepack pnpm images` builds 400/800/1200/2000 AVIF + WebP
  into public/media. The local sample catalogue shows the product stand-ins; production never serves them.
- Micro-interactions: hero line reveal, photo settle, step progress, link and door sweeps, ticking slip totals,
  fly-to-bag and badge pop, smooth questions; all off under reduced motion.
- Storefront (React Router 7 on Cloudflare Workers, SSR): home, Fabrics / Lingerie / Ready-to-Wear with in-stock filter and sort,
  product page with the tape-measure yard picker and size picker, bag drawer with add-to-bag motion, one-page checkout with
  server-side validation, order confirmation, order tracking, search with typo tolerance, policies, 404 and error states.
- Runs on the placeholder seed catalogue until the API Worker is connected; production refuses placeholder data.
- Fonts: Poppins dropped; Satoshi (400/500/700/900) is the only typeface.
- API Worker (`workers/api`, Hono): catalogue + search index in KV, settings, checkout with atomic 15-minute stock holds,
  Paystack initialise, signed + re-verified + amount-checked idempotent webhook, order lookup for confirmation and
  tracking, analytics events, 5-minute expiry cron, Resend emails. Firestore REST store with service-account auth and
  retried transactions; in-memory store for local dev. Firestore security rules and index. 21 tests.
- Storefront now reads the catalogue and runs checkout through the API when `API_URL` is set.
- Dashboard (`apps/dashboard`, React + Vite PWA): sign-in (Firebase Auth; dev roles locally), Today (money in today / this
  week / this month in her time zone, orders to pack, cutting list, running low), orders board New → Packed → Sent with undo,
  order page with call / WhatsApp / email, one-tap 80 mm slip and A4 invoice, products list and phone-first editor with
  in-browser photo resizing (400/800/1200/2000, AVIF + WebP) uploaded to R2, stock screen, order alerts on this phone with a
  test alert. Installable, works on a weak connection.
- API: `/admin/*` (Firebase ID-token check with admin claim and role, CORS locked to the dashboard), products and stock
  writes that respect shoppers' holds, board moves, takings, R2 photo upload with type and size checks, image serving,
  FCM push per paid order, dev-only sample orders. `scripts/set-admin.mjs` grants dashboard access. 34 API tests, 57 core tests.
- First production deploy on Cloudflare (workers.dev): API, storefront, dashboard. Storefront reaches the API over a
  service binding; photos from R2 served through the shop's own address with edge caching.
- Quality gate: Playwright end-to-end (browse → 5 yards → pay → confirmation → dashboard → stock down; sold-out can't be
  bought), axe on 18 screens with zero serious/critical issues, Lighthouse budget passing on the live site
  (LCP 2.15–2.31 s, CLS 0, TBT 0 ms, home JS 169 KB), 20-buyer race on the real Firestore (exactly 5 sold).
  CI workflow for every push. Fixes from the gate: keyboard access to the product gallery, home headline no longer
  hidden by the entrance animation, catalogue cached per Worker isolate, "Illegal invocation" on Workers.
