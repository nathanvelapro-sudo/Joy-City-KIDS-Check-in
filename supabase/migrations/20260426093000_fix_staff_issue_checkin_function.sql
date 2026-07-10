drop function if exists public.staff_issue_checkin(
  uuid,
  uuid,
  uuid[],
  jsonb,
  text,
  public.checkin_source
);

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
