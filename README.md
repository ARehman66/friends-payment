# BreakLedger

Office break money app for phones — expenses, account credits, and balances.

Uses **MongoDB** (Atlas recommended for Vercel).

## Data model

| Collection | Purpose |
|------------|---------|
| `User` / `Role` | Login + permissions (Admin is owner-only) |
| `Group` / `Membership` | Office group + member balance |
| `Expense` / `ExpenseShare` | Expense total + who was present |
| `AccountEntry` | Account credits + expense share history |

## Pages

| Route | Purpose |
|-------|---------|
| `/login` | Sign in |
| `/dashboard` | Member cards: Balance / Account / Expense |
| `/expenses` | Money out — equal split among present |
| `/deposits` | Account — add credit |
| `/members` | Active / inactive members |
| `/statement` | Date range + member account history |

## Local setup

```bash
cp .env.example .env
# Set MONGODB_URI to your Atlas connection string
npm install
npm run db:setup
npm run dev
```

Admin comes from `.env`: `ADMIN_EMAIL` / `ADMIN_PASSWORD`.

## Deploy on Vercel

1. In the Vercel project → **Settings → Environment Variables**, set:

| Name | Value |
|------|--------|
| `MONGODB_URI` | `mongodb+srv://…@cluster….mongodb.net/breakledger?retryWrites=true&w=majority` |
| `AUTH_SECRET` | long random string (32+ chars) |
| `ADMIN_NAME` | `Admin` |
| `ADMIN_EMAIL` | `admin@breakledger.app` |
| `ADMIN_PASSWORD` | your login password |

2. Redeploy. Build only generates the Prisma client — no DB migration.
3. Seed admin once (from your machine):

```bash
MONGODB_URI="your-atlas-uri" \
ADMIN_EMAIL="admin@breakledger.app" \
ADMIN_PASSWORD="your-password" \
npm run db:seed
```

4. Log in at `/login` with that admin email/password.

Prisma is only the typed MongoDB client (queries). Mongo creates collections on first write — nothing migrates on each build.

If the password has special characters (`$`, `@`, `#`), URL-encode them in `MONGODB_URI` (e.g. `$` → `%24`).
