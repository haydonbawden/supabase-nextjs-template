# HospoShift WA

HospoShift WA is a production-ready MVP built on Next.js 15 + Supabase for Western Australian casual hospitality staffing.

> HospoShift WA helps Western Australian hospitality venues find casual staff for short-notice shifts.

## Stack

- Next.js 15 App Router + TypeScript
- Supabase Auth + PostgreSQL + Storage
- Tailwind CSS + shadcn/ui primitives
- Supabase SQL migrations and Row Level Security (RLS)

## Features

- Role-based users: `staff`, `venue_user`, `admin`
- Staff onboarding and profile management
- RSA certificate upload to private `certificates` storage bucket
- Availability slots and shift request lifecycle
- Venue creation, multi-venue membership, staff search via `search_available_staff`
- Completed shift rating flow with automatic aggregate rating trigger updates
- Admin panel for RSA verification, staff approval, and membership moderation

## Local setup

```bash
cd nextjs
npm install
cp .env.example .env.local
npm run dev
```

## Required environment variables

See `nextjs/.env.example`:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY` (only needed for strictly server-side admin operations)

## Supabase setup

1. Link your Supabase project.
2. Run migrations:

```bash
supabase db push
```

Main migration added:

- `supabase/migrations/20260425090000_hosposhift_wa.sql`

This migration creates:

- schema/tables/enums/functions/triggers/indexes
- `search_available_staff` RPC
- RLS policies
- private `certificates` storage bucket + policies

## Seed / demo data (optional)

Optional demo script:

- `supabase/seed_hosposhift_demo.sql`

It seeds WA venues and demo staff/profile/availability patterns. Do not use demo seed in production.


## Connecting Supabase with repository secrets

If your CI/CD stores Supabase credentials in repository secrets, this repo includes an automated migration workflow:

- Workflow: `.github/workflows/supabase-migrate.yml`
- Script: `supabase/scripts/apply_migrations.sh`

Required repository secrets:

- `SUPABASE_ACCESS_TOKEN`
- `SUPABASE_PROJECT_REF`
- `SUPABASE_DB_PASSWORD`

The workflow can be run manually (`workflow_dispatch`) or automatically on `main` when migration files change.

## Replit

A root `.replit` is included:

```txt
run = "cd nextjs && npm run dev"
```

## Security notes

- Supabase Auth is the only auth system.
- No Prisma, MongoDB, Firebase, or Clerk.
- RLS is enabled for all business tables and storage objects.
- Certificate files are private and scoped to owner/admin read access.
- Search views avoid exposing private phone data.

## WA RSA disclaimer

Staff involved in the sale, supply or service of liquor in Western Australia generally need RSA training. Venues should verify suitability before confirming shifts.

This platform does not provide legal advice.

## Development scripts

Inside `nextjs/package.json`:

- `npm run dev`
- `npm run build`
- `npm run start`
- `npm run lint`
- `npm run typecheck`
