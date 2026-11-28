-- Scope team_memberships to the people each row concerns.
--
-- 20260526_templates_team_audit.sql let anyone (including signed-out visitors
-- holding the public anon key) read every row, and let any signed-in user
-- insert, update or delete any row, so one account could list every invited
-- email address, promote itself to Owner or wipe other people's teams.
--
-- After this migration a row is visible to the person who sent the invite
-- and to the invited person. Only the inviter can create, change or remove
-- an invite. The invited person can accept or decline it (status only) and
-- remove themselves.

drop policy if exists "Users can view team memberships" on public.team_memberships;
drop policy if exists "Admins and Owners can insert team memberships" on public.team_memberships;
drop policy if exists "Admins and Owners can update team memberships" on public.team_memberships;
drop policy if exists "Admins and Owners can delete team memberships" on public.team_memberships;

revoke all on public.team_memberships from anon;

create or replace function public.is_team_invitee(p_email text, p_user_id uuid)
returns boolean
language sql
stable
set search_path = public
as $$
  select auth.uid() is not null and (
    p_user_id = auth.uid()
    or lower(p_email) = lower(coalesce(auth.jwt() ->> 'email', ''))
  );
$$;

create policy "Team memberships visible to inviter and invitee" on public.team_memberships
  for select to authenticated
  using (invited_by = auth.uid() or public.is_team_invitee(email, user_id));

create policy "Inviter creates team memberships" on public.team_memberships
  for insert to authenticated
  with check (invited_by = auth.uid());

create policy "Inviter or invitee updates team memberships" on public.team_memberships
  for update to authenticated
  using (invited_by = auth.uid() or public.is_team_invitee(email, user_id))
  with check (invited_by = auth.uid() or public.is_team_invitee(email, user_id));

create policy "Inviter or invitee deletes team memberships" on public.team_memberships
  for delete to authenticated
  using (invited_by = auth.uid() or public.is_team_invitee(email, user_id));

-- An invitee may only accept or decline (and link their own user id); the
-- role, email and inviter can only be changed by the person who sent it.
create or replace function public.team_memberships_guard_invitee_update()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if auth.uid() is null or old.invited_by = auth.uid() then
    return new;
  end if;
  if new.role is distinct from old.role
     or new.email is distinct from old.email
     or new.invited_by is distinct from old.invited_by
     or (new.user_id is distinct from old.user_id and new.user_id is distinct from auth.uid()) then
    raise exception 'Only the person who sent this invite can change it'
      using errcode = '42501';
  end if;
  return new;
end;
$$;

drop trigger if exists team_memberships_guard_invitee_update on public.team_memberships;
create trigger team_memberships_guard_invitee_update
  before update on public.team_memberships
  for each row execute function public.team_memberships_guard_invitee_update();
