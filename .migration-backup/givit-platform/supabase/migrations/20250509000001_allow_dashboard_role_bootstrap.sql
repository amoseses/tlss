-- Allow promoting the first admin via Supabase SQL Editor (no auth.uid() session).
-- Customers still cannot escalate role through the API (auth.uid() is set there).

create or replace function public.enforce_profile_role_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'UPDATE' and new.role is distinct from old.role then
    if auth.uid() is not null and not public.is_staff() then
      raise exception 'Only staff can change roles' using errcode = '42501';
    end if;
  end if;
  return new;
end;
$$;
