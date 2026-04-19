"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import QRCode from "react-qr-code";
import { LoaderCircle, Pencil, Plus, ShieldCheck, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useRealtimeFamily } from "@/hooks/use-realtime-family";
import { createClient } from "@/lib/supabase/browser";
import {
  formatDateTime,
  formatGradeOrAge,
  formatPhone,
  formatTemplateLabel,
  normalizeBrandCopy,
} from "@/lib/utils";

function backgroundCheckVariant(status: string) {
  if (status === "approved") return "success";
  if (status === "expired" || status === "rejected") return "danger";
  return "secondary";
}

function createBlankChildForm() {
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

function createBlankPickupForm() {
  return {
    full_name: "",
    phone: "",
    relationship: "",
    email: "",
    notes: "",
  };
}

function createChildEditorState(child?: any) {
  if (!child) {
    return createBlankChildForm();
  }

  return {
    first_name: child.first_name ?? "",
    last_name: child.last_name ?? "",
    preferred_name: child.preferred_name ?? "",
    birthdate: child.birthdate ?? "",
    grade_label: child.grade_label ?? "",
    allergies: child.allergies ?? "",
    medical_notes: child.medical_notes ?? "",
    special_instructions: child.special_instructions ?? "",
    default_room_id: child.default_room_id ?? "",
  };
}

function createPickupEditorState(pickup?: any) {
  if (!pickup) {
    return createBlankPickupForm();
  }

  return {
    full_name: pickup.full_name ?? "",
    phone: pickup.phone ?? "",
    relationship: pickup.relationship ?? "",
    email: pickup.email ?? "",
    notes: pickup.notes ?? "",
  };
}

export function ParentPortal({
  profile,
  familyId,
  initialSnapshot,
  services,
  rooms,
  initialPrecheckins,
}: {
  profile: any;
  familyId: string | null;
  initialSnapshot: any | null;
  services: any[];
  rooms: any[];
  initialPrecheckins: any[];
}) {
  const supabase = useMemo(() => createClient(), []);
  const router = useRouter();
  const snapshot = useRealtimeFamily<any>(familyId, initialSnapshot);
  const [selectedServiceId, setSelectedServiceId] = useState<string>(
    initialPrecheckins[0]?.service_event_id ?? services[0]?.id ?? "",
  );
  const [selectedChildren, setSelectedChildren] = useState<Record<string, boolean>>({});
  const [precheckinNote, setPrecheckinNote] = useState("");
  const [familyForm, setFamilyForm] = useState({
    household_name: "",
    primary_phone: profile.phone ?? "",
    email: profile.email ?? "",
    address_line_1: "",
    address_line_2: "",
    city: "",
    state: "",
    postal_code: "",
  });
  const [childForm, setChildForm] = useState(createBlankChildForm());
  const [pickupForm, setPickupForm] = useState(createBlankPickupForm());
  const [editingChildId, setEditingChildId] = useState<string | null>(null);
  const [editingChildForm, setEditingChildForm] = useState(createBlankChildForm());
  const [editingPickupId, setEditingPickupId] = useState<string | null>(null);
  const [editingPickupForm, setEditingPickupForm] = useState(createBlankPickupForm());
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    if (!snapshot?.children) {
      return;
    }

    setSelectedChildren(
      Object.fromEntries(snapshot.children.map((child: any) => [child.id, true])),
    );
  }, [snapshot?.children]);

  async function handleCreateFamily(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    startTransition(async () => {
      const { error } = await supabase.rpc("create_family_household", {
        p_household_name: familyForm.household_name,
        p_primary_phone: familyForm.primary_phone,
        p_email: familyForm.email || null,
        p_address_line_1: familyForm.address_line_1 || null,
        p_address_line_2: familyForm.address_line_2 || null,
        p_city: familyForm.city || null,
        p_state: familyForm.state || null,
        p_postal_code: familyForm.postal_code || null,
      });

      if (error) {
        toast.error(error.message);
        return;
      }

      toast.success("Household created.");
      router.refresh();
    });
  }

  async function handleAddChild(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!familyId) return;

    startTransition(async () => {
      const { error } = await supabase.from("children").insert({
        family_id: familyId,
        first_name: childForm.first_name,
        last_name: childForm.last_name,
        preferred_name: childForm.preferred_name || null,
        birthdate: childForm.birthdate,
        grade_label: childForm.grade_label || null,
        allergies: childForm.allergies || null,
        medical_notes: childForm.medical_notes || null,
        special_instructions: childForm.special_instructions || null,
        default_room_id: childForm.default_room_id || null,
      });

      if (error) {
        toast.error(error.message);
        return;
      }

      setChildForm(createBlankChildForm());
      toast.success("Child added.");
    });
  }

  async function handleAddPickup(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!familyId) return;

    startTransition(async () => {
      const { error } = await supabase.from("authorized_pickups").insert({
        family_id: familyId,
        full_name: pickupForm.full_name,
        phone: pickupForm.phone || null,
        relationship: pickupForm.relationship || null,
        email: pickupForm.email || null,
        notes: pickupForm.notes || null,
        can_pick_up: true,
      });

      if (error) {
        toast.error(error.message);
        return;
      }

      setPickupForm(createBlankPickupForm());
      toast.success("Approved pickup adult added.");
    });
  }

  function handleStartEditChild(child: any) {
    setEditingChildId(child.id);
    setEditingChildForm(createChildEditorState(child));
  }

  function handleStartEditPickup(pickup: any) {
    setEditingPickupId(pickup.id);
    setEditingPickupForm(createPickupEditorState(pickup));
  }

  function handleSaveChild(childId: string) {
    if (!editingChildForm.first_name.trim() || !editingChildForm.last_name.trim() || !editingChildForm.birthdate) {
      toast.error("First name, last name, and birthdate are required.");
      return;
    }

    startTransition(async () => {
      const { error } = await supabase
        .from("children")
        .update({
          first_name: editingChildForm.first_name.trim(),
          last_name: editingChildForm.last_name.trim(),
          preferred_name: editingChildForm.preferred_name.trim() || null,
          birthdate: editingChildForm.birthdate,
          grade_label: editingChildForm.grade_label.trim() || null,
          allergies: editingChildForm.allergies.trim() || null,
          medical_notes: editingChildForm.medical_notes.trim() || null,
          special_instructions: editingChildForm.special_instructions.trim() || null,
          default_room_id: editingChildForm.default_room_id || null,
        })
        .eq("id", childId);

      if (error) {
        toast.error(error.message);
        return;
      }

      setEditingChildId(null);
      setEditingChildForm(createBlankChildForm());
      toast.success("Child updated.");
    });
  }

  function handleRemoveChild(childId: string) {
    startTransition(async () => {
      const { error } = await supabase
        .from("children")
        .update({ active: false })
        .eq("id", childId);

      if (error) {
        toast.error(error.message);
        return;
      }

      if (editingChildId === childId) {
        setEditingChildId(null);
        setEditingChildForm(createBlankChildForm());
      }

      toast.success("Child removed from the household list.");
    });
  }

  function handleSavePickup(pickupId: string) {
    if (!editingPickupForm.full_name.trim()) {
      toast.error("Pickup adult name is required.");
      return;
    }

    startTransition(async () => {
      const { error } = await supabase
        .from("authorized_pickups")
        .update({
          full_name: editingPickupForm.full_name.trim(),
          phone: editingPickupForm.phone.trim() || null,
          relationship: editingPickupForm.relationship.trim() || null,
          email: editingPickupForm.email.trim() || null,
          notes: editingPickupForm.notes.trim() || null,
          can_pick_up: true,
        })
        .eq("id", pickupId);

      if (error) {
        toast.error(error.message);
        return;
      }

      setEditingPickupId(null);
      setEditingPickupForm(createBlankPickupForm());
      toast.success("Approved pickup adult updated.");
    });
  }

  function handleRemovePickup(pickupId: string) {
    startTransition(async () => {
      const { error } = await supabase
        .from("authorized_pickups")
        .update({ can_pick_up: false })
        .eq("id", pickupId);

      if (error) {
        toast.error(error.message);
        return;
      }

      if (editingPickupId === pickupId) {
        setEditingPickupId(null);
        setEditingPickupForm(createBlankPickupForm());
      }

      toast.success("Approved pickup adult removed from the active list.");
    });
  }

  async function handlePrecheckin() {
    if (!familyId || !selectedServiceId) {
      toast.error("Select a service first.");
      return;
    }

    const childIds = Object.entries(selectedChildren)
      .filter(([, isSelected]) => isSelected)
      .map(([childId]) => childId);

    if (childIds.length === 0) {
      toast.error("Choose at least one child.");
      return;
    }

    startTransition(async () => {
      const { error } = await supabase.rpc("submit_precheckin", {
        p_family_id: familyId,
        p_service_event_id: selectedServiceId,
        p_child_ids: childIds,
        p_notes: precheckinNote || null,
      });

      if (error) {
        toast.error(error.message);
        return;
      }

      toast.success("Pre-check-in submitted. You can head straight to the kiosk.");
      setPrecheckinNote("");
    });
  }

  if (!familyId || !snapshot) {
    return (
      <Card className="glass-panel mx-auto max-w-4xl">
        <CardHeader>
          <CardTitle className="text-3xl">Set up your household</CardTitle>
          <CardDescription>
            We use this once to create your family group and primary pickup record.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form className="grid gap-4 md:grid-cols-2" onSubmit={handleCreateFamily}>
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="household-name">Household name</Label>
              <Input
                id="household-name"
                onChange={(event) =>
                  setFamilyForm((current) => ({
                    ...current,
                    household_name: event.target.value,
                  }))
                }
                placeholder="Rivera Family"
                required
                value={familyForm.household_name}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="primary-phone">Primary phone</Label>
              <Input
                id="primary-phone"
                onChange={(event) =>
                  setFamilyForm((current) => ({
                    ...current,
                    primary_phone: event.target.value,
                  }))
                }
                placeholder="(555) 555-5555"
                required
                value={familyForm.primary_phone}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="family-email">Family email</Label>
              <Input
                id="family-email"
                onChange={(event) =>
                  setFamilyForm((current) => ({
                    ...current,
                    email: event.target.value,
                  }))
                }
                placeholder="family@example.com"
                type="email"
                value={familyForm.email}
              />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="address-1">Address</Label>
              <Input
                id="address-1"
                onChange={(event) =>
                  setFamilyForm((current) => ({
                    ...current,
                    address_line_1: event.target.value,
                  }))
                }
                placeholder="123 Main St"
                value={familyForm.address_line_1}
              />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Input
                aria-label="Address line 2"
                onChange={(event) =>
                  setFamilyForm((current) => ({
                    ...current,
                    address_line_2: event.target.value,
                  }))
                }
                placeholder="Apartment, suite, etc."
                value={familyForm.address_line_2}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="city">City</Label>
              <Input
                id="city"
                onChange={(event) =>
                  setFamilyForm((current) => ({
                    ...current,
                    city: event.target.value,
                  }))
                }
                value={familyForm.city}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="state">State</Label>
              <Input
                id="state"
                onChange={(event) =>
                  setFamilyForm((current) => ({
                    ...current,
                    state: event.target.value,
                  }))
                }
                value={familyForm.state}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="zip">Postal code</Label>
              <Input
                id="zip"
                onChange={(event) =>
                  setFamilyForm((current) => ({
                    ...current,
                    postal_code: event.target.value,
                  }))
                }
                value={familyForm.postal_code}
              />
            </div>
            <div className="md:col-span-2">
              <Button disabled={pending} size="lg" type="submit">
                {pending ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                Create household
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <Card className="glass-panel">
          <CardHeader>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <CardTitle className="text-2xl">Welcome, {profile.full_name}</CardTitle>
                <CardDescription>
                  Manage children, approved pickups, and pre-check-ins for {snapshot.family.household_name}.
                </CardDescription>
              </div>
              <Badge variant="secondary">{formatPhone(snapshot.family.primary_phone)}</Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="rounded-[1.5rem] bg-slate-950 p-5 text-white">
                <p className="text-xs uppercase tracking-[0.28em] text-orange-200">Family grouping</p>
                <p className="mt-3 text-2xl font-semibold">{snapshot.family.household_name}</p>
                <p className="mt-2 text-sm text-orange-100">
                  {snapshot.children.length} children · {snapshot.authorizedPickups.length} pickup adults
                </p>
              </div>
              <div className="rounded-[1.5rem] border border-orange-100 bg-white p-5">
                <p className="text-xs uppercase tracking-[0.28em] text-slate-500">Account security</p>
                <div className="mt-3 flex items-center gap-3">
                  <ShieldCheck className="h-5 w-5 text-orange-500" />
                  <p className="text-sm text-slate-700">
                    COPPA-friendly family access with per-household Supabase RLS.
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <Label>Choose kids for the next service</Label>
              <select
                className="h-11 w-full rounded-2xl border border-orange-100 bg-white px-4 text-sm outline-none"
                onChange={(event) => setSelectedServiceId(event.target.value)}
                value={selectedServiceId}
              >
                {services.map((service) => (
                  <option key={service.id} value={service.id}>
                    {service.name} · {formatDateTime(service.starts_at)}
                  </option>
                ))}
              </select>
              <div className="space-y-3">
                {snapshot.children.length === 0 ? (
                  <div className="rounded-[1.5rem] border border-dashed border-orange-200 p-5 text-sm text-muted-foreground">
                    Add your first child below to enable pre-check-in.
                  </div>
                ) : (
                  snapshot.children.map((child: any) => (
                    <label
                      className="flex gap-4 rounded-[1.5rem] border border-orange-100 bg-white p-4"
                      key={child.id}
                    >
                      <Checkbox
                        checked={Boolean(selectedChildren[child.id])}
                        onChange={() =>
                          setSelectedChildren((current) => ({
                            ...current,
                            [child.id]: !current[child.id],
                          }))
                        }
                      />
                      <div className="flex-1">
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <div>
                            <p className="text-lg font-semibold text-slate-950">
                              {child.preferred_name || child.first_name} {child.last_name}
                            </p>
                            <p className="text-sm text-slate-500">
                              {formatGradeOrAge(child.grade_label, child.birthdate)}
                            </p>
                          </div>
                          {child.default_room_id ? (
                            <Badge variant="secondary">
                              {rooms.find((room) => room.id === child.default_room_id)?.name ?? "Room assigned"}
                            </Badge>
                          ) : null}
                        </div>
                        <p className="mt-2 text-sm leading-7 text-slate-700">
                          {child.allergies || "No allergies listed"}{" "}
                          {child.special_instructions ? `· ${child.special_instructions}` : ""}
                        </p>
                      </div>
                    </label>
                  ))
                )}
              </div>
              <Textarea
                onChange={(event) => setPrecheckinNote(event.target.value)}
                placeholder="Optional note for the kiosk team"
                value={precheckinNote}
              />
              <Button disabled={pending || snapshot.children.length === 0} onClick={handlePrecheckin}>
                {pending ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
                Submit pre-check-in
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="glass-panel">
          <CardHeader>
            <CardTitle className="text-2xl">Active security code</CardTitle>
            <CardDescription>
              Your pickup code updates in real time whenever your children are checked in.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {snapshot.activeSession ? (
              <div className="space-y-5">
                <div className="rounded-[1.75rem] bg-slate-950 p-6 text-white">
                  <p className="text-xs uppercase tracking-[0.28em] text-orange-200">Current code</p>
                  <p className="mt-4 text-5xl font-semibold tracking-[0.2em]">
                    {snapshot.activeSession.security_code}
                  </p>
                  <p className="mt-3 text-sm text-orange-100">
                    Checked in {formatDateTime(snapshot.activeSession.checked_in_at)}
                  </p>
                </div>
                <div className="rounded-[1.5rem] border border-orange-100 bg-white p-6">
                  <QRCode className="mx-auto h-48 w-48" value={snapshot.activeSession.security_qr_token} />
                </div>
              </div>
            ) : (
              <div className="rounded-[1.5rem] border border-dashed border-orange-200 p-5 text-sm text-muted-foreground">
                No active check-in yet. Your live code will appear here as soon as a kiosk volunteer completes
                drop-off.
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <Card className="glass-panel">
          <CardHeader>
            <CardTitle>Manage children</CardTitle>
            <CardDescription>
              Add new children, edit their information, or remove them from the active household list.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="space-y-3">
              {snapshot.children.length === 0 ? (
                <div className="rounded-[1.25rem] border border-dashed border-orange-200 p-5 text-sm text-muted-foreground">
                  No children added yet.
                </div>
              ) : (
                snapshot.children.map((child: any) => (
                  <div
                    className="rounded-[1.25rem] border border-orange-100 bg-white p-4"
                    key={child.id}
                  >
                    {editingChildId === child.id ? (
                      <div className="space-y-4">
                        <div className="grid gap-4 md:grid-cols-2">
                          <div className="space-y-2">
                            <Label>First name</Label>
                            <Input
                              onChange={(event) =>
                                setEditingChildForm((current) => ({ ...current, first_name: event.target.value }))
                              }
                              value={editingChildForm.first_name}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>Last name</Label>
                            <Input
                              onChange={(event) =>
                                setEditingChildForm((current) => ({ ...current, last_name: event.target.value }))
                              }
                              value={editingChildForm.last_name}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>Preferred name</Label>
                            <Input
                              onChange={(event) =>
                                setEditingChildForm((current) => ({
                                  ...current,
                                  preferred_name: event.target.value,
                                }))
                              }
                              value={editingChildForm.preferred_name}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>Birthdate</Label>
                            <Input
                              onChange={(event) =>
                                setEditingChildForm((current) => ({ ...current, birthdate: event.target.value }))
                              }
                              type="date"
                              value={editingChildForm.birthdate}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>Grade</Label>
                            <Input
                              onChange={(event) =>
                                setEditingChildForm((current) => ({ ...current, grade_label: event.target.value }))
                              }
                              value={editingChildForm.grade_label}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>Default room</Label>
                            <select
                              className="h-11 w-full rounded-2xl border border-orange-100 bg-white px-4 text-sm outline-none"
                              onChange={(event) =>
                                setEditingChildForm((current) => ({
                                  ...current,
                                  default_room_id: event.target.value,
                                }))
                              }
                              value={editingChildForm.default_room_id}
                            >
                              <option value="">Choose room</option>
                              {rooms.map((room) => (
                                <option key={room.id} value={room.id}>
                                  {room.name}
                                </option>
                              ))}
                            </select>
                          </div>
                          <div className="space-y-2 md:col-span-2">
                            <Label>Allergies</Label>
                            <Textarea
                              onChange={(event) =>
                                setEditingChildForm((current) => ({ ...current, allergies: event.target.value }))
                              }
                              value={editingChildForm.allergies}
                            />
                          </div>
                          <div className="space-y-2 md:col-span-2">
                            <Label>Medical notes</Label>
                            <Textarea
                              onChange={(event) =>
                                setEditingChildForm((current) => ({
                                  ...current,
                                  medical_notes: event.target.value,
                                }))
                              }
                              value={editingChildForm.medical_notes}
                            />
                          </div>
                          <div className="space-y-2 md:col-span-2">
                            <Label>Special instructions</Label>
                            <Textarea
                              onChange={(event) =>
                                setEditingChildForm((current) => ({
                                  ...current,
                                  special_instructions: event.target.value,
                                }))
                              }
                              value={editingChildForm.special_instructions}
                            />
                          </div>
                        </div>
                        <div className="flex flex-wrap gap-3">
                          <Button disabled={pending} onClick={() => handleSaveChild(child.id)} type="button">
                            {pending ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
                            Save child
                          </Button>
                          <Button
                            disabled={pending}
                            onClick={() => {
                              setEditingChildId(null);
                              setEditingChildForm(createBlankChildForm());
                            }}
                            type="button"
                            variant="secondary"
                          >
                            Cancel
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div>
                            <p className="text-lg font-semibold text-slate-950">
                              {child.preferred_name || child.first_name} {child.last_name}
                            </p>
                            <p className="text-sm text-slate-500">
                              {formatGradeOrAge(child.grade_label, child.birthdate)}
                              {child.default_room_id
                                ? ` · ${rooms.find((room) => room.id === child.default_room_id)?.name ?? "Room assigned"}`
                                : ""}
                            </p>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            <Button onClick={() => handleStartEditChild(child)} size="sm" type="button" variant="secondary">
                              <Pencil className="h-3.5 w-3.5" />
                              Edit
                            </Button>
                            <Button onClick={() => handleRemoveChild(child.id)} size="sm" type="button" variant="danger">
                              <Trash2 className="h-3.5 w-3.5" />
                              Remove
                            </Button>
                          </div>
                        </div>
                        <p className="text-sm leading-7 text-slate-700">
                          {child.allergies || "No allergies listed"}
                          {child.medical_notes ? ` · ${child.medical_notes}` : ""}
                          {child.special_instructions ? ` · ${child.special_instructions}` : ""}
                        </p>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>

            <div className="border-t border-orange-100 pt-5">
              <form className="grid gap-4 md:grid-cols-2" onSubmit={handleAddChild}>
                <div className="space-y-2">
                  <Label htmlFor="child-first-name">First name</Label>
                  <Input
                    id="child-first-name"
                    onChange={(event) =>
                      setChildForm((current) => ({ ...current, first_name: event.target.value }))
                    }
                    required
                    value={childForm.first_name}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="child-last-name">Last name</Label>
                  <Input
                    id="child-last-name"
                    onChange={(event) =>
                      setChildForm((current) => ({ ...current, last_name: event.target.value }))
                    }
                    required
                    value={childForm.last_name}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="preferred-name">Preferred name</Label>
                  <Input
                    id="preferred-name"
                    onChange={(event) =>
                      setChildForm((current) => ({ ...current, preferred_name: event.target.value }))
                    }
                    value={childForm.preferred_name}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="birthdate">Birthdate</Label>
                  <Input
                    id="birthdate"
                    onChange={(event) =>
                      setChildForm((current) => ({ ...current, birthdate: event.target.value }))
                    }
                    required
                    type="date"
                    value={childForm.birthdate}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="grade-label">Grade</Label>
                  <Input
                    id="grade-label"
                    onChange={(event) =>
                      setChildForm((current) => ({ ...current, grade_label: event.target.value }))
                    }
                    placeholder="Kindergarten"
                    value={childForm.grade_label}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="room">Default room</Label>
                  <select
                    className="h-11 w-full rounded-2xl border border-orange-100 bg-white px-4 text-sm outline-none"
                    id="room"
                    onChange={(event) =>
                      setChildForm((current) => ({ ...current, default_room_id: event.target.value }))
                    }
                    value={childForm.default_room_id}
                  >
                    <option value="">Choose room</option>
                    {rooms.map((room) => (
                      <option key={room.id} value={room.id}>
                        {room.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="allergies">Allergies</Label>
                  <Textarea
                    id="allergies"
                    onChange={(event) =>
                      setChildForm((current) => ({ ...current, allergies: event.target.value }))
                    }
                    value={childForm.allergies}
                  />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="medical-notes">Medical notes</Label>
                  <Textarea
                    id="medical-notes"
                    onChange={(event) =>
                      setChildForm((current) => ({ ...current, medical_notes: event.target.value }))
                    }
                    value={childForm.medical_notes}
                  />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="special-instructions">Special instructions</Label>
                  <Textarea
                    id="special-instructions"
                    onChange={(event) =>
                      setChildForm((current) => ({
                        ...current,
                        special_instructions: event.target.value,
                      }))
                    }
                    value={childForm.special_instructions}
                  />
                </div>
                <div className="md:col-span-2">
                  <Button disabled={pending} type="submit">
                    {pending ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                    Add child
                  </Button>
                </div>
              </form>
            </div>
          </CardContent>
        </Card>

        <Card className="glass-panel">
          <CardHeader>
            <CardTitle>Approved pickup adults</CardTitle>
            <CardDescription>
              Keep pickup adults current, edit their contact details, or remove them from the active list.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="space-y-3">
              {snapshot.authorizedPickups.length === 0 ? (
                <div className="rounded-[1.25rem] border border-dashed border-orange-200 p-5 text-sm text-muted-foreground">
                  No approved pickup adults yet.
                </div>
              ) : (
                snapshot.authorizedPickups.map((pickup: any) => (
                  <div
                    className="rounded-[1.25rem] border border-orange-100 bg-white p-4"
                    key={pickup.id}
                  >
                    {editingPickupId === pickup.id ? (
                      <div className="space-y-4">
                        <div className="grid gap-4 md:grid-cols-2">
                          <div className="space-y-2">
                            <Label>Full name</Label>
                            <Input
                              onChange={(event) =>
                                setEditingPickupForm((current) => ({ ...current, full_name: event.target.value }))
                              }
                              value={editingPickupForm.full_name}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>Phone</Label>
                            <Input
                              onChange={(event) =>
                                setEditingPickupForm((current) => ({ ...current, phone: event.target.value }))
                              }
                              value={editingPickupForm.phone}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>Relationship</Label>
                            <Input
                              onChange={(event) =>
                                setEditingPickupForm((current) => ({
                                  ...current,
                                  relationship: event.target.value,
                                }))
                              }
                              value={editingPickupForm.relationship}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>Email</Label>
                            <Input
                              onChange={(event) =>
                                setEditingPickupForm((current) => ({ ...current, email: event.target.value }))
                              }
                              type="email"
                              value={editingPickupForm.email}
                            />
                          </div>
                          <div className="space-y-2 md:col-span-2">
                            <Label>Notes</Label>
                            <Textarea
                              onChange={(event) =>
                                setEditingPickupForm((current) => ({ ...current, notes: event.target.value }))
                              }
                              value={editingPickupForm.notes}
                            />
                          </div>
                        </div>
                        <div className="flex flex-wrap gap-3">
                          <Button disabled={pending} onClick={() => handleSavePickup(pickup.id)} type="button">
                            {pending ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
                            Save adult
                          </Button>
                          <Button
                            disabled={pending}
                            onClick={() => {
                              setEditingPickupId(null);
                              setEditingPickupForm(createBlankPickupForm());
                            }}
                            type="button"
                            variant="secondary"
                          >
                            Cancel
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div>
                            <p className="font-semibold text-slate-950">{pickup.full_name}</p>
                            <p className="text-sm text-slate-500">
                              {pickup.relationship || "Approved adult"} · {formatPhone(pickup.phone)}
                            </p>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            <Badge variant={backgroundCheckVariant(pickup.can_pick_up ? "approved" : "expired") as any}>
                              {pickup.can_pick_up ? "approved" : "inactive"}
                            </Badge>
                            <Button onClick={() => handleStartEditPickup(pickup)} size="sm" type="button" variant="secondary">
                              <Pencil className="h-3.5 w-3.5" />
                              Edit
                            </Button>
                            <Button onClick={() => handleRemovePickup(pickup.id)} size="sm" type="button" variant="danger">
                              <Trash2 className="h-3.5 w-3.5" />
                              Remove
                            </Button>
                          </div>
                        </div>
                        {pickup.notes ? (
                          <p className="text-sm leading-7 text-slate-700">{pickup.notes}</p>
                        ) : null}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>

            <div className="border-t border-orange-100 pt-5">
              <form className="grid gap-4 md:grid-cols-2" onSubmit={handleAddPickup}>
                <div className="space-y-2">
                  <Label htmlFor="pickup-name">Full name</Label>
                  <Input
                    id="pickup-name"
                    onChange={(event) =>
                      setPickupForm((current) => ({ ...current, full_name: event.target.value }))
                    }
                    required
                    value={pickupForm.full_name}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="pickup-phone">Phone</Label>
                  <Input
                    id="pickup-phone"
                    onChange={(event) =>
                      setPickupForm((current) => ({ ...current, phone: event.target.value }))
                    }
                    value={pickupForm.phone}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="pickup-relationship">Relationship</Label>
                  <Input
                    id="pickup-relationship"
                    onChange={(event) =>
                      setPickupForm((current) => ({
                        ...current,
                        relationship: event.target.value,
                      }))
                    }
                    placeholder="Grandparent"
                    value={pickupForm.relationship}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="pickup-email">Email</Label>
                  <Input
                    id="pickup-email"
                    onChange={(event) =>
                      setPickupForm((current) => ({ ...current, email: event.target.value }))
                    }
                    type="email"
                    value={pickupForm.email}
                  />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="pickup-notes">Notes</Label>
                  <Textarea
                    id="pickup-notes"
                    onChange={(event) =>
                      setPickupForm((current) => ({ ...current, notes: event.target.value }))
                    }
                    value={pickupForm.notes}
                  />
                </div>
                <div className="md:col-span-2">
                  <Button disabled={pending} type="submit" variant="secondary">
                    {pending ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                    Add approved adult
                  </Button>
                </div>
              </form>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="glass-panel">
        <CardHeader>
          <CardTitle>Recent family activity</CardTitle>
          <CardDescription>Notifications and live check-in updates appear here automatically.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {snapshot.notifications.length === 0 ? (
            <div className="rounded-[1.25rem] border border-dashed border-orange-200 p-5 text-sm text-muted-foreground">
              No messages yet.
            </div>
          ) : (
            snapshot.notifications.map((notification: any) => (
              <div
                className="rounded-[1.25rem] border border-orange-100 bg-white p-4"
                key={notification.id}
              >
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="font-semibold text-slate-950">
                      {formatTemplateLabel(notification.template_key)}
                    </p>
                    <p className="mt-1 text-sm leading-7 text-slate-600">
                      {normalizeBrandCopy(notification.message_body)}
                    </p>
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
    </div>
  );
}
