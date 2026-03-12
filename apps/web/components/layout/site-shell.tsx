"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  QrCode,
  ShieldCheck,
  Users2,
  ClipboardList,
} from "lucide-react";

import { LogoLockup } from "@/components/branding/logo-lockup";
import { SignOutButton } from "@/components/layout/sign-out-button";
import { Badge } from "@/components/ui/badge";
import { NAV_ITEMS } from "@/lib/constants";
import { cn } from "@/lib/utils";
import type { AppProfile } from "@/lib/types";

const iconMap = {
  "/parent": Users2,
  "/kiosk": ClipboardList,
  "/dashboard": LayoutDashboard,
  "/pickup": QrCode,
  "/reports": ShieldCheck,
} as const;

export function SiteShell({
  children,
  profile,
}: {
  children: ReactNode;
  profile: AppProfile;
}) {
  const pathname = usePathname();
  const items = NAV_ITEMS.filter((item) => item.roles.includes(profile.role));

  return (
    <div className="min-h-screen">
      <header className="no-print sticky top-0 z-30 border-b border-orange-100/80 bg-white/90 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-4 lg:flex-row lg:items-center lg:justify-between lg:px-8">
          <div className="flex items-center justify-between gap-4">
            <LogoLockup />
            <Badge variant={profile.role === "parent" ? "secondary" : "default"}>
              {profile.role === "admin"
                ? "Admin"
                : profile.role === "volunteer"
                  ? "Volunteer"
                  : "Parent"}
            </Badge>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-sm text-muted-foreground">{profile.full_name}</span>
            <SignOutButton />
          </div>
        </div>
      </header>
      <div className="mx-auto flex max-w-7xl flex-col gap-6 px-4 py-6 lg:flex-row lg:px-8">
        <aside className="no-print lg:w-72">
          <div className="glass-panel grid-pattern rounded-[2rem] border border-orange-100/80 p-3 shadow-soft">
            <div className="mb-3 rounded-[1.5rem] bg-white/80 p-4">
              <p className="text-sm font-medium text-muted-foreground">JoyKids workspace</p>
              <h2 className="mt-1 text-xl font-semibold text-slate-900">Keep families moving with confidence.</h2>
            </div>
            <nav className="space-y-2">
              {items.map((item) => {
                const Icon = iconMap[item.href as keyof typeof iconMap] ?? Users2;
                const active = pathname === item.href;

                return (
                  <Link
                    className={cn(
                      "flex items-center justify-between rounded-[1.25rem] px-4 py-3 text-sm font-medium transition",
                      active
                        ? "bg-orange-500 text-white shadow-glow"
                        : "bg-white/80 text-slate-700 hover:bg-orange-50",
                    )}
                    href={item.href}
                    key={item.href}
                  >
                    <span className="flex items-center gap-3">
                      <Icon className="h-4 w-4" />
                      {item.label}
                    </span>
                  </Link>
                );
              })}
            </nav>
          </div>
        </aside>
        <main className="min-w-0 flex-1">{children}</main>
      </div>
    </div>
  );
}
