"use client";

import { useMemo, useState, useTransition } from "react";
import { LoaderCircle, Plus, Search, Sparkles, Trash2, UserPlus } from "lucide-react";
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

function createBlankDeskChild() {
  return {
    first_name: "",
    last_name: "",
    preferred_name: "",
    birthdate: "",
    grade_label: "",
    allergies: "",
    medical_notes: "",
    special_instructions: "",
    default_room_id: "",
  };
}

function createBlankDeskPickup() {
  return {
    full_name: "",
    phone: "",
    relationship: "",
    email: "",
    notes: "",
  };
}

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
  const [deskMode, setDeskMode] = useState(false);
  const [deskFamily, setDeskFamily] = useState({
    household_name: "",
    primary_phone: "",
    email: "",
    emergency_notes: "",
  });
  const [deskChildren, setDeskChildren] = useState([createBlankDeskChild()]);
  const [deskPickups, setDeskPickups] = useState([createBlankDeskPickup()]);
  const [searching, startSearch] = useTransition();
  const [issuing, startIssuing] = useTransition();
  const [creatingFamily, startCreatingFamily] = useTransition();
  const queue = useRealtimeKioskQueue(selectedServiceId || null, initialPrecheckins);

  function resetDeskForm() {
    setDeskFamily({
      household_name: "",
      primary_phone: "",
      email: "",
      emergency_notes: "",
    });
    setDeskChildren([createBlankDeskChild()]);
    setDeskPickups([createBlankDeskPickup()]);
  }

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
    setDeskMode(false);

    if (!options?.preserveLabelPayload) {
      setLabelPayload(null);
    }
  }

  function handleSearch() {
    startSearch(async () => {
      if (search.trim().length < 2) {
        toast.error("Search by last name, phone digits, or email.");
        return;
      }

      const trimmed = search.trim();
      const { data, error } = await supabase.rpc("search_family_households", {
        p_query: trimmed,
      });

      if (error) {
        toast.error(error.message);
        return;
      }

      const merged = new Map<string, SearchResult>();

      ((data ?? []) as SearchResult[]).forEach((result) => {
        merged.set(result.family_id, result);
      });

      if (trimmed.includes("@")) {
        const { data: emailMatches, error: emailError } = await supabase
          .from("families")
          .select("id, household_name, primary_phone, secondary_phone, email, children(first_name, last_name, active)")
          .ilike("email", `%${trimmed}%`)
          .limit(25);

        if (emailError) {
          toast.error(emailError.message);
          return;
        }

        (emailMatches ?? []).forEach((family: any) => {
          const activeChildren = (family.children ?? []).filter((child: any) => child.active !== false);
          merged.set(family.id, {
            family_id: family.id,
            household_name: family.household_name,
            primary_phone: family.primary_phone,
            secondary_phone: family.secondary_phone,
            email: family.email,
            child_count: activeChildren.length,
            child_names: activeChildren
              .map((child: any) => `${child.first_name} ${child.last_name}`.trim())
              .join(", "),
          });
        });
      }

      setDeskMode(false);
      setResults(Array.from(merged.values()));
    });
  }

  function updateDeskChild(index: number, field: string, value: string) {
    setDeskChildren((current) =>
      current.map((child, childIndex) =>
        childIndex === index ? { ...child, [field]: value } : child,
      ),
    );
  }

  function updateDeskPickup(index: number, field: string, value: string) {
    setDeskPickups((current) =>
      current.map((pickup, pickupIndex) =>
        pickupIndex === index ? { ...pickup, [field]: value } : pickup,
      ),
    );
  }

  function handleOpenDeskMode() {
    setDeskMode(true);
    setResults([]);
    setSelectedFamily(null);
    setLabelPayload(null);
  }

  function handleCancelDeskMode() {
    setDeskMode(false);
    resetDeskForm();
  }

  function addDeskChild() {
    setDeskChildren((current) => [...current, createBlankDeskChild()]);
  }

  function removeDeskChild(index: number) {
    setDeskChildren((current) => (current.length === 1 ? current : current.filter((_, childIndex) => childIndex !== index)));
  }

  function addDeskPickup() {
    setDeskPickups((current) => [...current, createBlankDeskPickup()]);
  }

  function removeDeskPickup(index: number) {
    setDeskPickups((current) => (current.length === 1 ? current : current.filter((_, pickupIndex) => pickupIndex !== index)));
  }

  function handleCreateFamilyAtDesk() {
    const firstChild = deskChildren[0];

    if (!deskFamily.household_name.trim() || !deskFamily.primary_phone.trim()) {
      toast.error("Household name and primary phone are required.");
      return;
    }

    if (!firstChild.first_name.trim() || !firstChild.last_name.trim() || !firstChild.birthdate) {
      toast.error("Add at least one child with first name, last name, and birthdate.");
      return;
    }

    startCreatingFamily(async () => {
      const { data: family, error: familyError } = await supabase
        .from("families")
        .insert({
          household_name: deskFamily.household_name.trim(),
          primary_phone: deskFamily.primary_phone.trim(),
          email: deskFamily.email.trim() || null,
          emergency_notes: deskFamily.emergency_notes.trim() || null,
        })
        .select("id")
        .single();

      if (familyError || !family) {
        toast.error(familyError?.message || "Unable to create family.");
        return;
      }

      const childrenPayload = deskChildren.map((child) => ({
        family_id: family.id,
        first_name: child.first_name.trim(),
        last_name: child.last_name.trim(),
        preferred_name: child.preferred_name.trim() || null,
        birthdate: child.birthdate,
        grade_label: child.grade_label.trim() || null,
        allergies: child.allergies.trim() || null,
        medical_notes: child.medical_notes.trim() || null,
        special_instructions: child.special_instructions.trim() || null,
        default_room_id: child.default_room_id || null,
      }));

      const { error: childrenError } = await supabase.from("children").insert(childrenPayload);

      if (childrenError) {
        toast.error(childrenError.message);
        return;
      }

      const pickupPayload = deskPickups
        .filter((pickup) => pickup.full_name.trim())
        .map((pickup) => ({
          family_id: family.id,
          full_name: pickup.full_name.trim(),
          phone: pickup.phone.trim() || null,
          relationship: pickup.relationship.trim() || null,
          email: pickup.email.trim() || null,
          notes: pickup.notes.trim() || null,
          can_pick_up: true,
        }));

      if (pickupPayload.length > 0) {
        const { error: pickupError } = await supabase.from("authorized_pickups").insert(pickupPayload);

        if (pickupError) {
          toast.error(pickupError.message);
          return;
        }
      }

      resetDeskForm();
      setSearch("");
      setResults([]);
      await loadFamily(family.id);
      toast.success("Family saved. They are ready to check in.");
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

  function renderFamilySetup() {
    if (!selectedFamily?.snapshot) {
      return null;
    }

    return (
      <div className="space-y-5 rounded-[1.5rem] border border-orange-200 bg-orange-50/70 p-5">
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
      </div>
    );
  }

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
            <div className="flex flex-col gap-3 xl:flex-row xl:items-stretch">
              <Input
                className="h-14 min-w-0 flex-1 px-5 text-base sm:text-lg xl:min-w-[15rem]"
                onChange={(event) => setSearch(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    handleSearch();
                  }
                }}
                placeholder="Last name, phone, or email"
                value={search}
              />
              <div className="grid gap-3 sm:grid-cols-2 xl:min-w-[22rem]">
                <Button className="h-14 px-6 text-base whitespace-nowrap" disabled={searching} onClick={handleSearch}>
                  {searching ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                  Search
                </Button>
                <Button
                  className="h-14 px-6 text-base whitespace-nowrap"
                  onClick={handleOpenDeskMode}
                  type="button"
                  variant="secondary"
                >
                  <UserPlus className="h-4 w-4" />
                  New family at desk
                </Button>
              </div>
            </div>
            <div className="space-y-3">
              {deskMode ? (
                <div className="rounded-[1.5rem] border border-orange-100 bg-white p-5">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-xs uppercase tracking-[0.28em] text-orange-600">Front desk intake</p>
                      <h3 className="mt-2 text-xl font-semibold text-slate-950">Create a family on the spot</h3>
                      <p className="mt-2 text-sm leading-7 text-slate-600">
                        Save them once, then search by last name, phone digits, or email on future Sundays.
                      </p>
                    </div>
                    <Button onClick={handleCancelDeskMode} type="button" variant="ghost">
                      Cancel
                    </Button>
                  </div>

                  <div className="mt-5 space-y-5">
                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="space-y-2">
                        <Label htmlFor="desk-household-name">Household name</Label>
                        <Input
                          id="desk-household-name"
                          onChange={(event) =>
                            setDeskFamily((current) => ({ ...current, household_name: event.target.value }))
                          }
                          placeholder="Vela Family"
                          value={deskFamily.household_name}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="desk-primary-phone">Primary phone</Label>
                        <Input
                          id="desk-primary-phone"
                          inputMode="tel"
                          onChange={(event) =>
                            setDeskFamily((current) => ({ ...current, primary_phone: event.target.value }))
                          }
                          placeholder="(555) 555-5555"
                          value={deskFamily.primary_phone}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="desk-email">Family email</Label>
                        <Input
                          id="desk-email"
                          onChange={(event) =>
                            setDeskFamily((current) => ({ ...current, email: event.target.value }))
                          }
                          placeholder="family@example.com"
                          type="email"
                          value={deskFamily.email}
                        />
                      </div>
                      <div className="space-y-2 md:col-span-2">
                        <Label htmlFor="desk-emergency-notes">Household notes</Label>
                        <Textarea
                          id="desk-emergency-notes"
                          onChange={(event) =>
                            setDeskFamily((current) => ({ ...current, emergency_notes: event.target.value }))
                          }
                          placeholder="Emergency contact details or general notes for staff."
                          value={deskFamily.emergency_notes}
                        />
                      </div>
                    </div>

                    <div className="space-y-3">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="text-sm font-semibold text-slate-950">Children</p>
                          <p className="text-sm text-slate-500">Birthdate is required. Grade is optional.</p>
                        </div>
                        <Button onClick={addDeskChild} type="button" variant="secondary">
                          <Plus className="h-4 w-4" />
                          Add child
                        </Button>
                      </div>
                      {deskChildren.map((child, index) => (
                        <div className="rounded-[1.5rem] border border-orange-100 bg-orange-50/45 p-4" key={`desk-child-${index}`}>
                          <div className="mb-4 flex items-center justify-between gap-3">
                            <p className="font-semibold text-slate-900">Child {index + 1}</p>
                            {deskChildren.length > 1 ? (
                              <Button onClick={() => removeDeskChild(index)} size="sm" type="button" variant="ghost">
                                <Trash2 className="h-4 w-4" />
                                Remove
                              </Button>
                            ) : null}
                          </div>
                          <div className="grid gap-4 md:grid-cols-2">
                            <div className="space-y-2">
                              <Label>First name</Label>
                              <Input
                                onChange={(event) => updateDeskChild(index, "first_name", event.target.value)}
                                value={child.first_name}
                              />
                            </div>
                            <div className="space-y-2">
                              <Label>Last name</Label>
                              <Input
                                onChange={(event) => updateDeskChild(index, "last_name", event.target.value)}
                                value={child.last_name}
                              />
                            </div>
                            <div className="space-y-2">
                              <Label>Preferred name</Label>
                              <Input
                                onChange={(event) => updateDeskChild(index, "preferred_name", event.target.value)}
                                value={child.preferred_name}
                              />
                            </div>
                            <div className="space-y-2">
                              <Label>Birthdate</Label>
                              <Input
                                onChange={(event) => updateDeskChild(index, "birthdate", event.target.value)}
                                type="date"
                                value={child.birthdate}
                              />
                            </div>
                            <div className="space-y-2">
                              <Label>Grade</Label>
                              <Input
                                onChange={(event) => updateDeskChild(index, "grade_label", event.target.value)}
                                placeholder="Optional"
                                value={child.grade_label}
                              />
                            </div>
                            <div className="space-y-2">
                              <Label>Default room</Label>
                              <select
                                className="h-11 w-full rounded-2xl border border-orange-100 bg-white px-4 text-sm outline-none focus:border-orange-300"
                                onChange={(event) => updateDeskChild(index, "default_room_id", event.target.value)}
                                value={child.default_room_id}
                              >
                                <option value="">Choose room later</option>
                                {initialRooms.map((room) => (
                                  <option key={room.id} value={room.id}>
                                    {room.name} · {room.location ?? "Main building"}
                                  </option>
                                ))}
                              </select>
                            </div>
                            <div className="space-y-2 md:col-span-2">
                              <Label>Allergies</Label>
                              <Textarea
                                onChange={(event) => updateDeskChild(index, "allergies", event.target.value)}
                                placeholder="Peanuts, dairy, epi pen, etc."
                                value={child.allergies}
                              />
                            </div>
                            <div className="space-y-2 md:col-span-2">
                              <Label>Medical notes</Label>
                              <Textarea
                                onChange={(event) => updateDeskChild(index, "medical_notes", event.target.value)}
                                placeholder="Medication, epi pen, sensory needs, or health details."
                                value={child.medical_notes}
                              />
                            </div>
                            <div className="space-y-2 md:col-span-2">
                              <Label>Special instructions</Label>
                              <Textarea
                                onChange={(event) => updateDeskChild(index, "special_instructions", event.target.value)}
                                placeholder="Comfort notes, bathroom help, drop-off routines, etc."
                                value={child.special_instructions}
                              />
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="space-y-3">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="text-sm font-semibold text-slate-950">Approved pickup adults</p>
                          <p className="text-sm text-slate-500">Optional now. Add at least one if the family gives you one.</p>
                        </div>
                        <Button onClick={addDeskPickup} type="button" variant="secondary">
                          <Plus className="h-4 w-4" />
                          Add adult
                        </Button>
                      </div>
                      {deskPickups.map((pickup, index) => (
                        <div className="rounded-[1.5rem] border border-orange-100 bg-white p-4" key={`desk-pickup-${index}`}>
                          <div className="mb-4 flex items-center justify-between gap-3">
                            <p className="font-semibold text-slate-900">Approved adult {index + 1}</p>
                            {deskPickups.length > 1 ? (
                              <Button onClick={() => removeDeskPickup(index)} size="sm" type="button" variant="ghost">
                                <Trash2 className="h-4 w-4" />
                                Remove
                              </Button>
                            ) : null}
                          </div>
                          <div className="grid gap-4 md:grid-cols-2">
                            <div className="space-y-2">
                              <Label>Full name</Label>
                              <Input
                                onChange={(event) => updateDeskPickup(index, "full_name", event.target.value)}
                                value={pickup.full_name}
                              />
                            </div>
                            <div className="space-y-2">
                              <Label>Phone</Label>
                              <Input
                                onChange={(event) => updateDeskPickup(index, "phone", event.target.value)}
                                value={pickup.phone}
                              />
                            </div>
                            <div className="space-y-2">
                              <Label>Relationship</Label>
                              <Input
                                onChange={(event) => updateDeskPickup(index, "relationship", event.target.value)}
                                placeholder="Mom, Dad, Grandma, etc."
                                value={pickup.relationship}
                              />
                            </div>
                            <div className="space-y-2">
                              <Label>Email</Label>
                              <Input
                                onChange={(event) => updateDeskPickup(index, "email", event.target.value)}
                                type="email"
                                value={pickup.email}
                              />
                            </div>
                            <div className="space-y-2 md:col-span-2">
                              <Label>Notes</Label>
                              <Textarea
                                onChange={(event) => updateDeskPickup(index, "notes", event.target.value)}
                                placeholder="Any pickup notes staff should remember."
                                value={pickup.notes}
                              />
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>

                    <Button className="w-full" disabled={creatingFamily} onClick={handleCreateFamilyAtDesk} size="lg" type="button">
                      {creatingFamily ? (
                        <LoaderCircle className="h-4 w-4 animate-spin" />
                      ) : (
                        <UserPlus className="h-4 w-4" />
                      )}
                      Save family and open check-in
                    </Button>
                  </div>
                </div>
              ) : results.length === 0 ? (
                <div className="rounded-[1.5rem] border border-dashed border-orange-200 p-5 text-sm text-muted-foreground">
                  Search results will appear here. If a family is brand new, use the New family at desk button.
                </div>
              ) : (
                results.map((result) => (
                  <div className="space-y-3" key={result.family_id}>
                    <button
                      className="w-full rounded-[1.5rem] border border-orange-100 bg-white p-4 text-left transition hover:border-orange-300 hover:bg-orange-50"
                      onClick={() => void loadFamily(result.family_id)}
                      type="button"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <p className="text-lg font-semibold text-slate-950">{result.household_name}</p>
                          <p className="text-sm text-slate-600">{formatPhone(result.primary_phone)}</p>
                          {result.email ? <p className="text-sm text-slate-500">{result.email}</p> : null}
                          <p className="mt-2 text-sm text-slate-500">{result.child_names}</p>
                        </div>
                        <Badge variant="secondary">{result.child_count} kids</Badge>
                      </div>
                    </button>
                    {selectedFamily?.snapshot?.family?.id === result.family_id ? renderFamilySetup() : null}
                  </div>
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
                  <div className="space-y-3" key={entry.id}>
                    <button
                      className="w-full rounded-[1.5rem] border border-orange-100 bg-white p-4 text-left transition hover:border-orange-300 hover:bg-orange-50"
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
                    {selectedFamily?.snapshot?.family?.id === entry.family.id ? renderFamilySetup() : null}
                  </div>
                );
              })
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6">
        <LabelPrintSheet payload={labelPayload} onMarkPrinted={markPrinted} />
      </div>
    </div>
  );
}
