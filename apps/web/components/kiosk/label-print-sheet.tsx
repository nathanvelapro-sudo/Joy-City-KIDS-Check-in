"use client";

import Barcode from "react-barcode";
import QRCode from "react-qr-code";
import { Printer } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { KioskLabelPayload } from "@/lib/types";
import { formatDateTime, truncate } from "@/lib/utils";

export function LabelPrintSheet({
  payload,
  onMarkPrinted,
}: {
  payload: KioskLabelPayload | null;
  onMarkPrinted?: () => Promise<void> | void;
}) {
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
              Print one parent security label and one child room label for each selected child.
            </CardDescription>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Badge variant="secondary">Brother QL-800 · horizontal badge</Badge>
            <Button onClick={handlePrint}>
              <Printer className="h-4 w-4" />
              Print Brother labels
            </Button>
          </div>
        </div>
        <div className="rounded-[1.5rem] bg-orange-50 p-4 text-sm text-orange-800">
          Use the Brother QL-800 with a 62mm continuous DK roll such as DK-2251. In the print dialog,
          choose the Brother printer, 62mm continuous paper, landscape layout, scale 100%, margins none,
          and auto cut after each label.
        </div>
      </CardHeader>
      <CardContent className="print-preview-scroll flex justify-center pr-0 xl:min-h-0 xl:flex-1 xl:overflow-y-auto">
        <div className="label-sheet pb-2" data-template="brother-ql800">
          <article className="label-card brother-parent-label overflow-hidden">
            <div className="security-dots border-b border-orange-100 bg-orange-50/80 px-4 py-2.5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.32em] text-orange-700">
                    Parent pickup label
                  </p>
                  <h3 className="mt-1.5 text-[1.6rem] font-semibold leading-none text-slate-950">
                    {truncate(payload.family.household_name, 24)}
                  </h3>
                  <p className="mt-1.5 text-[10px] leading-4 text-slate-600">
                    {payload.service?.name ?? "Current service"} · {formatDateTime(payload.session.checked_in_at)}
                  </p>
                </div>
                <Badge>Pickup code</Badge>
              </div>
            </div>
            <div className="grid h-[calc(62mm-64px)] grid-cols-[1.4fr_0.75fr] gap-3 px-4 py-2.5">
              <div className="flex min-w-0 flex-col justify-between gap-2">
                <div>
                  <p className="text-[9px] uppercase tracking-[0.28em] text-slate-500">Security code</p>
                  <p className="mt-1 text-[2rem] font-semibold leading-none tracking-[0.14em] text-slate-950">
                    {payload.session.security_code}
                  </p>
                </div>
                <div>
                  <p className="text-[9px] uppercase tracking-[0.28em] text-slate-500">Checked in</p>
                  <p className="mt-1 text-[10px] leading-4 text-slate-700">
                    {truncate(
                      payload.children.map((child) => child.preferred_name || child.first_name).join(", "),
                      46,
                    )}
                  </p>
                </div>
                <div className="overflow-hidden rounded-[0.95rem] border border-slate-200 bg-white px-2 py-1.5">
                  <Barcode
                    background="transparent"
                    displayValue={false}
                    height={20}
                    margin={0}
                    value={payload.session.security_code}
                    width={0.92}
                  />
                </div>
              </div>
              <div className="flex flex-col items-center justify-center gap-1.5 rounded-[1rem] border border-orange-100 bg-white p-2">
                <div className="aspect-square w-[74px]">
                  <QRCode className="h-full w-full" value={payload.session.security_qr_token} />
                </div>
                <p className="text-center text-[9px] uppercase tracking-[0.22em] text-slate-500">Scan at pickup</p>
              </div>
            </div>
          </article>

          {payload.children.map((child) => (
            <article className="label-card brother-child-label overflow-hidden" key={child.id}>
              <div className="border-b border-orange-100 bg-slate-950 px-4 py-2.5 text-white">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-[10px] uppercase tracking-[0.28em] text-orange-200">Child room label</p>
                    <h3 className="mt-1.5 text-[1.45rem] font-semibold leading-none">
                      {truncate(child.preferred_name || child.first_name, 18)}
                    </h3>
                  </div>
                  <Badge variant="secondary">{truncate(child.roomName, 22)}</Badge>
                </div>
              </div>
              <div className="grid h-[calc(62mm-58px)] grid-rows-[auto_1fr] gap-2 px-4 py-2.5">
                <div className="grid grid-cols-[0.78fr_1.08fr_0.82fr] gap-2">
                  <div className="rounded-[0.95rem] bg-orange-50 px-2.5 py-2">
                    <p className="text-[10px] uppercase tracking-[0.28em] text-slate-500">
                      {child.displayLabelType === "grade" ? "Grade" : "Age"}
                    </p>
                    <p className="mt-1 text-sm font-semibold text-slate-900">{child.displayLabel}</p>
                  </div>
                  <div className="rounded-[0.95rem] border border-orange-100 px-2.5 py-2">
                    <p className="text-[10px] uppercase tracking-[0.28em] text-slate-500">Allergies</p>
                    <p className="mt-1 text-[10px] leading-4 text-slate-700">{truncate(child.allergyText, 42)}</p>
                  </div>
                  <div className="rounded-[0.95rem] border border-slate-200 px-2.5 py-2">
                    <p className="text-[10px] uppercase tracking-[0.28em] text-slate-500">Code</p>
                    <p className="mt-1 text-sm font-semibold tracking-[0.08em] text-slate-900">
                      {payload.session.security_code}
                    </p>
                  </div>
                </div>
                <div className="rounded-[0.95rem] border border-slate-200 px-2.5 py-2">
                  <p className="text-[10px] uppercase tracking-[0.28em] text-slate-500">Instructions</p>
                  <p className="mt-1 text-[10px] leading-4 text-slate-700">
                    {truncate(child.special_instructions || "No additional instructions.", 78)}
                  </p>
                </div>
              </div>
            </article>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
