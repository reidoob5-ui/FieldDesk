# Backend foundation — Supabase

The repository currently contains a browser-only demonstration. This folder defines the first database foundation for converting it into a multi-tenant SaaS.

## Why Supabase/PostgreSQL
- PostgreSQL provides relational integrity for work orders, customers, technicians and stock.
- Supabase Auth supplies user identity; this schema references `auth.users`.
- Row Level Security (RLS) is enabled on every application table.
- Every operational record carries an `organization_id` to support tenant isolation.

## Apply the migration
1. Create a Supabase project.
2. Install the Supabase CLI and authenticate.
3. Link the project: `supabase link --project-ref YOUR_PROJECT_REF`.
4. Apply migrations: `supabase db push`.
5. Configure Auth providers and email templates in the Supabase dashboard.

The migration is at `supabase/migrations/202611220001_initial_schema.sql`.

## Current scope
The migration establishes profiles, organizations, memberships, customers, technicians, work orders, event history, inventory, consumed materials, attachments metadata and approval records. It includes initial RLS policies and timestamp triggers.

## Before production
- Review every RLS policy with tests for cross-tenant access.
- Add an audited organization bootstrap/invitation flow. Do not allow users to self-assign privileged roles.
- Add secure Storage bucket policies for attachment objects; database metadata policies alone do not secure files.
- Add transactional stock deduction/restock functions to prevent race conditions.
- Add status-transition validation, quote line items, service checklists, signatures and customer portal access.
- Add automated migrations, backups, monitoring and integration tests.

**No Supabase project, keys, authentication or live API has been configured by this commit.** Never put a service-role key in browser code.
