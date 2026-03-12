create extension if not exists pgcrypto;
create extension if not exists citext;

create type public.app_role as enum ('parent', 'volunteer', 'admin');
create type public.background_check_status as enum ('pending', 'approved', 'expired', 'rejected');
create type public.checkin_source as enum ('kiosk', 'parent_portal', 'mobile');
create type public.checkin_status as enum ('pending', 'checked_in', 'picked_up', 'cancelled');
create type public.precheckin_status as enum ('queued', 'confirmed', 'cancelled', 'expired');
create type public.notification_channel as enum ('sms', 'in_app');
create type public.notification_status as enum ('queued', 'sent', 'failed');
create type public.service_status as enum ('scheduled', 'live', 'closed');
create type public.verification_method as enum ('security_code', 'qr_scan', 'manual_override');

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

create table public.user_profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email citext unique,
  full_name text not null default '',
  phone text,
  avatar_url text,
  role public.app_role not null default 'parent',
  background_check_status public.background_check_status not null default 'pending',
  background_check_completed_at timestamptz,
  is_active boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table public.families (
  id uuid primary key default gen_random_uuid(),
  household_name text not null,
  primary_phone text not null,
  secondary_phone text,
  email citext,
  address_line_1 text,
  address_line_2 text,
  city text,
  state text,
  postal_code text,
  sms_opt_in boolean not null default true,
  emergency_notes text,
  created_by uuid references auth.users (id),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table public.family_memberships (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  relationship text not null,
  is_primary_guardian boolean not null default false,
  can_check_in boolean not null default true,
  can_pick_up boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  unique (family_id, user_id)
);

create table public.rooms (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  slug text not null unique,
  location text,
  color_hex text not null default '#F97316',
  min_age_months integer,
  max_age_months integer,
  min_grade integer,
  max_grade integer,
  capacity integer,
  active boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table public.service_events (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  campus text not null default 'Main Campus',
  starts_at timestamptz not null,
  ends_at timestamptz,
  status public.service_status not null default 'scheduled',
  created_by uuid references auth.users (id),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table public.children (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families (id),
  first_name text not null,
  last_name text not null,
  preferred_name text,
  birthdate date not null,
  grade_label text,
  allergies text,
  medical_notes text,
  special_instructions text,
  photo_url text,
  default_room_id uuid references public.rooms (id),
  active boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table public.authorized_pickups (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families (id) on delete cascade,
  linked_user_id uuid references auth.users (id),
  full_name text not null,
  phone text,
  relationship text,
  email citext,
  photo_id_last4 text,
  can_pick_up boolean not null default true,
  notes text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table public.precheckins (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families (id) on delete cascade,
  service_event_id uuid not null references public.service_events (id) on delete cascade,
  requested_by uuid not null references auth.users (id),
  status public.precheckin_status not null default 'queued',
  notes text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (family_id, service_event_id)
);

create table public.precheckin_children (
  id uuid primary key default gen_random_uuid(),
  precheckin_id uuid not null references public.precheckins (id) on delete cascade,
  child_id uuid not null references public.children (id),
  room_id uuid references public.rooms (id),
  selected boolean not null default true,
  unique (precheckin_id, child_id)
);

create table public.checkin_sessions (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families (id),
  service_event_id uuid not null references public.service_events (id),
  source public.checkin_source not null default 'kiosk',
  status public.checkin_status not null default 'checked_in',
  security_code text not null,
  security_code_last4 text not null,
  security_qr_token uuid not null default gen_random_uuid(),
  parent_note text,
  created_by uuid references auth.users (id),
  checked_in_at timestamptz not null default timezone('utc', now()),
  picked_up_at timestamptz,
  released_to_authorized_pickup_id uuid references public.authorized_pickups (id),
  picked_up_by_staff_id uuid references auth.users (id),
  kiosk_device_name text,
  label_printed_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table public.checkins (
  id uuid primary key default gen_random_uuid(),
  checkin_session_id uuid not null references public.checkin_sessions (id) on delete cascade,
  family_id uuid not null references public.families (id),
  service_event_id uuid not null references public.service_events (id),
  child_id uuid not null references public.children (id),
  room_id uuid references public.rooms (id),
  dropoff_time timestamptz not null default timezone('utc', now()),
  pickup_time timestamptz,
  status public.checkin_status not null default 'checked_in',
  dropoff_by uuid references auth.users (id),
  picked_up_by_staff_id uuid references auth.users (id),
  released_to_authorized_pickup_id uuid references public.authorized_pickups (id),
  allergies_snapshot text,
  medical_notes_snapshot text,
  special_instructions_snapshot text,
  photo_url_snapshot text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (checkin_session_id, child_id)
);

create table public.pickup_logs (
  id uuid primary key default gen_random_uuid(),
  checkin_session_id uuid not null references public.checkin_sessions (id) on delete cascade,
  checkin_id uuid not null references public.checkins (id) on delete cascade,
  released_to_authorized_pickup_id uuid not null references public.authorized_pickups (id),
  verified_by_staff_id uuid not null references auth.users (id),
  verification_method public.verification_method not null,
  security_code_entered text,
  notes text,
  released_at timestamptz not null default timezone('utc', now()),
  created_at timestamptz not null default timezone('utc', now())
);

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families (id) on delete cascade,
  checkin_session_id uuid references public.checkin_sessions (id) on delete set null,
  recipient_user_id uuid references auth.users (id),
  recipient_phone text,
  channel public.notification_channel not null default 'sms',
  template_key text not null,
  message_body text not null,
  status public.notification_status not null default 'queued',
  provider_sid text,
  sent_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_by uuid references auth.users (id),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index families_household_name_idx on public.families (household_name);
create index families_primary_phone_idx on public.families (primary_phone);
create index family_memberships_user_id_idx on public.family_memberships (user_id);
create index children_family_id_idx on public.children (family_id);
create index children_last_name_idx on public.children (last_name);
create index children_default_room_id_idx on public.children (default_room_id);
create index authorized_pickups_family_id_idx on public.authorized_pickups (family_id);
create index precheckins_family_service_idx on public.precheckins (family_id, service_event_id);
create index checkin_sessions_status_idx on public.checkin_sessions (status, checked_in_at desc);
create index checkin_sessions_security_code_idx on public.checkin_sessions (security_code);
create unique index checkin_sessions_one_active_per_service_idx
  on public.checkin_sessions (family_id, service_event_id)
  where status = 'checked_in';
create index checkins_room_status_idx on public.checkins (room_id, status, dropoff_time desc);
create index checkins_service_status_idx on public.checkins (service_event_id, status);
create index pickup_logs_session_idx on public.pickup_logs (checkin_session_id, released_at desc);
create index notifications_family_status_idx on public.notifications (family_id, status, created_at desc);

create trigger set_user_profiles_updated_at
before update on public.user_profiles
for each row execute function public.set_updated_at();

create trigger set_families_updated_at
before update on public.families
for each row execute function public.set_updated_at();

create trigger set_rooms_updated_at
before update on public.rooms
for each row execute function public.set_updated_at();

create trigger set_service_events_updated_at
before update on public.service_events
for each row execute function public.set_updated_at();

create trigger set_children_updated_at
before update on public.children
for each row execute function public.set_updated_at();

create trigger set_authorized_pickups_updated_at
before update on public.authorized_pickups
for each row execute function public.set_updated_at();

create trigger set_precheckins_updated_at
before update on public.precheckins
for each row execute function public.set_updated_at();

create trigger set_checkin_sessions_updated_at
before update on public.checkin_sessions
for each row execute function public.set_updated_at();

create trigger set_checkins_updated_at
before update on public.checkins
for each row execute function public.set_updated_at();

create trigger set_notifications_updated_at
before update on public.notifications
for each row execute function public.set_updated_at();

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.user_profiles (
    id,
    email,
    full_name,
    phone,
    role
  )
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'full_name', ''),
    new.raw_user_meta_data ->> 'phone',
    'parent'
  )
  on conflict (id) do update
  set
    email = excluded.email,
    full_name = coalesce(nullif(excluded.full_name, ''), public.user_profiles.full_name),
    phone = coalesce(excluded.phone, public.user_profiles.phone),
    updated_at = timezone('utc', now());

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

create or replace function public.is_staff(p_user_id uuid default auth.uid())
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.user_profiles up
    where up.id = p_user_id
      and up.role in ('volunteer', 'admin')
      and up.is_active
  );
$$;

create or replace function public.is_admin(p_user_id uuid default auth.uid())
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.user_profiles up
    where up.id = p_user_id
      and up.role = 'admin'
      and up.is_active
  );
$$;

create or replace function public.generate_security_code()
returns text
language sql
volatile
as $$
  select upper(substring(replace(gen_random_uuid()::text, '-', '') from 1 for 6));
$$;

create or replace function public.calculate_age_years(p_birthdate date)
returns integer
language sql
stable
as $$
  select extract(year from age(current_date, p_birthdate))::integer;
$$;

create or replace function public.search_family_households(p_query text)
returns table (
  family_id uuid,
  household_name text,
  primary_phone text,
  secondary_phone text,
  email citext,
  child_count bigint,
  child_names text
)
language sql
stable
security definer
set search_path = public
as $$
  select
    f.id,
    f.household_name,
    f.primary_phone,
    f.secondary_phone,
    f.email,
    count(c.id) as child_count,
    coalesce(
      string_agg(
        distinct concat_ws(' ', c.first_name, c.last_name),
        ', ' order by concat_ws(' ', c.first_name, c.last_name)
      ),
      ''
    ) as child_names
  from public.families f
  left join public.children c
    on c.family_id = f.id
   and c.active
  where public.is_staff()
    and nullif(trim(p_query), '') is not null
    and (
      lower(f.household_name) like '%' || lower(trim(p_query)) || '%'
      or regexp_replace(coalesce(f.primary_phone, ''), '\D', '', 'g') like '%' || regexp_replace(trim(p_query), '\D', '', 'g') || '%'
      or regexp_replace(coalesce(f.secondary_phone, ''), '\D', '', 'g') like '%' || regexp_replace(trim(p_query), '\D', '', 'g') || '%'
      or exists (
        select 1
        from public.children cx
        where cx.family_id = f.id
          and (
            lower(cx.last_name) like '%' || lower(trim(p_query)) || '%'
            or lower(cx.first_name) like '%' || lower(trim(p_query)) || '%'
          )
      )
    )
  group by f.id, f.household_name, f.primary_phone, f.secondary_phone, f.email
  order by f.household_name asc
  limit 25;
$$;

create or replace function public.find_active_session_by_code(p_code text)
returns table (
  session_id uuid,
  family_id uuid,
  household_name text,
  service_event_id uuid,
  service_name text,
  checked_in_at timestamptz,
  security_code text
)
language sql
stable
security definer
set search_path = public
as $$
  select
    s.id,
    s.family_id,
    f.household_name,
    s.service_event_id,
    se.name,
    s.checked_in_at,
    s.security_code
  from public.checkin_sessions s
  join public.families f
    on f.id = s.family_id
  join public.service_events se
    on se.id = s.service_event_id
  where public.is_staff()
    and s.status = 'checked_in'
    and (
      s.security_code = trim(p_code)
      or s.security_qr_token::text = trim(p_code)
    )
  limit 1;
$$;

create or replace function public.submit_precheckin(
  p_family_id uuid,
  p_service_event_id uuid,
  p_child_ids uuid[],
  p_notes text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_precheckin_id uuid;
  v_rows_inserted integer;
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;

  if not exists (
    select 1
    from public.family_memberships fm
    where fm.family_id = p_family_id
      and fm.user_id = auth.uid()
      and fm.can_check_in
  ) then
    raise exception 'You do not have permission to pre-check-in this family';
  end if;

  if array_length(p_child_ids, 1) is null then
    raise exception 'Select at least one child';
  end if;

  insert into public.precheckins (
    family_id,
    service_event_id,
    requested_by,
    status,
    notes
  )
  values (
    p_family_id,
    p_service_event_id,
    auth.uid(),
    'queued',
    p_notes
  )
  on conflict (family_id, service_event_id) do update
  set
    requested_by = excluded.requested_by,
    status = 'queued',
    notes = excluded.notes,
    updated_at = timezone('utc', now())
  returning id into v_precheckin_id;

  delete from public.precheckin_children
  where precheckin_id = v_precheckin_id;

  insert into public.precheckin_children (
    precheckin_id,
    child_id,
    room_id,
    selected
  )
  select
    v_precheckin_id,
    c.id,
    c.default_room_id,
    true
  from public.children c
  where c.family_id = p_family_id
    and c.id = any (p_child_ids)
    and c.active;

  get diagnostics v_rows_inserted = row_count;

  if v_rows_inserted = 0 then
    raise exception 'No matching children were found for this family';
  end if;

  return v_precheckin_id;
end;
$$;

create or replace function public.create_family_household(
  p_household_name text,
  p_primary_phone text,
  p_email text default null,
  p_address_line_1 text default null,
  p_address_line_2 text default null,
  p_city text default null,
  p_state text default null,
  p_postal_code text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_family_id uuid;
  v_profile public.user_profiles%rowtype;
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;

  if exists (
    select 1
    from public.family_memberships fm
    where fm.user_id = auth.uid()
  ) then
    raise exception 'This account already belongs to a family';
  end if;

  select *
  into v_profile
  from public.user_profiles
  where id = auth.uid();

  insert into public.families (
    household_name,
    primary_phone,
    email,
    address_line_1,
    address_line_2,
    city,
    state,
    postal_code,
    created_by
  )
  values (
    p_household_name,
    p_primary_phone,
    p_email,
    p_address_line_1,
    p_address_line_2,
    p_city,
    p_state,
    p_postal_code,
    auth.uid()
  )
  returning id into v_family_id;

  insert into public.family_memberships (
    family_id,
    user_id,
    relationship,
    is_primary_guardian,
    can_check_in,
    can_pick_up
  )
  values (
    v_family_id,
    auth.uid(),
    'Parent/Guardian',
    true,
    true,
    true
  );

  insert into public.authorized_pickups (
    family_id,
    linked_user_id,
    full_name,
    phone,
    email,
    relationship,
    can_pick_up
  )
  values (
    v_family_id,
    auth.uid(),
    coalesce(nullif(v_profile.full_name, ''), 'Primary Guardian'),
    coalesce(v_profile.phone, p_primary_phone),
    coalesce(v_profile.email::text, p_email),
    'Parent/Guardian',
    true
  );

  update public.user_profiles
  set
    phone = coalesce(user_profiles.phone, p_primary_phone),
    updated_at = timezone('utc', now())
  where id = auth.uid();

  return v_family_id;
end;
$$;

create or replace function public.staff_issue_checkin(
  p_family_id uuid,
  p_service_event_id uuid,
  p_child_ids uuid[],
  p_room_assignments jsonb default '{}'::jsonb,
  p_parent_note text default null,
  p_source public.checkin_source default 'kiosk'
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_session_id uuid;
  v_security_code text;
  v_rows_inserted integer;
begin
  if not public.is_staff() then
    raise exception 'Only volunteers or admins can issue check-ins';
  end if;

  if array_length(p_child_ids, 1) is null then
    raise exception 'Select at least one child';
  end if;

  if exists (
    select 1
    from public.checkin_sessions s
    where s.family_id = p_family_id
      and s.service_event_id = p_service_event_id
      and s.status = 'checked_in'
  ) then
    raise exception 'This family already has an active check-in for the selected service';
  end if;

  select public.generate_security_code() into v_security_code;

  insert into public.checkin_sessions (
    family_id,
    service_event_id,
    source,
    status,
    security_code,
    security_code_last4,
    parent_note,
    created_by,
    checked_in_at
  )
  values (
    p_family_id,
    p_service_event_id,
    p_source,
    'checked_in',
    v_security_code,
    right(v_security_code, 4),
    p_parent_note,
    auth.uid(),
    timezone('utc', now())
  )
  returning id into v_session_id;

  insert into public.checkins (
    checkin_session_id,
    family_id,
    service_event_id,
    child_id,
    room_id,
    dropoff_time,
    status,
    dropoff_by,
    allergies_snapshot,
    medical_notes_snapshot,
    special_instructions_snapshot,
    photo_url_snapshot
  )
  select
    v_session_id,
    c.family_id,
    p_service_event_id,
    c.id,
    coalesce(nullif((p_room_assignments ->> c.id::text), '')::uuid, c.default_room_id),
    timezone('utc', now()),
    'checked_in',
    auth.uid(),
    c.allergies,
    c.medical_notes,
    c.special_instructions,
    c.photo_url
  from public.children c
  where c.family_id = p_family_id
    and c.id = any (p_child_ids)
    and c.active;

  get diagnostics v_rows_inserted = row_count;

  if v_rows_inserted = 0 then
    raise exception 'No eligible children were found for the selected family';
  end if;

  update public.precheckins
  set
    status = 'confirmed',
    updated_at = timezone('utc', now())
  where family_id = p_family_id
    and service_event_id = p_service_event_id
    and status = 'queued';

  return v_session_id;
end;
$$;

create or replace function public.complete_pickup(
  p_session_id uuid,
  p_security_code text,
  p_authorized_pickup_id uuid,
  p_notes text default null,
  p_verification_method public.verification_method default 'security_code'
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_session public.checkin_sessions%rowtype;
begin
  if not public.is_staff() then
    raise exception 'Only volunteers or admins can complete pickup';
  end if;

  select *
  into v_session
  from public.checkin_sessions s
  where s.id = p_session_id
    and s.status = 'checked_in'
  for update;

  if not found then
    raise exception 'No active check-in session was found';
  end if;

  if not exists (
    select 1
    from public.authorized_pickups ap
    where ap.id = p_authorized_pickup_id
      and ap.family_id = v_session.family_id
      and ap.can_pick_up
  ) then
    raise exception 'The selected pickup adult is not approved for this family';
  end if;

  if p_verification_method in ('security_code', 'qr_scan')
     and coalesce(trim(p_security_code), '') <> v_session.security_code then
    raise exception 'Security code does not match the active session';
  end if;

  if p_verification_method = 'manual_override'
     and not public.is_admin() then
    raise exception 'Manual override requires an admin account';
  end if;

  update public.checkin_sessions
  set
    status = 'picked_up',
    picked_up_at = timezone('utc', now()),
    released_to_authorized_pickup_id = p_authorized_pickup_id,
    picked_up_by_staff_id = auth.uid(),
    updated_at = timezone('utc', now())
  where id = p_session_id;

  update public.checkins
  set
    status = 'picked_up',
    pickup_time = timezone('utc', now()),
    picked_up_by_staff_id = auth.uid(),
    released_to_authorized_pickup_id = p_authorized_pickup_id,
    updated_at = timezone('utc', now())
  where checkin_session_id = p_session_id
    and status = 'checked_in';

  insert into public.pickup_logs (
    checkin_session_id,
    checkin_id,
    released_to_authorized_pickup_id,
    verified_by_staff_id,
    verification_method,
    security_code_entered,
    notes
  )
  select
    p_session_id,
    c.id,
    p_authorized_pickup_id,
    auth.uid(),
    p_verification_method,
    p_security_code,
    p_notes
  from public.checkins c
  where c.checkin_session_id = p_session_id;

  return p_session_id;
end;
$$;

create or replace function public.queue_sms_notification(
  p_family_id uuid,
  p_checkin_session_id uuid,
  p_template_key text,
  p_message_body text,
  p_recipient_phone text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_notification_id uuid;
  v_recipient_phone text;
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;

  if not public.is_staff()
     and not exists (
       select 1
       from public.family_memberships fm
       where fm.family_id = p_family_id
         and fm.user_id = auth.uid()
     ) then
    raise exception 'You do not have permission to contact this family';
  end if;

  select coalesce(p_recipient_phone, f.primary_phone)
  into v_recipient_phone
  from public.families f
  where f.id = p_family_id;

  insert into public.notifications (
    family_id,
    checkin_session_id,
    recipient_phone,
    channel,
    template_key,
    message_body,
    status,
    created_by
  )
  values (
    p_family_id,
    p_checkin_session_id,
    v_recipient_phone,
    'sms',
    p_template_key,
    p_message_body,
    'queued',
    auth.uid()
  )
  returning id into v_notification_id;

  return v_notification_id;
end;
$$;

create or replace view public.attendance_rollup
with (security_invoker = true)
as
select
  c.service_event_id,
  se.name as service_name,
  date_trunc('day', se.starts_at) as service_day,
  c.room_id,
  r.name as room_name,
  count(*) filter (where c.status = 'checked_in') as active_count,
  count(*) filter (where c.status = 'picked_up') as picked_up_count,
  count(*) as total_count
from public.checkins c
join public.service_events se
  on se.id = c.service_event_id
left join public.rooms r
  on r.id = c.room_id
group by c.service_event_id, se.name, date_trunc('day', se.starts_at), c.room_id, r.name;

grant usage on schema public to anon, authenticated;
grant select, insert, update, delete on all tables in schema public to authenticated;
grant usage, select on all sequences in schema public to authenticated;
grant execute on all functions in schema public to authenticated;

alter table public.user_profiles enable row level security;
alter table public.families enable row level security;
alter table public.family_memberships enable row level security;
alter table public.rooms enable row level security;
alter table public.service_events enable row level security;
alter table public.children enable row level security;
alter table public.authorized_pickups enable row level security;
alter table public.precheckins enable row level security;
alter table public.precheckin_children enable row level security;
alter table public.checkin_sessions enable row level security;
alter table public.checkins enable row level security;
alter table public.pickup_logs enable row level security;
alter table public.notifications enable row level security;

create policy "users can view their profile or staff can view all"
on public.user_profiles
for select
to authenticated
using (id = auth.uid() or public.is_staff());

create policy "users can update their profile"
on public.user_profiles
for update
to authenticated
using (id = auth.uid() or public.is_admin())
with check (id = auth.uid() or public.is_admin());

create policy "staff can insert profiles"
on public.user_profiles
for insert
to authenticated
with check (public.is_staff());

create policy "family members and staff can view families"
on public.families
for select
to authenticated
using (
  public.is_staff()
  or exists (
    select 1
    from public.family_memberships fm
    where fm.family_id = families.id
      and fm.user_id = auth.uid()
  )
);

create policy "family creators and staff can insert families"
on public.families
for insert
to authenticated
with check (
  public.is_staff()
  or created_by = auth.uid()
);

create policy "family members and staff can update families"
on public.families
for update
to authenticated
using (
  public.is_staff()
  or exists (
    select 1
    from public.family_memberships fm
    where fm.family_id = families.id
      and fm.user_id = auth.uid()
  )
)
with check (
  public.is_staff()
  or exists (
    select 1
    from public.family_memberships fm
    where fm.family_id = families.id
      and fm.user_id = auth.uid()
  )
);

create policy "members can view their memberships and staff can view all"
on public.family_memberships
for select
to authenticated
using (user_id = auth.uid() or public.is_staff());

create policy "staff can manage family memberships"
on public.family_memberships
for all
to authenticated
using (public.is_staff())
with check (public.is_staff());

create policy "family members and staff can view children"
on public.children
for select
to authenticated
using (
  public.is_staff()
  or exists (
    select 1
    from public.family_memberships fm
    where fm.family_id = children.family_id
      and fm.user_id = auth.uid()
  )
);

create policy "family members and staff can insert children"
on public.children
for insert
to authenticated
with check (
  public.is_staff()
  or exists (
    select 1
    from public.family_memberships fm
    where fm.family_id = children.family_id
      and fm.user_id = auth.uid()
      and fm.can_check_in
  )
);

create policy "family members and staff can update children"
on public.children
for update
to authenticated
using (
  public.is_staff()
  or exists (
    select 1
    from public.family_memberships fm
    where fm.family_id = children.family_id
      and fm.user_id = auth.uid()
      and fm.can_check_in
  )
)
with check (
  public.is_staff()
  or exists (
    select 1
    from public.family_memberships fm
    where fm.family_id = children.family_id
      and fm.user_id = auth.uid()
      and fm.can_check_in
  )
);

create policy "authenticated users can view rooms"
on public.rooms
for select
to authenticated
using (true);

create policy "staff can manage rooms"
on public.rooms
for all
to authenticated
using (public.is_staff())
with check (public.is_staff());

create policy "authenticated users can view service events"
on public.service_events
for select
to authenticated
using (true);

create policy "staff can manage service events"
on public.service_events
for all
to authenticated
using (public.is_staff())
with check (public.is_staff());

create policy "family members and staff can view authorized pickups"
on public.authorized_pickups
for select
to authenticated
using (
  public.is_staff()
  or exists (
    select 1
    from public.family_memberships fm
    where fm.family_id = authorized_pickups.family_id
      and fm.user_id = auth.uid()
  )
);

create policy "family members and staff can manage authorized pickups"
on public.authorized_pickups
for all
to authenticated
using (
  public.is_staff()
  or exists (
    select 1
    from public.family_memberships fm
    where fm.family_id = authorized_pickups.family_id
      and fm.user_id = auth.uid()
      and fm.can_pick_up
  )
)
with check (
  public.is_staff()
  or exists (
    select 1
    from public.family_memberships fm
    where fm.family_id = authorized_pickups.family_id
      and fm.user_id = auth.uid()
      and fm.can_pick_up
  )
);

create policy "family members and staff can view precheckins"
on public.precheckins
for select
to authenticated
using (
  public.is_staff()
  or exists (
    select 1
    from public.family_memberships fm
    where fm.family_id = precheckins.family_id
      and fm.user_id = auth.uid()
  )
);

create policy "family members and staff can insert precheckins"
on public.precheckins
for insert
to authenticated
with check (
  public.is_staff()
  or (
    requested_by = auth.uid()
    and exists (
      select 1
      from public.family_memberships fm
      where fm.family_id = precheckins.family_id
        and fm.user_id = auth.uid()
        and fm.can_check_in
    )
  )
);

create policy "family members and staff can update precheckins"
on public.precheckins
for update
to authenticated
using (
  public.is_staff()
  or exists (
    select 1
    from public.family_memberships fm
    where fm.family_id = precheckins.family_id
      and fm.user_id = auth.uid()
      and fm.can_check_in
  )
)
with check (
  public.is_staff()
  or exists (
    select 1
    from public.family_memberships fm
    where fm.family_id = precheckins.family_id
      and fm.user_id = auth.uid()
      and fm.can_check_in
  )
);

create policy "family members and staff can view precheckin children"
on public.precheckin_children
for select
to authenticated
using (
  public.is_staff()
  or exists (
    select 1
    from public.precheckins p
    join public.family_memberships fm
      on fm.family_id = p.family_id
    where p.id = precheckin_children.precheckin_id
      and fm.user_id = auth.uid()
  )
);

create policy "family members and staff can manage precheckin children"
on public.precheckin_children
for all
to authenticated
using (
  public.is_staff()
  or exists (
    select 1
    from public.precheckins p
    join public.family_memberships fm
      on fm.family_id = p.family_id
    where p.id = precheckin_children.precheckin_id
      and fm.user_id = auth.uid()
      and fm.can_check_in
  )
)
with check (
  public.is_staff()
  or exists (
    select 1
    from public.precheckins p
    join public.family_memberships fm
      on fm.family_id = p.family_id
    where p.id = precheckin_children.precheckin_id
      and fm.user_id = auth.uid()
      and fm.can_check_in
  )
);

create policy "family members and staff can view checkin sessions"
on public.checkin_sessions
for select
to authenticated
using (
  public.is_staff()
  or exists (
    select 1
    from public.family_memberships fm
    where fm.family_id = checkin_sessions.family_id
      and fm.user_id = auth.uid()
  )
);

create policy "staff can manage checkin sessions"
on public.checkin_sessions
for all
to authenticated
using (public.is_staff())
with check (public.is_staff());

create policy "family members and staff can view checkins"
on public.checkins
for select
to authenticated
using (
  public.is_staff()
  or exists (
    select 1
    from public.family_memberships fm
    where fm.family_id = checkins.family_id
      and fm.user_id = auth.uid()
  )
);

create policy "staff can manage checkins"
on public.checkins
for all
to authenticated
using (public.is_staff())
with check (public.is_staff());

create policy "family members and staff can view pickup logs"
on public.pickup_logs
for select
to authenticated
using (
  public.is_staff()
  or exists (
    select 1
    from public.checkin_sessions s
    join public.family_memberships fm
      on fm.family_id = s.family_id
    where s.id = pickup_logs.checkin_session_id
      and fm.user_id = auth.uid()
  )
);

create policy "staff can manage pickup logs"
on public.pickup_logs
for all
to authenticated
using (public.is_staff())
with check (public.is_staff());

create policy "family members and staff can view notifications"
on public.notifications
for select
to authenticated
using (
  public.is_staff()
  or recipient_user_id = auth.uid()
  or exists (
    select 1
    from public.family_memberships fm
    where fm.family_id = notifications.family_id
      and fm.user_id = auth.uid()
  )
);

create policy "staff can manage notifications"
on public.notifications
for all
to authenticated
using (public.is_staff())
with check (public.is_staff());

alter publication supabase_realtime add table public.precheckins;
alter publication supabase_realtime add table public.precheckin_children;
alter publication supabase_realtime add table public.checkin_sessions;
alter publication supabase_realtime add table public.checkins;
alter publication supabase_realtime add table public.pickup_logs;
alter publication supabase_realtime add table public.notifications;
