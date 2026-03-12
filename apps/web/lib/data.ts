import type { SupabaseClient } from "@supabase/supabase-js";

import { buildLabelPayload } from "@/lib/labels";

type AppSupabase = SupabaseClient<any, "public", any>;

export async function getUpcomingServices(supabase: AppSupabase) {
  const { data } = await supabase
    .from("service_events")
    .select("*")
    .neq("status", "closed")
    .order("starts_at", { ascending: true })
    .limit(8);

  return data ?? [];
}

export async function getRooms(supabase: AppSupabase) {
  const { data } = await supabase
    .from("rooms")
    .select("*")
    .eq("active", true)
    .order("name", { ascending: true });

  return data ?? [];
}

export async function getRecentNotifications(
  supabase: AppSupabase,
  familyId?: string,
  limit = 20,
) {
  let query = supabase
    .from("notifications")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (familyId) {
    query = query.eq("family_id", familyId);
  }

  const { data } = await query;
  return data ?? [];
}

export async function resolveFamilyId(supabase: AppSupabase, userId: string) {
  const { data } = await supabase
    .from("family_memberships")
    .select("family_id")
    .eq("user_id", userId)
    .limit(1)
    .maybeSingle();

  return data?.family_id ?? null;
}

export async function fetchFamilyBundle(supabase: AppSupabase, familyId: string) {
  const [
    familyResult,
    childrenResult,
    authorizedPickupsResult,
    activeSessionResult,
    notifications,
  ] = await Promise.all([
    supabase.from("families").select("*").eq("id", familyId).single(),
    supabase.from("children").select("*").eq("family_id", familyId).order("first_name"),
    supabase.from("authorized_pickups").select("*").eq("family_id", familyId).order("full_name"),
    supabase
      .from("checkin_sessions")
      .select("*")
      .eq("family_id", familyId)
      .eq("status", "checked_in")
      .order("checked_in_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    getRecentNotifications(supabase, familyId, 12),
  ]);

  const activeSession = activeSessionResult.data ?? null;
  const activeCheckins = activeSession
    ? (
        await supabase
          .from("checkins")
          .select("*")
          .eq("checkin_session_id", activeSession.id)
          .order("dropoff_time", { ascending: true })
      ).data ?? []
    : [];

  if (!familyResult.data) {
    return null;
  }

  return {
    family: familyResult.data,
    children: childrenResult.data ?? [],
    authorizedPickups: authorizedPickupsResult.data ?? [],
    activeSession,
    activeCheckins,
    notifications,
  };
}

export async function fetchQueuedPrecheckins(
  supabase: AppSupabase,
  serviceEventId?: string,
) {
  let query = supabase
    .from("precheckins")
    .select(
      "*, family:families(id, household_name, primary_phone), service:service_events(id, name, starts_at), items:precheckin_children(child_id, room_id)",
    )
    .eq("status", "queued")
    .order("created_at", { ascending: false });

  if (serviceEventId) {
    query = query.eq("service_event_id", serviceEventId);
  }

  const { data } = await query;
  return data ?? [];
}

export async function getParentBootstrap(supabase: AppSupabase, userId: string) {
  const [services, rooms, familyId] = await Promise.all([
    getUpcomingServices(supabase),
    getRooms(supabase),
    resolveFamilyId(supabase, userId),
  ]);

  const [snapshot, precheckins] = await Promise.all([
    familyId ? fetchFamilyBundle(supabase, familyId) : Promise.resolve(null),
    familyId
      ? supabase
          .from("precheckins")
          .select("*, service:service_events(id, name, starts_at)")
          .eq("family_id", familyId)
          .order("updated_at", { ascending: false })
      : Promise.resolve({ data: [] as any[] }),
  ]);

  return {
    familyId,
    rooms,
    services,
    snapshot,
    precheckins: precheckins.data ?? [],
  };
}

export async function getKioskBootstrap(supabase: AppSupabase) {
  const [services, rooms] = await Promise.all([
    getUpcomingServices(supabase),
    getRooms(supabase),
  ]);

  const selectedServiceId = services[0]?.id as string | undefined;
  const precheckins = await fetchQueuedPrecheckins(supabase, selectedServiceId);

  return {
    rooms,
    services,
    precheckins,
    selectedServiceId: selectedServiceId ?? null,
  };
}

export async function fetchKioskFamilyDetails(
  supabase: AppSupabase,
  familyId: string,
) {
  const [snapshot, queuedPrecheckins] = await Promise.all([
    fetchFamilyBundle(supabase, familyId),
    supabase
      .from("precheckins")
      .select("*, items:precheckin_children(child_id, room_id)")
      .eq("family_id", familyId)
      .eq("status", "queued")
      .order("updated_at", { ascending: false }),
  ]);

  return {
    snapshot,
    queuedPrecheckins: queuedPrecheckins.data ?? [],
  };
}

export async function fetchCheckinLabelPayload(
  supabase: AppSupabase,
  sessionId: string,
) {
  const sessionResult = await supabase
    .from("checkin_sessions")
    .select("*")
    .eq("id", sessionId)
    .single();

  if (!sessionResult.data) {
    return null;
  }

  const session = sessionResult.data;
  const [familyResult, serviceResult, checkinsResult, rooms] = await Promise.all([
    supabase.from("families").select("*").eq("id", session.family_id).single(),
    supabase.from("service_events").select("*").eq("id", session.service_event_id).single(),
    supabase.from("checkins").select("*").eq("checkin_session_id", sessionId),
    getRooms(supabase),
  ]);

  const childIds = (checkinsResult.data ?? []).map((checkin) => checkin.child_id);
  const { data: children } = await supabase
    .from("children")
    .select("*")
    .in("id", childIds.length > 0 ? childIds : ["00000000-0000-0000-0000-000000000000"]);

  if (!familyResult.data) {
    return null;
  }

  return buildLabelPayload({
    family: familyResult.data,
    session,
    service: serviceResult.data ?? null,
    children: children ?? [],
    checkins: checkinsResult.data ?? [],
    rooms,
  });
}

export async function fetchRoomBoard(
  supabase: AppSupabase,
  serviceEventId: string,
) {
  const { data } = await supabase
    .from("checkins")
    .select(
      "*, child:children(*), family:families(id, household_name, primary_phone), room:rooms(id, name, color_hex, location), session:checkin_sessions(id, security_code, security_code_last4, checked_in_at, parent_note)",
    )
    .eq("service_event_id", serviceEventId)
    .in("status", ["checked_in", "picked_up"])
    .order("dropoff_time", { ascending: false });

  return data ?? [];
}

export async function getDashboardSnapshot(supabase: AppSupabase) {
  const services = await getUpcomingServices(supabase);
  const currentService = services[0] ?? null;
  const [rooms, board, notifications, volunteers] = await Promise.all([
    getRooms(supabase),
    currentService ? fetchRoomBoard(supabase, currentService.id) : Promise.resolve([]),
    getRecentNotifications(supabase, undefined, 15),
    supabase
      .from("user_profiles")
      .select("*")
      .in("role", ["volunteer", "admin"])
      .order("full_name"),
  ]);

  return {
    services,
    currentService,
    rooms,
    board,
    notifications,
    volunteers: volunteers.data ?? [],
  };
}

export async function fetchPickupSearchResult(
  supabase: AppSupabase,
  code: string,
) {
  const { data: sessions } = await supabase.rpc("find_active_session_by_code", {
    p_code: code.trim(),
  });

  const sessionMatch = sessions?.[0];
  if (!sessionMatch) {
    return null;
  }

  const [bundle, checkins, service] = await Promise.all([
    fetchFamilyBundle(supabase, sessionMatch.family_id),
    supabase
      .from("checkins")
      .select("*, child:children(*), room:rooms(id, name)")
      .eq("checkin_session_id", sessionMatch.session_id)
      .order("dropoff_time", { ascending: true }),
    supabase
      .from("service_events")
      .select("*")
      .eq("id", sessionMatch.service_event_id)
      .single(),
  ]);

  return {
    session: sessionMatch,
    service: service.data ?? null,
    bundle,
    checkins: checkins.data ?? [],
  };
}

export async function getReportsSnapshot(supabase: AppSupabase) {
  const [attendance, pickupLogs, volunteers] = await Promise.all([
    supabase
      .from("attendance_rollup")
      .select("*")
      .order("service_day", { ascending: false }),
    supabase
      .from("pickup_logs")
      .select(
        "*, pickup:authorized_pickups(full_name), checkin:checkins(id, child_id), session:checkin_sessions(id, security_code, family_id, service_event_id), child:children(first_name, last_name), family:families(household_name)",
      )
      .order("released_at", { ascending: false })
      .limit(50),
    supabase
      .from("user_profiles")
      .select("*")
      .in("role", ["volunteer", "admin"])
      .order("full_name"),
  ]);

  return {
    attendance: attendance.data ?? [],
    pickupLogs: pickupLogs.data ?? [],
    volunteers: volunteers.data ?? [],
  };
}

