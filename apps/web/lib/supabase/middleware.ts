import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

import {
  createTimeoutFetch,
  getSupabasePublicEnv,
  hasSupabasePublicEnv,
  withSupabaseTimeout,
} from "@/lib/supabase/env";

const PUBLIC_PATHS = new Set(["/", "/sign-in", "/sign-up", "/api/health"]);
const PROTECTED_PAGE_PATHS = new Set(["/dashboard", "/kiosk", "/parent", "/pickup", "/reports"]);

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
  try {
    await withSupabaseTimeout(async (signal) => {
      const supabase = createServerClient(
        url,
        anonKey,
        {
          cookies: {
            getAll() {
              return request.cookies.getAll();
            },
            setAll(cookiesToSet) {
              if (signal.aborted) return;
              cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
              response = NextResponse.next({ request });
              cookiesToSet.forEach(({ name, value, options }) => {
                response.cookies.set(name, value, options);
              });
            },
          },
          global: {
            fetch: createTimeoutFetch(undefined, signal),
          },
        },
      );

      const { error } = await supabase.auth.getUser();
      if (
        error &&
        error.name !== "AuthSessionMissingError" &&
        (!error.status || error.status >= 500)
      ) {
        throw error;
      }
    });
  } catch (error) {
    console.error("Supabase middleware auth refresh failed.", error);
    if (PROTECTED_PAGE_PATHS.has(request.nextUrl.pathname)) {
      const destination = request.nextUrl.clone();
      destination.pathname = "/sign-in";
      destination.search = "?unavailable=1";
      const redirect = NextResponse.redirect(destination);
      response.cookies.getAll().forEach((cookie) => redirect.cookies.set(cookie));
      return redirect;
    }
  }

  return response;
}
