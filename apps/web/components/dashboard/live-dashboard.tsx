"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { Bell, Clock3, LoaderCircle, MessageSquareText } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useRealtimeRoomBoard } from "@/hooks/use-realtime-room-board";
import { QUICK_MESSAGE_TEMPLATES } from "@/lib/constants";
import { fetchRoomBoard, getRecentNotifications } from "@/lib/data";
import { createClient } from "@/lib/supabase/browser";
import { formatDateTime, formatPhone, formatTemplateLabel } from "@/lib/utils";

function statusVariant(status: string) {
  if (status === "approved") return "success";
  if (status === "expired" || status === "rejected") return "danger";
  return "secondary";
}

export function LiveDashboard({
  initialServices,
  initialCurrentService,
  initialRooms,
  initialBoard,
  initialNotifications,
  volunteers,
}: {
  initialServices: any[];
  initialCurrentService: any | null;
  initialRooms: any[];
  initialBoard: any[];
  initialNotifications: any[];
  volunteers: any[];
}) {
  const supabase = useMemo(() => createClient(), []);
  const [selectedServiceId, setSelectedServiceId] = useState<string>(
    initialCurrentService?.id ?? initialServices[0]?.id ?? "",
  );
  const [sendingKey, startSending] = useTransition();
  const { board, notifications, setBoard, setNotifications } = useRealtimeRoomBoard<any, any>(
    selectedServiceId || null,
    initialBoard,
    initialNotifications,
  );

  useEffect(() => {
    if (!selectedServiceId) {
      return;
    }

    let alive = true;

    async function refresh() {
      const [nextBoard, nextNotifications] = await Promise.all([
        fetchRoomBoard(supabase, selectedServiceId),
        getRecentNotifications(supabase, undefined, 15),
      ]);

      if (!alive) {
        return;
      }

      setBoard(nextBoard);
      setNotifications(nextNotifications);
    }

    void refresh();

    return () => {
      alive = false;
    };
  }, [selectedServiceId, setBoard, setNotifications, supabase]);

  async function sendMessage(entry: any, template: (typeof QUICK_MESSAGE_TEMPLATES)[number]) {
    startSending(async () => {
      const response = await fetch("/api/notifications/sms", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          familyId: entry.family.id,
          checkinSessionId: entry.session.id,
          templateKey: template.key,
          messageBody: template.body,
        }),
      });

      const data = (await response.json()) as { error?: string };

      if (!response.ok) {
        toast.error(data.error || "Alert failed to deliver.");
        return;
      }

      toast.success(`Live alert sent to ${entry.family.household_name}.`);
    });
  }

  const activeKids = board.filter((entry) => entry.status === "checked_in");
  const groups = initialRooms.map((room) => ({
    room,
    entries: activeKids.filter((entry) => entry.room_id === room.id),
  }));

  return (
    <div className="space-y-6">
      <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <Card className="glass-panel">
          <CardHeader>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <CardTitle className="text-2xl">Live volunteer dashboard</CardTitle>
                <CardDescription>
                  Room-by-room attendance updates stream in live from Supabase Realtime.
                </CardDescription>
              </div>
              <select
                className="h-11 rounded-2xl border border-orange-100 bg-white px-4 text-sm outline-none"
                onChange={(event) => setSelectedServiceId(event.target.value)}
                value={selectedServiceId}
              >
                {initialServices.map((service) => (
                  <option key={service.id} value={service.id}>
                    {service.name}
                  </option>
                ))}
              </select>
            </div>
          </CardHeader>
          <CardContent className="grid gap-4 lg:grid-cols-2">
            {groups.map(({ room, entries }) => (
              <div
                className="rounded-[1.75rem] border border-orange-100 bg-white p-5"
                key={room.id}
              >
                <div className="mb-4 flex items-center justify-between gap-3">
                  <div>
                    <p className="text-lg font-semibold text-slate-950">{room.name}</p>
                    <p className="text-sm text-slate-500">{room.location ?? "Building assignment pending"}</p>
                  </div>
                  <Badge>{entries.length} active</Badge>
                </div>
                {entries.length === 0 ? (
                  <div className="rounded-[1.25rem] border border-dashed border-orange-200 p-4 text-sm text-muted-foreground">
                    No children checked into this room yet.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {entries.map((entry) => (
                      <div
                        className="rounded-[1.25rem] border border-slate-100 bg-slate-50 p-4"
                        key={entry.id}
                      >
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div>
                            <p className="text-lg font-semibold text-slate-950">
                              {entry.child?.preferred_name || entry.child?.first_name}{" "}
                              {entry.child?.last_name}
                            </p>
                            <p className="text-sm text-slate-500">
                              {entry.family?.household_name} · {formatPhone(entry.family?.primary_phone)}
                            </p>
                          </div>
                          <Badge variant="secondary">Code {entry.session?.security_code_last4}</Badge>
                        </div>
                        <div className="mt-4 flex flex-wrap gap-2 text-xs text-slate-500">
                          <span className="inline-flex items-center gap-1 rounded-full bg-white px-3 py-1">
                            <Clock3 className="h-3.5 w-3.5" />
                            Dropped off {formatDateTime(entry.dropoff_time)}
                          </span>
                          {entry.session?.parent_note ? (
                            <span className="inline-flex items-center gap-1 rounded-full bg-white px-3 py-1">
                              Note: {entry.session.parent_note}
                            </span>
                          ) : null}
                        </div>
                        <div className="mt-4 flex flex-wrap gap-2">
                          {QUICK_MESSAGE_TEMPLATES.map((template) => (
                            <Button
                              disabled={sendingKey}
                              key={template.key}
                              onClick={() => void sendMessage(entry, template)}
                              size="sm"
                              variant="secondary"
                            >
                              {sendingKey ? (
                                <LoaderCircle className="h-3.5 w-3.5 animate-spin" />
                              ) : (
                                <MessageSquareText className="h-3.5 w-3.5" />
                              )}
                              {template.label}
                            </Button>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card className="glass-panel">
            <CardHeader>
              <CardTitle>Recent alerts</CardTitle>
              <CardDescription>Live room-to-parent alerts delivered through Supabase Realtime.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {notifications.length === 0 ? (
                <div className="rounded-[1.25rem] border border-dashed border-orange-200 p-4 text-sm text-muted-foreground">
                  Alerts will appear here after volunteers send a quick parent message.
                </div>
              ) : (
                notifications.map((notification) => (
                  <div
                    className="rounded-[1.25rem] border border-orange-100 bg-white p-4"
                    key={notification.id}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3">
                        <div className="mt-1 flex h-10 w-10 items-center justify-center rounded-2xl bg-orange-100 text-orange-600">
                          <Bell className="h-4 w-4" />
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-slate-900">
                            {formatTemplateLabel(notification.template_key)}
                          </p>
                          <p className="mt-1 text-sm text-slate-600">{notification.message_body}</p>
                          {notification.status === "failed" && notification.metadata?.error ? (
                            <p className="mt-2 text-xs text-rose-600">{notification.metadata.error}</p>
                          ) : null}
                        </div>
                      </div>
                      <Badge
                        variant={
                          notification.status === "sent"
                            ? "success"
                            : notification.status === "failed"
                              ? "danger"
                              : "secondary"
                        }
                      >
                        {notification.status}
                      </Badge>
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          <Card className="glass-panel">
            <CardHeader>
              <CardTitle>Volunteer roster</CardTitle>
              <CardDescription>Background-check readiness stays visible to room leads.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {volunteers.map((volunteer) => (
                <div
                  className="flex items-center justify-between rounded-[1.25rem] border border-orange-100 bg-white p-4"
                  key={volunteer.id}
                >
                  <div>
                    <p className="font-semibold text-slate-950">{volunteer.full_name}</p>
                    <p className="text-sm text-slate-500">{volunteer.email}</p>
                  </div>
                  <Badge variant={statusVariant(volunteer.background_check_status) as any}>
                    {volunteer.background_check_status}
                  </Badge>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
