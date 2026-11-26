"use client";

import * as React from "react";
import Image from "next/image";
import Link from "next/link";
import {
  ArrowLeft,
  KeyRound,
  Lock,
  Loader2,
  AlertCircle,
  CheckCircle2,
  ShieldCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { createClient } from "@/lib/supabase/client";
import {
  getDefaultHomeForRole,
  getUserRoleFromUser,
  normalizeUserRole,
  type ManagedUserRole,
} from "@/lib/auth-roles";

type PageStatus = "checking" | "ready" | "invalid" | "saved_pending_role";

export default function DefinirSenhaPage() {
  const supabase = React.useMemo(() => createClient(), []);

  const [status, setStatus] = React.useState<PageStatus>("checking");
  const [userEmail, setUserEmail] = React.useState<string | null>(null);
  const [userRole, setUserRole] = React.useState<ManagedUserRole>("blader");
  const [linkError, setLinkError] = React.useState<string | null>(null);

  const [password, setPassword] = React.useState("");
  const [confirmPassword, setConfirmPassword] = React.useState("");
  const [formError, setFormError] = React.useState<string | null>(null);
  const [submitting, setSubmitting] = React.useState(false);

  React.useEffect(() => {
    let active = true;

    async function initAuthSession() {
      const { hash, search } = window.location;
      const hashParams = hash.startsWith("#")
        ? new URLSearchParams(hash.slice(1))
        : new URLSearchParams();
      const searchParams = new URLSearchParams(search);

      const hasHashError =
        hashParams.has("error") ||
        hashParams.has("error_code") ||
        hashParams.has("error_description");
      const hasQueryError = searchParams.get("error") === "invalid_link";

      if (hasHashError || hasQueryError) {
        if (!active) return;
        const code = hashParams.get("error_code");
        setLinkError(
          code === "otp_expired"
            ? "Este link de convite ou redefinição expirou ou já foi utilizado. Solicite um novo convite ou redefinição de senha."
            : "Link inválido, expirado ou já utilizado. Solicite um novo link para continuar."
        );
        setStatus("invalid");
        window.history.replaceState(null, "", "/auth/definir-senha");
        return;
      }

      const accessToken = hashParams.get("access_token");
      const refreshToken = hashParams.get("refresh_token");

      if (accessToken && refreshToken) {
        const { error: sessionError } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        });
        window.history.replaceState(null, "", "/auth/definir-senha");

        if (sessionError) {
          if (!active) return;
          setLinkError(
            "Não foi possível validar o link de acesso. Solicite um novo convite."
          );
          setStatus("invalid");
          return;
        }
      }

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (!active) return;

      if (userError || !user) {
        setLinkError(
          "Nenhuma sessão de convite ou redefinição ativa foi encontrada. Use o link enviado para o seu e-mail ou peça um novo envio."
        );
        setStatus("invalid");
        return;
      }

      setUserEmail(user.email ?? null);
      setUserRole(getUserRoleFromUser(user));
      setStatus("ready");
    }

    void initAuthSession();
    return () => {
      active = false;
    };
  }, [supabase]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (password.length < 6) {
      setFormError("A senha deve ter no mínimo 6 caracteres.");
      return;
    }

    if (password !== confirmPassword) {
      setFormError("As senhas digitadas não conferem.");
      return;
    }

    setSubmitting(true);

    try {
      const { data, error: updateError } = await supabase.auth.updateUser({
        password,
      });

      if (updateError) {
        setFormError(
          updateError.message || "Erro ao salvar nova senha. Tente novamente."
        );
        setSubmitting(false);
        return;
      }

      const confirmedEmail = data.user?.email ?? userEmail;
      const resolvedRole = normalizeUserRole(
        data.user?.app_metadata?.role ?? userRole
      );

      if (
        (resolvedRole === "admin" || resolvedRole === "judge") &&
        confirmedEmail
      ) {
        const loginRes = await fetch("/api/auth/login", {
          method: "POST",
          credentials: "same-origin",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            email: confirmedEmail,
            password,
          }),
        });

        if (loginRes.ok) {
          window.location.assign(
            new URL(
              getDefaultHomeForRole(resolvedRole),
              window.location.origin
            ).toString()
          );
          return;
        }
      }

      setStatus("saved_pending_role");
      setSubmitting(false);
    } catch (err: unknown) {
      setFormError(
        err instanceof Error
          ? err.message
          : "Erro inesperado ao definir senha. Tente novamente."
      );
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col justify-center items-center px-4 py-12 bg-background relative overflow-hidden">
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[500px] h-[300px] bg-primary/20 blur-[130px] rounded-full pointer-events-none" />

      <div className="w-full max-w-sm mb-6">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground font-semibold transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Voltar para a página inicial
        </Link>
      </div>

      <Card className="w-full max-w-sm border-border/60 bg-card/80 backdrop-blur-md shadow-2xl relative">
        <div className="h-1.5 bg-gradient-to-r from-fire-orange via-primary to-fire-yellow rounded-t-xl" />
        <CardHeader className="text-center pt-8 pb-4">
          <div className="mx-auto relative h-16 w-16 rounded-full overflow-hidden border-2 border-primary/50 shadow-md mb-3">
            <Image
              src="/images/logo.jpg"
              alt="Logo OBA"
              fill
              className="object-cover"
            />
          </div>
          <CardTitle className="text-xl font-black text-foreground">
            Definir Senha de Acesso
          </CardTitle>
          <CardDescription className="text-xs text-muted-foreground">
            Convite &amp; Recuperação de Conta • Liga OBA
          </CardDescription>
        </CardHeader>

        <CardContent className="px-6 pb-8">
          {status === "checking" && (
            <div className="py-8 flex flex-col items-center justify-center gap-3 text-xs text-muted-foreground">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
              <span>Validando seu link de acesso...</span>
            </div>
          )}

          {status === "invalid" && (
            <div className="space-y-4">
              <div className="p-3.5 rounded-lg bg-destructive/15 border border-destructive/30 text-destructive text-xs flex items-start gap-2">
                <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                <span>{linkError}</span>
              </div>

              <Link href="/auth/login" className="block">
                <Button className="w-full h-10 bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-sm gap-2">
                  <ShieldCheck className="h-4 w-4" />
                  Ir para o Login
                </Button>
              </Link>
            </div>
          )}

          {status === "saved_pending_role" && (
            <div className="space-y-4">
              <div className="p-3.5 rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-emerald-500 text-xs flex items-start gap-2">
                <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5" />
                <span>
                  Senha definida com sucesso! Assim que sua permissão de
                  administrador ou juiz for liberada, acesse o painel em{" "}
                  <strong>/auth/login</strong>.
                </span>
              </div>

              <Link href="/auth/login" className="block">
                <Button className="w-full h-10 bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-sm gap-2">
                  <ShieldCheck className="h-4 w-4" />
                  Ir para o Login
                </Button>
              </Link>
            </div>
          )}

          {status === "ready" && (
            <div className="space-y-4">
              {userEmail && (
                <div className="p-3 rounded-lg bg-muted/40 border border-border/50 text-xs">
                  <span className="text-muted-foreground block text-[11px]">
                    Conta confirmada:
                  </span>
                  <span className="font-bold text-foreground break-all">
                    {userEmail}
                  </span>
                </div>
              )}

              {formError && (
                <div className="p-3 rounded-lg bg-destructive/15 border border-destructive/30 text-destructive text-xs flex items-start gap-2">
                  <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                  <span>{formError}</span>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="new-password" className="text-xs font-semibold">
                    Nova Senha (mín. 6 caracteres)
                  </Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="new-password"
                      type="password"
                      minLength={6}
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      autoComplete="new-password"
                      className="pl-9 h-10 text-sm bg-background/50 border-border/80"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label
                    htmlFor="confirm-password"
                    className="text-xs font-semibold"
                  >
                    Confirmar Nova Senha
                  </Label>
                  <div className="relative">
                    <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="confirm-password"
                      type="password"
                      minLength={6}
                      placeholder="••••••••"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      required
                      autoComplete="new-password"
                      className="pl-9 h-10 text-sm bg-background/50 border-border/80"
                    />
                  </div>
                </div>

                <Button
                  type="submit"
                  disabled={submitting}
                  className="w-full h-10 bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-sm shadow-md gap-2 mt-2"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Salvando senha...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="h-4 w-4" />
                      Salvar Senha e Continuar
                    </>
                  )}
                </Button>
              </form>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
