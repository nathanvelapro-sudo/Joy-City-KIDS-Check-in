import Link from "next/link";

import { AuthForm } from "@/components/auth/auth-form";

export default function SignInPage() {
  return (
    <div className="mx-auto flex min-h-screen max-w-7xl items-center px-4 py-10 lg:px-8">
      <div className="grid w-full gap-8 lg:grid-cols-[0.9fr_1.1fr]">
        <div className="hidden rounded-[2rem] bg-gradient-to-br from-slate-950 via-orange-950 to-orange-700 p-10 text-white shadow-glow lg:block">
          <h1 className="font-[var(--font-sora)] text-4xl font-semibold leading-tight">
            Sunday check-in that feels calm for families and effortless for volunteers.
          </h1>
          <p className="mt-6 max-w-md text-sm leading-7 text-orange-100">
            Staff use the kiosk and pickup tools. Parents use the same secure login to pre-check-in and
            view their live code.
          </p>
        </div>
        <div className="flex items-center justify-center">
          <div className="w-full max-w-xl space-y-4">
            <AuthForm mode="sign-in" />
            <p className="text-center text-sm text-slate-600">
              Need a parent account?{" "}
              <Link className="font-semibold text-orange-600" href="/sign-up">
                Create one here.
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

