# Deploying Listing Launch

Target stack: Vercel (web + cron) · Supabase (Postgres, storage) · Stripe · Resend · a SERP provider.
Everything degrades gracefully: any key you leave out keeps that part in demo mode.

## 1. Supabase

1. Create a project. Copy the project URL and the **service role** key (server-only).
2. In the SQL editor, run in order:
   - `supabase/migrations/0001_init.sql`
   - `supabase/migrations/0002_details_and_google.sql`
   - `supabase/seed.sql` (regenerate with `npm run seed:sql` after editing the registry)
3. Set `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`.

## 2. Vercel

1. Import the GitHub repo. Framework preset: Next.js. No build changes needed.
2. Add environment variables from `.env.example`. Minimum for a real launch:
   `SUPABASE_*`, `SERPAPI_KEY` (or DataForSEO pair + `SERP_PROVIDER=dataforseo`), `STRIPE_*`,
   `RESEND_API_KEY`, `EMAIL_FROM`, `APP_URL`, `APP_SECRET` (random 32+ chars), `ADMIN_TOKEN`, `CRON_SECRET`.
3. `vercel.json` registers the daily re-check cron at `/api/cron/recheck`. Vercel sends `CRON_SECRET` automatically.
4. Protect `/admin` behind Vercel Authentication (Deployment Protection) or put it on a separate internal domain.
   The status API already requires `x-admin-token`; the pages themselves are not auth-gated yet.

## 3. Stripe

1. Create a webhook endpoint: `https://<your-domain>/api/stripe/webhook`, event `checkout.session.completed`.
2. Set `STRIPE_SECRET_KEY` and the endpoint's `STRIPE_WEBHOOK_SECRET`.
3. Test with `stripe listen --forward-to localhost:3000/api/stripe/webhook` locally.

## 4. Resend

Verify your sending domain, create an API key, set `RESEND_API_KEY` and `EMAIL_FROM`.

## 5. Google

- **Places API (New)**: enable it in Google Cloud, create a server key restricted to the Places API, set `GOOGLE_PLACES_API_KEY`.
  Powers intake autocomplete and Google discovery in scans.
- **Business Profile OAuth** (optional, for owner-authorized GBP work): create an OAuth client (web), add
  `https://<your-domain>/api/google/callback` as a redirect URI, request access to the Business Profile APIs
  (Google requires an application and approval), then set `GOOGLE_OAUTH_CLIENT_ID` / `GOOGLE_OAUTH_CLIENT_SECRET`.

## 5b. DataForSEO

Set `SERP_PROVIDER=dataforseo`, `DATAFORSEO_LOGIN`, `DATAFORSEO_PASSWORD`. Two products are used:
Business Listings (Google discovery, ~$0.014/lookup) and Google SERP (fallback discovery, ~$0.002/query).
A full 15-directory scan currently costs roughly $0.03 to $0.05 in API fees.
Rotate the API password if it has ever been pasted into a chat or ticket.

Local note: Node's built-in `fetch` ignores `HTTPS_PROXY`. Behind a corporate or sandbox proxy run with `NODE_USE_ENV_PROXY=1`.

## 6. Yelp (optional)

Create a Fusion API key and set `YELP_API_KEY` for exact phone-based discovery.

## 7. Submission worker (optional, after form specs exist)

Run `npm run worker -- --loop` on a small always-on box (Railway, Fly.io, a VPS) with the same env as the web app
plus `PLAYWRIGHT_CHROMIUM_PATH`. It only picks up jobs whose adapter can submit automatically; everything else
stays in the ops queue.

## Smoke test after deploy

1. Run a scan for a real business you control. Confirm findings have evidence URLs.
2. Unlock the report with your email; confirm the report email arrives.
3. Complete checkout in Stripe test mode; confirm the order page and confirmation email.
4. In `/admin`, mark one job `verification_required` with instructions; confirm the owner email.
5. Mark it `published` with a URL; confirm three rows appear in `publication_checks`.
