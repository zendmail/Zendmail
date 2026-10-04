# MAILORA AI — Production Deployment Guide

This is the complete, step-by-step path from "code on your laptop" to "live app that stays fast and correct under real traffic, from 1 user to 100,000." Follow it in order — each section builds on the last.

There is no single "run this one command and it's live" step for an app with a real database, background jobs, and payments. Professional deployments are always a small stack of managed services wired together. This guide picks one good, boring, well-supported combination for each piece.

---

## 0. Architecture at a glance

```
                        ┌─────────────────────┐
   Browser  ───────────▶│  Vercel (Next.js)    │──── outbound ───▶ Anthropic API (AI Studio)
                        │  auto-scales per      │──── outbound ───▶ Stripe API (billing)
                        │  request, globally     │──── outbound ───▶ Email provider (Resend/Postmark)
                        │  distributed CDN       │
                        └──────────┬────────────┘
                                   │  pooled Postgres connection
                                   ▼
                        ┌─────────────────────┐
                        │  Neon Postgres        │ (serverless, autoscaling,
                        │  (primary + branches) │  built-in connection pooler)
                        └─────────────────────┘
                                   ▲
                                   │ read/write
                        ┌──────────┴────────────┐
                        │  Upstash Redis         │ (rate limiting — shared
                        │                        │  state across all instances)
                        └────────────────────────┘

   Vercel Cron (built in) ──▶ /api/cron/process-automations       (every minute)
                          ──▶ /api/cron/send-scheduled-campaigns  (every minute)
                          ──▶ /api/cron/sync-stores               (every minute)

   Stripe ──▶ webhook ──▶ /api/webhooks/stripe  (signature verified, idempotent)
```

**Why this combination:** every piece here is serverless/managed and bills by usage, not by a fixed server you have to size upfront. That's what "handles any number of users without you doing anything" actually means in practice — you're not manually adding servers, you're using services designed to auto-scale, and the app code has already been written to be safe under that model (connection pooling, atomic campaign-claiming, distributed rate limiting, idempotent webhooks).

---

## 1. Accounts you'll need (15 minutes)

Create these now — free tiers are enough to launch on:

1. **[Vercel](https://vercel.com)** — hosting, auto-scaling, cron jobs, CDN
2. **[Neon](https://neon.tech)** — serverless Postgres with built-in pooling
3. **[Upstash](https://upstash.com)** — serverless Redis for rate limiting
4. **[Resend](https://resend.com)** or **[Postmark](https://postmarkapp.com)** — transactional email (100–3,000 free emails/month depending on provider)
5. **[Stripe](https://stripe.com)** — billing (only if you're charging money)
6. **[Anthropic Console](https://console.anthropic.com)** — API key for AI Studio (only if you want AI features live)
7. A domain name (from Namecheap, Cloudflare Registrar, Google Domains, etc.)

---

## 2. Database: Neon Postgres (20 minutes)

1. Create a Neon project. Pick the region closest to where your users are.
2. In the Neon dashboard, go to **Connection Details**. You'll see **two** connection strings:
   - A **pooled** one (host ends in `-pooler`) — use this for `DATABASE_URL`.
   - A **direct** one — use this only for running migrations (Drizzle's migrator works better against a direct connection).
3. Copy both somewhere safe.
4. Run migrations against the **direct** URL from your laptop once:
   ```bash
   DATABASE_URL="<direct-connection-string>" npm run db:migrate
   DATABASE_URL="<direct-connection-string>" npm run db:seed
   ```
5. In production, `DATABASE_URL` (used by the running app) should be the **pooled** string. This matters: Vercel runs your app as many parallel serverless function instances, and a raw Postgres connection pool inside each one will exhaust Neon's connection limit almost immediately without pgBouncer (which the pooled endpoint provides) in front.

**Why Neon specifically:** it autoscales compute with load, has instant branching (a full copy of your schema+data for testing migrations safely), and its pooled endpoint is exactly what makes Postgres safe to use from serverless functions. Supabase is an equally good alternative with the same pooling model (use its port-6543 connection string).

---

## 3. Redis: Upstash (5 minutes)

Required once you have more than one server instance — which Vercel gives you automatically the moment you get real traffic (it spins up parallel instances per request). Without this, `src/lib/rate-limit.ts` silently falls back to in-memory counting, which means the actual login rate limit becomes `(configured limit) × (number of concurrently running instances)` instead of the number you set — an attacker gets a moving target.

1. Create a free Upstash Redis database (choose the region closest to your Vercel deployment region).
2. Copy the **REST URL** and **REST TOKEN** from the dashboard (not the Redis protocol URL — the REST ones).
3. You'll set these as `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN` in step 5.

The code auto-detects these and switches from in-memory to distributed rate limiting with no other change needed.

---

## 4. Email: connect Resend (15 minutes)

`src/lib/email.ts` sends through **Resend** automatically as soon as `EMAIL_PROVIDER_API_KEY` is set. With no key it falls back to printing emails in the terminal (useful for local development: verification and reset links appear there).

1. Sign up at https://resend.com and create an **API key**.
2. **Quick test:** with only the key set, mail is sent from `onboarding@resend.dev`, but Resend only delivers those to your own Resend account email.
3. **Going live:** add and verify your sending domain in Resend (the DKIM/SPF DNS records keep you out of spam), then set:
   - `EMAIL_PROVIDER_API_KEY` = your Resend API key
   - `EMAIL_FROM` = `Zendmail <hello@yourdomain.com>` (used for verification and password-reset emails)
   - `EMAIL_VERIFIED_DOMAINS` = `yourdomain.com` (comma-separated). Campaigns whose "From" address is on one of these domains send as-is. Any other From address (for example a Gmail address) is sent from `EMAIL_FROM` instead, with Reply-To set to the workspace's address, so mail is never rejected for an unverified domain.
4. Restart the app. Use **Send test email** on a campaign's review step to confirm delivery.

If a send fails (bad key, unverified domain), the campaign returns to Draft with an error on the review page; if only some addresses fail, those recipients are marked FAILED and the rest are delivered.

---

## 5. Environment variables (10 minutes)

In your Vercel project settings → Environment Variables, set (Production environment):

| Variable | Value |
|---|---|
| `DATABASE_URL` | Neon **pooled** connection string |
| `DATABASE_POOL_MAX` | `10` (see §8 for sizing) |
| `APP_URL` | `https://yourdomain.com` |
| `AUTH_URL` | `https://yourdomain.com` |
| `AUTH_SECRET` | Output of `openssl rand -base64 32` |
| `CRON_SECRET` | Output of `openssl rand -hex 32` |
| `UPSTASH_REDIS_REST_URL` | from Upstash |
| `UPSTASH_REDIS_REST_TOKEN` | from Upstash |
| `EMAIL_PROVIDER_API_KEY` | Resend API key |
| `EMAIL_FROM` | `Zendmail <hello@yourdomain.com>` |
| `EMAIL_VERIFIED_DOMAINS` | Platform-owned domains only (see `.env.example`) |
| `RESEND_WEBHOOK_SECRET` | Resend webhook signing secret; webhook URL `/api/webhooks/resend` (events: delivered, bounced, complained) |
| `STRIPE_SECRET_KEY` | from Stripe (see §7) |
| `STRIPE_WEBHOOK_SECRET` | from Stripe (see §7) |
| `AI_PROVIDER_API_KEY` | from Anthropic Console |
| `SHOPIFY_CLIENT_ID` | Shopify Dev Dashboard app client ID |
| `SHOPIFY_CLIENT_SECRET` | Shopify app secret; also verifies Shopify webhooks |
| `SHOPIFY_API_VERSION` | Shopify Admin API version, e.g. `2026-07` |
| `SHOPIFY_EXTRA_SCOPES` | optional approved scopes, e.g. `read_all_orders` |
| `STORE_CREDENTIALS_ENCRYPTION_KEY` | `openssl rand -base64 32` (AES-256-GCM key) |
| `S3_ACCESS_KEY_ID` | IAM access key restricted to campaign image uploads |
| `S3_SECRET_ACCESS_KEY` | matching IAM secret; never expose to the browser |
| `S3_BUCKET` | bucket for campaign image assets |
| `S3_REGION` | AWS region containing that bucket |
| `S3_PUBLIC_BASE_URL` | optional public CloudFront/S3 base URL for email images |

Never commit these to git. `.env` is already in `.gitignore`.

### Store integrations

**Shopify:** Create a public app in the Shopify Dev Dashboard. Register these exact URLs, replacing the origin with the deployed `APP_URL`:

- OAuth redirect: `https://yourdomain.com/api/integrations/shopify/callback`
- `app/uninstalled` webhook: `https://yourdomain.com/api/webhooks/shopify/app-uninstalled`

Configure the app scopes `read_products`, `read_orders`, and `read_customers`. Shopify protected customer data approval may be required for customer access. Set the app client ID, client secret, API version, and encryption key above. The OAuth flow validates state, callback HMAC, timestamp, shop domain, and granted scopes; it requests expiring offline tokens and stores the access/refresh token pair encrypted. Shopify limits order history by default; request and obtain approval for `read_all_orders`, then set `SHOPIFY_EXTRA_SCOPES=read_all_orders` to enable 90-day/all-history imports.

**WooCommerce:** Create a REST API key in WooCommerce → Settings → Advanced → REST API with **Read** permission only. Enter the HTTPS store URL and key pair in Zendmail; the server verifies the key over HTTPS before storing it encrypted. Never put consumer keys in a URL or browser storage.

`STORE_CREDENTIALS_ENCRYPTION_KEY` must decode to exactly 32 bytes. Changing it makes existing store connections unreadable; reconnect them or perform a deliberate credential re-encryption before rotating it. Shopify uninstall webhooks remove the local token. When disconnecting WooCommerce, also revoke the REST API key in WooCommerce.

Connected stores expose a manual sync control. Products sync first; the user chooses the order window (30 days, 90 days, or all history). Each provider page is processed by the `CRON_SECRET`-protected `/api/cron/sync-stores` worker and is idempotently upserted by its external ID. Run `npm run db:migrate` before deploying so the order and sync-job tables exist. Buyer details remain attached to order records and are **not** added as marketing contacts or granted email consent automatically.

### Campaign image uploads

Image blocks use authenticated, short-lived S3 presigned POSTs. Configure the bucket with CORS for your app origin and `POST`, and serve uploaded image keys publicly through a CloudFront distribution or a bucket policy limited to `workspaces/*/campaigns/*/images/*`. Set `S3_PUBLIC_BASE_URL` to the public distribution origin (without a trailing slash); when omitted, the app uses the standard regional S3 URL. The upload form accepts JPG, PNG, WebP, and GIF up to 10 MB. Do not enable public writes or grant the app IAM user broader permissions than `s3:PutObject` on the campaign image prefix.

Example bucket CORS configuration (replace the origin with each deployed app origin):

```json
[
   {
      "AllowedOrigins": ["https://yourdomain.com", "http://localhost:3000"],
      "AllowedMethods": ["POST"],
      "AllowedHeaders": ["*"],
      "ExposeHeaders": ["ETag"],
      "MaxAgeSeconds": 3000
   }
]
```

---

## 6. Deploy to Vercel (10 minutes)

1. Push this repo to GitHub (or GitLab/Bitbucket).
2. In Vercel: **Add New Project** → import the repo. Vercel auto-detects Next.js.
3. Paste in the environment variables from §5.
4. Deploy.
5. `vercel.json` (already in this repo) tells Vercel to run the cron endpoints every minute automatically — no extra setup needed. Check **Vercel dashboard → Cron Jobs** after your first deploy to confirm they show up and are firing.
6. Add your custom domain under **Project Settings → Domains**. Vercel provisions and auto-renews the SSL certificate for you.

Your app is now live and already auto-scales — Vercel spins up more serverless instances under load and back down when quiet, with no configuration from you.

---

## 7. Stripe webhook (10 minutes) — skip if not charging yet

1. In the Stripe Dashboard → **Developers → Webhooks → Add endpoint**.
2. Endpoint URL: `https://yourdomain.com/api/webhooks/stripe`
3. Select events: `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`.
4. Copy the **Signing secret** shown → set as `STRIPE_WEBHOOK_SECRET` in Vercel.
5. In the Stripe Dashboard, create a **Product + Price** for each paid plan (Starter/Growth/Pro), then in your database set `plans.stripe_price_id` for each to the matching Stripe Price ID:
   ```sql
   update plans set stripe_price_id = 'price_xxxxx' where key = 'starter';
   ```
6. Test with Stripe's test mode + test card `4242 4242 4242 4242` before flipping to live keys.

---

## 8. Sizing the database connection pool

`DATABASE_POOL_MAX` (default 10) controls how many Postgres connections **each running instance** opens. The math that matters:

```
your Neon plan's max connections  >  DATABASE_POOL_MAX × number of concurrent instances
```

Neon's pooled endpoint (pgBouncer) already multiplexes far more logical connections than Postgres' raw limit allows, so start at the default of 10 and only raise it if you see connection-timeout errors in logs under real load. Don't raise it speculatively — a too-high value on many instances is the single most common way people accidentally take down their own database on launch day.

---

## 9. Observability — know when something breaks

A production app you can't see into isn't actually production-ready. Minimum setup:

1. **Vercel's built-in logs and analytics** — already on, no setup. Check **Vercel Dashboard → Logs** after deploy.
2. **Error tracking**: add [Sentry](https://sentry.io) (`npx @sentry/wizard@latest -i nextjs`) — free tier is generous, and it will catch and alert you to server-side exceptions you'd otherwise only find out about from an angry user email.
3. **Uptime monitoring**: point a free monitor (UptimeRobot, Better Uptime, or Vercel's own) at `https://yourdomain.com/api/health` every 1–5 minutes. This endpoint checks real database connectivity, not just "the server responded."
4. **Cron job monitoring**: Vercel's dashboard shows cron invocation history and failures directly — check it after your first day live to confirm both jobs are running every minute successfully.

---

## 10. Security checklist before opening signups

Already handled by the code as shipped:
- [x] Passwords hashed with bcrypt (12 rounds)
- [x] Sessions are opaque random tokens, only SHA-256 hashes stored server-side
- [x] Login/signup/forgot-password are rate-limited per-IP and per-account
- [x] Security headers (HSTS, CSP, X-Frame-Options, etc.) on every response
- [x] Stripe webhook signature verified before any data changes
- [x] Cron endpoints require a bearer secret
- [x] SQL via parameterized queries throughout (Drizzle ORM — no raw string concatenation)
- [x] Workspace data isolation enforced at the query layer

Do before launch:
- [ ] Set every secret in §5 to a freshly generated, unique value — never reuse a value from this document or from development.
- [ ] Confirm `.env` was never committed to git (`git log --all --full-history -- .env` should show nothing).
- [ ] Turn on Vercel's **Deployment Protection** for preview deployments so unfinished branches aren't publicly accessible.
- [ ] Review Stripe is in **live mode** (not test mode) before accepting real payments.
- [ ] Set up automated Postgres backups — Neon does daily backups on paid plans; confirm your plan/retention window matches how much data loss you could tolerate.

---

## 11. Scaling beyond the basics (when you actually need it)

You will not need any of this on day one. Revisit when you have real usage data showing you need it:

- **Read replicas**: Neon supports read replicas if analytics queries start competing with write traffic for capacity.
- **Queue-based sending** (instead of the current in-request loop) for campaigns with very large audiences (100k+ recipients) — move `dispatchCampaign`'s per-recipient loop into a queue (Upstash QStash pairs naturally with the stack here) so a single HTTP request/cron invocation isn't holding open a connection for a multi-minute send.
- **Edge caching** for public, non-personalized pages if you add a marketing site.
- **Dedicated background worker** (a small always-on container) instead of Vercel Cron, once automation/campaign volume outgrows what a once-a-minute sweep can keep up with.

None of this requires changing your hosting provider — it's additive to what's already deployed.

---

## What "professional-grade" means here, concretely

Not a slogan — specific properties this deployment actually has:
- **No single server to overload**: Vercel functions scale horizontally per-request; there's no fixed machine that falls over under a traffic spike.
- **No connection exhaustion**: pooled Postgres + a bounded per-instance pool size means many instances can't collectively overwhelm the database.
- **No double-sends under concurrency**: campaign dispatch atomically claims a campaign before sending — two overlapping cron ticks can't send the same campaign twice.
- **No brute-force path**: rate limiting is enforced with shared (Redis) state across every instance, not per-instance counters an attacker could reset by hitting a different instance.
- **No silent payment-state corruption**: every Stripe webhook is signature-verified and idempotent (recorded by event ID before processing), so retried deliveries can't double-apply a change.
- **No blind spots**: health checks, error tracking, and cron monitoring mean you find out about problems from a dashboard, not from a support email.

This is the same fundamental architecture used by production SaaS companies at far larger scale than a launch will need — the pattern doesn't change as you grow, mostly just the sizing numbers in §8 and §11.
