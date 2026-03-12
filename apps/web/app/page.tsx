import Link from "next/link";
import { ArrowRight, Check, Smartphone, ShieldCheck, Sticker, Users } from "lucide-react";

import { LogoLockup } from "@/components/branding/logo-lockup";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const features = [
  {
    icon: Sticker,
    title: "Instant child + parent labels",
    copy: "Thermal-friendly label printing with QR and barcode support straight from the browser.",
  },
  {
    icon: Smartphone,
    title: "Parent portal + mobile pre-check-in",
    copy: "Families can sign in once, pre-check-in before they leave home, and track their active security code in real time.",
  },
  {
    icon: Users,
    title: "Live volunteer board",
    copy: "Room counts, drop-off timestamps, and quick parent alerts update live from Supabase Realtime.",
  },
  {
    icon: ShieldCheck,
    title: "Secure pickup and logs",
    copy: "Pickup releases require approved adults, verified codes, and leave a permanent audit trail.",
  },
];

export default function HomePage() {
  return (
    <div className="relative overflow-hidden">
      <div className="absolute inset-0 bg-halo" />
      <div className="relative mx-auto flex min-h-screen max-w-7xl flex-col px-4 py-6 sm:py-8 lg:px-8">
        <header className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <LogoLockup className="items-start sm:items-center" />
          <div className="grid w-full grid-cols-2 gap-3 sm:flex sm:w-auto">
            <Button asChild className="w-full sm:w-auto" size="sm" variant="secondary">
              <Link href="/sign-in">Sign in</Link>
            </Button>
            <Button asChild className="w-full sm:w-auto" size="sm">
              <Link href="/sign-up">Get started</Link>
            </Button>
          </div>
        </header>

        <section className="grid flex-1 gap-10 py-10 sm:py-12 lg:grid-cols-[1.12fr_0.88fr] lg:items-center">
          <div className="animate-fade-up space-y-8">
            <div className="inline-flex max-w-max rounded-full bg-white/85 px-4 py-2 text-sm font-semibold text-orange-700 shadow-soft">
              JoyKids Check-In for Joy City Church
            </div>
            <div className="space-y-5">
              <h1 className="max-w-4xl font-[var(--font-sora)] text-[3.35rem] font-semibold leading-[0.94] tracking-tight text-slate-950 sm:text-6xl lg:text-7xl">
                A kinder, faster, more secure Sunday check-in flow.
              </h1>
              <p className="max-w-2xl text-base leading-8 text-slate-600 sm:text-lg">
                Built for kiosk tablets, volunteer rooms, pickup stations, parent phones, and free-tier
                Supabase + Vercel deployments without compromising security or polish.
              </p>
            </div>
            <div className="grid gap-3 sm:flex sm:flex-wrap">
              <Button asChild className="w-full justify-between sm:w-auto sm:justify-center" size="lg">
                <Link href="/sign-up">
                  Launch parent portal
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
              <Button
                asChild
                className="w-full justify-center sm:w-auto"
                size="lg"
                variant="secondary"
              >
                <Link href="/sign-in">Volunteer sign in</Link>
              </Button>
            </div>
            <div className="grid gap-3 text-sm text-slate-600 sm:grid-cols-2">
              <div className="flex items-center gap-3">
                <Check className="h-4 w-4 text-orange-500" />
                Full Supabase Row Level Security
              </div>
              <div className="flex items-center gap-3">
                <Check className="h-4 w-4 text-orange-500" />
                Browser-based label printing
              </div>
              <div className="flex items-center gap-3">
                <Check className="h-4 w-4 text-orange-500" />
                Parent-facing mobile + PWA experience
              </div>
              <div className="flex items-center gap-3">
                <Check className="h-4 w-4 text-orange-500" />
                Pickup audit logs and volunteer flags
              </div>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1">
            {features.map((feature, index) => {
              const Icon = feature.icon;

              return (
                <Card
                  className="glass-panel animate-fade-up border-white/90"
                  key={feature.title}
                  style={{ animationDelay: `${index * 80}ms` }}
                >
                  <CardHeader className="flex-row items-center gap-4 space-y-0">
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-orange-100 text-orange-600">
                      <Icon className="h-6 w-6" />
                    </div>
                    <CardTitle className="text-lg">{feature.title}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm leading-7 text-slate-600">{feature.copy}</p>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </section>
      </div>
    </div>
  );
}
