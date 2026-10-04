create or replace function public.calculate_age_months(
  p_birthdate date,
  p_as_of_date date default current_date
)
returns integer
language sql
stable
as $$
  select greatest(
    (
      extract(year from age(p_as_of_date, p_birthdate))::integer * 12
    ) + extract(month from age(p_as_of_date, p_birthdate))::integer,
    0
  );
$$;

create or replace function public.find_room_for_birthdate(
  p_birthdate date,
  p_as_of_date date default current_date
)
returns uuid
language sql
stable
set search_path = public
as $$
  with age_value as (
    select public.calculate_age_months(p_birthdate, p_as_of_date) as age_months
  )
  select r.id
  from public.rooms r
  cross join age_value av
  where r.active
    and (r.min_age_months is null or av.age_months >= r.min_age_months)
    and (r.max_age_months is null or av.age_months <= r.max_age_months)
  order by
    coalesce(r.min_age_months, -1) desc,
    coalesce(r.max_age_months, 1000000) asc,
    r.name asc
  limit 1;
$$;

create or replace function public.set_child_default_room()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.default_room_id = public.find_room_for_birthdate(new.birthdate, current_date);
  return new;
end;
$$;

drop trigger if exists set_children_default_room on public.children;

create trigger set_children_default_room
before insert or update of birthdate on public.children
for each row execute function public.set_child_default_room();

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
  v_service_date date;
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

  select se.starts_at::date
  into v_service_date
  from public.service_events se
  where se.id = p_service_event_id;

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
    coalesce(public.find_room_for_birthdate(c.birthdate, coalesce(v_service_date, current_date)), c.default_room_id),
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
  v_service_date date;
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

  select se.starts_at::date
  into v_service_date
  from public.service_events se
  where se.id = p_service_event_id;

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
    coalesce(
      nullif((p_room_assignments ->> c.id::text), '')::uuid,
      public.find_room_for_birthdate(c.birthdate, coalesce(v_service_date, current_date)),
      c.default_room_id
    ),
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

update public.children
set
  default_room_id = public.find_room_for_birthdate(birthdate, current_date),
  updated_at = timezone('utc', now())
where active;
