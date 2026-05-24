"use client";

import { createBrowserClient } from "@supabase/ssr";

import { getSupabasePublicEnv } from "@/lib/supabase/env";

export function createClient() {
  const { anonKey, url } = getSupabasePublicEnv();

  return createBrowserClient(url, anonKey);
}
