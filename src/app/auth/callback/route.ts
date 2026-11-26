import type { EmailOtpType, User } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";
import {
  createRouteSupabaseClient,
  getRequestOrigin,
} from "@/lib/supabase/route-cookies";
import {
  getUserRoleFromUser,
  resolvePostLoginRedirect,
} from "@/lib/auth-roles";

const ALLOWED_OTP_TYPES = new Set<string>([
  "invite",
  "recovery",
  "email",
  "magiclink",
  "signup",
]);

function getSafeNextPath(rawNext: string | null): string | null {
  if (!rawNext || !rawNext.startsWith("/") || rawNext.startsWith("//")) {
    return null;
  }
  return rawNext;
}

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const code = searchParams.get("code");
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type");
  const safeNext = getSafeNextPath(searchParams.get("next"));
  const isPasswordFlow =
    type === "invite" ||
    type === "recovery" ||
    Boolean(safeNext?.startsWith("/auth/definir-senha"));

  const origin = getRequestOrigin(request);

  if (searchParams.get("error") || searchParams.get("error_code")) {
    const errorRedirect = isPasswordFlow
      ? "/auth/definir-senha?error=invalid_link"
      : "/auth/login?error=oauth_error";
    return NextResponse.redirect(new URL(errorRedirect, origin));
  }

  const { supabase, applyCookies } = createRouteSupabaseClient(request);

  let verified = false;
  let authenticatedUser: User | null = null;

  if (code) {
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      verified = true;
      authenticatedUser = data.user ?? null;
    }
  } else if (tokenHash && type && ALLOWED_OTP_TYPES.has(type)) {
    const { data, error } = await supabase.auth.verifyOtp({
      token_hash: tokenHash,
      type: type as EmailOtpType,
    });
    if (!error) {
      verified = true;
      authenticatedUser = data.user ?? null;
    }
  }

  if (!verified) {
    const errorRedirect = isPasswordFlow
      ? "/auth/definir-senha?error=invalid_link"
      : "/auth/login?error=oauth_error";
    return NextResponse.redirect(new URL(errorRedirect, origin));
  }

  let destination = "/meu-painel";

  if (isPasswordFlow) {
    destination = "/auth/definir-senha";
  } else {
    const role = getUserRoleFromUser(authenticatedUser);
    destination = resolvePostLoginRedirect(role, safeNext);
  }

  const response = NextResponse.redirect(new URL(destination, origin));
  return applyCookies(response);
}
