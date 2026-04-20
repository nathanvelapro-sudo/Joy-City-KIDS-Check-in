import type { SupabaseClient } from "@supabase/supabase-js";

import { buildLabelPayload } from "@/lib/labels";

type AppSupabase = SupabaseClient<any, "public", any>;
const DEFAULT_SERVICE_DURATION_MINUTES = 90;

function getStartOfTodayIso() {
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  return startOfToday.toISOString();
}

function getServiceEndTimestamp(service: { starts_at?: string | null; ends_at?: string | null }) {
  const startsAt = service.starts_at ? new Date(service.starts_at).getTime() : Number.NaN;

  if (Number.isNaN(startsAt)) {
    return Number.NaN;
  }

  if (service.ends_at) {
    const endsAt = new Date(service.ends_at).getTime();
    if (!Number.isNaN(endsAt)) {
      return endsAt;
    }
  }

  return startsAt + DEFAULT_SERVICE_DURATION_MINUTES * 60_000;
}

function isServiceStillUpcomingOrLive(
  service: { starts_at?: string | null; ends_at?: string | null },
  referenceTime = Date.now(),
) {
  const serviceEnd = getServiceEndTimestamp(service);

  if (!Number.isNaN(serviceEnd)) {
    return serviceEnd >= referenceTime;
  }

  const startsAt = service.starts_at ? new Date(service.starts_at).getTime() : Number.NaN;
  return !Number.isNaN(startsAt) && startsAt >= referenceTime;
}

function normalizeSessionRecord<T extends { id?: string; session_id?: string } | null | undefined>(session: T) {
  if (!session) {
    return null;
  }

  return {
    ...session,
    session_id: session.session_id ?? session.id ?? null,
  };
}

function pickDefaultServiceId(services: Array<{ id: string; starts_at: string; ends_at?: string | null; status?: string }>) {
  const now = Date.now();

  const liveService = services.find((service) => {
    const startsAt = new Date(service.starts_at).getTime();
    const endsAt = getServiceEndTimestamp(service);

    if (Number.isNaN(startsAt) || Number.isNaN(endsAt)) {
      return false;
    }

    return startsAt <= now && endsAt >= now;
  });

  if (liveService) {
    return liveService.id;
  }

  return services[0]?.id ?? null;
}

function selectActiveSession(
  sessions: any[],
  serviceEventId?: string | null,
) {
  if (serviceEventId) {
    return normalizeSessionRecord(
      sessions.find((session) => session.service_event_id === serviceEventId) ?? null,
    );
  }

  const relevantSessions = sessions.filter((session) => isServiceStillUpcomingOrLive(session.service));

  return normalizeSessionRecord(
    relevantSessions.sort(
      (left, right) =>
        new Date(right.checked_in_at ?? 0).getTime() - new Date(left.checked_in_at ?? 0).getTime(),
    )[0] ?? null,
  );
}

export async function getUpcomingServices(supabase: AppSupabase) {
  const { data } = await supabase
    .from("service_events")
    .select("*")
    .neq("status", "closed")
    .gte("starts_at", getStartOfTodayIso())
    .order("starts_at", { ascending: true })
    .limit(12);

  return (data ?? []).filter((service) => isServiceStillUpcomingOrLive(service));
}

export async function getRooms(supabase: AppSupabase) {
  const { data } = await supabase
    .from("rooms")
    .select("*")
    .eq("active", true)
    .order("min_age_months", { ascending: true, nullsFirst: false })
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
    activeSessionsResult,
    notifications,
  ] = await Promise.all([
    supabase.from("families").select("*").eq("id", familyId).single(),
    supabase
      .from("children")
      .select("*")
      .eq("family_id", familyId)
      .eq("active", true)
      .order("first_name"),
    supabase
      .from("authorized_pickups")
      .select("*")
      .eq("family_id", familyId)
      .eq("can_pick_up", true)
      .order("full_name"),
    supabase
      .from("checkin_sessions")
      .select("*, service:service_events(id, name, starts_at, ends_at, status)")
      .eq("family_id", familyId)
      .eq("status", "checked_in")
      .order("checked_in_at", { ascending: false })
      .limit(12),
    getRecentNotifications(supabase, familyId, 12),
  ]);

  const activeSession = selectActiveSession(activeSessionsResult.data ?? []);
  const activeCheckins = activeSession
    ? (
        await supabase
          .from("checkins")
          .select("*")
          .eq("checkin_session_id", activeSession.session_id)
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

export async function fetchFamilyHouseholds(
  supabase: AppSupabase,
  query?: string,
) {
  const trimmedQuery = query?.trim() ?? "";
  const normalizedQuery = trimmedQuery.toLowerCase();
  const normalizedDigits = trimmedQuery.replace(/\D/g, "");
  const limit = trimmedQuery ? 250 : 25;
  const { data, error } = await supabase
    .from("families")
    .select("id, household_name, primary_phone, secondary_phone, email, children(first_name, last_name, active)")
    .order("household_name", { ascending: true })
    .limit(limit);

  if (error) {
    throw error;
  }

  const households = (data ?? []).map((family: any) => {
    const activeChildren = (family.children ?? []).filter((child: any) => child.active !== false);
    const childNames = activeChildren
      .map((child: any) => `${child.first_name} ${child.last_name}`.trim())
      .join(", ");

    return {
      family_id: family.id,
      household_name: family.household_name,
      primary_phone: family.primary_phone,
      secondary_phone: family.secondary_phone,
      email: family.email,
      child_count: activeChildren.length,
      child_names: childNames,
      _search_blob: [
        family.household_name,
        family.primary_phone,
        family.secondary_phone,
        family.email,
        ...activeChildren.map((child: any) => child.first_name),
        ...activeChildren.map((child: any) => child.last_name),
        childNames,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase(),
      _digits_blob: [family.primary_phone, family.secondary_phone].filter(Boolean).join(" ").replace(/\D/g, ""),
    };
  });

  const filteredHouseholds = trimmedQuery
    ? households.filter((family) => {
        const matchesText = family._search_blob.includes(normalizedQuery);
        const matchesDigits = normalizedDigits ? family._digits_blob.includes(normalizedDigits) : false;
        return matchesText || matchesDigits;
      })
    : households;

  return filteredHouseholds.map(({ _search_blob, _digits_blob, ...family }) => family);
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

  const selectedServiceId = pickDefaultServiceId(services) ?? undefined;
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
  serviceEventId?: string | null,
) {
  const [snapshot, queuedPrecheckins] = await Promise.all([
    fetchFamilyBundleForService(supabase, familyId, serviceEventId),
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

export async function fetchFamilyBundleForService(
  supabase: AppSupabase,
  familyId: string,
  serviceEventId?: string | null,
) {
  const [
    familyResult,
    childrenResult,
    authorizedPickupsResult,
    activeSessionsResult,
    notifications,
  ] = await Promise.all([
    supabase.from("families").select("*").eq("id", familyId).single(),
    supabase
      .from("children")
      .select("*")
      .eq("family_id", familyId)
      .eq("active", true)
      .order("first_name"),
    supabase
      .from("authorized_pickups")
      .select("*")
      .eq("family_id", familyId)
      .eq("can_pick_up", true)
      .order("full_name"),
    supabase
      .from("checkin_sessions")
      .select("*, service:service_events(id, name, starts_at, ends_at, status)")
      .eq("family_id", familyId)
      .eq("status", "checked_in")
      .order("checked_in_at", { ascending: false })
      .limit(12),
    getRecentNotifications(supabase, familyId, 12),
  ]);

  if (!familyResult.data) {
    return null;
  }

  const activeSession = selectActiveSession(activeSessionsResult.data ?? [], serviceEventId);

  const activeCheckins = activeSession
    ? (
        await supabase
          .from("checkins")
          .select("*")
          .eq("checkin_session_id", activeSession.session_id)
          .order("dropoff_time", { ascending: true })
      ).data ?? []
    : [];

  return {
    family: familyResult.data,
    children: childrenResult.data ?? [],
    authorizedPickups: authorizedPickupsResult.data ?? [],
    activeSession,
    activeCheckins,
    notifications,
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
  const currentService = services.find((service) => service.id === pickDefaultServiceId(services)) ?? null;
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

  return fetchPickupSessionResult(supabase, sessionMatch.session_id, sessionMatch);
}

export async function fetchPickupSessionResult(
  supabase: AppSupabase,
  sessionId: string,
  existingSession?: any,
) {
  const sessionMatch = normalizeSessionRecord(
    existingSession ??
      (
        await supabase
          .from("checkin_sessions")
          .select("*")
          .eq("id", sessionId)
          .eq("status", "checked_in")
          .maybeSingle()
      ).data,
  );

  if (!sessionMatch) {
    return null;
  }

  const [bundle, checkins, service] = await Promise.all([
    fetchFamilyBundleForService(supabase, sessionMatch.family_id, sessionMatch.service_event_id),
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

export async function fetchPickupRoster(
  supabase: AppSupabase,
  serviceEventId: string,
) {
  const { data } = await supabase
    .from("checkin_sessions")
    .select(
      "id, family_id, service_event_id, checked_in_at, security_code_last4, family:families(id, household_name, primary_phone), checkins:checkins(id, status, child:children(first_name, last_name, preferred_name))",
    )
    .eq("service_event_id", serviceEventId)
    .eq("status", "checked_in")
    .order("checked_in_at", { ascending: false });

  return data ?? [];
}

export async function getPickupBootstrap(supabase: AppSupabase) {
  const services = await getUpcomingServices(supabase);
  const selectedServiceId = pickDefaultServiceId(services) ?? undefined;
  const roster = selectedServiceId
    ? await fetchPickupRoster(supabase, selectedServiceId)
    : [];

  return {
    services,
    roster,
    selectedServiceId: selectedServiceId ?? null,
  };
}

export async function getReportsSnapshot(supabase: AppSupabase) {
  const [attendance, pickupLogsResult, detailedCheckinsResult, volunteers] = await Promise.all([
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
      .from("checkins")
      .select(
        "*, child:children(first_name, last_name, preferred_name, birthdate, grade_label), family:families(household_name), room:rooms(name), service:service_events(name, starts_at), pickup:authorized_pickups(full_name, relationship)",
      )
      .order("dropoff_time", { ascending: false })
      .limit(100),
    supabase
      .from("user_profiles")
      .select("*")
      .in("role", ["volunteer", "admin"])
      .order("full_name"),
  ]);

  const pickupLogs = pickupLogsResult.data ?? [];
  const detailedCheckins = detailedCheckinsResult.data ?? [];
  const staffIds = Array.from(
    new Set(
      [
        ...pickupLogs.map((log) => log.verified_by_staff_id),
        ...detailedCheckins.map((entry) => entry.dropoff_by),
        ...detailedCheckins.map((entry) => entry.picked_up_by_staff_id),
      ].filter(Boolean),
    ),
  );

  const staffProfiles = staffIds.length
    ? await supabase.from("user_profiles").select("id, full_name").in("id", staffIds)
    : { data: [] as Array<{ id: string; full_name: string }> };
  const staffMap = new Map((staffProfiles.data ?? []).map((profile) => [profile.id, profile.full_name]));

  return {
    attendance: attendance.data ?? [],
    pickupLogs: pickupLogs.map((log) => ({
      ...log,
      verifiedByName: staffMap.get(log.verified_by_staff_id) ?? "Unknown staff",
    })),
    detailedCheckins: detailedCheckins.map((entry) => ({
      ...entry,
      checkedInByName: staffMap.get(entry.dropoff_by) ?? "Unknown staff",
      checkedOutByName: entry.picked_up_by_staff_id
        ? (staffMap.get(entry.picked_up_by_staff_id) ?? "Unknown staff")
        : null,
    })),
    volunteers: volunteers.data ?? [],
  };
}
