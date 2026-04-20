"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { Bell, Clock3, LoaderCircle, MessageSquareText, Plus } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useRealtimeRoomBoard } from "@/hooks/use-realtime-room-board";
import { QUICK_MESSAGE_TEMPLATES } from "@/lib/constants";
import { fetchRoomBoard, getRecentNotifications, getUpcomingServices } from "@/lib/data";
import { createClient } from "@/lib/supabase/browser";
import {
  formatDateTime,
  formatNotificationError,
  formatPhone,
  formatTemplateLabel,
  normalizeBrandCopy,
} from "@/lib/utils";

function statusVariant(status: string) {
  if (status === "approved") return "success";
  if (status === "expired" || status === "rejected") return "danger";
  return "secondary";
}

function toLocalDateTimeValue(value: Date) {
  const localValue = new Date(value.getTime() - value.getTimezoneOffset() * 60_000);
  return localValue.toISOString().slice(0, 16);
}

const DEFAULT_SERVICE_DURATION_MINUTES = 90;

function buildDefaultServiceStart() {
  const next = new Date();
  next.setDate(next.getDate() + 7);
  next.setHours(10, 30, 0, 0);
  return toLocalDateTimeValue(next);
}

function buildServiceEnd(startValue: string, durationMinutes = DEFAULT_SERVICE_DURATION_MINUTES) {
  const start = new Date(startValue);

  if (Number.isNaN(start.getTime())) {
    return "";
  }

  start.setMinutes(start.getMinutes() + durationMinutes);
  return toLocalDateTimeValue(start);
}

function isSameLocalDay(left: string, right: string) {
  return left.slice(0, 10) === right.slice(0, 10);
}

function getServiceDurationMinutes(startsAt: string, endsAt: string) {
  const start = new Date(startsAt);
  const end = new Date(endsAt);

  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    return DEFAULT_SERVICE_DURATION_MINUTES;
  }

  const duration = Math.round((end.getTime() - start.getTime()) / 60_000);
  return duration > 0 ? duration : DEFAULT_SERVICE_DURATION_MINUTES;
}

function syncEndDateToStartDay(startsAt: string, endsAt: string) {
  if (!startsAt || !endsAt) {
    return endsAt;
  }

  const start = new Date(startsAt);
  const end = new Date(endsAt);

  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    return endsAt;
  }

  const synced = new Date(start);
  synced.setHours(end.getHours(), end.getMinutes(), 0, 0);
  return toLocalDateTimeValue(synced);
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
  const [services, setServices] = useState<any[]>(initialServices);
  const [selectedServiceId, setSelectedServiceId] = useState<string>(
    initialCurrentService?.id ?? initialServices[0]?.id ?? "",
  );
  const defaultStart = buildDefaultServiceStart();
  const [serviceForm, setServiceForm] = useState({
    name: "Sunday Service",
    campus: "Main Campus",
    starts_at: defaultStart,
    ends_at: buildServiceEnd(defaultStart),
  });
  const [sendingKey, startSending] = useTransition();
  const [savingService, startSavingService] = useTransition();
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

  function handleCreateService(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!serviceForm.name.trim() || !serviceForm.starts_at) {
      toast.error("Service name and date/time are required.");
      return;
    }

    const resolvedEnd = serviceForm.ends_at || buildServiceEnd(serviceForm.starts_at);

    if (!resolvedEnd) {
      toast.error("Set an end time for the service.");
      return;
    }

    if (!isSameLocalDay(serviceForm.starts_at, resolvedEnd)) {
      toast.error("Service start and end need to stay on the same day.");
      return;
    }

    if (new Date(resolvedEnd).getTime() <= new Date(serviceForm.starts_at).getTime()) {
      toast.error("Service end time needs to be after the start time.");
      return;
    }

    startSavingService(async () => {
      const { error } = await supabase.from("service_events").insert({
        name: serviceForm.name.trim(),
        campus: serviceForm.campus.trim() || "Main Campus",
        starts_at: new Date(serviceForm.starts_at).toISOString(),
        ends_at: new Date(resolvedEnd).toISOString(),
        status: "scheduled",
      });

      if (error) {
        toast.error(error.message);
        return;
      }

      const nextServices = await getUpcomingServices(supabase);
      setServices(nextServices);

      const newestService = nextServices.find(
        (service) =>
          service.name === serviceForm.name.trim() &&
          service.starts_at === new Date(serviceForm.starts_at).toISOString(),
      );

      if (newestService?.id) {
        setSelectedServiceId(newestService.id);
      } else if (nextServices[0]?.id) {
        setSelectedServiceId(nextServices[0].id);
      }

      setServiceForm((current) => ({
        ...current,
        starts_at: defaultStart,
        ends_at: buildServiceEnd(defaultStart),
      }));
      toast.success("Service event created.");
    });
  }

  const activeKids = board.filter((entry) => entry.status === "checked_in");
  const groups = initialRooms.map((room) => ({
    room,
    entries: activeKids.filter((entry) => entry.room_id === room.id),
  }));

  return (
    <div className="space-y-6">
      <div className="grid items-start gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <Card className="glass-panel self-start">
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
                {services.map((service) => (
                  <option key={service.id} value={service.id}>
                    {service.name}
                  </option>
                ))}
              </select>
            </div>
          </CardHeader>
          <CardContent className="grid content-start gap-4 md:grid-cols-2">
            {groups.map(({ room, entries }) => (
              <div
                className="flex min-h-[11rem] flex-col rounded-[1.75rem] border border-orange-100 bg-white p-5"
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
                    <p>No children checked into this room yet.</p>
                  </div>
                ) : (
                  <div className="flex flex-col gap-3">
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
              <CardTitle>Upcoming service dates</CardTitle>
              <CardDescription>
                Create the next service here. Past dates automatically fall out of the dropdowns.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form className="space-y-4" onSubmit={handleCreateService}>
                <div className="space-y-2">
                  <Label htmlFor="service-name">Service name</Label>
                  <Input
                    id="service-name"
                    onChange={(event) =>
                      setServiceForm((current) => ({ ...current, name: event.target.value }))
                    }
                    placeholder="Sunday 10:30 AM"
                    value={serviceForm.name}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="service-campus">Campus</Label>
                  <Input
                    id="service-campus"
                    onChange={(event) =>
                      setServiceForm((current) => ({ ...current, campus: event.target.value }))
                    }
                    value={serviceForm.campus}
                  />
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="service-starts-at">Starts</Label>
                    <Input
                      id="service-starts-at"
                      onChange={(event) => {
                        const nextStartsAt = event.target.value;

                        setServiceForm((current) => {
                          const duration = current.ends_at
                            ? getServiceDurationMinutes(current.starts_at, current.ends_at)
                            : DEFAULT_SERVICE_DURATION_MINUTES;

                          return {
                            ...current,
                            starts_at: nextStartsAt,
                            ends_at: nextStartsAt ? buildServiceEnd(nextStartsAt, duration) : "",
                          };
                        });
                      }}
                      type="datetime-local"
                      value={serviceForm.starts_at}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="service-ends-at">Ends</Label>
                    <Input
                      id="service-ends-at"
                      onChange={(event) =>
                        setServiceForm((current) => ({
                          ...current,
                          ends_at: syncEndDateToStartDay(current.starts_at, event.target.value),
                        }))
                      }
                      type="datetime-local"
                      value={serviceForm.ends_at}
                    />
                  </div>
                </div>
                <Button disabled={savingService} type="submit" variant="secondary">
                  {savingService ? (
                    <LoaderCircle className="h-4 w-4 animate-spin" />
                  ) : (
                    <Plus className="h-4 w-4" />
                  )}
                  Add service date
                </Button>
              </form>
            </CardContent>
          </Card>

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
                          <p className="mt-1 text-sm leading-7 text-slate-600">
                            {normalizeBrandCopy(notification.message_body)}
                          </p>
                          {notification.status === "failed" && notification.metadata?.error ? (
                            <p className="mt-2 text-xs text-rose-600">
                              {formatNotificationError(notification.metadata.error)}
                            </p>
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
