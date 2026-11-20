import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import type { Database } from "@/types/database";

interface PendingCookie {
  name: string;
  value: string;
  options?: CookieOptions;
}

export function getRequestIsHttps(request: NextRequest): boolean {
  return (
    request.nextUrl.protocol === "https:" ||
    request.headers.get("x-forwarded-proto") === "https"
  );
}

export function createRouteSupabaseClient(request: NextRequest) {
  const pendingCookies: PendingCookie[] = [];
  const isHttps = getRequestIsHttps(request);

  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          for (const cookie of cookiesToSet) {
            pendingCookies.push(cookie);
          }
        },
      },
    }
  );

  function applyCookies(response: NextResponse): NextResponse {
    for (const { name, value, options } of pendingCookies) {
      response.cookies.set(name, value, {
        ...options,
        path: options?.path ?? "/",
        sameSite: options?.sameSite ?? "lax",
        secure: isHttps,
      });
    }
    return response;
  }

  return { supabase, applyCookies };
}
