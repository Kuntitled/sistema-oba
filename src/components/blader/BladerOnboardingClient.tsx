"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  UserPlus,
  Link2,
  Search,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Clock,
  Copy,
  Check,
  LogOut,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { BladerAvatar } from "@/components/shared/BladerAvatar";
import {
  createOwnBladerProfileAction,
  requestBladerClaimAction,
  cancelBladerClaimAction,
} from "@/app/meu-painel/actions";
import { logoutToHomeAction } from "@/app/auth/actions";
import type { BladerClaimRequest, BladerRow } from "@/types/domain";

interface BladerOnboardingClientProps {
  userId: string;
  userEmail: string | null;
  suggestedName: string;
  suggestedAvatarUrl: string | null;
  unclaimedBladers: BladerRow[];
  pendingClaim: BladerClaimRequest | null;
}

export function BladerOnboardingClient({
  userId,
  userEmail,
  suggestedName,
  suggestedAvatarUrl,
  unclaimedBladers,
  pendingClaim,
}: BladerOnboardingClientProps) {
  const router = useRouter();
  const [tab, setTab] = React.useState<"claim" | "create">(
    unclaimedBladers.length > 0 ? "claim" : "create"
  );
  const [search, setSearch] = React.useState("");
  const [note, setNote] = React.useState("");
  const [selectedBladerId, setSelectedBladerId] = React.useState<string>("");

  const [nickname, setNickname] = React.useState("");
  const [name, setName] = React.useState(suggestedName);
  const [avatarUrl, setAvatarUrl] = React.useState(suggestedAvatarUrl ?? "");

  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [copiedId, setCopiedId] = React.useState(false);

  const filteredUnclaimed = React.useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return unclaimedBladers;
    return unclaimedBladers.filter(
      (b) =>
        b.nickname.toLowerCase().includes(q) ||
        b.name.toLowerCase().includes(q)
    );
  }, [unclaimedBladers, search]);

  const handleCopyUserId = async () => {
    try {
      await navigator.clipboard.writeText(userId);
      setCopiedId(true);
      setTimeout(() => setCopiedId(false), 1800);
    } catch {
      // ignora erro de clipboard em contexto restrito
    }
  };

  const handleClaimSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBladerId) {
      setError("Selecione o seu perfil na lista antes de solicitar o vínculo.");
      return;
    }
    setLoading(true);
    setError(null);

    const res = await requestBladerClaimAction(selectedBladerId, note);
    setLoading(false);

    if (res.error) {
      setError(res.error);
      return;
    }

    router.refresh();
  };

  const handleCancelClaim = async () => {
    if (!pendingClaim) return;
    setLoading(true);
    setError(null);

    const res = await cancelBladerClaimAction(pendingClaim.id);
    setLoading(false);

    if (res.error) {
      setError(res.error);
      return;
    }

    router.refresh();
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const fd = new FormData();
    fd.set("nickname", nickname);
    fd.set("name", name);
    fd.set("avatar_url", avatarUrl);

    const res = await createOwnBladerProfileAction(fd);
    setLoading(false);

    if (res.error) {
      setError(res.error);
      return;
    }

    router.refresh();
  };

  return (
    <div className="container mx-auto px-4 sm:px-6 py-10 max-w-3xl space-y-6">
      {/* Cabeçalho da Conta */}
      <Card className="border-border/60 bg-card/70 overflow-hidden">
        <div className="h-1.5 bg-gradient-to-r from-fire-orange via-primary to-fire-yellow" />
        <CardContent className="p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5 min-w-0">
            <BladerAvatar
              avatarUrl={suggestedAvatarUrl}
              nickname={suggestedName || userEmail || "BX"}
              sizeClass="h-12 w-12"
              textClass="font-black text-base text-primary"
              borderClass="border-2 border-primary/40"
            />
            <div className="min-w-0">
              <h1 className="text-lg sm:text-xl font-black text-foreground truncate">
                Bem-vindo à Liga OBA!
              </h1>
              <p className="text-xs text-muted-foreground truncate">
                Conectado como{" "}
                <span className="font-semibold text-foreground">
                  {userEmail ?? suggestedName}
                </span>
              </p>
            </div>
          </div>

          <form action={logoutToHomeAction}>
            <Button
              type="submit"
              variant="outline"
              size="sm"
              className="text-xs text-destructive border-destructive/30 hover:bg-destructive/10 gap-1.5"
            >
              <LogOut className="h-3.5 w-3.5" />
              Sair da conta
            </Button>
          </form>
        </CardContent>
      </Card>

      {error && (
        <div className="p-3.5 rounded-xl bg-destructive/15 border border-destructive/30 text-destructive text-xs flex items-center gap-2">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {pendingClaim ? (
        <Card className="border-amber-500/40 bg-amber-500/5">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-amber-500" />
              <CardTitle className="text-base font-black text-foreground">
                Solicitação de Vínculo Enviada
              </CardTitle>
            </div>
            <CardDescription className="text-xs">
              Um administrador da OBA irá aprovar seu vínculo em breve para preservar sua pontuação na Temporada 2026.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-3 p-3.5 rounded-xl border border-border/60 bg-card/80">
              <BladerAvatar
                avatarUrl={pendingClaim.blader?.avatar_url}
                nickname={pendingClaim.blader?.nickname}
                sizeClass="h-11 w-11"
              />
              <div className="min-w-0 flex-1">
                <div className="font-bold text-sm text-foreground">
                  {pendingClaim.blader?.nickname ?? "Blader selecionado"}
                </div>
                <div className="text-xs text-muted-foreground">
                  {pendingClaim.blader?.name}
                </div>
              </div>
              <Badge className="bg-amber-500/20 text-amber-500 border-amber-500/40 text-[10px]">
                Aguardando Admin
              </Badge>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3">
              <span className="text-[11px] text-muted-foreground">
                Escolheu o perfil errado ou prefere começar do zero?
              </span>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={loading}
                onClick={handleCancelClaim}
                className="text-xs border-destructive/40 text-destructive hover:bg-destructive/10"
              >
                {loading && <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />}
                Cancelar solicitação
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card className="border-border/60 bg-card/70">
          <CardHeader className="pb-3 space-y-3">
            <div>
              <CardTitle className="text-base sm:text-lg font-black text-foreground">
                Primeiro Acesso — Configure seu Perfil de Blader
              </CardTitle>
              <CardDescription className="text-xs mt-1">
                Se você já competiu na Temporada 2026, vincule seu perfil existente para manter seus pontos. Caso seja novato, crie um novo perfil agora.
              </CardDescription>
            </div>

            <div className="flex flex-wrap gap-2 pt-1">
              <Button
                type="button"
                size="sm"
                variant={tab === "claim" ? "default" : "outline"}
                onClick={() => {
                  setTab("claim");
                  setError(null);
                }}
                className="text-xs font-bold gap-1.5"
              >
                <Link2 className="h-3.5 w-3.5" />
                Já sou Blader cadastrado ({unclaimedBladers.length})
              </Button>
              <Button
                type="button"
                size="sm"
                variant={tab === "create" ? "default" : "outline"}
                onClick={() => {
                  setTab("create");
                  setError(null);
                }}
                className="text-xs font-bold gap-1.5"
              >
                <UserPlus className="h-3.5 w-3.5" />
                Criar Novo Perfil
              </Button>
            </div>
          </CardHeader>

          <CardContent className="pt-2">
            {tab === "claim" ? (
              unclaimedBladers.length === 0 ? (
                <div className="py-8 text-center space-y-3">
                  <p className="text-xs text-muted-foreground">
                    Todos os perfis existentes já possuem conta vinculada. Crie um novo perfil na aba ao lado.
                  </p>
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => setTab("create")}
                    className="text-xs font-bold"
                  >
                    Criar Novo Perfil
                  </Button>
                </div>
              ) : (
                <form onSubmit={handleClaimSubmit} className="space-y-4">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      type="text"
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      placeholder="Buscar seu nickname ou nome na lista..."
                      className="pl-9 h-9 text-xs bg-background/60"
                    />
                  </div>

                  <div className="max-h-64 overflow-y-auto grid grid-cols-1 sm:grid-cols-2 gap-2 pr-1">
                    {filteredUnclaimed.length === 0 ? (
                      <div className="col-span-full py-6 text-center text-xs text-muted-foreground">
                        Nenhum Blader disponível encontrado para &ldquo;{search}&rdquo;.
                      </div>
                    ) : (
                      filteredUnclaimed.map((b) => {
                        const selected = selectedBladerId === b.id;
                        return (
                          <button
                            key={b.id}
                            type="button"
                            onClick={() => setSelectedBladerId(b.id)}
                            className={`flex items-center gap-2.5 p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                              selected
                                ? "border-primary bg-primary/15 shadow-sm"
                                : "border-border/60 bg-background/40 hover:border-primary/40"
                            }`}
                          >
                            <BladerAvatar
                              avatarUrl={b.avatar_url}
                              nickname={b.nickname}
                              sizeClass="h-9 w-9"
                            />
                            <div className="min-w-0 flex-1">
                              <div className="font-bold text-xs text-foreground truncate">
                                {b.nickname}
                              </div>
                              <div className="text-[11px] text-muted-foreground truncate">
                                {b.name}
                              </div>
                            </div>
                            {selected && (
                              <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />
                            )}
                          </button>
                        );
                      })
                    )}
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="claim-note" className="text-xs font-semibold">
                      Observação para a organização (opcional)
                    </Label>
                    <Input
                      id="claim-note"
                      value={note}
                      onChange={(e) => setNote(e.target.value)}
                      maxLength={200}
                      placeholder="Ex: Joguei o Torneio Semanal 01..."
                      className="h-9 text-xs bg-background/60"
                    />
                  </div>

                  <Button
                    type="submit"
                    disabled={loading || !selectedBladerId}
                    className="w-full sm:w-auto bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-xs gap-1.5"
                  >
                    {loading ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Link2 className="h-3.5 w-3.5" />
                    )}
                    Solicitar Vínculo ao Perfil
                  </Button>
                </form>
              )
            ) : (
              <form onSubmit={handleCreateSubmit} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label
                      htmlFor="create-nickname"
                      className="text-xs font-semibold"
                    >
                      Apelido / Nickname *
                    </Label>
                    <Input
                      id="create-nickname"
                      value={nickname}
                      onChange={(e) => setNickname(e.target.value)}
                      required
                      placeholder="Ex: ValtAM"
                      className="h-9 text-xs"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="create-name" className="text-xs font-semibold">
                      Nome Completo *
                    </Label>
                    <Input
                      id="create-name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      required
                      placeholder="Seu nome completo"
                      className="h-9 text-xs"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label
                    htmlFor="create-avatar"
                    className="text-xs font-semibold"
                  >
                    URL da Foto / Avatar
                  </Label>
                  <Input
                    id="create-avatar"
                    value={avatarUrl}
                    onChange={(e) => setAvatarUrl(e.target.value)}
                    placeholder="https://..."
                    className="h-9 text-xs"
                  />
                </div>

                <Button
                  type="submit"
                  disabled={loading}
                  className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-xs gap-1.5"
                >
                  {loading ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <UserPlus className="h-3.5 w-3.5" />
                  )}
                  Criar Meu Perfil de Blader
                </Button>
              </form>
            )}
          </CardContent>
        </Card>
      )}

      {/* ID da conta para fallback manual pelo Admin */}
      <Card className="border-border/50 bg-card/40">
        <CardContent className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
          <div className="min-w-0">
            <span className="font-semibold text-foreground">
              Precisa de vínculo manual imediato?
            </span>{" "}
            <span className="text-muted-foreground">
              Informe este ID de conta a um administrador da OBA:
            </span>
            <code className="block sm:inline sm:ml-2 mt-1 sm:mt-0 text-[11px] bg-muted px-2 py-0.5 rounded font-mono text-primary truncate">
              {userId}
            </code>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleCopyUserId}
            className="text-xs gap-1.5 shrink-0 self-start sm:self-auto"
          >
            {copiedId ? (
              <>
                <Check className="h-3.5 w-3.5 text-emerald-500" />
                Copiado
              </>
            ) : (
              <>
                <Copy className="h-3.5 w-3.5" />
                Copiar ID
              </>
            )}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
