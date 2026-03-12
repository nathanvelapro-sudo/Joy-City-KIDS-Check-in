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
      <div className="relative mx-auto flex min-h-screen max-w-7xl flex-col px-4 py-8 lg:px-8">
        <header className="flex items-center justify-between">
          <LogoLockup />
          <div className="flex gap-3">
            <Button asChild variant="secondary">
              <Link href="/sign-in">Sign in</Link>
            </Button>
            <Button asChild>
              <Link href="/sign-up">Get started</Link>
            </Button>
          </div>
        </header>

        <section className="grid flex-1 items-center gap-10 py-12 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="animate-fade-up space-y-8">
            <div className="inline-flex rounded-full bg-white/80 px-4 py-2 text-sm font-semibold text-orange-700 shadow-soft">
              JoyKids Check-In for Joy City Church
            </div>
            <div className="space-y-5">
              <h1 className="max-w-4xl font-[var(--font-sora)] text-5xl font-semibold tracking-tight text-slate-950 lg:text-7xl">
                A kinder, faster, more secure Sunday check-in flow.
              </h1>
              <p className="max-w-2xl text-lg leading-8 text-slate-600">
                Built for kiosk tablets, volunteer rooms, pickup stations, parent phones, and free-tier
                Supabase + Vercel deployments without compromising security or polish.
              </p>
            </div>
            <div className="flex flex-wrap gap-4">
              <Button asChild size="lg">
                <Link href="/sign-up">
                  Launch parent portal
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
              <Button asChild size="lg" variant="secondary">
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

          <div className="grid gap-4">
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
