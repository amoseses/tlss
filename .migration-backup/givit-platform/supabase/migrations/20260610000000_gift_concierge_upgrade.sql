-- Production upgrade for the automated GivIt concierge flow.

alter table public.profiles
  add column if not exists concierge_onboarding_completed boolean not null default false,
  add column if not exists stripe_default_payment_method_id text;

alter table public.gift_recipients
  add column if not exists automation_enabled boolean not null default true;

do $$
begin
  alter table public.gift_approvals drop constraint if exists gift_approvals_status_check;
  alter table public.gift_approvals add constraint gift_approvals_status_check
    check (status in ('draft', 'needs_approval', 'approved', 'paid_pending_fulfillment', 'ordered', 'shipped', 'delivered', 'regenerating', 'skipped', 'cancelled', 'payment_failed'));
end $$;

do $$
begin
  create policy "gift recipients admin access" on public.gift_recipients
    for select using (exists (select 1 from public.profiles where profiles.id = auth.uid() and profiles.role = 'admin'));
exception when duplicate_object then null;
end $$;

do $$
begin
  create policy "gift occasions admin access" on public.gift_occasions
    for select using (exists (select 1 from public.profiles where profiles.id = auth.uid() and profiles.role = 'admin'));
exception when duplicate_object then null;
end $$;

do $$
begin
  create policy "gift approvals admin access" on public.gift_approvals
    for all using (exists (select 1 from public.profiles where profiles.id = auth.uid() and profiles.role = 'admin'))
    with check (exists (select 1 from public.profiles where profiles.id = auth.uid() and profiles.role = 'admin'));
exception when duplicate_object then null;
end $$;

do $$
begin
  create policy "gift approval items admin access" on public.gift_approval_items
    for select using (exists (select 1 from public.profiles where profiles.id = auth.uid() and profiles.role = 'admin'));
exception when duplicate_object then null;
end $$;

do $$
begin
  create policy "gift fulfillment tasks admin access" on public.gift_fulfillment_tasks
    for all using (exists (select 1 from public.profiles where profiles.id = auth.uid() and profiles.role = 'admin'))
    with check (exists (select 1 from public.profiles where profiles.id = auth.uid() and profiles.role = 'admin'));
exception when duplicate_object then null;
end $$;
