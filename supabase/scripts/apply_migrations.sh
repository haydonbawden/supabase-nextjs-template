#!/usr/bin/env bash
set -euo pipefail

required=(SUPABASE_ACCESS_TOKEN SUPABASE_PROJECT_REF SUPABASE_DB_PASSWORD)
for key in "${required[@]}"; do
  if [[ -z "${!key:-}" ]]; then
    echo "Missing required environment variable: $key" >&2
    exit 1
  fi
done

echo "Installing/using Supabase CLI and linking project..."
npx supabase@2.95.3 link --project-ref "$SUPABASE_PROJECT_REF" --password "$SUPABASE_DB_PASSWORD"

echo "Pushing migrations to linked Supabase project..."
npx supabase@2.95.3 db push --linked

echo "Supabase migrations applied successfully."
