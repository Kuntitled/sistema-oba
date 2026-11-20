import type { EmailOtpType } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";
import { createRouteSupabaseClient } from "@/lib/supabase/route-cookies";

const ALLOWED_OTP_TYPES = new Set<string>([
  "invite",
  "recovery",
  "email",
  "magiclink",
  "signup",
]);

function getSafeNextPath(rawNext: string | null): string {
  if (!rawNext || !rawNext.startsWith("/") || rawNext.startsWith("//")) {
    return "/admin";
  }
  return rawNext;
}

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const code = searchParams.get("code");
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type");
  const safeNext = getSafeNextPath(searchParams.get("next"));

  if (searchParams.get("error") || searchParams.get("error_code")) {
    return NextResponse.redirect(
      new URL("/auth/definir-senha?error=invalid_link", request.url)
    );
  }

  const { supabase, applyCookies } = createRouteSupabaseClient(request);

  let verified = false;

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      verified = true;
    }
  } else if (tokenHash && type && ALLOWED_OTP_TYPES.has(type)) {
    const { error } = await supabase.auth.verifyOtp({
      token_hash: tokenHash,
      type: type as EmailOtpType,
    });
    if (!error) {
      verified = true;
    }
  }

  if (!verified) {
    return NextResponse.redirect(
      new URL("/auth/definir-senha?error=invalid_link", request.url)
    );
  }

  const destination =
    type === "invite" ||
    type === "recovery" ||
    safeNext.startsWith("/auth/definir-senha")
      ? "/auth/definir-senha"
      : safeNext;

  const response = NextResponse.redirect(new URL(destination, request.url));
  return applyCookies(response);
}
