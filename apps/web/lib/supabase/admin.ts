import { createClient } from "@supabase/supabase-js";

import {
  createTimeoutFetch,
  getSupabasePublicEnv,
  getSupabaseServiceRoleKey,
} from "@/lib/supabase/env";

export function createAdminClient() {
  const { url } = getSupabasePublicEnv();

  return createClient(
    url,
    getSupabaseServiceRoleKey(),
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
      global: {
        fetch: createTimeoutFetch(),
      },
    },
  );
}
