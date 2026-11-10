# Local Business Backlinks (codename Listing Launch)

Free business listing scan → report → one-time payment → we create and correct listings.

A self-service web app for local businesses. The owner enters their business once, we scan the
directories that matter, show exactly what is accurate, wrong or missing (with evidence links),
and sell a one-time package covering only the actionable gaps. Fulfillment starts human-assisted
through an internal ops queue and is automated one directory adapter at a time.

See `docs/build-plan.md` for the full product and engineering plan.

## Run it

```bash
npm install
npm run dev
```

Open http://localhost:3000. With no environment variables set the app runs in **demo mode**:
an in-memory store, simulated scan results (clearly labeled), and checkout that marks orders paid
without charging. Copy `.env.example` to `.env.local` and fill in keys to go live piece by piece:

| Variable | Turns on |
|---|---|
| `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` | Persistent storage (run `supabase/migrations/0001_init.sql` first) |
| `SERPAPI_KEY` | Real discovery via `site:` searches + page fetch for every directory |
| `GOOGLE_PLACES_API_KEY` | Google Business Profile discovery through the Places API |
| `YELP_API_KEY` | Yelp discovery through the Fusion API (phone search) |
| `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` | Real one-time checkout; webhook at `/api/stripe/webhook` |
| `RESEND_API_KEY`, `EMAIL_FROM`, `APP_URL` | Real email (report, order confirmation, owner actions, completion report). Without it, emails land in `/admin/outbox` |
| `DATAFORSEO_LOGIN`/`DATAFORSEO_PASSWORD` + `SERP_PROVIDER=dataforseo` | Alternative search provider using header auth |
| `CRON_SECRET` | Protects `/api/cron/recheck` (Vercel cron, daily, see `vercel.json`) |
| `ADMIN_TOKEN` | Gates `/admin/*` and `/api/admin/*` behind `/admin/login` (or the `x-admin-token` header) |
| `APP_SECRET` | Signs magic links and session cookies; encrypts connected-account tokens. Set in production |
| `ANTHROPIC_API_KEY` | AI description drafts from owner-approved facts (template fallback without it) |
| `GOOGLE_OAUTH_CLIENT_ID`, `GOOGLE_OAUTH_CLIENT_SECRET` | Owner-authorized Google Business Profile connection |
| `PLAYWRIGHT_CHROMIUM_PATH` | System Chromium for the submission worker (`npm run worker`) |

```bash
npm test                 # unit + integration tests (matching, extraction, quoting, scan runner, form adapter, re-checks)
npm run build
npm run worker -- --dry  # submission worker, one pass, no submissions
```

## How it is put together

```
src/
  app/                      Next.js App Router
    page.tsx                Intake form (home)
    scan/[id]               Live scan progress
    report/[id]             Findings table + recommended package + checkout
    order/[id]              Post-purchase status page
    admin                   Ops queue: task cards, status changes trigger owner emails and re-checks
    admin/metrics           Pilot scorecard: scans, unlocks, conversion, revenue, publication rate
    admin/outbox            Demo-mode email outbox
    admin/login             Admin token sign-in (enforced by src/proxy.ts when ADMIN_TOKEN is set)
    login, account          Customer magic-link sign-in and account (orders, scans)
    order/[id]/details      Post-purchase details: services, hours, service area, descriptions (AI draft)
    api/scan, api/checkout, api/stripe/webhook, api/admin/submissions
    api/places/*            Server-proxied Google Places autocomplete + details
    api/report/unlock       Email gate for the full report
    api/cron/recheck        Daily publication re-checks
  lib/
    domain/types.ts         CanonicalBusiness, Finding, FindingState, DirectoryDefinition…
    directories/registry.ts The 15 seed directories (discovery + submission method, eligibility, price)
    adapters/               DirectoryAdapter interface, generic search+fetch adapter, Google + Yelp API adapters,
                            PlaywrightFormAdapter base (declarative field map, injected browser)
    scan/
      normalize.ts          Phone → E.164, street abbreviations, domains, legal-suffix stripping
      extract.ts            schema.org JSON-LD LocalBusiness extraction, HTML heuristics fallback
      match.ts              Identity scoring (phone/domain/name+street) → finding state + field diffs
      runner.ts             Bounded-concurrency fan-out with streaming progress
      quote.ts              Findings → sellable package, with excluded reasons
      mock.ts               Deterministic simulated directory pages for demo mode
      service.ts            Input validation, start/execute scan
    orders/service.ts       Order creation, Stripe Checkout, mark-paid → submission jobs + confirmation email
    email/                  Mailer (Resend or outbox), templates, send helpers
    fulfillment/            Publication re-check job, submission worker
    places/                 Google Places API (New) client
    data/                   Store interface, in-memory store, Supabase store
supabase/migrations/        Postgres schema with RLS
```

### How discovery works, per directory

| Method | Directories | Notes |
|---|---|---|
| Directory's own search page (`site_search`) | Yellow Pages, Superpages, MerchantCircle, BBB | Free, reliable. YP and Superpages embed JSON-LD per result; MerchantCircle listing pages carry microdata; BBB result cards are parsed (profiles sit behind a bot wall). |
| Licensed listings database (`listings_db`) | Google Business Profile | DataForSEO Business Listings (Google Maps data), about 1¢ per lookup. Places API is used instead when `GOOGLE_PLACES_API_KEY` is set. |
| Official API (`api`) | Yelp (Fusion), Foursquare, Bing | Need keys; fall back to web search without them. |
| Web search + fetch (`search_fetch`) | Facebook, LinkedIn, Nextdoor, Apple Maps, Angi, Houzz, Manta | Depends on the SERP provider honoring `site:`. When results come back off-site (seen with Google in Nov 2026), the finding is `unable_to_verify`, never a false `not_found`. |

Yelp, Manta, Angi, LinkedIn and Facebook block server-side page fetches, so they need API access or an owner-assisted check.

## Finding states

| State | Meaning | Quoted? |
|---|---|---|
| `verified_accurate` | Listing found, all fields match | no |
| `incorrect` | Listing found, one or more fields differ | correction |
| `not_found` | High-confidence absence across name, phone and domain queries | create (if confidence ≥ 0.7) |
| `possible_match` | Ambiguous candidate | no, human review first |
| `unable_to_verify` | Method failed or blocked | no |
| `not_eligible` | Category, country or address rules exclude it | no |

### Adding a directory

1. Add an entry to `src/lib/directories/registry.ts` (domains, tier, discovery/submission method,
   eligibility, owner actions, placeholder price, submit URL).
2. That is all for search+fetch discovery. For an official API, add a class extending
   `SearchFetchAdapter` and register it in `src/lib/adapters/index.ts`.
3. Insert the same row into the `directories` table.

## Guardrails baked in

- "Not found" is never automatically "missing": only confident absences are sold, ambiguous ones go to review.
- Every finding carries evidence (queries, candidate URLs, scores, extraction source).
- Industry directories are only quoted for eligible categories; address-requiring directories are skipped for service-area businesses.
- No CAPTCHA, MFA or identity-verification bypass. Owner-action steps are modeled as tasks, not automated.
- The app promises listings created and corrected, not rankings or backlinks.

## Lifecycle

1. Scan completes → report email (if we have an address). Full report is gated behind an email.
2. Checkout → order paid → one submission job per item → order confirmation email.
3. Ops (or the worker) submits. Status `verification_required` emails the owner instructions.
   Status `published` schedules re-checks at 3, 14 and 30 days.
4. Daily cron re-verifies published listings; a vanished listing flips to `failed` for ops.
5. When every job is terminal, the completion report goes out once and the order is `complete`.

Repeat scans of the same phone number within 14 days reuse the earlier scan. Scans are
limited to 5 per hour per IP (in-process; move to Redis when running multiple instances).

## Writing a form adapter

`PlaywrightFormAdapter` takes a `FormSpec`: the add-business URL, a list of
`{ selector, value, kind }` fields, the submit selector, and the success / verification /
blocked markers. Selectors must come from inspecting the live site in a real browser. The
adapter never bypasses a CAPTCHA or login wall; it returns `manual_required` and ops takes over.

## Next up

- Log human minutes per submission in the ops queue so the scorecard can price fulfillment.
- Real-site form specs for Yellow Pages, Manta, MerchantCircle, Superpages (inspect each site first).
- Google Business Profile OAuth flow for owner-authorized creation and claims.
- Post-purchase intake for logo, descriptions, hours and service area.
- Move rate limiting to Upstash Redis before running multiple instances.
