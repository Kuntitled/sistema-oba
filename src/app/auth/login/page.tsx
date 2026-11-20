"use client";

import * as React from "react";
import Image from "next/image";
import Link from "next/link";
import {
  ShieldCheck,
  ArrowLeft,
  Lock,
  Mail,
  Loader2,
  AlertCircle,
  CheckCircle2,
  KeyRound,
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

export default function LoginPage() {
  const [mode, setMode] = React.useState<"login" | "recovery">("login");
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);
  const [recoverySuccess, setRecoverySuccess] = React.useState<string | null>(
    null
  );
  const [loading, setLoading] = React.useState(false);

  const switchMode = (nextMode: "login" | "recovery") => {
    setMode(nextMode);
    setError(null);
    setRecoverySuccess(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setRecoverySuccess(null);
    setLoading(true);

    if (mode === "recovery") {
      try {
        const supabase = createClient();
        const { error: resetError } = await supabase.auth.resetPasswordForEmail(
          email.trim(),
          {
            redirectTo: `${window.location.origin}/auth/callback?next=/auth/definir-senha`,
          }
        );

        if (resetError) {
          setError(
            resetError.message ||
              "Não foi possível enviar o e-mail de recuperação."
          );
          setLoading(false);
          return;
        }

        setRecoverySuccess(
          "Enviamos um link de redefinição de senha para o seu e-mail. Confira também a caixa de spam."
        );
        setLoading(false);
      } catch (err: unknown) {
        setError(
          err instanceof Error
            ? err.message
            : "Erro de rede ao solicitar recuperação de senha."
        );
        setLoading(false);
      }
      return;
    }

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        credentials: "same-origin",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: email.trim(),
          password,
        }),
      });

      const payload = (await response.json().catch(() => ({}))) as {
        ok?: boolean;
        error?: string;
      };

      if (!response.ok) {
        setError(
          payload.error ||
            "Não foi possível autenticar. Verifique suas credenciais."
        );
        setLoading(false);
        return;
      }

      // Navegação completa garante o envio imediato dos cookies HttpOnly no cabeçalho HTTP
      window.location.assign(new URL("/admin", window.location.origin).toString());
    } catch (err: unknown) {
      const message =
        err instanceof Error
          ? err.message
          : "Ocorreu um erro de rede ao tentar entrar. Tente novamente.";
      setError(message);
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col justify-center items-center px-4 py-12 bg-background relative overflow-hidden">
      {/* Glow de fundo */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[500px] h-[300px] bg-primary/20 blur-[130px] rounded-full pointer-events-none" />

      {/* Botão de voltar */}
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
            {mode === "login"
              ? "Painel Administrativo"
              : "Recuperar Senha"}
          </CardTitle>
          <CardDescription className="text-xs text-muted-foreground">
            {mode === "login"
              ? "Gestão oficial da Liga de Beyblade X do Amazonas"
              : "Informe seu e-mail para receber o link de redefinição"}
          </CardDescription>
        </CardHeader>

        <CardContent className="px-6 pb-8">
          {error && (
            <div className="mb-4 p-3 rounded-lg bg-destructive/15 border border-destructive/30 text-destructive text-xs flex items-start gap-2">
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {recoverySuccess && (
            <div className="mb-4 p-3 rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-emerald-500 text-xs flex items-start gap-2">
              <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5" />
              <span>{recoverySuccess}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-xs font-semibold">
                E-mail do Administrador
              </Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  inputMode="email"
                  autoCapitalize="none"
                  autoCorrect="off"
                  spellCheck={false}
                  placeholder="admin@exemplo.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                  className="pl-9 h-10 text-sm bg-background/50 border-border/80"
                />
              </div>
            </div>

            {mode === "login" && (
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password" className="text-xs font-semibold">
                    Senha
                  </Label>
                  <button
                    type="button"
                    onClick={() => switchMode("recovery")}
                    className="text-[11px] font-semibold text-primary hover:underline cursor-pointer"
                  >
                    Esqueceu a senha?
                  </button>
                </div>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="password"
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    autoComplete="current-password"
                    className="pl-9 h-10 text-sm bg-background/50 border-border/80"
                  />
                </div>
              </div>
            )}

            <Button
              type="submit"
              disabled={loading}
              className="w-full h-10 bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-sm shadow-md gap-2 mt-2"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  {mode === "login" ? "Entrando..." : "Enviando link..."}
                </>
              ) : mode === "login" ? (
                <>
                  <ShieldCheck className="h-4 w-4" />
                  Acessar Painel
                </>
              ) : (
                <>
                  <KeyRound className="h-4 w-4" />
                  Enviar Link de Redefinição
                </>
              )}
            </Button>

            {mode === "recovery" && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => switchMode("login")}
                className="w-full text-xs text-muted-foreground hover:text-foreground"
              >
                Voltar para o login
              </Button>
            )}
          </form>

          <p className="mt-6 text-[11px] text-center text-muted-foreground">
            Apenas organizadores credenciados têm acesso a esta área.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
