# MAILORA AI

AI-powered email marketing and customer growth platform. Create. Automate. Convert.

## Local development

```bash
npm install
cp .env.example .env   # fill in DATABASE_URL at minimum
npm run db:migrate
npm run db:seed
npm run dev
```

Open http://localhost:3000.

## What's built

Auth (signup/login/verification/password reset), multi-tenant workspaces with onboarding,
dashboard, contacts/CRM with CSV import, rule-based segmentation, campaigns with a
block-based email builder, email open/click tracking + one-click unsubscribe, automations
(trigger → step workflows), AI Studio (real Anthropic integration), analytics, billing
(real Stripe checkout/portal/webhooks), and an admin panel (users, workspaces, plans,
feature flags, audit logs).

## Going live

Read **[PRODUCTION_DEPLOYMENT.md](./PRODUCTION_DEPLOYMENT.md)** — a full step-by-step guide
covering hosting, database pooling, distributed rate limiting, cron jobs, Stripe webhooks,
security checklist, and scaling guidance.

## Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Start the dev server |
| `npm run build` | Production build |
| `npm run lint` | Lint the codebase |
| `npm run db:generate` | Generate a new Drizzle migration from schema changes |
| `npm run db:migrate` | Apply pending migrations |
| `npm run db:seed` | Seed default plans and starter email templates |
| `npm run db:studio` | Open Drizzle Studio to browse the database |
