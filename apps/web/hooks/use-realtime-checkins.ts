"use client";

import { useEffect, useState } from "react";

import { fetchQueuedPrecheckins } from "@/lib/data";
import { createClient } from "@/lib/supabase/browser";

export function useRealtimeKioskQueue<T>(
  serviceEventId: string | null,
  initialPrecheckins: T[],
) {
  const [precheckins, setPrecheckins] = useState<T[]>(initialPrecheckins);

  useEffect(() => {
    if (!serviceEventId) {
      return;
    }

    const currentServiceEventId = serviceEventId;
    const supabase = createClient();

    async function refreshQueue() {
      const next = await fetchQueuedPrecheckins(supabase, currentServiceEventId);
      setPrecheckins(next as T[]);
    }

    const channel = supabase
      .channel(`kiosk-queue:${currentServiceEventId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "precheckins",
          filter: `service_event_id=eq.${currentServiceEventId}`,
        },
        refreshQueue,
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "precheckin_children",
        },
        refreshQueue,
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [serviceEventId]);

  return precheckins;
}
