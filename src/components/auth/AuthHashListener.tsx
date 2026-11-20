"use client";

import * as React from "react";

/**
 * Intercepta tokens/erros de convite ou recuperação entregues pelo Supabase
 * na URL raiz (hash implícito ou query PKCE/OTP) e redireciona para o fluxo dedicado.
 */
export function AuthHashListener() {
  React.useEffect(() => {
    const { pathname, hash, search, origin } = window.location;

    if (pathname !== "/auth/definir-senha" && hash.startsWith("#")) {
      const hashParams = new URLSearchParams(hash.slice(1));
      const hashType = hashParams.get("type");
      const hasAuthPayload =
        hashParams.has("access_token") ||
        hashParams.has("error") ||
        hashParams.has("error_code");
      const isInviteOrRecovery =
        hashType === "invite" ||
        hashType === "recovery" ||
        hashParams.get("error_code") === "otp_expired";

      if (hasAuthPayload && isInviteOrRecovery) {
        window.location.replace(`${origin}/auth/definir-senha${hash}`);
        return;
      }
    }

    if (pathname === "/" && search) {
      const searchParams = new URLSearchParams(search);
      if (searchParams.has("code") || searchParams.has("token_hash")) {
        window.location.replace(`${origin}/auth/callback${search}`);
      }
    }
  }, []);

  return null;
}
