"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  Plus,
  Trash2,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Sparkles,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ComboBuilder } from "@/components/blader/ComboBuilder";
import { useToast } from "@/components/ui/toast-provider";
import {
  createEmptyComboSelection,
  getMissingComboPartLabels,
} from "@/lib/combo-rules";
import { upsertAdminParticipantDecklistAction } from "@/app/admin/registrations-actions";
import type { ComboSelection, PartRow } from "@/types/domain";

export interface DecklistBladerOption {
  id: string;
  nickname: string;
  name: string;
}

interface AdminDecklistDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tournamentId: string;
  tournamentName: string;
  blader: DecklistBladerOption | null;
  availableBladers?: DecklistBladerOption[];
  initialCombos: ComboSelection[];
  parts: PartRow[];
  bannedParts: PartRow[];
  onSaved?: (bladerId: string) => void;
}

function buildInitialCombos(initialCombos: ComboSelection[]): ComboSelection[] {
  if (initialCombos.length > 0) return initialCombos;
  return [
    createEmptyComboSelection(),
    createEmptyComboSelection(),
    createEmptyComboSelection(),
  ];
}

function AdminDecklistDialogBody({
  onOpenChange,
  tournamentId,
  tournamentName,
  blader,
  availableBladers = [],
  initialCombos,
  parts,
  bannedParts,
  onSaved,
}: Omit<AdminDecklistDialogProps, "open">) {
  const router = useRouter();
  const toast = useToast();
  const [selectedBladerId, setSelectedBladerId] = React.useState<string>(
    () => blader?.id ?? availableBladers[0]?.id ?? ""
  );
  const [combos, setCombos] = React.useState<ComboSelection[]>(() =>
    buildInitialCombos(initialCombos)
  );
  const [saving, setSaving] = React.useState(false);
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null);
  const [successMsg, setSuccessMsg] = React.useState<string | null>(null);

  const partsById = React.useMemo(() => {
    const map = new Map<string, PartRow>();
    for (const p of parts) map.set(p.id, p);
    return map;
  }, [parts]);

  const bannedPartIds = React.useMemo(
    () => new Set(bannedParts.map((p) => p.id)),
    [bannedParts]
  );

  const incompleteCombos = React.useMemo(() => {
    return combos
      .map((combo, index) => ({
        slot: index + 1,
        missing: getMissingComboPartLabels(combo, partsById),
      }))
      .filter((item) => item.missing.length > 0);
  }, [combos, partsById]);

  const activeBlader = React.useMemo(() => {
    if (blader) return blader;
    return availableBladers.find((b) => b.id === selectedBladerId) ?? null;
  }, [blader, availableBladers, selectedBladerId]);

  const handleComboChange = (index: number, next: ComboSelection) => {
    setCombos((prev) => prev.map((c, i) => (i === index ? next : c)));
  };

  const handleAddCombo = () => {
    if (combos.length >= 4) return;
    setCombos((prev) => [...prev, createEmptyComboSelection()]);
  };

  const handleRemoveCombo = (index: number) => {
    if (combos.length <= 1) return;
    setCombos((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (incompleteCombos.length > 0) {
      const first = incompleteCombos[0];
      setErrorMsg(
        `Combo #${first.slot} incompleto (faltando: ${first.missing.join(", ")}).`
      );
      return;
    }

    const targetBladerId = blader?.id ?? selectedBladerId;
    if (!targetBladerId) {
      setErrorMsg("Selecione o Blader para vincular esta decklist.");
      return;
    }

    setSaving(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    const res = await upsertAdminParticipantDecklistAction({
      tournamentId,
      bladerId: targetBladerId,
      combos,
    });

    setSaving(false);

    if (res.error) {
      setErrorMsg(res.error);
      toast.error(res.error);
      return;
    }

    setSuccessMsg("Decklist salva e aprovada para o Placar do Juiz!");
    toast.success("Decklist salva e aprovada para o Placar do Juiz!");
    onSaved?.(targetBladerId);
    router.refresh();
    setTimeout(() => {
      onOpenChange(false);
    }, 500);
  };

  return (
    <DialogContent className="max-w-3xl max-h-[90dvh] overflow-y-auto bg-card border-border/80">
      <DialogHeader>
        <DialogTitle className="text-base sm:text-lg font-black flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-fire-yellow" />
          {blader
            ? `Decklist de ${blader.nickname}`
            : "Cadastrar Decklist Manual"}
        </DialogTitle>
        <p className="text-xs text-muted-foreground">
          {tournamentName} • Monte os <strong>3 combos principais (#1, #2 e #3)</strong> para o Placar do Juiz e, opcionalmente, o <strong>#4 como depósito de peças extras</strong> (oculto na arena).
        </p>
      </DialogHeader>

      <form onSubmit={handleSave} className="space-y-4 pt-1">
        {!blader && (
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-foreground block">
              Blader Participante
            </label>
            <Select
              value={selectedBladerId}
              onValueChange={(v) => {
                if (v) setSelectedBladerId(v);
              }}
            >
              <SelectTrigger className="w-full h-10 text-xs font-semibold">
                <SelectValue placeholder="Selecione um Blader">
                  {activeBlader
                    ? activeBlader.nickname === activeBlader.name
                      ? activeBlader.nickname
                      : `${activeBlader.nickname} (${activeBlader.name})`
                    : "Selecione um Blader"}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {availableBladers.map((b) => (
                  <SelectItem key={b.id} value={b.id}>
                    {b.nickname === b.name
                      ? b.nickname
                      : `${b.nickname} (${b.name})`}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {errorMsg && (
          <div className="p-3 rounded-lg bg-destructive/15 border border-destructive/30 text-destructive text-xs flex items-center gap-2">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {successMsg && (
          <div className="p-3 rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-emerald-500 text-xs flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        <div className="space-y-3">
          {combos.map((combo, index) => {
            const isDeposit = index === 3;
            return (
              <div
                key={index}
                className={`rounded-xl border p-3.5 space-y-3 ${
                  isDeposit
                    ? "border-dashed border-amber-500/45 bg-amber-500/5"
                    : "border-border/60 bg-background/50"
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <Badge
                    variant="outline"
                    className={`text-xs font-black ${
                      isDeposit
                        ? "border-amber-500/50 text-amber-500"
                        : "border-primary/40 text-primary"
                    }`}
                  >
                    {isDeposit
                      ? "Combo #4 — Depósito de Peças Extras (oculto na arena)"
                      : `Combo Principal #${index + 1}`}
                  </Badge>

                  {combos.length > 1 && (
                    <Button
                      type="button"
                      size="xs"
                      variant="ghost"
                      disabled={saving}
                      onClick={() => handleRemoveCombo(index)}
                      className="text-destructive hover:text-destructive gap-1 text-[11px]"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      Remover
                    </Button>
                  )}
                </div>

                <ComboBuilder
                  parts={parts}
                  value={combo}
                  onChange={(next) => handleComboChange(index, next)}
                  bannedPartIds={bannedPartIds}
                  disabled={saving}
                  title={
                    isDeposit
                      ? "Depósito #4 (Reserva de peças extras)"
                      : `Peças do Combo Principal #${index + 1}`
                  }
                />
              </div>
            );
          })}
        </div>

        {incompleteCombos.length > 0 && (
          <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 p-3 text-xs text-amber-500 space-y-1">
            <div className="font-bold">
              Complete todos os combos antes de salvar a decklist:
            </div>
            {incompleteCombos.map((item) => (
              <div key={item.slot} className="text-[11px]">
                •{" "}
                {item.slot === 4
                  ? "Depósito #4"
                  : `Combo Principal #${item.slot}`}
                : falta {item.missing.join(", ")}
              </div>
            ))}
          </div>
        )}

        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-border/50">
          <div>
            {combos.length < 4 && (
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={saving}
                onClick={handleAddCombo}
                className={`text-xs font-bold gap-1.5 ${
                  combos.length === 3
                    ? "border-amber-500/50 text-amber-500 hover:bg-amber-500/10"
                    : ""
                }`}
              >
                <Plus className="h-3.5 w-3.5" />
                {combos.length < 3
                  ? `Adicionar Combo Principal (${combos.length}/3)`
                  : "Adicionar Depósito (#4 — opcional)"}
              </Button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={saving}
              onClick={() => onOpenChange(false)}
              className="text-xs"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={
                saving || parts.length === 0 || incompleteCombos.length > 0
              }
              className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-xs gap-1.5"
            >
              {saving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              Salvar &amp; Aprovar Decklist
            </Button>
          </div>
        </div>
      </form>
    </DialogContent>
  );
}

export function AdminDecklistDialog({
  open,
  onOpenChange,
  blader,
  ...rest
}: AdminDecklistDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {open && (
        <AdminDecklistDialogBody
          key={blader?.id ?? "manual"}
          onOpenChange={onOpenChange}
          blader={blader}
          {...rest}
        />
      )}
    </Dialog>
  );
}
