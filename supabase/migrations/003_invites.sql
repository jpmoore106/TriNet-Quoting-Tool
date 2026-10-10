-- Run once in the Supabase SQL editor. Includes 002 (managers edit their team's deals), so it's fine if 002 wasn't run.
-- Safe to re-run.

-- True when the signed-in user may edit this rep's work: the rep themselves, their manager, or an admin.
create or replace function public.can_edit_for(owner uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select owner = auth.uid() or public.manages(owner) or public.is_admin()
$$;

create or replace function public.can_edit_company(c uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.companies where id = c and public.can_edit_for(owner_id))
$$;
grant execute on function public.can_edit_company(uuid) to authenticated;

-- Only the quote and its name can change; the owner can't be reassigned through the app.
revoke update on public.companies from authenticated;
grant update (name, quote) on public.companies to authenticated;

drop policy if exists "companies: owners edit" on public.companies;
drop policy if exists "companies: owners and their managers edit" on public.companies;
create policy "companies: owners and their managers edit" on public.companies for update to authenticated
  using (public.can_edit_for(owner_id)) with check (public.can_edit_for(owner_id));

drop policy if exists "shares: owners create" on public.shares;
drop policy if exists "shares: team creates" on public.shares;
create policy "shares: team creates" on public.shares for insert to authenticated
  with check (created_by = auth.uid() and public.can_edit_company(company_id));
drop policy if exists "shares: owners edit" on public.shares;
drop policy if exists "shares: team edits" on public.shares;
create policy "shares: team edits" on public.shares for update to authenticated
  using (public.can_edit_company(company_id)) with check (public.can_edit_company(company_id));
drop policy if exists "shares: owners delete" on public.shares;
drop policy if exists "shares: team deletes" on public.shares;
create policy "shares: team deletes" on public.shares for delete to authenticated
  using (public.can_edit_company(company_id));

-- ---------- Invites ----------
-- Admins add TriNet emails with a role (and manager) before people first sign in. The first sign-in creates the
-- profile with that role and manager.

create table if not exists public.invites (
  email text primary key check (email = lower(email) and email like '%@trinet.com'),
  full_name text not null default '',
  role text not null default 'rep' check (role in ('rep', 'manager', 'admin')),
  manager_id uuid references public.profiles (id) on delete set null,
  invited_by uuid default auth.uid() references public.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);

alter table public.invites enable row level security;
revoke all on public.invites from anon;
grant select, insert, update, delete on public.invites to authenticated;
drop policy if exists "invites: admins manage" on public.invites;
create policy "invites: admins manage" on public.invites for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
declare inv public.invites;
begin
  if public.is_trinet_email(new.email) then
    select * into inv from public.invites where email = lower(new.email);
    insert into public.profiles (id, email, full_name, role, manager_id)
    values (new.id, lower(new.email), coalesce(inv.full_name, ''), coalesce(inv.role, 'rep'), inv.manager_id)
    on conflict (id) do nothing;
  end if;
  return new;
end $$;
