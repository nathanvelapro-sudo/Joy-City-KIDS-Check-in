"use client";

import { useEffect, useState } from "react";

import { fetchFamilyBundle } from "@/lib/data";
import { createClient } from "@/lib/supabase/browser";

export function useRealtimeFamily<T>(familyId: string | null, initialSnapshot: T | null) {
  const [snapshot, setSnapshot] = useState<T | null>(initialSnapshot);

  useEffect(() => {
    if (!familyId) {
      return;
    }

    const currentFamilyId = familyId;
    const supabase = createClient();

    async function refresh() {
      const next = await fetchFamilyBundle(supabase, currentFamilyId);
      setSnapshot(next as T | null);
    }

    const channel = supabase
      .channel(`family-live:${currentFamilyId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "children", filter: `family_id=eq.${currentFamilyId}` },
        refresh,
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "authorized_pickups", filter: `family_id=eq.${currentFamilyId}` },
        refresh,
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "checkin_sessions", filter: `family_id=eq.${currentFamilyId}` },
        refresh,
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "checkins", filter: `family_id=eq.${currentFamilyId}` },
        refresh,
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "notifications", filter: `family_id=eq.${currentFamilyId}` },
        refresh,
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [familyId]);

  return snapshot;
}
