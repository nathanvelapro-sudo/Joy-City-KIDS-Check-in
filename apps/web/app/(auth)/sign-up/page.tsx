import Link from "next/link";

import { AuthForm } from "@/components/auth/auth-form";
import { LogoLockup } from "@/components/branding/logo-lockup";

export default function SignUpPage() {
  return (
    <div className="mx-auto flex min-h-screen max-w-7xl items-center px-4 py-10 lg:px-8">
      <div className="grid w-full gap-8 lg:grid-cols-[1.05fr_0.95fr]">
        <div className="flex items-center justify-center">
          <div className="w-full max-w-xl space-y-4">
            <div className="rounded-[2rem] border border-orange-100 bg-white/85 p-6 shadow-soft lg:hidden">
              <LogoLockup />
              <p className="mt-5 text-sm leading-7 text-slate-600">
                Create your household once, then handle weekly pre-check-in and pickup updates from your phone.
              </p>
            </div>
            <AuthForm mode="sign-up" />
            <p className="px-2 text-center text-sm leading-7 text-slate-600">
              Already have an account?{" "}
              <Link className="font-semibold text-orange-600" href="/sign-in">
                Sign in.
              </Link>
            </p>
          </div>
        </div>
        <div className="hidden rounded-[2rem] border border-orange-100 bg-white/80 p-10 shadow-soft lg:block">
          <h1 className="font-[var(--font-sora)] text-4xl font-semibold leading-tight text-slate-950">
            Create your household once, then pre-check-in from your phone every week.
          </h1>
          <ul className="mt-8 space-y-4 text-sm leading-7 text-slate-600">
            <li>Track your live security code in real time.</li>
            <li>Keep allergy and pickup information current.</li>
            <li>Receive live room alerts from volunteers in the parent app and portal.</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
