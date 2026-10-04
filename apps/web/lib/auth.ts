import { redirect, unstable_rethrow } from "next/navigation";
import { cache } from "react";

import { createClient } from "@/lib/supabase/server";
import { withSupabaseTimeout } from "@/lib/supabase/env";
import type { AppProfile } from "@/lib/types";

export const getUserContext = cache(async () => {
  try {
    return await withSupabaseTimeout(async (signal) => {
      const supabase = await createClient(signal);
      const {
        data: { user },
        error,
      } = await supabase.auth.getUser();

      if (
        error &&
        error.name !== "AuthSessionMissingError" &&
        (!error.status || error.status >= 500)
      ) {
        throw error;
      }

      if (!user) {
        return { user: null, profile: null, unavailable: false };
      }

      const { data: profile, error: profileError, status } = await supabase
        .from("user_profiles")
        .select("*")
        .eq("id", user.id)
        .single();

      if (profileError && (!status || status >= 500)) {
        throw profileError;
      }

      return { user, profile, unavailable: false };
    });
  } catch (error) {
    unstable_rethrow(error);
    console.error("Unable to load authenticated user context.", error);
    return { user: null, profile: null, unavailable: true };
  }
});

export async function requireUser() {
  const context = await getUserContext();

  if (!context.user || !context.profile) {
    redirect(context.unavailable ? "/sign-in?unavailable=1" : "/sign-in");
  }

  return context as { user: NonNullable<typeof context.user>; profile: AppProfile };
}

export async function requireStaff() {
  const context = await requireUser();

  if (!["volunteer", "admin"].includes(context.profile.role)) {
    redirect("/parent");
  }

  return context;
}
