create table if not exists public.staff_invites (
  email citext primary key,
  role public.app_role not null,
  is_active boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint staff_invites_role_check check (role in ('volunteer', 'admin'))
);

drop trigger if exists set_staff_invites_updated_at on public.staff_invites;

create trigger set_staff_invites_updated_at
before update on public.staff_invites
for each row execute function public.set_updated_at();

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  invited_role public.app_role;
begin
  select si.role
  into invited_role
  from public.staff_invites si
  where si.email = new.email
    and si.is_active
  limit 1;

  insert into public.user_profiles (
    id,
    email,
    full_name,
    phone,
    role,
    background_check_status,
    background_check_completed_at
  )
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'full_name', ''),
    new.raw_user_meta_data ->> 'phone',
    coalesce(invited_role, 'parent'),
    case when invited_role is null then 'pending' else 'approved' end,
    case when invited_role is null then null else timezone('utc', now()) end
  )
  on conflict (id) do update
  set
    email = excluded.email,
    full_name = coalesce(nullif(excluded.full_name, ''), public.user_profiles.full_name),
    phone = coalesce(excluded.phone, public.user_profiles.phone),
    role = excluded.role,
    background_check_status = excluded.background_check_status,
    background_check_completed_at = excluded.background_check_completed_at,
    updated_at = timezone('utc', now());

  return new;
end;
$$;

alter table public.staff_invites enable row level security;

drop policy if exists "admins can view staff invites" on public.staff_invites;
create policy "admins can view staff invites"
on public.staff_invites
for select
to authenticated
using (public.is_admin());

drop policy if exists "admins can manage staff invites" on public.staff_invites;
create policy "admins can manage staff invites"
on public.staff_invites
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

insert into public.staff_invites (email, role)
values
  ('giovannicardenas12998@yahoo.com', 'admin'),
  ('kendracvela@gmail.com', 'admin'),
  ('sarasgotjoy@gmail.com', 'admin'),
  ('matthewneie@gmail.com', 'admin')
on conflict (email) do update
set
  role = excluded.role,
  is_active = true,
  updated_at = timezone('utc', now());

update public.user_profiles
set
  role = 'admin',
  background_check_status = 'approved',
  background_check_completed_at = coalesce(background_check_completed_at, timezone('utc', now())),
  updated_at = timezone('utc', now())
where lower(email::text) in (
  'giovannicardenas12998@yahoo.com',
  'kendracvela@gmail.com',
  'sarasgotjoy@gmail.com',
  'matthewneie@gmail.com'
);
