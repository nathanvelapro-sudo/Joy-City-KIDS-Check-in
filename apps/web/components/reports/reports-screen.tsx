"use client";

import { useEffect, useMemo, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/browser";
import { getReportsSnapshot } from "@/lib/data";
import { formatDateTime } from "@/lib/utils";

function statusVariant(status: string) {
  if (status === "approved" || status === "sent") return "success";
  if (status === "expired" || status === "rejected" || status === "failed") return "danger";
  return "secondary";
}

export function ReportsScreen({
  initialAttendance,
  initialPickupLogs,
  initialVolunteers,
}: {
  initialAttendance: any[];
  initialPickupLogs: any[];
  initialVolunteers: any[];
}) {
  const supabase = useMemo(() => createClient(), []);
  const [attendance, setAttendance] = useState(initialAttendance);
  const [pickupLogs, setPickupLogs] = useState(initialPickupLogs);
  const [volunteers, setVolunteers] = useState(initialVolunteers);

  useEffect(() => {
    let alive = true;

    async function refresh() {
      const snapshot = await getReportsSnapshot(supabase);
      if (!alive) {
        return;
      }

      setAttendance(snapshot.attendance);
      setPickupLogs(snapshot.pickupLogs);
      setVolunteers(snapshot.volunteers);
    }

    const channel = supabase
      .channel("reports-live")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "checkins" },
        refresh,
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "pickup_logs" },
        refresh,
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "user_profiles" },
        refresh,
      )
      .subscribe();

    return () => {
      alive = false;
      void supabase.removeChannel(channel);
    };
  }, [supabase]);

  return (
    <div className="space-y-6">
      <Card className="glass-panel">
        <CardHeader>
          <CardTitle className="text-2xl">Attendance reports</CardTitle>
          <CardDescription>
            Live rollups by service and room, powered by the Supabase attendance view.
          </CardDescription>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="text-slate-500">
              <tr>
                <th className="pb-3 pr-6">Service</th>
                <th className="pb-3 pr-6">Room</th>
                <th className="pb-3 pr-6">Active</th>
                <th className="pb-3 pr-6">Picked up</th>
                <th className="pb-3">Total</th>
              </tr>
            </thead>
            <tbody>
              {attendance.map((row) => (
                <tr className="border-t border-orange-100" key={`${row.service_event_id}-${row.room_id}`}>
                  <td className="py-4 pr-6">
                    <div>
                      <p className="font-semibold text-slate-950">{row.service_name}</p>
                      <p className="text-xs text-slate-500">{formatDateTime(row.service_day)}</p>
                    </div>
                  </td>
                  <td className="py-4 pr-6">{row.room_name || "Unassigned"}</td>
                  <td className="py-4 pr-6">{row.active_count}</td>
                  <td className="py-4 pr-6">{row.picked_up_count}</td>
                  <td className="py-4">{row.total_count}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>

      <div className="grid gap-6 xl:grid-cols-[0.8fr_1.2fr]">
        <Card className="glass-panel">
          <CardHeader>
            <CardTitle>Volunteer compliance</CardTitle>
            <CardDescription>Background-check flags stay visible for leaders and admins.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {volunteers.map((volunteer) => (
              <div
                className="flex items-center justify-between rounded-[1.25rem] border border-orange-100 bg-white p-4"
                key={volunteer.id}
              >
                <div>
                  <p className="font-semibold text-slate-950">{volunteer.full_name}</p>
                  <p className="text-sm text-slate-500">{volunteer.role}</p>
                </div>
                <Badge variant={statusVariant(volunteer.background_check_status) as any}>
                  {volunteer.background_check_status}
                </Badge>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="glass-panel">
          <CardHeader>
            <CardTitle>Recent pickup log</CardTitle>
            <CardDescription>Every release is timestamped and tied to an approved adult.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {pickupLogs.map((log) => (
              <div
                className="rounded-[1.25rem] border border-orange-100 bg-white p-4"
                key={log.id}
              >
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="font-semibold text-slate-950">
                      {log.child?.first_name} {log.child?.last_name}
                    </p>
                    <p className="text-sm text-slate-500">
                      {log.family?.household_name} · Released to {log.pickup?.full_name}
                    </p>
                  </div>
                  <Badge variant={statusVariant(log.verification_method) as any}>
                    {log.verification_method}
                  </Badge>
                </div>
                <p className="mt-2 text-sm text-slate-600">
                  {formatDateTime(log.released_at)}
                  {log.notes ? ` · ${log.notes}` : ""}
                </p>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
