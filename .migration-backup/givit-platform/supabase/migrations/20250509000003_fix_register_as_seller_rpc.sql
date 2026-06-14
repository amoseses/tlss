-- PostgREST matches RPC args by name (alphabetical). Redefine with p_business_description first.

create or replace function public.register_as_seller(
  p_business_description text,
  p_company_name text
)
returns public.user_role
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  profile_role public.user_role;
  trimmed_company text := nullif(trim(p_company_name), '');
begin
  if uid is null then
    raise exception 'Sign in required' using errcode = '42501';
  end if;

  if trimmed_company is null then
    raise exception 'Company name is required' using errcode = '22023';
  end if;

  select p.role into profile_role from public.profiles p where p.id = uid;
  if not found then
    raise exception 'Profile not found' using errcode = 'P0002';
  end if;

  if profile_role = 'staff'::public.user_role or profile_role = 'admin'::public.user_role then
    return profile_role;
  end if;

  if profile_role <> 'customer'::public.user_role then
    raise exception 'Cannot register as seller from role %', profile_role using errcode = '42501';
  end if;

  alter table public.profiles disable trigger profiles_enforce_role;

  update public.profiles
  set
    role = 'staff'::public.user_role,
    company_name = trimmed_company
  where id = uid;

  alter table public.profiles enable trigger profiles_enforce_role;

  insert into public.seller_applications (user_id, company_name, business_description)
  values (uid, trimmed_company, nullif(trim(p_business_description), ''))
  on conflict (user_id) do update
  set
    company_name = excluded.company_name,
    business_description = excluded.business_description,
    created_at = now();

  return 'staff'::public.user_role;
end;
$$;

revoke all on function public.register_as_seller(text, text) from public;
grant execute on function public.register_as_seller(text, text) to authenticated;

-- Refresh PostgREST schema cache (Supabase picks this up automatically; run NOTIFY if needed)
notify pgrst, 'reload schema';
