# Manisa

Manisa is a mobile-first, bilingual, multi-tenant business platform. One deployment hosts isolated business workspaces with their own teams, customers, appointments, payments, reports, media quotas, integrations, and public studio pages.

## Architecture

The production application is a modular monolith. The Next.js application in `apps/web` provides the UI, protected server components, server actions, and health endpoint. PostgreSQL is the source of truth and Prisma owns the normalized schema and migrations. The separately deployable FastAPI application in `apps/api` currently provides the API foundation and health endpoint; feature APIs can be added there without introducing microservices.

Authentication uses Argon2id password hashes and signed, HTTP-only, same-site session cookies. PostgreSQL stores tenant-scoped application and media metadata. MinIO stores private originals/variants and public featured derivatives through an S3-compatible interface; MongoDB is intentionally not used for binary objects.

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

Generate separate values for `AUTH_SECRET` and `PLATFORM_SETUP_TOKEN`, then open:

- Public website: `http://localhost:3000`
- One-time setup: `http://localhost:3000/setup`
- Platform console: `http://localhost:3000/platform`
- MinIO console (host-only): `http://localhost:9001`
- Private reporting: `http://localhost:3000/report`
- Web health: `http://localhost:3000/api/health`
- API documentation: `http://localhost:8000/docs`
- API health: `http://localhost:8000/health`
- API database readiness: `http://localhost:8000/ready`

The one-shot `web-init` container applies migrations only. On a fresh deployment, visit `/setup` and use `PLATFORM_SETUP_TOKEN` to create the sole root owner and first business. Setup closes permanently afterward. Run `npm run db:seed` explicitly only for development. Set `S3_PUBLIC_ENDPOINT` to the server address browsers and phones can reach.

Use `docker compose logs -f web media-worker api` to follow logs. Copy legacy local images into MinIO, without deleting the old volume, with `docker compose --profile migration run --rm legacy-media-migrate`.

## Backup and restore

Back up both stores together: use `pg_dump` for PostgreSQL and `mc mirror` for both MinIO buckets. Restore PostgreSQL first, then both buckets with their original keys. Keep `AUTH_SECRET`, S3 credentials, and the integration encryption key in a separate encrypted backup. `docker compose down -v` permanently removes PostgreSQL and MinIO volumes.

## Workspaces and permissions

The platform owner manages businesses under `/platform`. Business owners and admins invite members from Settings → Members with single-use 72-hour links. Users with multiple memberships select or switch workspaces. The root owner’s elevated workspace entry is visibly marked and audited. Public registration is disabled; Google links existing accounts or accepts a valid invitation. Public business pages live at `/studio/[slug]`, including `/studio/manisa` for the migrated installation.

## Run in development mode

```bash
cp apps/web/.env.example apps/web/.env
```

Replace `AUTH_SECRET` and `PLATFORM_SETUP_TOKEN` with independently generated values. Development demo data is optional and must be created explicitly with the seed command.

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

The seed creates English and Persian customers, modular nail and hair service categories, and scheduled, completed, cancelled, paid, and unpaid appointments across multiple dates. The canonical Report values always come from PostgreSQL records; legacy Dashboard, Reports, and Working Hours routes redirect there.

## Persian, timezone, and accessibility

The language setting switches between English and فارسی and changes direction between LTR and RTL. UI strings are centralized in `src/lib/i18n.ts`; names, notes, addresses, and search remain Unicode throughout. Canonical timestamps are never stored as Jalali strings. The UI uses semantic forms, visible focus states, text labels in addition to status color, a customizable four-item bottom navigation, and guarded page-swipe navigation.

## Media, Gallery, and public studio pages

Customer avatars and finalized-appointment albums are stored in private MinIO objects with responsive WebP variants. Staff can filter the private Gallery and explicitly feature appointment photos. Featuring copies a derivative into the public bucket; customer identity and avatars are never published. Storage remains counted through the seven-day Trash period and is released only after object purge.

The public landing page reads active service categories and selected Gallery work from PostgreSQL. Configure `NEXT_PUBLIC_BUSINESS_ADDRESS` and `NEXT_PUBLIC_INSTAGRAM_URL` for the public contact details.

## Instagram Professional integration

Create a Meta app with Instagram Login, add this exact OAuth callback, and request only `instagram_business_basic`:

```text
https://your-domain.example/api/integrations/instagram/callback
```

Set `INSTAGRAM_APP_ID`, `INSTAGRAM_APP_SECRET`, `INSTAGRAM_REDIRECT_URI`, and a separately generated `INTEGRATION_ENCRYPTION_KEY`. The redirect URI must use public HTTPS. Then open **Settings → Instagram** and connect an Instagram Business or Creator account. A linked Facebook Page is not required for the Instagram Login flow.

### One-way Google Calendar synchronization

Enable the Google Calendar API in Google Cloud, create a Web application OAuth client, and set `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_CALENDAR_REDIRECT_URI`, `GOOGLE_CALENDAR_SYNC_SECRET`, and `INTEGRATION_ENCRYPTION_KEY`. The Calendar callback is separate from Google sign-in and must exactly match `https://YOUR_DOMAIN/api/integrations/google-calendar/callback` on a public HTTPS origin.

For an External consent screen in Testing, add the intended Gmail address (for example `fahimemnsn@gmail.com`) as a test user. Open **Settings → Google Calendar**, connect that account, and approve offline Calendar event access. Manisa then pushes all future scheduled and confirmed visits to the connected account's primary calendar. Edits and outcomes update those events, Trash removes them, and restore recreates them. The integration is deliberately one-way: Google Calendar never writes appointments into Manisa.

The `calendar-worker` Compose service drains a durable database outbox every 15 seconds. Appointment changes remain successful while Google is unavailable; failures retry with backoff and appear only in the private integration page. Google events include customer and service names but exclude contact details, private notes, payments, and photos.

Manisa encrypts the long-lived access token with AES-256-GCM, validates signed OAuth state against a short-lived HTTP-only cookie, requests read-only access, and caches optimized covers locally. Landing-page requests use the cache and schedule a background refresh when it is older than 15 minutes; a failed refresh keeps the last successful feed online. Disconnecting removes the connection and unpublishes cached database records.

## Google Calendar

Settings includes a safe historical importer for Google Calendar `.ics` exports. Event titles must use `Customer name | Service name`; optional `Phone:` and `Email:` lines may be included in the event description. Missing customers and services are created, repeat imports are deduplicated, and imported visits are tagged `historical · unreported` so they never affect income or working-hour totals.

Set `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, and optionally `GOOGLE_CALENDAR_ID` to expose live-integration configuration status. OAuth connection and retry delivery are intentionally not enabled yet; core workflows do not depend on Google availability, and Manisa remains the source of truth.

## PWA and offline behavior

The app includes a manifest, icon, standalone metadata, and conservative service worker. Private customer, appointment, and report data is never cached. Offline navigation shows a static reconnection page instead of stale business records.

## Container design

Application images run as non-root users where supported and include health checks. PostgreSQL uses `manisa_postgres_data`; MinIO uses `manisa_minio_data`; the legacy upload volume remains mounted read-only during migration and is never removed automatically. Runtime secrets are supplied through environment variables and are not copied into images.

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
- Instagram requires a Meta app, a Professional account, and a publicly reachable HTTPS OAuth callback; it is hidden gracefully when not configured.
- Invitation links are copyable; outbound email delivery is intentionally deferred.
- The FastAPI service remains independently deployable but is not required by the Next.js feature layer.
