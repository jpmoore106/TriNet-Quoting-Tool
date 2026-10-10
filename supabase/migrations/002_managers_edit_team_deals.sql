-- Managers (and admins) can edit their reps' companies and manage those companies' share links.
-- Deleting a company stays with its owner, and nobody can move a company to another owner.
-- Run once in the Supabase SQL editor after schema.sql. Safe to re-run.

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
