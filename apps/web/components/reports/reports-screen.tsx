"use client";

import { useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Download, Search } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { createClient } from "@/lib/supabase/browser";
import { getReportsSnapshot } from "@/lib/data";
import { formatDateTime } from "@/lib/utils";

const REPORT_PAGE_SIZE = 25;
const ATTENDANCE_PREVIEW_SIZE = 20;
const PICKUP_PREVIEW_SIZE = 10;

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
  const [query, setQuery] = useState("");
  const [serviceFilter, setServiceFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [page, setPage] = useState(1);

  const serviceOptions = useMemo(() => {
    const services = new Map<string, string>();

    detailedCheckins.forEach((entry) => {
      if (entry.service_event_id && entry.service?.name) {
        services.set(entry.service_event_id, entry.service.name);
      }
    });

    return Array.from(services, ([id, name]) => ({ id, name })).sort((left, right) =>
      left.name.localeCompare(right.name),
    );
  }, [detailedCheckins]);

  const filteredDetailedCheckins = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return detailedCheckins.filter((entry) => {
      if (serviceFilter !== "all" && entry.service_event_id !== serviceFilter) {
        return false;
      }

      if (statusFilter !== "all" && entry.status !== statusFilter) {
        return false;
      }

      if (!normalizedQuery) {
        return true;
      }

      return [
        entry.child?.preferred_name,
        entry.child?.first_name,
        entry.child?.last_name,
        entry.family?.household_name,
        entry.room?.name,
        entry.checkedInByName,
        entry.checkedOutByName,
        entry.pickup?.full_name,
      ]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(normalizedQuery));
    });
  }, [detailedCheckins, query, serviceFilter, statusFilter]);

  const pageCount = Math.max(1, Math.ceil(filteredDetailedCheckins.length / REPORT_PAGE_SIZE));
  const safePage = Math.min(page, pageCount);
  const paginatedDetailedCheckins = filteredDetailedCheckins.slice(
    (safePage - 1) * REPORT_PAGE_SIZE,
    safePage * REPORT_PAGE_SIZE,
  );

  const visibleAttendance = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return attendance
      .filter((row) => {
        if (serviceFilter !== "all" && row.service_event_id !== serviceFilter) {
          return false;
        }

        if (!normalizedQuery) {
          return true;
        }

        return [row.service_name, row.room_name]
          .filter(Boolean)
          .some((value) => String(value).toLowerCase().includes(normalizedQuery));
      })
      .slice(0, ATTENDANCE_PREVIEW_SIZE);
  }, [attendance, query, serviceFilter]);

  const visiblePickupLogs = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return pickupLogs
      .filter((log) => {
        if (!normalizedQuery) {
          return true;
        }

        return [
          log.child?.first_name,
          log.child?.last_name,
          log.family?.household_name,
          log.pickup?.full_name,
          log.verifiedByName,
        ]
          .filter(Boolean)
          .some((value) => String(value).toLowerCase().includes(normalizedQuery));
      })
      .slice(0, PICKUP_PREVIEW_SIZE);
  }, [pickupLogs, query]);

  function updateFilters(callback: () => void) {
    callback();
    setPage(1);
  }

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
          <CardTitle className="text-2xl">Report filters</CardTitle>
          <CardDescription>
            Narrow the audit view before reviewing or exporting attendance records.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 lg:grid-cols-[1fr_0.7fr_0.55fr]">
          <div className="relative">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input
              aria-label="Search reports"
              className="pl-11"
              onChange={(event) => updateFilters(() => setQuery(event.target.value))}
              placeholder="Search child, family, room, pickup adult, or staff"
              value={query}
            />
          </div>
          <select
            aria-label="Filter reports by service"
            className="h-11 rounded-2xl border border-orange-100 bg-white px-4 text-sm outline-none"
            onChange={(event) => updateFilters(() => setServiceFilter(event.target.value))}
            value={serviceFilter}
          >
            <option value="all">All services</option>
            {serviceOptions.map((service) => (
              <option key={service.id} value={service.id}>
                {service.name}
              </option>
            ))}
          </select>
          <select
            aria-label="Filter reports by status"
            className="h-11 rounded-2xl border border-orange-100 bg-white px-4 text-sm outline-none"
            onChange={(event) => updateFilters(() => setStatusFilter(event.target.value))}
            value={statusFilter}
          >
            <option value="all">All statuses</option>
            <option value="checked_in">Checked in</option>
            <option value="picked_up">Picked up</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </CardContent>
      </Card>

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
              {visibleAttendance.map((row) => (
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
          {visibleAttendance.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              No attendance rows match these filters.
            </p>
          ) : null}
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
                  filteredDetailedCheckins.map((entry) => ({
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
              {paginatedDetailedCheckins.map((entry) => (
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
          {paginatedDetailedCheckins.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              No check-in records match these filters.
            </p>
          ) : null}
          <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-orange-100 pt-4">
            <p className="text-sm text-muted-foreground">
              Showing {paginatedDetailedCheckins.length} of {filteredDetailedCheckins.length} matching records
            </p>
            <div className="flex items-center gap-2">
              <Button
                disabled={safePage <= 1}
                onClick={() => setPage((current) => Math.max(1, current - 1))}
                size="sm"
                variant="secondary"
              >
                <ChevronLeft className="h-4 w-4" />
                Previous
              </Button>
              <Badge variant="secondary">
                Page {safePage} of {pageCount}
              </Badge>
              <Button
                disabled={safePage >= pageCount}
                onClick={() => setPage((current) => Math.min(pageCount, current + 1))}
                size="sm"
                variant="secondary"
              >
                Next
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
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
            {visiblePickupLogs.map((log) => (
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
            {visiblePickupLogs.length === 0 ? (
              <p className="rounded-[1.25rem] border border-dashed border-orange-200 p-5 text-sm text-muted-foreground">
                No pickup records match this search.
              </p>
            ) : null}
            {visiblePickupLogs.length > 0 && pickupLogs.length > visiblePickupLogs.length ? (
              <p className="text-xs text-muted-foreground">
                Showing the latest {visiblePickupLogs.length} matching pickup records. Use CSV export for the full audit.
              </p>
            ) : null}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
