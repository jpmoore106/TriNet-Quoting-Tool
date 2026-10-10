-- Confidential pricing configuration (the PEO Service Fee Rate Card and PEO Promotions).
-- TriNet users can read it; nobody can change it through the app. Load or update the values in the SQL editor.
-- The values themselves are never committed to this repository.

create table if not exists public.pricing_config (
  id text primary key,
  data jsonb not null,
  updated_at timestamptz not null default now()
);

alter table public.pricing_config enable row level security;
revoke all on public.pricing_config from anon, authenticated;
grant select on public.pricing_config to authenticated;
drop policy if exists "pricing config: TriNet users read" on public.pricing_config;
create policy "pricing config: TriNet users read" on public.pricing_config for select to authenticated
  using (public.is_rep());
