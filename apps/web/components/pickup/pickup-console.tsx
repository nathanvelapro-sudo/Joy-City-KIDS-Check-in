"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { ClipboardList, LoaderCircle, QrCode, Search, ShieldCheck } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  fetchPickupRoster,
  fetchPickupSearchResult,
  fetchPickupSessionResult,
} from "@/lib/data";
import { createClient } from "@/lib/supabase/browser";
import { formatDateTime, formatPhone } from "@/lib/utils";

export function PickupConsole({
  initialRoster,
  initialSelectedServiceId,
  initialServices,
}: {
  initialRoster: any[];
  initialSelectedServiceId: string | null;
  initialServices: any[];
}) {
  const supabase = useMemo(() => createClient(), []);
  const [code, setCode] = useState("");
  const [result, setResult] = useState<any | null>(null);
  const [selectedPickupId, setSelectedPickupId] = useState("");
  const [notes, setNotes] = useState("");
  const [rosterSearch, setRosterSearch] = useState("");
  const [roster, setRoster] = useState<any[]>(initialRoster);
  const [selectedServiceId, setSelectedServiceId] = useState<string>(
    initialSelectedServiceId ?? initialServices[0]?.id ?? "",
  );
  const [verificationMethod, setVerificationMethod] = useState<
    "security_code" | "qr_scan" | "manual_override"
  >("security_code");
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    if (!selectedServiceId) {
      setRoster([]);
      return;
    }

    let alive = true;

    async function refresh() {
      const nextRoster = await fetchPickupRoster(supabase, selectedServiceId);

      if (alive) {
        setRoster(nextRoster);
      }
    }

    void refresh();

    return () => {
      alive = false;
    };
  }, [selectedServiceId, supabase]);

  const filteredRoster = useMemo(() => {
    const query = rosterSearch.trim().toLowerCase();

    if (!query) {
      return roster;
    }

    return roster.filter((entry) => {
      const childNames = (entry.checkins ?? [])
        .map((checkin: any) =>
          `${checkin.child?.preferred_name || checkin.child?.first_name || ""} ${checkin.child?.last_name || ""}`.trim(),
        )
        .join(" ");

      return [
        entry.family?.household_name,
        entry.family?.primary_phone,
        childNames,
        entry.security_code_last4,
      ]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(query));
    });
  }, [roster, rosterSearch]);

  function applySession(next: any) {
    setResult(next);
    setSelectedPickupId(next?.bundle?.authorizedPickups?.[0]?.id ?? "");
  }

  function searchSession() {
    startTransition(async () => {
      const next = await fetchPickupSearchResult(supabase, code);

      if (!next) {
        toast.error("No active session matched that code.");
        setResult(null);
        return;
      }

      if (next.service?.id) {
        setSelectedServiceId(next.service.id);
      }

      applySession(next);
    });
  }

  function openRosterSession(sessionId: string) {
    startTransition(async () => {
      const next = await fetchPickupSessionResult(supabase, sessionId);

      if (!next) {
        toast.error("That family is no longer checked in.");
        return;
      }

      applySession(next);
    });
  }

  function completePickup() {
    if (!result?.bundle?.family?.id || !result.session?.session_id) {
      toast.error("Search for an active session first.");
      return;
    }

    if (!selectedPickupId) {
      toast.error("Select the approved adult picking up today.");
      return;
    }

    startTransition(async () => {
      const { error } = await supabase.rpc("complete_pickup", {
        p_session_id: result.session.session_id,
        p_security_code:
          verificationMethod === "manual_override"
            ? null
            : result.session.security_code,
        p_authorized_pickup_id: selectedPickupId,
        p_notes: notes || null,
        p_verification_method: verificationMethod,
      });

      if (error) {
        toast.error(error.message);
        return;
      }

      if (selectedServiceId) {
        const nextRoster = await fetchPickupRoster(supabase, selectedServiceId);
        setRoster(nextRoster);
      }

      toast.success("Pickup complete. The full log has been recorded.");
      setCode("");
      setNotes("");
      setResult(null);
    });
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
      <div className="space-y-6">
        <Card className="glass-panel">
          <CardHeader>
            <CardTitle className="text-2xl">Secure pickup</CardTitle>
            <CardDescription>
              Keep both methods available: type or scan a code, or open the family directly from the live roster.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="pickup-code">Security code or scanned QR token</Label>
              <Input
                id="pickup-code"
                onChange={(event) => setCode(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    searchSession();
                  }
                }}
                placeholder="ABC123"
                value={code}
              />
            </div>
            <div className="flex flex-wrap gap-3">
              <Button disabled={pending} onClick={searchSession}>
                {pending ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <QrCode className="h-4 w-4" />}
                Find active session
              </Button>
              <Badge variant="secondary">Scanner-friendly input</Badge>
            </div>

            <div className="space-y-3">
              <Label>Verification method</Label>
              <div className="grid gap-3">
                {[
                  { value: "security_code", label: "Typed security code" },
                  { value: "qr_scan", label: "QR scan / keyboard wedge" },
                  { value: "manual_override", label: "Admin manual override" },
                ].map((option) => (
                  <label
                    className="flex items-center gap-3 rounded-[1.25rem] border border-orange-100 bg-white px-4 py-3"
                    key={option.value}
                  >
                    <input
                      checked={verificationMethod === option.value}
                      className="h-4 w-4"
                      name="verification-method"
                      onChange={() => setVerificationMethod(option.value as typeof verificationMethod)}
                      type="radio"
                    />
                    <span className="text-sm font-medium text-slate-700">{option.label}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="pickup-notes">Pickup note</Label>
              <Textarea
                id="pickup-notes"
                onChange={(event) => setNotes(event.target.value)}
                placeholder="Optional note for the pickup log"
                value={notes}
              />
            </div>
          </CardContent>
        </Card>

        <Card className="glass-panel">
          <CardHeader>
            <CardTitle className="text-2xl">Roster checkout</CardTitle>
            <CardDescription>
              Open a family from the current service roster if the parent does not have the code ready.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="pickup-service">Service event</Label>
              <select
                className="h-11 w-full rounded-2xl border border-orange-100 bg-white px-4 text-sm outline-none"
                id="pickup-service"
                onChange={(event) => setSelectedServiceId(event.target.value)}
                value={selectedServiceId}
              >
                {initialServices.map((service) => (
                  <option key={service.id} value={service.id}>
                    {service.name} · {formatDateTime(service.starts_at)}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="roster-search">Search roster</Label>
              <div className="relative">
                <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <Input
                  className="pl-11"
                  id="roster-search"
                  onChange={(event) => setRosterSearch(event.target.value)}
                  placeholder="Household, phone, child name, or code ending"
                  value={rosterSearch}
                />
              </div>
            </div>

            <div className="space-y-3">
              {filteredRoster.length === 0 ? (
                <div className="rounded-[1.5rem] border border-dashed border-orange-200 p-5 text-sm text-muted-foreground">
                  No active families match this roster view yet.
                </div>
              ) : (
                filteredRoster.map((entry: any) => (
                  <button
                    className="w-full rounded-[1.5rem] border border-orange-100 bg-white p-4 text-left transition hover:border-orange-300 hover:bg-orange-50"
                    key={entry.id}
                    onClick={() => openRosterSession(entry.id)}
                    type="button"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="text-lg font-semibold text-slate-950">
                          {entry.family?.household_name}
                        </p>
                        <p className="text-sm text-slate-500">
                          {formatPhone(entry.family?.primary_phone)} · Checked in {formatDateTime(entry.checked_in_at)}
                        </p>
                      </div>
                      <Badge variant="secondary">Code ending {entry.security_code_last4}</Badge>
                    </div>
                    <p className="mt-3 text-sm leading-7 text-slate-700">
                      {(entry.checkins ?? [])
                        .map((checkin: any) =>
                          `${checkin.child?.preferred_name || checkin.child?.first_name} ${checkin.child?.last_name}`.trim(),
                        )
                        .join(", ")}
                    </p>
                  </button>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="glass-panel">
        <CardHeader>
          <CardTitle className="text-2xl">Active session details</CardTitle>
          <CardDescription>
            Review the checked-in children, choose an approved adult, and complete release with either workflow.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          {!result?.bundle ? (
            <div className="rounded-[1.5rem] border border-dashed border-orange-200 p-6 text-sm text-muted-foreground">
              Use the security code search or the roster list to open a live session.
            </div>
          ) : (
            <>
              <div className="rounded-[1.5rem] bg-slate-950 p-5 text-white">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-xs uppercase tracking-[0.28em] text-orange-200">Family</p>
                    <h3 className="mt-2 text-2xl font-semibold">
                      {result.bundle.family.household_name}
                    </h3>
                    <p className="mt-2 text-sm text-orange-100">
                      {formatPhone(result.bundle.family.primary_phone)} · {result.service?.name}
                    </p>
                  </div>
                  <Badge>{result.session.security_code}</Badge>
                </div>
              </div>

              <div className="space-y-3">
                {result.checkins.map((checkin: any) => (
                  <div
                    className="rounded-[1.25rem] border border-orange-100 bg-white p-4"
                    key={checkin.id}
                  >
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <p className="text-lg font-semibold text-slate-950">
                          {checkin.child?.preferred_name || checkin.child?.first_name}{" "}
                          {checkin.child?.last_name}
                        </p>
                        <p className="text-sm text-slate-500">
                          {checkin.room?.name ?? "Room pending"} · Checked in {formatDateTime(checkin.dropoff_time)}
                        </p>
                      </div>
                      <Badge variant="secondary">{checkin.status}</Badge>
                    </div>
                  </div>
                ))}
              </div>

              <div className="space-y-2">
                <Label htmlFor="approved-adult">Approved adult releasing the children</Label>
                <select
                  className="h-11 w-full rounded-2xl border border-orange-100 bg-white px-4 text-sm outline-none"
                  id="approved-adult"
                  onChange={(event) => setSelectedPickupId(event.target.value)}
                  value={selectedPickupId}
                >
                  <option value="">Select approved adult</option>
                  {result.bundle.authorizedPickups.map((pickup: any) => (
                    <option key={pickup.id} value={pickup.id}>
                      {pickup.full_name} · {pickup.relationship || "Approved adult"}
                    </option>
                  ))}
                </select>
              </div>

              <Button className="w-full" disabled={pending} onClick={completePickup} size="lg">
                {pending ? (
                  <LoaderCircle className="h-4 w-4 animate-spin" />
                ) : (
                  <ShieldCheck className="h-4 w-4" />
                )}
                Release family and log pickup
              </Button>

              <div className="rounded-[1.25rem] border border-orange-100 bg-orange-50 p-4 text-sm text-slate-700">
                <div className="flex items-center gap-2 font-semibold text-slate-900">
                  <ClipboardList className="h-4 w-4 text-orange-600" />
                  Roster and code lookup both stay available.
                </div>
                <p className="mt-2 leading-7">
                  Volunteers can still use the printed code, but they can also open families from the live roster when
                  that is faster at the desk.
                </p>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
