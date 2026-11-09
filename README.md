# Listing Launch

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
| `ADMIN_TOKEN` | Protects the ops status API (`x-admin-token` header) |

```bash
npm test        # unit tests for normalization, matching, extraction, quoting, scan runner
npm run build
```

## How it is put together

```
src/
  app/                      Next.js App Router
    page.tsx                Intake form (home)
    scan/[id]               Live scan progress
    report/[id]             Findings table + recommended package + checkout
    order/[id]              Post-purchase status page
    admin                   Ops queue: task cards with copy-to-clipboard fields
    api/scan, api/checkout, api/stripe/webhook, api/admin/submissions
  lib/
    domain/types.ts         CanonicalBusiness, Finding, FindingState, DirectoryDefinition…
    directories/registry.ts The 15 seed directories (discovery + submission method, eligibility, price)
    adapters/               DirectoryAdapter interface, generic search+fetch adapter, Google + Yelp API adapters
    scan/
      normalize.ts          Phone → E.164, street abbreviations, domains, legal-suffix stripping
      extract.ts            schema.org JSON-LD LocalBusiness extraction, HTML heuristics fallback
      match.ts              Identity scoring (phone/domain/name+street) → finding state + field diffs
      runner.ts             Bounded-concurrency fan-out with streaming progress
      quote.ts              Findings → sellable package, with excluded reasons
      mock.ts               Deterministic simulated directory pages for demo mode
      service.ts            Input validation, start/execute scan
    orders/service.ts       Order creation, Stripe Checkout, mark-paid → submission jobs
    data/                   Store interface, in-memory store, Supabase store
supabase/migrations/        Postgres schema with RLS
```

### Finding states

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

## Next up

- Google Places autocomplete on the intake form to seed the canonical record.
- Email: report unlock, owner verification tasks, completion report (Resend).
- Scheduled publication re-checks (3/14/30 days) via Inngest or Trigger.dev.
- Playwright submission adapters for the highest-volume form-based directories.
- Rate limiting and scan caching by phone number.
