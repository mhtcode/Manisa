# Manisa

Manisa is a private, bilingual business-management application for a self-employed service provider. It manages customers, services, appointments, completion and payments, working hours, and database-derived business reporting.

## Architecture

The production application is a modular monolith. The Next.js application in `apps/web` provides the UI, protected server components, server actions, and health endpoint. PostgreSQL is the source of truth and Prisma owns the normalized schema and migrations. The separately deployable FastAPI application in `apps/api` currently provides the API foundation and health endpoint; feature APIs can be added there without introducing microservices.

Authentication uses Argon2id password hashes and signed, HTTP-only, same-site session cookies. Business timestamps are stored as PostgreSQL `timestamptz`; local input and display use `America/Toronto`. Money uses PostgreSQL `decimal(12,2)`, with historical service name and price values retained on appointments.

## Requirements

- Node.js 24
- npm
- Docker with Compose, or a compatible PostgreSQL 17 server

## Run everything with Docker Compose

Create a local environment file and replace every placeholder secret:

```bash
cp .env.example .env
openssl rand -base64 32
docker compose up --build -d
docker compose ps
```

Put the generated value in `AUTH_SECRET`, then open:

- Web application: `http://localhost:3000`
- Web health: `http://localhost:3000/api/health`
- API documentation: `http://localhost:8000/docs`
- API health: `http://localhost:8000/health`
- API database readiness: `http://localhost:8000/ready`

The one-shot `web-init` container applies Prisma migrations and seeds the administrator plus demo data when the database is empty. Sign in using `SEED_ADMIN_EMAIL` and `SEED_ADMIN_PASSWORD` from `.env`. PostgreSQL is exposed only on the host loopback interface; the web and API ports bind to the local network by default so the responsive UI can be tested from another device. `SESSION_COOKIE_SECURE=false` is required for plain HTTP access from a phone on the local network; set it to `true` when deploying behind HTTPS.

Use `docker compose logs -f web api` to follow application logs and `docker compose down` to stop the stack while preserving its named database and gallery-photo volumes. `docker compose down -v` permanently deletes both database data and uploaded photos.

## Run in development mode

```bash
cp apps/web/.env.example apps/web/.env
```

Replace `AUTH_SECRET` with output from `openssl rand -base64 32`. Set a development administrator email and a password of at least 12 characters in `SEED_ADMIN_EMAIL` and `SEED_ADMIN_PASSWORD`.

```bash
docker compose up -d postgres
cd apps/web
npm install
npm run db:generate
npm run db:migrate
npm run db:seed
npm run dev
```

Open `http://localhost:3000` and sign in with the seed administrator credentials from your local `.env`.

## Useful commands

From `apps/web`:

```bash
npm run dev          # development server
npm run build        # production build
npm run start        # production server
npm run lint         # ESLint
npm run typecheck    # strict TypeScript validation
npm test             # Vitest business tests
npm run db:migrate   # create/apply a development migration
npm run db:seed      # administrator and realistic demo-data seed
npm run db:studio    # inspect data locally
```

The liveness endpoint is `GET /api/health`. It deliberately does not disclose database or configuration details.

## Demo experience

The seed creates English and Persian customers, three services, and scheduled, completed, cancelled, paid, and unpaid appointments across multiple dates. Dashboard and report values always come from PostgreSQL records.

## Persian, timezone, and accessibility

The language setting switches between English and فارسی and changes direction between LTR and RTL. UI strings are centralized in `src/lib/i18n.ts`; names, notes, addresses, and search remain Unicode throughout. Canonical timestamps are never stored as Jalali strings. The UI uses semantic forms, visible focus states, text labels in addition to status color, and mobile-specific navigation.

## Google Calendar

Settings includes a safe historical importer for Google Calendar `.ics` exports. Event titles must use `Customer name | Service name`; optional `Phone:` and `Email:` lines may be included in the event description. Missing customers and services are created, repeat imports are deduplicated, and imported visits are tagged `historical · unreported` so they never affect income or working-hour totals.

Set `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, and optionally `GOOGLE_CALENDAR_ID` to expose live-integration configuration status. OAuth connection and retry delivery are intentionally not enabled yet; core workflows do not depend on Google availability, and Manisa remains the source of truth.

## PWA and offline behavior

The app includes a manifest, icon, standalone metadata, and conservative service worker. Private customer, appointment, and report data is never cached. Offline navigation shows a static reconnection page instead of stale business records.

## Container design

Both application images run as non-root users and include health checks. The web image uses Next.js standalone output, the API filesystem is read-only at runtime, PostgreSQL stores data in `manisa_postgres_data`, and optimized gallery media is retained in the separate `manisa_uploads` volume. Runtime secrets are supplied through environment variables and are not copied into either image. Change the sample database password, administrator password, and authentication secret before using this configuration outside a local machine.

## Project structure

```text
apps/
├── api/                 # FastAPI application and container image
└── web/
    ├── prisma/          # schema, migration, and demo seed
    ├── public/          # PWA assets and conservative service worker
    └── src/
        ├── app/         # routes, protected pages, error/loading states
        ├── components/  # reusable UI and forms
        ├── lib/         # auth, validation, formatting, i18n, time
        └── server/      # server actions, analytics, integrations
compose.yaml             # web, API, initializer, and PostgreSQL stack
```

## Current limitations

- Google Calendar export import is available; OAuth connection and durable two-way synchronization remain future work.
- Web Push is not enabled; it requires a deliberate permission and delivery design.
- The responsive calendar supports day, compact mobile week, month, and agenda views, plus two-finger or button zoom; drag-and-drop rescheduling remains future work.
- The authorization model currently defines `ADMIN`; granular roles can be added when multiple users are introduced.

The next production milestone is Google OAuth/calendar synchronization with durable retry tracking, followed by Playwright coverage of the seeded primary workflow.
