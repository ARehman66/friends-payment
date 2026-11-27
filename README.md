# BreakLedger

Office break money app for phones — expenses, deposits, and balances.

Uses **MongoDB** (Atlas recommended for Vercel).

## Pages

| Route | Purpose |
|-------|---------|
| `/login` | Sign in |
| `/dashboard` | Member cards: Total / Expense / Advance / Remaining |
| `/expenses` | Money out — table + Add expense |
| `/deposits` | Money in — table + Add deposit |
| `/members` | Active / inactive members (admin adds) |
| `/statement` | Date range + member ledger |

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

2. Redeploy. Build runs `prisma db push` so collections/indexes exist.
3. Seed admin once (from your machine):

```bash
MONGODB_URI="your-atlas-uri" \
ADMIN_EMAIL="admin@breakledger.app" \
ADMIN_PASSWORD="your-password" \
npm run db:seed
```

4. Log in at `/login` with that admin email/password.

If the password has special characters (`$`, `@`, `#`), URL-encode them in `MONGODB_URI` (e.g. `$` → `%24`).
