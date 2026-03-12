import { supabase } from "./supabase";

export async function resolveFamilyId(userId: string) {
  const { data } = await supabase
    .from("family_memberships")
    .select("family_id")
    .eq("user_id", userId)
    .limit(1)
    .maybeSingle();

  return data?.family_id ?? null;
}

export async function fetchServices() {
  const { data } = await supabase
    .from("service_events")
    .select("*")
    .neq("status", "closed")
    .order("starts_at", { ascending: true })
    .limit(8);

  return data ?? [];
}

export async function fetchFamilySnapshot(familyId: string) {
  const [
    familyResult,
    childrenResult,
    pickupsResult,
    activeSessionResult,
    notificationsResult,
  ] = await Promise.all([
    supabase.from("families").select("*").eq("id", familyId).single(),
    supabase.from("children").select("*").eq("family_id", familyId).order("first_name"),
    supabase
      .from("authorized_pickups")
      .select("*")
      .eq("family_id", familyId)
      .order("full_name"),
    supabase
      .from("checkin_sessions")
      .select("*")
      .eq("family_id", familyId)
      .eq("status", "checked_in")
      .order("checked_in_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from("notifications")
      .select("*")
      .eq("family_id", familyId)
      .order("created_at", { ascending: false })
      .limit(20),
  ]);

  if (!familyResult.data) {
    return null;
  }

  return {
    family: familyResult.data,
    children: childrenResult.data ?? [],
    authorizedPickups: pickupsResult.data ?? [],
    activeSession: activeSessionResult.data ?? null,
    notifications: notificationsResult.data ?? [],
  };
}

export async function fetchFamilyState(userId: string) {
  const [familyId, services] = await Promise.all([resolveFamilyId(userId), fetchServices()]);

  if (!familyId) {
    return {
      familyId: null,
      services,
      snapshot: null,
      precheckins: [],
    };
  }

  const [snapshot, precheckinsResult] = await Promise.all([
    fetchFamilySnapshot(familyId),
    supabase
      .from("precheckins")
      .select("*, service:service_events(id, name, starts_at)")
      .eq("family_id", familyId)
      .order("updated_at", { ascending: false }),
  ]);

  return {
    familyId,
    services,
    snapshot,
    precheckins: precheckinsResult.data ?? [],
  };
}

