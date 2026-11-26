"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  Link2,
  Search,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Trophy,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { BladerAvatar } from "@/components/shared/BladerAvatar";
import { useToast } from "@/components/ui/toast-provider";
import { requestBladerClaimAction } from "@/app/meu-painel/actions";
import type { UnclaimedBladerOption } from "@/types/domain";

interface RetroactiveClaimDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentNickname: string;
  unclaimedBladers: UnclaimedBladerOption[];
}

function RetroactiveClaimDialogBody({
  onOpenChange,
  currentNickname,
  unclaimedBladers,
}: Omit<RetroactiveClaimDialogProps, "open">) {
  const router = useRouter();
  const toast = useToast();
  const [search, setSearch] = React.useState("");
  const [selectedBladerId, setSelectedBladerId] = React.useState("");
  const [note, setNote] = React.useState("");
  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const filtered = React.useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return unclaimedBladers;
    return unclaimedBladers.filter(
      (b) =>
        b.nickname.toLowerCase().includes(q) ||
        b.name.toLowerCase().includes(q)
    );
  }, [unclaimedBladers, search]);

  const selectedProfile = React.useMemo(
    () => unclaimedBladers.find((b) => b.id === selectedBladerId) ?? null,
    [unclaimedBladers, selectedBladerId]
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBladerId) {
      setError("Selecione o perfil retroativo que pertence a você.");
      return;
    }

    setSubmitting(true);
    setError(null);

    const res = await requestBladerClaimAction(selectedBladerId, note);
    setSubmitting(false);

    if (res.error) {
      setError(res.error);
      toast.error(res.error);
      return;
    }

    toast.success(
      `Solicitação de vínculo para "${selectedProfile?.nickname ?? "perfil retroativo"}" enviada! Aguarde a aprovação da organização.`
    );
    onOpenChange(false);
    router.refresh();
  };

  return (
    <DialogContent className="max-w-lg max-h-[90dvh] overflow-y-auto bg-card border-border/80">
      <DialogHeader>
        <DialogTitle className="text-base sm:text-lg font-black flex items-center gap-2">
          <Link2 className="h-4 w-4 text-primary" />
          Vincular Perfil de Torneio Retroativo
        </DialogTitle>
        <p className="text-xs text-muted-foreground leading-relaxed">
          Se você já competiu antes e existe um cadastro seu sem conta vinculada, selecione-o abaixo. Após aprovação de um administrador, sua conta e histórico serão transferidos para esse perfil (preservando sua pontuação).
        </p>
      </DialogHeader>

      <form onSubmit={handleSubmit} className="space-y-4 pt-1">
        {error && (
          <div className="p-3 rounded-lg bg-destructive/15 border border-destructive/30 text-destructive text-xs flex items-center gap-2">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <div className="rounded-lg border border-amber-500/35 bg-amber-500/10 p-3 text-[11px] text-amber-500 leading-relaxed">
          Seu perfil temporário atual (<strong>{currentNickname}</strong>) será mesclado ao perfil histórico selecionado assim que um administrador aprovar.
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar seu nickname ou nome cadastrado..."
            className="pl-9 h-9 text-xs bg-background/60"
          />
        </div>

        <div className="max-h-60 overflow-y-auto grid grid-cols-1 sm:grid-cols-2 gap-2 pr-1">
          {filtered.length === 0 ? (
            <div className="col-span-full py-6 text-center text-xs text-muted-foreground">
              Nenhum perfil sem vínculo encontrado para &ldquo;{search}&rdquo;.
            </div>
          ) : (
            filtered.map((b) => {
              const selected = selectedBladerId === b.id;
              return (
                <button
                  key={b.id}
                  type="button"
                  onClick={() => setSelectedBladerId(b.id)}
                  className={`flex items-center gap-2.5 p-2.5 rounded-xl border text-left transition-all ${
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
                  <div className="min-w-0 flex-1 space-y-0.5">
                    <div className="font-bold text-xs text-foreground truncate">
                      {b.nickname}
                    </div>
                    <div className="text-[10px] text-muted-foreground truncate">
                      {b.name}
                    </div>
                    {(b.tournamentsPlayed ?? 0) > 0 || (b.totalPoints ?? 0) > 0 ? (
                      <Badge
                        variant="outline"
                        className="text-[9px] px-1.5 py-0 border-primary/35 text-primary gap-1"
                      >
                        <Trophy className="h-2.5 w-2.5" />
                        {b.tournamentsPlayed ?? 0} etapa(s) • {b.totalPoints ?? 0} pts
                      </Badge>
                    ) : null}
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
          <Label htmlFor="retro-claim-note" className="text-xs font-semibold">
            Observação para a organização (opcional)
          </Label>
          <Input
            id="retro-claim-note"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            maxLength={200}
            placeholder="Ex: Joguei no torneio retroativo..."
            className="h-9 text-xs bg-background/60"
          />
        </div>

        <div className="flex items-center justify-end gap-2 pt-2 border-t border-border/50">
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={submitting}
            onClick={() => onOpenChange(false)}
            className="text-xs"
          >
            Cancelar
          </Button>
          <Button
            type="submit"
            size="sm"
            disabled={submitting || !selectedBladerId}
            className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-xs gap-1.5"
          >
            {submitting ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Link2 className="h-3.5 w-3.5" />
            )}
            Solicitar Vínculo
          </Button>
        </div>
      </form>
    </DialogContent>
  );
}

export function RetroactiveClaimDialog({
  open,
  onOpenChange,
  ...rest
}: RetroactiveClaimDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {open && (
        <RetroactiveClaimDialogBody onOpenChange={onOpenChange} {...rest} />
      )}
    </Dialog>
  );
}
