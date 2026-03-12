"use client";

import { useEffect, useState } from "react";

import { fetchRoomBoard, getRecentNotifications } from "@/lib/data";
import { createClient } from "@/lib/supabase/browser";

export function useRealtimeRoomBoard<TBoard, TNotification>(
  serviceEventId: string | null,
  initialBoard: TBoard[],
  initialNotifications: TNotification[],
) {
  const [board, setBoard] = useState<TBoard[]>(initialBoard);
  const [notifications, setNotifications] =
    useState<TNotification[]>(initialNotifications);

  useEffect(() => {
    if (!serviceEventId) {
      return;
    }

    const currentServiceEventId = serviceEventId;
    const supabase = createClient();

    async function refreshBoard() {
      const [nextBoard, nextNotifications] = await Promise.all([
        fetchRoomBoard(supabase, currentServiceEventId),
        getRecentNotifications(supabase, undefined, 15),
      ]);

      setBoard(nextBoard as TBoard[]);
      setNotifications(nextNotifications as TNotification[]);
    }

    const channel = supabase
      .channel(`room-board:${currentServiceEventId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "checkins",
          filter: `service_event_id=eq.${currentServiceEventId}`,
        },
        refreshBoard,
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "notifications",
        },
        refreshBoard,
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [serviceEventId]);

  return { board, notifications, setBoard, setNotifications };
}
