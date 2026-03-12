"use client";

import { useMemo, useState, useTransition } from "react";
import { LoaderCircle, QrCode, ShieldCheck } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { fetchPickupSearchResult } from "@/lib/data";
import { createClient } from "@/lib/supabase/browser";
import { formatDateTime, formatPhone } from "@/lib/utils";

export function PickupConsole() {
  const supabase = useMemo(() => createClient(), []);
  const [code, setCode] = useState("");
  const [result, setResult] = useState<any | null>(null);
  const [selectedPickupId, setSelectedPickupId] = useState("");
  const [notes, setNotes] = useState("");
  const [verificationMethod, setVerificationMethod] = useState<
    "security_code" | "qr_scan" | "manual_override"
  >("security_code");
  const [pending, startTransition] = useTransition();

  function searchSession() {
    startTransition(async () => {
      const next = await fetchPickupSearchResult(supabase, code);

      if (!next) {
        toast.error("No active session matched that code.");
        setResult(null);
        return;
      }

      setResult(next);
      setSelectedPickupId(next.bundle?.authorizedPickups?.[0]?.id ?? "");
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

      toast.success("Pickup complete. The full log has been recorded.");
      setCode("");
      setNotes("");
      setResult(null);
    });
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[0.85fr_1.15fr]">
      <Card className="glass-panel">
        <CardHeader>
          <CardTitle className="text-2xl">Secure pickup</CardTitle>
          <CardDescription>
            Scan a QR code with a hardware scanner or type the security code manually.
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
          <CardTitle className="text-2xl">Active session details</CardTitle>
          <CardDescription>
            Only approved adults can be chosen for release. Every child release is written to the pickup log.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          {!result?.bundle ? (
            <div className="rounded-[1.5rem] border border-dashed border-orange-200 p-6 text-sm text-muted-foreground">
              Search for a live session to review children and release the family.
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
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

