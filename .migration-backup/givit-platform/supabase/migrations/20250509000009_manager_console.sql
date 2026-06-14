-- Platform manager console: ban accounts, role management via admin-only RPCs.

alter table public.profiles
  add column if not exists is_banned boolean not null default false,
  add column if not exists banned_at timestamptz,
  add column if not exists ban_reason text;

create index if not exists profiles_is_banned_idx on public.profiles (is_banned);

-- Only platform admins may change user roles (not sellers).
create or replace function public.enforce_profile_role_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'UPDATE' and new.role is distinct from old.role then
    if auth.uid() is not null and not public.is_admin() then
      raise exception 'Only platform admins can change roles' using errcode = '42501';
    end if;
  end if;
  return new;
end;
$$;

create or replace function public.manager_set_user_role(
  p_user_id uuid,
  p_role public.user_role
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'Forbidden' using errcode = '42501';
  end if;

  if p_user_id = auth.uid() then
    raise exception 'Cannot change your own role' using errcode = '42501';
  end if;

  if not exists (select 1 from public.profiles where id = p_user_id) then
    raise exception 'User not found' using errcode = 'P0002';
  end if;

  update public.profiles
  set role = p_role
  where id = p_user_id;
end;
$$;

create or replace function public.manager_set_user_banned(
  p_user_id uuid,
  p_banned boolean,
  p_reason text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'Forbidden' using errcode = '42501';
  end if;

  if p_user_id = auth.uid() then
    raise exception 'Cannot ban your own account' using errcode = '42501';
  end if;

  if not exists (select 1 from public.profiles where id = p_user_id) then
    raise exception 'User not found' using errcode = 'P0002';
  end if;

  update public.profiles
  set
    is_banned = p_banned,
    banned_at = case when p_banned then now() else null end,
    ban_reason = case when p_banned then nullif(trim(p_reason), '') else null end
  where id = p_user_id;
end;
$$;

revoke all on function public.manager_set_user_role(uuid, public.user_role) from public;
grant execute on function public.manager_set_user_role(uuid, public.user_role) to authenticated;

revoke all on function public.manager_set_user_banned(uuid, boolean, text) from public;
grant execute on function public.manager_set_user_banned(uuid, boolean, text) to authenticated;

-- Platform admins can read all profiles (replace staff-wide read for management).
drop policy if exists "profiles_select_own_or_staff" on public.profiles;

create policy "profiles_select_own_or_staff"
  on public.profiles for select
  using (
    auth.uid() = id
    or public.is_staff()
  );

-- Feedback: platform admins only (not sellers).
drop policy if exists "feedback_select_staff" on public.feedback;

create policy "feedback_select_admin"
  on public.feedback for select
  using (public.is_admin());
