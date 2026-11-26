"use client";

import * as React from "react";
import {
  ArrowLeftRight,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Sparkles,
  Plus,
  Trash2,
  PackageCheck,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ComboBuilder } from "@/components/blader/ComboBuilder";
import {
  comboRowToSelection,
  createEmptyComboSelection,
  getMissingComboPartLabels,
} from "@/lib/combo-rules";
import {
  buildPartCountsMap,
  extractMultisetPartIdsFromSelections,
} from "@/lib/deck-reassembly";
import {
  getArenaPlayerDecklistForEditAction,
  updateArenaPlayerCombosAction,
} from "@/app/admin/arena/actions";
import type {
  BladerRow,
  ComboSelection,
  PartRow,
  UserRole,
} from "@/types/domain";

interface ArenaComboEditDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  arenaId: string;
  tournamentId: string;
  player: BladerRow | null;
  parts: PartRow[];
  bannedParts: PartRow[];
  userRole: UserRole;
  onSaved: () => void;
}

function ArenaComboEditDialogBody({
  onOpenChange,
  arenaId,
  tournamentId,
  player,
  parts,
  bannedParts,
  userRole,
  onSaved,
}: Omit<ArenaComboEditDialogProps, "open"> & { player: BladerRow }) {
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [loadError, setLoadError] = React.useState<string | null>(null);
  const [saveError, setSaveError] = React.useState<string | null>(null);
  const [successMsg, setSuccessMsg] = React.useState<string | null>(null);
  const [originalPartIds, setOriginalPartIds] = React.useState<string[]>([]);
  const [allowFullCatalog, setAllowFullCatalog] = React.useState(false);
  const [combos, setCombos] = React.useState<ComboSelection[]>([
    createEmptyComboSelection(),
    createEmptyComboSelection(),
    createEmptyComboSelection(),
  ]);

  const partsById = React.useMemo(() => {
    const map = new Map<string, PartRow>();
    for (const p of parts) map.set(p.id, p);
    return map;
  }, [parts]);

  const bannedPartIds = React.useMemo(
    () => new Set(bannedParts.map((p) => p.id)),
    [bannedParts]
  );

  React.useEffect(() => {
    let active = true;
    void getArenaPlayerDecklistForEditAction(tournamentId, player.id).then(
      (res) => {
        if (!active) return;
        setLoading(false);
        if (res.error) {
          setLoadError(res.error);
          return;
        }
        setOriginalPartIds(res.originalPartIds);
        if (res.combos.length > 0) {
          setCombos(
            [...res.combos]
              .sort((a, b) => a.slot_number - b.slot_number)
              .map((row) => comboRowToSelection(row, partsById))
          );
        } else {
          setCombos([
            createEmptyComboSelection(),
            createEmptyComboSelection(),
            createEmptyComboSelection(),
          ]);
        }
      }
    );

    return () => {
      active = false;
    };
  }, [tournamentId, player.id, partsById]);

  const hasPoolRestriction =
    originalPartIds.length > 0 && !(userRole === "admin" && allowFullCatalog);

  const originalCounts = React.useMemo(
    () => buildPartCountsMap(originalPartIds),
    [originalPartIds]
  );

  const originalPartsList = React.useMemo(() => {
    const seen = new Set<string>();
    const list: PartRow[] = [];
    for (const id of originalPartIds) {
      if (seen.has(id)) continue;
      seen.add(id);
      const part = partsById.get(id);
      if (part) list.push(part);
    }
    return list;
  }, [originalPartIds, partsById]);

  const usedCountsInDraft = React.useMemo(
    () => buildPartCountsMap(extractMultisetPartIdsFromSelections(combos)),
    [combos]
  );

  const getAvailablePartsForSlot = React.useCallback(
    (slotIndex: number): PartRow[] => {
      if (!hasPoolRestriction) {
        return parts;
      }

      const currentCombo = combos[slotIndex];
      const selectedInSlot = new Set(
        currentCombo
          ? [
              currentCombo.lockChipId,
              currentCombo.overBladeId,
              currentCombo.bladeId,
              currentCombo.assistBladeId,
              currentCombo.ratchetId,
              currentCombo.bitId,
            ].filter(Boolean)
          : []
      );

      const usedElsewhere = new Map<string, number>();
      combos.forEach((c, idx) => {
        if (idx === slotIndex) return;
        const ids = [
          c.lockChipId,
          c.overBladeId,
          c.bladeId,
          c.assistBladeId,
          c.ratchetId,
          c.bitId,
        ].filter(Boolean);
        for (const id of ids) {
          usedElsewhere.set(id, (usedElsewhere.get(id) ?? 0) + 1);
        }
      });

      return originalPartsList.filter((part) => {
        if (selectedInSlot.has(part.id)) return true;
        const allowed = originalCounts.get(part.id) ?? 0;
        const used = usedElsewhere.get(part.id) ?? 0;
        return used < allowed;
      });
    },
    [hasPoolRestriction, parts, combos, originalPartsList, originalCounts]
  );

  const incompleteCombos = React.useMemo(() => {
    return combos
      .map((combo, index) => ({
        slot: index + 1,
        missing: getMissingComboPartLabels(combo, partsById),
      }))
      .filter((item) => item.missing.length > 0);
  }, [combos, partsById]);

  const handleComboChange = (index: number, next: ComboSelection) => {
    setCombos((prev) => prev.map((c, idx) => (idx === index ? next : c)));
    setSaveError(null);
    setSuccessMsg(null);
  };

  const handleSwapReserveWithSlot = (targetIdx: number) => {
    if (combos.length < 4 || targetIdx < 0 || targetIdx >= 3) return;
    setCombos((prev) => {
      const next = [...prev];
      const reserve = next[3];
      next[3] = next[targetIdx];
      next[targetIdx] = reserve;
      return next;
    });
    setSaveError(null);
    setSuccessMsg(
      `Combo #4 (Reserva) movido para o slot #${targetIdx + 1}! Clique em Salvar para confirmar na arena.`
    );
  };

  const handleAddCombo = () => {
    if (combos.length >= 4) return;
    setCombos((prev) => [...prev, createEmptyComboSelection()]);
  };

  const handleRemoveCombo = (index: number) => {
    if (combos.length <= 1) return;
    setCombos((prev) => prev.filter((_, idx) => idx !== index));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (incompleteCombos.length > 0) {
      const first = incompleteCombos[0];
      setSaveError(
        `Combo #${first.slot} incompleto (faltando: ${first.missing.join(", ")}).`
      );
      return;
    }

    setSaving(true);
    setSaveError(null);
    setSuccessMsg(null);

    const res = await updateArenaPlayerCombosAction({
      tournamentId,
      bladerId: player.id,
      arenaId,
      combos,
      allowFullCatalog: userRole === "admin" && allowFullCatalog,
    });

    setSaving(false);

    if (res.error) {
      setSaveError(res.error);
      return;
    }

    setSuccessMsg("Combos atualizados no Placar da Arena!");
    onSaved();
    setTimeout(() => {
      onOpenChange(false);
    }, 350);
  };

  return (
    <DialogContent className="max-w-3xl max-h-[90dvh] overflow-y-auto bg-card border-border/80">
      <DialogHeader>
        <DialogTitle className="text-base sm:text-lg font-black flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-fire-yellow" />
          Editar Combos na Arena — {player.nickname}
        </DialogTitle>
        <p className="text-xs text-muted-foreground">
          Apenas os combos <strong>#1, #2 e #3</strong> aparecem para seleção na batalha. O slot{" "}
          <strong>#4</strong> fica como reserva/repositório de peças.
        </p>
      </DialogHeader>

      {loading ? (
        <div className="py-12 flex flex-col items-center justify-center gap-2 text-xs text-muted-foreground">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
          <span>Carregando decklist de {player.nickname}...</span>
        </div>
      ) : (
        <form onSubmit={handleSave} className="space-y-4 pt-1">
          {loadError && (
            <div className="p-3 rounded-lg bg-destructive/15 border border-destructive/30 text-destructive text-xs flex items-center gap-2">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{loadError}</span>
            </div>
          )}

          {saveError && (
            <div className="p-3 rounded-lg bg-destructive/15 border border-destructive/30 text-destructive text-xs flex items-center gap-2">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{saveError}</span>
            </div>
          )}

          {successMsg && (
            <div className="p-3 rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-emerald-500 text-xs flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* Barra informativa do Pool de Peças */}
          {originalPartIds.length > 0 && (
            <div className="rounded-xl border border-border/60 bg-background/50 p-3 space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-2 text-[11px]">
                <span className="font-bold text-foreground flex items-center gap-1.5">
                  <PackageCheck className="h-3.5 w-3.5 text-primary" />
                  {hasPoolRestriction
                    ? "Restrito às peças cadastradas pelo Blader neste torneio"
                    : "Modo Admin: catálogo completo liberado"}
                </span>
                {userRole === "admin" && (
                  <button
                    type="button"
                    onClick={() => setAllowFullCatalog((prev) => !prev)}
                    className="text-[11px] font-bold text-primary hover:underline cursor-pointer"
                  >
                    {allowFullCatalog
                      ? "Voltar ao pool cadastrado"
                      : "Liberar catálogo completo (Admin)"}
                  </button>
                )}
              </div>

              {hasPoolRestriction && (
                <div className="flex flex-wrap gap-1.5">
                  {originalPartsList.map((part) => {
                    const total = originalCounts.get(part.id) ?? 0;
                    const used = usedCountsInDraft.get(part.id) ?? 0;
                    const free = Math.max(0, total - used);
                    return (
                      <Badge
                        key={part.id}
                        variant="outline"
                        className={`text-[10px] gap-1 ${
                          free > 0
                            ? "border-emerald-500/45 bg-emerald-500/10 text-emerald-500 font-bold"
                            : "border-border/50 text-muted-foreground"
                        }`}
                      >
                        <span>{part.name}</span>
                        <span className="font-mono">
                          {free}/{total}
                        </span>
                      </Badge>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Troca rápida com o Combo #4 (Reserva) */}
          {combos.length >= 4 && (
            <div className="rounded-xl border border-primary/35 bg-primary/5 p-3 flex flex-wrap items-center justify-between gap-2">
              <div className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                <ArrowLeftRight className="h-3.5 w-3.5 text-primary" />
                <span>Trocar Reserva (#4) por combo ativo:</span>
              </div>
              <div className="flex items-center gap-1.5">
                {[0, 1, 2].map((slotIdx) => (
                  <Button
                    key={slotIdx}
                    type="button"
                    size="xs"
                    variant="outline"
                    disabled={saving}
                    onClick={() => handleSwapReserveWithSlot(slotIdx)}
                    className="text-[11px] font-bold border-primary/40 text-primary hover:bg-primary/15"
                  >
                    #4 ↔ #{slotIdx + 1}
                  </Button>
                ))}
              </div>
            </div>
          )}

          {/* Editores de Combos */}
          <div className="space-y-3">
            {combos.map((combo, index) => {
              const isReserve = index === 3;
              return (
                <div
                  key={index}
                  className={`rounded-xl border p-3.5 space-y-3 ${
                    isReserve
                      ? "border-dashed border-amber-500/45 bg-amber-500/5"
                      : "border-border/60 bg-background/50"
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <Badge
                        variant="outline"
                        className={`text-xs font-black ${
                          isReserve
                            ? "border-amber-500/50 text-amber-500"
                            : "border-primary/40 text-primary"
                        }`}
                      >
                        {isReserve
                          ? "Combo #4 (Reserva — oculto na arena)"
                          : `Combo Ativo #${index + 1}`}
                      </Badge>
                    </div>

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
                    parts={getAvailablePartsForSlot(index)}
                    value={combo}
                    onChange={(next) => handleComboChange(index, next)}
                    bannedPartIds={bannedPartIds}
                    disabled={saving}
                    title={
                      isReserve
                        ? "Combo #4 — Reserva / Pool de Peças"
                        : `Peças do Combo #${index + 1}`
                    }
                  />
                </div>
              );
            })}
          </div>

          {incompleteCombos.length > 0 && (
            <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 p-3 text-xs text-amber-500 space-y-1">
              <div className="font-bold">
                Complete todos os combos antes de salvar:
              </div>
              {incompleteCombos.map((item) => (
                <div key={item.slot} className="text-[11px]">
                  • Combo #{item.slot}: falta {item.missing.join(", ")}
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
                  className="text-xs font-bold gap-1.5"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Adicionar Combo ({combos.length}/4)
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
                disabled={saving || incompleteCombos.length > 0}
                className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-xs gap-1.5"
              >
                {saving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                Salvar Combos na Arena
              </Button>
            </div>
          </div>
        </form>
      )}
    </DialogContent>
  );
}

export function ArenaComboEditDialog({
  open,
  onOpenChange,
  player,
  ...rest
}: ArenaComboEditDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {open && player && (
        <ArenaComboEditDialogBody
          key={player.id}
          onOpenChange={onOpenChange}
          player={player}
          {...rest}
        />
      )}
    </Dialog>
  );
}
