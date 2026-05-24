import { redirect, unstable_rethrow } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import type { AppProfile } from "@/lib/types";

export async function getUserContext() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { user: null, profile: null };
    }

    const { data: profile } = await supabase
      .from("user_profiles")
      .select("*")
      .eq("id", user.id)
      .single();

    return {
      user,
      profile,
    };
  } catch (error) {
    unstable_rethrow(error);
    console.error("Unable to load authenticated user context.", error);
    return { user: null, profile: null };
  }
}

export async function requireUser() {
  const context = await getUserContext();

  if (!context.user || !context.profile) {
    redirect("/sign-in");
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
