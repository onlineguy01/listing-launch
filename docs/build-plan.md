# Local Listing Scan & Submit — Web App Build Plan

Product in one line: a business owner enters their business, we scan the directories
that matter, show them where they are missing or wrong, and charge a one-time fee to
create and correct those listings. No subscription, no sales call.

Working name used below: "Listing Launch" (placeholder).

---

## 1. The customer flow (6 screens)

1. **Find your business** — type name + city. Google Places autocomplete picks the
   business; we pull name, address, phone, website, hours, category automatically.
   The owner confirms or edits. This removes 90% of data entry and gives us an
   authoritative "canonical record" to compare every directory against.
2. **Scanning** — live progress screen (directory logos flipping to a status).
   Target: full scan in under 90 seconds.
3. **Free report** — headline counts (accurate / incorrect / not found / unverified)
   and a per-directory table with evidence links. Ask for an email to unlock the
   full table and emailed PDF. This is the lead-capture point for Rocket Lab.
4. **Package + checkout** — a recommended package built only from eligible,
   actionable gaps. Exact directory list shown before payment. Stripe Checkout,
   one-time payment.
5. **Post-purchase intake** — the extra fields directories need: logo, long/short
   description (AI-drafted from owner-approved facts, owner edits), service area,
   payment methods, owner email for verification, authorization checkbox.
6. **Fulfillment dashboard** — per-directory status, "action needed from you"
   tasks (click the Yelp confirmation email, enter the phone code), and the final
   completion report with live listing URLs.

---

## 2. The hard part: the scan engine

There is no single API that answers "is this business on directory X." Each
directory gets one of three discovery methods, and the registry stores which one.

| Tier | Method | Directories (initial 15) |
|---|---|---|
| A — Official API | Query the platform directly | Google (Places API), Yelp (Fusion API, phone search), Foursquare (Places API), Bing (Maps Locations API) |
| B — Search + fetch | `site:domain "Name" City` and phone-number queries via a SERP API, then fetch the top candidate pages | Yellow Pages, Superpages, Manta, MerchantCircle, BBB, Facebook, LinkedIn, Nextdoor, Angi, Houzz, Thumbtack, Apple Maps |
| C — Unverifiable | No reliable method yet | Reported as "unable to verify," never quoted or charged |

**Matching a candidate page to the business**

1. Fetch the page server-side (plain fetch first, Playwright only for JS-rendered sites).
2. Extract NAP (name, address, phone), website, hours. Prefer deterministic sources:
   most directories embed schema.org `LocalBusiness` JSON-LD. Fall back to an LLM
   structured-extraction call only when JSON-LD is absent.
3. Normalize: phone to E.164, address via Google Geocoding (or libpostal), name via
   token-set fuzzy match.
4. Score: phone match = strong signal; name + street match = strong; name + city only
   = weak (becomes "possible match," not "found").
5. Record a **finding** with evidence: directory, URL, observed fields, diffs,
   confidence, timestamp, screenshot (storage bucket).

**Finding states** (drive both the report and the quote)

| State | Meaning | Quoted action |
|---|---|---|
| verified_accurate | Listing found, all fields match | none |
| incorrect | Listing found, one or more fields differ | correction |
| not_found | High-confidence absence across name, phone, domain queries | new listing |
| possible_match | Ambiguous candidate | manual review before quoting |
| unable_to_verify | Method failed or blocked | excluded from quote |
| not_eligible | Category/geo rules exclude it | excluded |

Rule: "not found" never automatically means "missing." Only not_found with confidence
above threshold is quoted, and ops reviews possible_match before anything is created.

**Scan cost and abuse control**

- Cache scans by canonical phone number for 14 days.
- Rate limit by IP and require email verification for a second scan of a different
  business from the same IP.
- Rough cost per scan with 15 directories: roughly 20 to 30 SERP calls, a dozen page
  fetches, a few LLM extraction calls. Expect well under $0.50; measure it in the pilot.

---

## 3. Fulfillment engine (start human-assisted, automate adapter by adapter)

**Phase 1 (launch):** an internal ops queue. Each order item becomes a task card with
the canonical record pre-formatted for that directory and a "copy all fields" button.
A human submits, pastes the resulting URL, and sets the status. This is fast to build
and lets you sell before automation exists.

**Phase 2:** one adapter per directory, all sharing one interface:

```ts
interface DirectoryAdapter {
  id: string;                               // "yelp"
  discover(biz: CanonicalBusiness): Promise<Finding>;
  eligibility(biz: CanonicalBusiness): Eligibility;   // category, geo, home-based rules
  submit?(biz: CanonicalBusiness, order: OrderItem): Promise<SubmissionResult>; // API or Playwright
  requiredOwnerActions: OwnerAction[];      // email_confirm, sms_code, oauth, none
  verifyPublished(url: string, biz: CanonicalBusiness): Promise<Finding>;
}
```

Submission methods, in order of preference:
1. Official API with owner authorization (Google Business Profile via OAuth, Apple
   Business Connect partner program, Bing Places).
2. Playwright form fill on sites that permit it, pausing for owner verification
   steps. Never bypass CAPTCHA, MFA, or identity checks.
3. Ops task (paid, restricted, or fragile sites).

**Publication check:** a scheduled job re-runs `verifyPublished` at 3, 14, and 30 days,
then emails the completion report. Status vocabulary: prepared, submitted,
verification_required, published, rejected, not_eligible.

---

## 4. Tech stack

| Layer | Choice | Why |
|---|---|---|
| Web app | Next.js (App Router) on Vercel | Fast to ship marketing site + app in one repo |
| Database / auth / storage | Supabase (Postgres, RLS, magic-link auth, screenshot bucket) | One service, generous free tier |
| Background jobs | Inngest or Trigger.dev | Scan fan-out, retries, scheduled re-checks |
| Browser automation | Playwright in a worker container (Railway or Fly.io), or Browserless | Keep it off Vercel's function limits |
| Search discovery | DataForSEO SERP API or SerpApi | `site:` + phone queries |
| Business data APIs | Google Places, Yelp Fusion, Foursquare, Bing Maps | Tier A discovery |
| LLM | Claude or OpenAI via structured outputs | Extraction fallback, fuzzy matching, description drafting |
| Payments | Stripe Checkout + webhooks | One-time payment, receipts, refunds |
| Email | Resend | Report unlock, verification tasks, completion report |
| Ops UI | Same Next.js app, admin role | Review queue and task cards |

Core tables: `businesses`, `directories`, `scan_jobs`, `findings`, `orders`,
`order_items`, `submission_jobs`, `owner_tasks`, `publication_checks`.
The `directories` table is seeded from the 100-directory workbook already built.

---

## 5. Pricing model (structure now, numbers after pilot)

- Quote = sum of per-directory prices for actionable items + any pass-through fees,
  shown as a single package price. Three recommended tiers keep decisions simple:
  Core (maps + top review sites), Growth (adds 10 to 15 general directories),
  Full (every eligible gap).
- Benchmarks: BrightLocal sells manual citations at $3.20 each, so the bare
  submission is a commodity. Our price carries the scan, the corrections, the
  verification handling, and the completion report.
- Measure in the pilot: scan cost, scan-to-purchase conversion, human minutes per
  published listing, publication rate. Set price from those four numbers.
- Sell "submission with verification and reporting," not "guaranteed backlinks or
  rankings." Write the refund and substitution policy before the first sale.

---

## 6. Build order (about 6 weeks to a pilot)

| Week | Deliverable |
|---|---|
| 1 | Repo, Supabase schema, directory registry seeded, intake with Google Places lookup, canonical record |
| 2 | Scan engine for 15 directories with evidence and confidence; job fan-out; caching |
| 3 | Report page, email unlock + PDF, quote engine, Stripe Checkout and webhooks |
| 4 | Post-purchase intake, ops task queue, owner task center, status tracking |
| 5 | Publication re-check jobs, completion report email, admin review for possible_match |
| 6 | Pilot with 10 consenting businesses (5 home services, 5 professional services); record costs and conversion |

After the pilot: build Playwright adapters for the 5 highest-volume directories,
then Google Business Profile OAuth, then expand toward the 100-directory pool.
Agency white-label (bulk CSV, branded reports) comes only after unit economics work.

---

## 7. Risks and guardrails

- **Terms of service.** Yelp, Facebook, and Google restrict unauthorized automation.
  Use official APIs and owner-authorized claim flows there. Never scrape at volume.
- **False "not found."** Causes duplicate listings and refunds. Confidence threshold
  plus human review on anything ambiguous.
- **Home-based businesses.** Registry needs a hide-address flag per directory.
- **The AI never invents facts.** Descriptions are drafted only from owner-approved
  fields; licenses, certifications, and services come from the owner.
- **Directory site changes** break adapters. Each adapter has its own health check
  and falls back to an ops task on failure, so one site never breaks the product.
- **Customer ownership.** Listings are created under the customer's email and
  accounts where possible, and the completion report hands over every login.

---

## 8. First decisions to lock

1. Initial 15 directories (the list in section 2 is the recommendation).
2. Free report gating: headline counts free, full table behind email.
3. Fulfillment at launch is human-assisted via the ops queue.
4. Pilot cohort: DFW home services and professional services.
5. Public promise: find, create, and correct listings. Not rankings, not backlinks.
