"use client";

import { useState } from "react";
import Barcode from "react-barcode";
import QRCode from "react-qr-code";
import { Printer, Settings2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { KioskLabelPayload } from "@/lib/types";
import { cn, formatDateTime } from "@/lib/utils";

export function LabelPrintSheet({
  payload,
  onMarkPrinted,
}: {
  payload: KioskLabelPayload | null;
  onMarkPrinted?: () => Promise<void> | void;
}) {
  const [template, setTemplate] = useState<"thermal" | "letter">("thermal");
  const isThermal = template === "thermal";

  if (!payload) {
    return null;
  }

  async function handlePrint() {
    await onMarkPrinted?.();
    window.print();
  }

  return (
    <Card className="print-surface border-orange-200 xl:sticky xl:top-24 xl:flex xl:max-h-[calc(100vh-8rem)] xl:flex-col xl:overflow-hidden">
      <CardHeader className="no-print">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <CardTitle>Ready to print</CardTitle>
            <CardDescription>
              Print one parent security label and one child label for each selected child.
            </CardDescription>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2 rounded-full border border-orange-100 bg-orange-50 px-3 py-2 text-sm">
              <Settings2 className="h-4 w-4 text-orange-600" />
              <select
                className="bg-transparent font-medium outline-none"
                onChange={(event) => setTemplate(event.target.value as "thermal" | "letter")}
                value={template}
              >
                <option value="thermal">4x6 thermal</option>
                <option value="letter">Letter / A4</option>
              </select>
            </div>
            <Button onClick={handlePrint}>
              <Printer className="h-4 w-4" />
              Print labels
            </Button>
          </div>
        </div>
        <div className="rounded-[1.5rem] bg-orange-50 p-4 text-sm text-orange-800">
          For Zebra or Brother thermal printers, set paper size to 4x6 and margins to none. For regular
          paper, choose Letter or A4, set scale to 100%, and print in portrait.
        </div>
      </CardHeader>
      <CardContent className="print-preview-scroll pr-2 sm:pr-3 xl:min-h-0 xl:flex-1 xl:overflow-y-auto">
        <div className="label-sheet pb-2" data-template={template}>
          <article className="label-card overflow-hidden">
            <div className="security-dots border-b border-orange-100 bg-orange-50/80 p-5">
              <div
                className={cn(
                  "gap-4",
                  isThermal ? "flex flex-col items-start" : "flex items-start justify-between",
                )}
              >
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.3em] text-orange-700">
                    Parent security label
                  </p>
                  <h3 className="mt-2 text-2xl font-semibold text-slate-950">
                    {payload.family.household_name}
                  </h3>
                  <p className="mt-2 text-sm text-slate-600">
                    {payload.service?.name ?? "Current service"} · {formatDateTime(payload.session.checked_in_at)}
                  </p>
                </div>
                <Badge>Pickup code</Badge>
              </div>
            </div>
            {isThermal ? (
              <div className="space-y-4 p-5">
                <div>
                  <p className="text-xs uppercase tracking-[0.28em] text-slate-500">Security code</p>
                  <p className="mt-2 text-[3.25rem] font-semibold leading-none tracking-[0.12em] text-slate-950">
                    {payload.session.security_code}
                  </p>
                </div>
                <div className="grid grid-cols-[minmax(0,1fr)_108px] items-start gap-4">
                  <div className="min-w-0 rounded-[1.25rem] bg-slate-950 p-4 text-white">
                    <p className="text-xs uppercase tracking-[0.28em] text-orange-200">Family members checked in</p>
                    <p className="mt-3 text-sm leading-7">
                      {payload.children.map((child) => child.preferred_name || child.first_name).join(", ")}
                    </p>
                  </div>
                  <div className="self-start rounded-[1.25rem] border border-orange-100 p-3">
                    <div className="mx-auto aspect-square w-[82px]">
                      <QRCode className="h-full w-full" value={payload.session.security_qr_token} />
                    </div>
                  </div>
                </div>
                <div className="overflow-hidden rounded-[1.25rem] border border-slate-200 bg-white p-3">
                  <Barcode
                    background="transparent"
                    displayValue={false}
                    height={40}
                    margin={0}
                    value={payload.session.security_code}
                    width={1.12}
                  />
                </div>
              </div>
            ) : (
              <div className="grid gap-5 p-5 md:grid-cols-[1fr_180px]">
                <div className="space-y-5">
                  <div>
                    <p className="text-xs uppercase tracking-[0.28em] text-slate-500">Security code</p>
                    <p className="mt-2 text-5xl font-semibold tracking-[0.18em] text-slate-950">
                      {payload.session.security_code}
                    </p>
                  </div>
                  <div className="rounded-[1.25rem] bg-slate-950 p-4 text-white">
                    <p className="text-xs uppercase tracking-[0.28em] text-orange-200">Family members checked in</p>
                    <p className="mt-3 text-sm leading-7">
                      {payload.children.map((child) => child.preferred_name || child.first_name).join(", ")}
                    </p>
                  </div>
                  <div className="overflow-hidden rounded-[1.25rem] border border-slate-200 bg-white p-3">
                    <Barcode
                      background="transparent"
                      displayValue={false}
                      height={54}
                      margin={0}
                      value={payload.session.security_code}
                      width={1.8}
                    />
                  </div>
                </div>
                <div className="self-start rounded-[1.5rem] border border-orange-100 p-3">
                  <div className="mx-auto aspect-square w-full max-w-[148px]">
                    <QRCode className="h-full w-full" value={payload.session.security_qr_token} />
                  </div>
                </div>
              </div>
            )}
          </article>

          {payload.children.map((child) => (
            <article className="label-card overflow-hidden" key={child.id}>
              <div className="border-b border-orange-100 bg-slate-950 px-5 py-4 text-white">
                <div
                  className={cn(
                    "gap-3",
                    isThermal ? "flex flex-col items-start" : "flex items-center justify-between",
                  )}
                >
                  <div>
                    <p className="text-xs uppercase tracking-[0.28em] text-orange-200">Child label</p>
                    <h3 className={cn("mt-2 font-semibold", isThermal ? "text-[2rem]" : "text-3xl")}>
                      {child.preferred_name || child.first_name}
                    </h3>
                  </div>
                  <Badge variant="secondary">{child.roomName}</Badge>
                </div>
              </div>
              {isThermal ? (
                <div className="space-y-4 p-5">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs uppercase tracking-[0.28em] text-slate-500">
                        {child.displayLabelType === "grade" ? "Grade" : "Age"}
                      </p>
                      <p className="mt-2 text-lg font-semibold text-slate-900">{child.displayLabel}</p>
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-[0.28em] text-slate-500">Security code</p>
                      <p className="mt-2 text-lg font-semibold tracking-[0.08em] text-slate-900">
                        {payload.session.security_code}
                      </p>
                    </div>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-[0.28em] text-slate-500">Allergies</p>
                    <p className="mt-2 text-sm leading-7 text-slate-700">{child.allergyText}</p>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-[0.28em] text-slate-500">Instructions</p>
                    <p className="mt-2 text-sm leading-7 text-slate-700">
                      {child.special_instructions || "No additional instructions."}
                    </p>
                  </div>
                  <div className="rounded-[1.25rem] border border-orange-100 p-3">
                    <div className="mx-auto aspect-square w-full max-w-[120px]">
                      <QRCode className="h-full w-full" value={payload.session.security_qr_token} />
                    </div>
                  </div>
                </div>
              ) : (
                <div className="grid gap-5 p-5 md:grid-cols-[1fr_120px]">
                  <div className="space-y-4">
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div>
                        <p className="text-xs uppercase tracking-[0.28em] text-slate-500">
                          {child.displayLabelType === "grade" ? "Grade" : "Age"}
                        </p>
                        <p className="mt-2 text-lg font-semibold text-slate-900">{child.displayLabel}</p>
                      </div>
                      <div>
                        <p className="text-xs uppercase tracking-[0.28em] text-slate-500">Security code</p>
                        <p className="mt-2 text-lg font-semibold tracking-[0.12em] text-slate-900">
                          {payload.session.security_code}
                        </p>
                      </div>
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-[0.28em] text-slate-500">Allergies</p>
                      <p className="mt-2 text-sm leading-7 text-slate-700">{child.allergyText}</p>
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-[0.28em] text-slate-500">Instructions</p>
                      <p className="mt-2 text-sm leading-7 text-slate-700">
                        {child.special_instructions || "No additional instructions."}
                      </p>
                    </div>
                  </div>
                  <div className="self-start rounded-[1.25rem] border border-orange-100 p-3">
                    <div className="mx-auto aspect-square w-full">
                      <QRCode className="h-full w-full" value={payload.session.security_qr_token} />
                    </div>
                  </div>
                </div>
              )}
            </article>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
