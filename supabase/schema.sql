-- TriNet Quoting Tool database: rep accounts, companies (quotes), manager visibility and prospect share links.
-- Run once in the Supabase SQL editor. Safe to re-run: it drops and recreates the policies and functions.
--
-- Who can do what
--   Reps     sign in with an @trinet.com email code; create, edit and delete their own companies and share links.
--   Managers everything a rep can, plus read-only access to the companies and share links of the reps they manage.
--   Admins   see everyone's companies and assign roles and managers on the Team page.
--   Prospects sign in with an email code; read only the share links sent to their email, while not revoked or expired.

-- ---------- Helpers ----------

create or replace function public.current_email() returns text
language sql stable as $$
  select lower(coalesce(auth.jwt() ->> 'email', ''))
$$;

create or replace function public.is_trinet_email(e text) returns boolean
language sql immutable as $$
  select lower(coalesce(e, '')) like '%@trinet.com'
$$;

-- ---------- Profiles (TriNet users only) ----------

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null unique,
  full_name text not null default '',
  role text not null default 'rep' check (role in ('rep', 'manager', 'admin')),
  manager_id uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);

-- A profile is created the first time someone signs in with an @trinet.com email.
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if public.is_trinet_email(new.email) then
    insert into public.profiles (id, email) values (new.id, lower(new.email)) on conflict (id) do nothing;
  end if;
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- These read profiles without going through row-level security, so policies can call them without recursion.
create or replace function public.my_role() returns text
language sql stable security definer set search_path = public as $$
  select role from public.profiles where id = auth.uid()
$$;

create or replace function public.my_manager() returns uuid
language sql stable security definer set search_path = public as $$
  select manager_id from public.profiles where id = auth.uid()
$$;

create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce(public.my_role() = 'admin', false)
$$;

create or replace function public.is_rep() returns boolean
language sql stable security definer set search_path = public as $$
  select public.my_role() is not null
$$;

-- True when the signed-in user manages this rep (directly).
create or replace function public.manages(rep uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles where id = rep and manager_id = auth.uid())
$$;

alter table public.profiles enable row level security;
drop policy if exists "profiles: read own, team or all for admins" on public.profiles;
create policy "profiles: read own, team or all for admins" on public.profiles for select to authenticated
  using (id = auth.uid() or manager_id = auth.uid() or public.is_admin() or id = public.my_manager());

-- Users may only change their own name; roles and managers change through admin_update_profile.
revoke insert, update, delete on public.profiles from anon, authenticated;
grant select on public.profiles to authenticated;
grant update (full_name) on public.profiles to authenticated;
drop policy if exists "profiles: update own name" on public.profiles;
create policy "profiles: update own name" on public.profiles for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid());

create or replace function public.admin_update_profile(target uuid, new_role text, new_manager uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'Only admins can change roles and managers'; end if;
  if new_role not in ('rep', 'manager', 'admin') then raise exception 'Unknown role %', new_role; end if;
  if new_manager = target then raise exception 'A rep cannot manage themselves'; end if;
  update public.profiles set role = new_role, manager_id = new_manager where id = target;
end $$;
revoke all on function public.admin_update_profile(uuid, text, uuid) from public, anon;
grant execute on function public.admin_update_profile(uuid, text, uuid) to authenticated;

-- ---------- Companies (one quote each) ----------

create table if not exists public.companies (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  name text not null default '',
  quote jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists companies_owner_idx on public.companies (owner_id);

create or replace function public.touch_updated_at() returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end $$;
drop trigger if exists companies_touch on public.companies;
create trigger companies_touch before update on public.companies for each row execute function public.touch_updated_at();

alter table public.companies enable row level security;
grant select, insert, update, delete on public.companies to authenticated;
drop policy if exists "companies: read own, team or all for admins" on public.companies;
create policy "companies: read own, team or all for admins" on public.companies for select to authenticated
  using (owner_id = auth.uid() or public.manages(owner_id) or public.is_admin());
drop policy if exists "companies: reps create their own" on public.companies;
create policy "companies: reps create their own" on public.companies for insert to authenticated
  with check (owner_id = auth.uid() and public.is_rep());
drop policy if exists "companies: owners edit" on public.companies;
create policy "companies: owners edit" on public.companies for update to authenticated
  using (owner_id = auth.uid()) with check (owner_id = auth.uid());
drop policy if exists "companies: owners delete" on public.companies;
create policy "companies: owners delete" on public.companies for delete to authenticated
  using (owner_id = auth.uid());

-- ---------- Share links (customer-facing) ----------

create table if not exists public.shares (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete cascade,
  created_by uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  prospect_emails text[] not null check (cardinality(prospect_emails) > 0),
  snapshot jsonb not null, -- customer-facing proposal only; no internal pricing detail
  expires_at timestamptz,
  revoked boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists shares_company_idx on public.shares (company_id);
drop trigger if exists shares_touch on public.shares;
create trigger shares_touch before update on public.shares for each row execute function public.touch_updated_at();

-- Prospect emails are stored lowercased so the email match is exact.
create or replace function public.lowercase_prospects() returns trigger language plpgsql as $$
begin
  new.prospect_emails = array(select distinct lower(trim(e)) from unnest(new.prospect_emails) e where trim(e) <> '');
  return new;
end $$;
drop trigger if exists shares_lowercase on public.shares;
create trigger shares_lowercase before insert or update on public.shares for each row execute function public.lowercase_prospects();

create or replace function public.owns_company(c uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.companies where id = c and owner_id = auth.uid())
$$;
create or replace function public.can_see_company(c uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.companies where id = c
                 and (owner_id = auth.uid() or public.manages(owner_id) or public.is_admin()))
$$;

alter table public.shares enable row level security;
grant select, insert, update, delete on public.shares to authenticated;
drop policy if exists "shares: team reads" on public.shares;
create policy "shares: team reads" on public.shares for select to authenticated
  using (public.can_see_company(company_id));
drop policy if exists "shares: prospects read live links sent to them" on public.shares;
create policy "shares: prospects read live links sent to them" on public.shares for select to authenticated
  using (public.current_email() = any (prospect_emails) and not revoked and (expires_at is null or expires_at > now()));
drop policy if exists "shares: owners create" on public.shares;
create policy "shares: owners create" on public.shares for insert to authenticated
  with check (created_by = auth.uid() and public.owns_company(company_id));
drop policy if exists "shares: owners edit" on public.shares;
create policy "shares: owners edit" on public.shares for update to authenticated
  using (public.owns_company(company_id)) with check (public.owns_company(company_id));
drop policy if exists "shares: owners delete" on public.shares;
create policy "shares: owners delete" on public.shares for delete to authenticated
  using (public.owns_company(company_id));

-- ---------- Share views (when a prospect opened a link) ----------

create table if not exists public.share_views (
  id bigint generated always as identity primary key,
  share_id uuid not null references public.shares (id) on delete cascade,
  viewer_email text not null default public.current_email(),
  viewed_at timestamptz not null default now()
);
create index if not exists share_views_share_idx on public.share_views (share_id);

create or replace function public.can_view_share(s uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.shares where id = s and public.current_email() = any (prospect_emails)
                 and not revoked and (expires_at is null or expires_at > now()))
$$;
create or replace function public.can_see_share(s uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.shares where id = s and public.can_see_company(company_id))
$$;

alter table public.share_views enable row level security;
grant select, insert on public.share_views to authenticated;
drop policy if exists "share views: prospects record their own" on public.share_views;
create policy "share views: prospects record their own" on public.share_views for insert to authenticated
  with check (viewer_email = public.current_email() and public.can_view_share(share_id));
drop policy if exists "share views: team reads" on public.share_views;
create policy "share views: team reads" on public.share_views for select to authenticated
  using (public.can_see_share(share_id));
