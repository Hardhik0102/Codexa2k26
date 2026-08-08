# Campus Resource Booking & Slot Adjustment System

A hackathon MVP for shared facility booking with conflict prevention, cancellation,
peer-to-peer slot adjustment requests, admin approval, and basic analytics.

**Stack:** Node.js + Express + PostgreSQL (via Sequelize ORM) on the backend, plain HTML/CSS/JavaScript on the frontend.

## 1. Get a free PostgreSQL database

Easiest options for a beginner (no local install needed):

1. Go to https://neon.tech (or https://supabase.com) and create a free account.
2. Create a new project/database.
3. Copy the connection string it gives you. It looks like:
   `postgresql://<username>:<password>@<host>/<database>?sslmode=require`

## 2. Set up the backend

```bash
cd backend
npm install
cp .env.example .env
```

Open `.env` and paste your real PostgreSQL connection string into `DATABASE_URL`.

## 3. Seed the demo data

```bash
npm run seed
```

This drops/recreates the tables and creates 3 facilities, 3 users, and the exact
demo bookings/requests from the problem statement. It prints the login
credentials when done:

```
Admin:     admin@campus.edu / admin123
Student A: studentA@campus.edu / student123
Student B: studentB@campus.edu / student123
```

## 4. Run the app

```bash
npm start
```

Open your browser to **http://localhost:5000** — the backend also serves the
frontend files, so this one command runs the whole app.

## Running the two acceptance tests

**Test 1 — Cancellation:** Log in as Student B → My Bookings → Cancel the
Wednesday 2–4 PM booking → log in as Student A in another browser/incognito
window → open the calendar for the Seminar Hall → confirm the slot now shows
as free.

**Test 2 — Adjustment:** Log in as Student A → Requests page → see the
pre-seeded outgoing RELINQUISH request (or send a new one from the calendar
page) → log out → log in as Student B → Requests page → Accept → confirm the
booking now belongs to Student A.

## Project structure

```
backend/
  models/         Sequelize models (User, Facility, Booking, AdjustmentRequest)
  models/index.js Wires up the relationships (foreign keys) between tables
  routes/         Express route handlers, grouped by feature
  config/db.js    PostgreSQL connection + table sync logic
  server.js       App entry point
  seed.js         Demo data script
frontend/
  *.html          One page per feature
  css/style.css   Shared styling
  js/             One script per page, plus a shared api.js helper
docs/             (add your ER diagram + technology-decision.md here)
```

## Notes on scope

This is deliberately trimmed from a full production spec to fit an 8-hour
hackathon: two roles (student/admin, no separate faculty role), no
notification system, no separate audit log table (cancelled/rejected
bookings keep their row with a status flip instead — that IS the audit
trail), no charting library for analytics (plain numbers instead).

## Why PostgreSQL + Sequelize (technology decision notes)

- **PostgreSQL** enforces the schema at the database level (foreign keys,
  enums, unique constraints) — a stronger safety net for a booking system
  where data integrity matters (accreditation/audit requirement).
- **Row-level locking** (`SELECT ... FOR UPDATE`, used in the adjustment
  accept transaction) is a native PostgreSQL feature that directly
  implements the "Concurrency Safety" requirement from the spec — it
  guarantees no two users can complete a slot transfer on the same booking
  at once.
- **Sequelize** gives transaction support, associations (foreign keys), and
  migrations/sync in a JavaScript-friendly API, similar in shape to
  Mongoose so the codebase stays approachable for a beginner.
