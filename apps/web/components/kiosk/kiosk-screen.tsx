"use client";

import { useMemo, useState, useTransition } from "react";
import { LoaderCircle, Search, Sparkles } from "lucide-react";
import { toast } from "sonner";

import { LabelPrintSheet } from "@/components/kiosk/label-print-sheet";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useRealtimeKioskQueue } from "@/hooks/use-realtime-checkins";
import {
  fetchCheckinLabelPayload,
  fetchKioskFamilyDetails,
  fetchQueuedPrecheckins,
} from "@/lib/data";
import { createClient } from "@/lib/supabase/browser";
import { formatDateTime, formatGradeOrAge, formatPhone } from "@/lib/utils";

type SearchResult = {
  family_id: string;
  household_name: string;
  primary_phone: string;
  secondary_phone: string | null;
  email: string | null;
  child_count: number;
  child_names: string;
};

export function KioskScreen({
  initialServices,
  initialRooms,
  initialPrecheckins,
  initialServiceId,
}: {
  initialServices: any[];
  initialRooms: any[];
  initialPrecheckins: any[];
  initialServiceId: string | null;
}) {
  const supabase = useMemo(() => createClient(), []);
  const [search, setSearch] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [selectedFamily, setSelectedFamily] = useState<any | null>(null);
  const [selectedServiceId, setSelectedServiceId] = useState<string>(
    initialServiceId ?? initialServices[0]?.id ?? "",
  );
  const [selectedChildren, setSelectedChildren] = useState<Record<string, boolean>>({});
  const [roomAssignments, setRoomAssignments] = useState<Record<string, string>>({});
  const [familyNote, setFamilyNote] = useState("");
  const [labelPayload, setLabelPayload] = useState<any | null>(null);
  const [searching, startSearch] = useTransition();
  const [issuing, startIssuing] = useTransition();
  const queue = useRealtimeKioskQueue(selectedServiceId || null, initialPrecheckins);

  async function loadFamily(
    familyId: string,
    options?: {
      presetNotes?: string | null;
      presetChildIds?: string[];
      presetRooms?: Record<string, string>;
      preserveLabelPayload?: boolean;
    },
  ) {
    const details = await fetchKioskFamilyDetails(supabase, familyId);

    if (!details.snapshot) {
      toast.error("We could not load that family.");
      return;
    }

    const defaultSelection = Object.fromEntries(
      details.snapshot.children.map((child: any) => [
        child.id,
        options?.presetChildIds ? options.presetChildIds.includes(child.id) : true,
      ]),
    );

    const defaultRooms = Object.fromEntries(
      details.snapshot.children.map((child: any) => [
        child.id,
        options?.presetRooms?.[child.id] ?? child.default_room_id ?? "",
      ]),
    );

    setSelectedFamily(details);
    setSelectedChildren(defaultSelection);
    setRoomAssignments(defaultRooms);
    setFamilyNote(
      options?.presetNotes ?? details.queuedPrecheckins[0]?.notes ?? "",
    );

    if (!options?.preserveLabelPayload) {
      setLabelPayload(null);
    }
  }

  function handleSearch() {
    startSearch(async () => {
      if (search.trim().length < 2) {
        toast.error("Search by at least two letters of a last name or a phone number.");
        return;
      }

      const { data, error } = await supabase.rpc("search_family_households", {
        p_query: search.trim(),
      });

      if (error) {
        toast.error(error.message);
        return;
      }

      setResults((data ?? []) as SearchResult[]);
    });
  }

  function toggleChild(childId: string) {
    setSelectedChildren((current) => ({
      ...current,
      [childId]: !current[childId],
    }));
  }

  async function handleIssueCheckin() {
    if (!selectedFamily?.snapshot?.family) {
      toast.error("Select a family first.");
      return;
    }

    const childIds = Object.entries(selectedChildren)
      .filter(([, selected]) => selected)
      .map(([childId]) => childId);

    if (childIds.length === 0) {
      toast.error("Select at least one child.");
      return;
    }

    const assignments = childIds.reduce<Record<string, string>>((accumulator, childId) => {
      if (roomAssignments[childId]) {
        accumulator[childId] = roomAssignments[childId];
      }
      return accumulator;
    }, {});

    startIssuing(async () => {
      const { data, error } = await supabase.rpc("staff_issue_checkin", {
        p_family_id: selectedFamily.snapshot.family.id,
        p_service_event_id: selectedServiceId,
        p_child_ids: childIds,
        p_room_assignments: assignments,
        p_parent_note: familyNote,
        p_source: "kiosk",
      });

      if (error) {
        toast.error(error.message);
        return;
      }

      const payload = await fetchCheckinLabelPayload(supabase, data as string);
      setLabelPayload(payload);
      await loadFamily(selectedFamily.snapshot.family.id, {
        preserveLabelPayload: true,
      });
      setResults([]);
      setSearch("");
      toast.success("Check-in complete. Labels are ready.");
    });
  }

  async function handleServiceChange(nextServiceId: string) {
    setSelectedServiceId(nextServiceId);
    if (selectedFamily?.snapshot?.family?.id) {
      await loadFamily(selectedFamily.snapshot.family.id);
    }
    const nextQueue = await fetchQueuedPrecheckins(supabase, nextServiceId);
    if (nextQueue.length === 0) {
      setLabelPayload(null);
    }
  }

  async function markPrinted() {
    if (!labelPayload) {
      return;
    }

    await supabase
      .from("checkin_sessions")
      .update({ label_printed_at: new Date().toISOString() })
      .eq("id", labelPayload.session.id);
  }

  const selectedService = initialServices.find((service) => service.id === selectedServiceId);

  return (
    <div className="space-y-6">
      <div className="grid gap-6 xl:grid-cols-[0.85fr_1.15fr]">
        <Card className="glass-panel">
          <CardHeader>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <CardTitle className="text-2xl">Kiosk mode</CardTitle>
                <CardDescription>
                  Search by household last name or phone, select children, and print labels instantly.
                </CardDescription>
              </div>
              <Badge>Fullscreen-ready</Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="service">Service event</Label>
              <select
                className="h-11 w-full rounded-2xl border border-orange-100 bg-white px-4 text-sm outline-none focus:border-orange-300"
                id="service"
                onChange={(event) => void handleServiceChange(event.target.value)}
                value={selectedServiceId}
              >
                {initialServices.map((service) => (
                  <option key={service.id} value={service.id}>
                    {service.name} · {formatDateTime(service.starts_at)}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex gap-3">
              <Input
                onChange={(event) => setSearch(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    handleSearch();
                  }
                }}
                placeholder="Last name or phone number"
                value={search}
              />
              <Button disabled={searching} onClick={handleSearch}>
                {searching ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                Search
              </Button>
            </div>
            <div className="space-y-3">
              {results.length === 0 ? (
                <div className="rounded-[1.5rem] border border-dashed border-orange-200 p-5 text-sm text-muted-foreground">
                  Search results will appear here.
                </div>
              ) : (
                results.map((result) => (
                  <button
                    className="w-full rounded-[1.5rem] border border-orange-100 bg-white p-4 text-left transition hover:border-orange-300 hover:bg-orange-50"
                    key={result.family_id}
                    onClick={() => void loadFamily(result.family_id)}
                    type="button"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="text-lg font-semibold text-slate-950">{result.household_name}</p>
                        <p className="text-sm text-slate-600">{formatPhone(result.primary_phone)}</p>
                        <p className="mt-2 text-sm text-slate-500">{result.child_names}</p>
                      </div>
                      <Badge variant="secondary">{result.child_count} kids</Badge>
                    </div>
                  </button>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="glass-panel">
          <CardHeader>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <CardTitle className="text-2xl">Queued mobile pre-check-ins</CardTitle>
                <CardDescription>
                  Families who pre-checked in from home appear here for one-tap completion.
                </CardDescription>
              </div>
              <Badge variant="secondary">
                {selectedService ? selectedService.name : "No service selected"}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {queue.length === 0 ? (
              <div className="rounded-[1.5rem] border border-dashed border-orange-200 p-5 text-sm text-muted-foreground">
                No queued pre-check-ins yet for this service.
              </div>
            ) : (
              queue.map((entry: any) => {
                const presetChildIds = (entry.items ?? []).map((item: any) => item.child_id);
                const presetRooms = Object.fromEntries(
                  (entry.items ?? []).map((item: any) => [item.child_id, item.room_id]),
                );

                return (
                  <button
                    className="w-full rounded-[1.5rem] border border-orange-100 bg-white p-4 text-left transition hover:border-orange-300 hover:bg-orange-50"
                    key={entry.id}
                    onClick={() =>
                      void loadFamily(entry.family.id, {
                        presetNotes: entry.notes,
                        presetChildIds,
                        presetRooms,
                      })
                    }
                    type="button"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="text-lg font-semibold text-slate-950">
                          {entry.family.household_name}
                        </p>
                        <p className="text-sm text-slate-600">
                          {formatPhone(entry.family.primary_phone)}
                        </p>
                        <p className="mt-2 text-sm text-slate-500">
                          Requested {formatDateTime(entry.created_at)}
                        </p>
                        {entry.notes ? (
                          <p className="mt-2 text-sm text-slate-700">{entry.notes}</p>
                        ) : null}
                      </div>
                      <Badge>{(entry.items ?? []).length} selected</Badge>
                    </div>
                  </button>
                );
              })
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1fr_1fr]">
        <Card className="glass-panel">
          <CardHeader>
            <CardTitle className="text-2xl">Family setup</CardTitle>
            <CardDescription>
              Select children, adjust room assignments, and review allergy notes before drop-off.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            {!selectedFamily?.snapshot ? (
              <div className="rounded-[1.5rem] border border-dashed border-orange-200 p-6 text-sm text-muted-foreground">
                Choose a family from search results or the queued pre-check-in list.
              </div>
            ) : (
              <>
                <div className="rounded-[1.5rem] bg-slate-950 p-5 text-white">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="text-xs uppercase tracking-[0.28em] text-orange-200">Selected family</p>
                      <h3 className="mt-2 text-2xl font-semibold">
                        {selectedFamily.snapshot.family.household_name}
                      </h3>
                      <p className="mt-2 text-sm text-orange-100">
                        {formatPhone(selectedFamily.snapshot.family.primary_phone)}
                      </p>
                    </div>
                    {selectedFamily.snapshot.activeSession ? (
                      <Badge variant="success">
                        Active code {selectedFamily.snapshot.activeSession.security_code}
                      </Badge>
                    ) : (
                      <Badge variant="secondary">Ready for drop-off</Badge>
                    )}
                  </div>
                </div>

                <div className="space-y-4">
                  {selectedFamily.snapshot.children.map((child: any) => (
                    <div
                      className="rounded-[1.5rem] border border-orange-100 bg-white p-4"
                      key={child.id}
                    >
                      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                        <div className="flex items-start gap-4">
                          <Checkbox
                            checked={Boolean(selectedChildren[child.id])}
                            onChange={() => toggleChild(child.id)}
                          />
                          <div>
                            <p className="text-lg font-semibold text-slate-950">
                              {child.preferred_name || child.first_name} {child.last_name}
                            </p>
                            <p className="text-sm text-slate-500">
                              {formatGradeOrAge(child.grade_label, child.birthdate)}
                            </p>
                            <div className="mt-3 flex flex-wrap gap-2">
                              {child.allergies ? <Badge>Allergy alert</Badge> : null}
                              {child.medical_notes ? <Badge variant="secondary">Medical note</Badge> : null}
                            </div>
                            <p className="mt-3 text-sm leading-7 text-slate-700">
                              {child.allergies || "No allergies listed"}{" "}
                              {child.special_instructions ? `· ${child.special_instructions}` : ""}
                            </p>
                          </div>
                        </div>
                        <div className="w-full max-w-sm space-y-2">
                          <Label htmlFor={`room-${child.id}`}>Room assignment</Label>
                          <select
                            className="h-11 w-full rounded-2xl border border-orange-100 bg-white px-4 text-sm outline-none focus:border-orange-300"
                            id={`room-${child.id}`}
                            onChange={(event) =>
                              setRoomAssignments((current) => ({
                                ...current,
                                [child.id]: event.target.value,
                              }))
                            }
                            value={roomAssignments[child.id] ?? ""}
                          >
                            <option value="">Choose a room</option>
                            {initialRooms.map((room) => (
                              <option key={room.id} value={room.id}>
                                {room.name} · {room.location ?? "Main building"}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="family-note">Family note for this visit</Label>
                  <Textarea
                    id="family-note"
                    onChange={(event) => setFamilyNote(event.target.value)}
                    placeholder="Add any temporary instructions for this service."
                    value={familyNote}
                  />
                </div>

                <Button
                  className="w-full"
                  disabled={issuing || Boolean(selectedFamily.snapshot.activeSession)}
                  onClick={() => void handleIssueCheckin()}
                  size="lg"
                >
                  {issuing ? (
                    <LoaderCircle className="h-4 w-4 animate-spin" />
                  ) : (
                    <Sparkles className="h-4 w-4" />
                  )}
                  {selectedFamily.snapshot.activeSession
                    ? "Family already checked in"
                    : "Check in and generate labels"}
                </Button>
              </>
            )}
          </CardContent>
        </Card>

        <LabelPrintSheet payload={labelPayload} onMarkPrinted={markPrinted} />
      </div>
    </div>
  );
}
