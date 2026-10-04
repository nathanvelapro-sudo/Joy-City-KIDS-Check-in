import type { ReactNode } from "react";

import { SiteShell } from "@/components/layout/site-shell";
import { requireUser } from "@/lib/auth";

export const maxDuration = 30;

export default async function ProtectedLayout({
  children,
}: {
  children: ReactNode;
}) {
  const { profile } = await requireUser();

  return <SiteShell profile={profile}>{children}</SiteShell>;
}
