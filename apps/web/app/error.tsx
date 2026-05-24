"use client";

import { AlertTriangle, RefreshCw } from "lucide-react";

import { Button } from "@/components/ui/button";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  console.error(error);

  return (
    <main className="flex min-h-screen items-center justify-center bg-orange-50 px-4 py-12">
      <section className="w-full max-w-xl rounded-2xl border border-orange-100 bg-white p-8 text-center shadow-soft">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-orange-100 text-orange-600">
          <AlertTriangle className="h-6 w-6" />
        </div>
        <h1 className="mt-6 font-[var(--font-sora)] text-3xl font-semibold text-slate-950">
          The check-in app hit a temporary issue.
        </h1>
        <p className="mt-4 text-sm leading-7 text-slate-600">
          Please try again. If this keeps happening, ask a team lead to check the deployment health
          and Supabase connection.
        </p>
        <Button className="mt-6" onClick={reset}>
          <RefreshCw className="h-4 w-4" />
          Try again
        </Button>
      </section>
    </main>
  );
}
