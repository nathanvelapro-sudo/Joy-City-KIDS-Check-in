"use client";

import { createBrowserClient } from "@supabase/ssr";

import { createTimeoutFetch, getSupabasePublicEnv } from "@/lib/supabase/env";

export function createClient() {
  const { anonKey, url } = getSupabasePublicEnv();

  return createBrowserClient(url, anonKey, {
    global: { fetch: createTimeoutFetch(10000) },
  });
}
