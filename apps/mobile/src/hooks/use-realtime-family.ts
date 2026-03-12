import { useEffect, useState } from "react";

import { fetchFamilyState, fetchFamilySnapshot } from "../lib/data";
import { useSession } from "../lib/session";
import { supabase } from "../lib/supabase";

export function useRealtimeFamily() {
  const { session, loading: authLoading } = useSession();
  const [loading, setLoading] = useState(true);
  const [familyId, setFamilyId] = useState<string | null>(null);
  const [services, setServices] = useState<any[]>([]);
  const [precheckins, setPrecheckins] = useState<any[]>([]);
  const [snapshot, setSnapshot] = useState<any | null>(null);

  useEffect(() => {
    let alive = true;

    async function load() {
      if (!session?.user?.id) {
        setLoading(false);
        setFamilyId(null);
        setSnapshot(null);
        setServices([]);
        return;
      }

      setLoading(true);
      const next = await fetchFamilyState(session.user.id);

      if (!alive) {
        return;
      }

      setFamilyId(next.familyId);
      setServices(next.services);
      setSnapshot(next.snapshot);
      setPrecheckins(next.precheckins);
      setLoading(false);
    }

    if (!authLoading) {
      void load();
    }

    return () => {
      alive = false;
    };
  }, [authLoading, session?.user?.id]);

  useEffect(() => {
    if (!familyId) {
      return;
    }

    const currentFamilyId = familyId;

    async function refreshFamily() {
      const next = await fetchFamilySnapshot(currentFamilyId);
      setSnapshot(next);
    }

    async function refreshPrecheckins() {
      const { data } = await supabase
        .from("precheckins")
        .select("*, service:service_events(id, name, starts_at)")
        .eq("family_id", currentFamilyId)
        .order("updated_at", { ascending: false });
      setPrecheckins(data ?? []);
    }

    const familyChannel = supabase
      .channel(`mobile-family:${currentFamilyId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "children", filter: `family_id=eq.${currentFamilyId}` },
        refreshFamily,
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "authorized_pickups",
          filter: `family_id=eq.${currentFamilyId}`,
        },
        refreshFamily,
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "checkin_sessions",
          filter: `family_id=eq.${currentFamilyId}`,
        },
        refreshFamily,
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "notifications",
          filter: `family_id=eq.${currentFamilyId}`,
        },
        refreshFamily,
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "precheckins",
          filter: `family_id=eq.${currentFamilyId}`,
        },
        refreshPrecheckins,
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(familyChannel);
    };
  }, [familyId]);

  return {
    authLoading,
    familyId,
    loading,
    precheckins,
    services,
    snapshot,
  };
}
