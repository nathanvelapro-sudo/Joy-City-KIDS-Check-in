import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

import {
  createTimeoutFetch,
  getSupabasePublicEnv,
  hasSupabasePublicEnv,
} from "@/lib/supabase/env";

const PUBLIC_PATHS = new Set(["/", "/sign-in", "/sign-up", "/api/health"]);

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({
    request,
  });

  if (PUBLIC_PATHS.has(request.nextUrl.pathname)) {
    return response;
  }

  if (!hasSupabasePublicEnv()) {
    console.error("Supabase middleware skipped: public environment variables are missing.");
    return response;
  }

  const { anonKey, url } = getSupabasePublicEnv();
  const supabase = createServerClient(
    url,
    anonKey,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            request.cookies.set(name, value);
            response.cookies.set(name, value, options);
          });
        },
      },
      global: {
        fetch: createTimeoutFetch(),
      },
    },
  );

  try {
    await supabase.auth.getUser();
  } catch (error) {
    console.error("Supabase middleware auth refresh failed.", error);
  }

  return response;
}
