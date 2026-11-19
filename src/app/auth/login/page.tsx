"use client";

import * as React from "react";
import Image from "next/image";
import Link from "next/link";
import { ShieldCheck, ArrowLeft, Lock, Mail, Loader2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const supabase = createClient();
      const { data, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (authError) {
        setError(
          authError.message === "Invalid login credentials"
            ? "E-mail ou senha incorretos."
            : authError.message
        );
        setLoading(false);
        return;
      }

      if (!data.user) {
        setError("Usuário não encontrado.");
        setLoading(false);
        return;
      }

      // Valida role admin
      const role = data.user.user_metadata?.role;
      if (role !== "admin") {
        await supabase.auth.signOut();
        setError("Acesso restrito. Este usuário não possui a permissão 'admin'.");
        setLoading(false);
        return;
      }

      // Navegação completa para garantir que os cookies da sessão sejam enviados no cabeçalho HTTP
      window.location.href = "/admin";
    } catch (err: any) {
      setError(err?.message || "Ocorreu um erro ao tentar entrar. Tente novamente.");
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
            Painel Administrativo
          </CardTitle>
          <CardDescription className="text-xs text-muted-foreground">
            Gestão oficial da Liga de Beyblade X do Amazonas
          </CardDescription>
        </CardHeader>

        <CardContent className="px-6 pb-8">
          {error && (
            <div className="mb-4 p-3 rounded-lg bg-destructive/15 border border-destructive/30 text-destructive text-xs flex items-start gap-2">
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
              <span>{error}</span>
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
                  placeholder="admin@exemplo.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                  className="pl-9 h-10 text-sm bg-background/50 border-border/80"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="password" className="text-xs font-semibold">
                Senha
              </Label>
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

            <Button
              type="submit"
              disabled={loading}
              className="w-full h-10 bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-sm shadow-md gap-2 mt-2"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Entrando...
                </>
              ) : (
                <>
                  <ShieldCheck className="h-4 w-4" />
                  Acessar Painel
                </>
              )}
            </Button>
          </form>

          <p className="mt-6 text-[11px] text-center text-muted-foreground">
            Apenas organizadores credenciados têm acesso a esta área.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
