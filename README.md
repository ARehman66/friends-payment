# BreakLedger

Simple office break money app for phones.

## Pages

| Route | Purpose |
|-------|---------|
| `/` | Landing page + Login button |
| `/login` | Sign in (password show/hide) |
| `/dashboard` | Member cards: Advance / Remaining / Total |
| `/expenses` | Money out — table + Add expense modal |
| `/deposits` | Money in — table + Add deposit modal |
| `/members` | Active / inactive members (admin adds) |
| `/statement` | Date range + member ledger |

## Setup

```bash
cp .env.example .env
npm install
npx prisma migrate dev
npm run db:seed
npm run dev
```

Admin from `.env`: `ADMIN_EMAIL` / `ADMIN_PASSWORD`.
