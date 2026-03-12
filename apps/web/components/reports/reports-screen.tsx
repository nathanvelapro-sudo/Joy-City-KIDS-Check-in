"use client";

import { useEffect, useMemo, useState } from "react";
import { Download } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/browser";
import { getReportsSnapshot } from "@/lib/data";
import { formatDateTime } from "@/lib/utils";

function statusVariant(status: string) {
  if (status === "approved" || status === "sent") return "success";
  if (status === "expired" || status === "rejected" || status === "failed") return "danger";
  return "secondary";
}

function escapeCsvValue(value: unknown) {
  const text = value == null ? "" : String(value);
  return `"${text.replace(/"/g, '""')}"`;
}

function downloadCsv(filename: string, rows: Array<Record<string, unknown>>) {
  if (rows.length === 0) {
    return;
  }

  const headers = Object.keys(rows[0]);
  const csv = [
    headers.join(","),
    ...rows.map((row) => headers.map((header) => escapeCsvValue(row[header])).join(",")),
  ].join("\n");

  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = filename;
  link.click();

  URL.revokeObjectURL(url);
}

export function ReportsScreen({
  initialAttendance,
  initialDetailedCheckins,
  initialPickupLogs,
  initialVolunteers,
}: {
  initialAttendance: any[];
  initialDetailedCheckins: any[];
  initialPickupLogs: any[];
  initialVolunteers: any[];
}) {
  const supabase = useMemo(() => createClient(), []);
  const [attendance, setAttendance] = useState(initialAttendance);
  const [detailedCheckins, setDetailedCheckins] = useState(initialDetailedCheckins);
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
      setDetailedCheckins(snapshot.detailedCheckins);
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
          <CardTitle className="text-2xl">Attendance summary</CardTitle>
          <CardDescription>
            Live room totals for quick headcounts and end-of-day reconciliation.
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

      <Card className="glass-panel">
        <CardHeader>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <CardTitle className="text-2xl">Detailed check-in and check-out log</CardTitle>
              <CardDescription>
                Every child movement with timestamps, room, and the staff member who handled drop-off or release.
              </CardDescription>
            </div>
            <Button
              onClick={() =>
                downloadCsv(
                  "joykids-detailed-checkin-log.csv",
                  detailedCheckins.map((entry) => ({
                    child: `${entry.child?.preferred_name || entry.child?.first_name || ""} ${entry.child?.last_name || ""}`.trim(),
                    family: entry.family?.household_name ?? "",
                    service: entry.service?.name ?? "",
                    service_start: entry.service?.starts_at ?? "",
                    room: entry.room?.name ?? "Unassigned",
                    checked_in_at: entry.dropoff_time ?? "",
                    checked_in_by: entry.checkedInByName ?? "",
                    checked_out_at: entry.pickup_time ?? "",
                    checked_out_by: entry.checkedOutByName ?? "",
                    released_to: entry.pickup?.full_name ?? "",
                    released_to_relationship: entry.pickup?.relationship ?? "",
                    status: entry.status ?? "",
                  })),
                )
              }
              size="sm"
              variant="secondary"
            >
              <Download className="h-4 w-4" />
              Export CSV
            </Button>
          </div>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="text-slate-500">
              <tr>
                <th className="pb-3 pr-6">Child</th>
                <th className="pb-3 pr-6">Service</th>
                <th className="pb-3 pr-6">Room</th>
                <th className="pb-3 pr-6">Checked in</th>
                <th className="pb-3 pr-6">Checked in by</th>
                <th className="pb-3 pr-6">Checked out</th>
                <th className="pb-3 pr-6">Checked out by</th>
                <th className="pb-3 pr-6">Released to</th>
                <th className="pb-3">Status</th>
              </tr>
            </thead>
            <tbody>
              {detailedCheckins.map((entry) => (
                <tr className="border-t border-orange-100 align-top" key={entry.id}>
                  <td className="py-4 pr-6">
                    <div>
                      <p className="font-semibold text-slate-950">
                        {entry.child?.preferred_name || entry.child?.first_name} {entry.child?.last_name}
                      </p>
                      <p className="text-xs text-slate-500">{entry.family?.household_name}</p>
                    </div>
                  </td>
                  <td className="py-4 pr-6">
                    <div>
                      <p className="font-medium text-slate-900">{entry.service?.name ?? "Service"}</p>
                      <p className="text-xs text-slate-500">
                        {entry.service?.starts_at ? formatDateTime(entry.service.starts_at) : "Not scheduled"}
                      </p>
                    </div>
                  </td>
                  <td className="py-4 pr-6">{entry.room?.name ?? "Unassigned"}</td>
                  <td className="py-4 pr-6">{formatDateTime(entry.dropoff_time)}</td>
                  <td className="py-4 pr-6">{entry.checkedInByName}</td>
                  <td className="py-4 pr-6">
                    {entry.pickup_time ? formatDateTime(entry.pickup_time) : "Still checked in"}
                  </td>
                  <td className="py-4 pr-6">{entry.checkedOutByName ?? "Pending"}</td>
                  <td className="py-4 pr-6">{entry.pickup?.full_name ?? "Pending"}</td>
                  <td className="py-4">
                    <Badge variant={statusVariant(entry.status) as any}>{entry.status}</Badge>
                  </td>
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
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <CardTitle>Recent pickup audit</CardTitle>
                <CardDescription>Every release is timestamped, tied to an approved adult, and linked to staff verification.</CardDescription>
              </div>
              <Button
                onClick={() =>
                  downloadCsv(
                    "joykids-pickup-audit.csv",
                    pickupLogs.map((log) => ({
                      child: `${log.child?.first_name || ""} ${log.child?.last_name || ""}`.trim(),
                      family: log.family?.household_name ?? "",
                      released_to: log.pickup?.full_name ?? "",
                      released_at: log.released_at ?? "",
                      verification_method: log.verification_method ?? "",
                      verified_by: log.verifiedByName ?? "",
                      notes: log.notes ?? "",
                    })),
                  )
                }
                size="sm"
                variant="secondary"
              >
                <Download className="h-4 w-4" />
                Export CSV
              </Button>
            </div>
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
                  {formatDateTime(log.released_at)} · Verified by {log.verifiedByName}
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
