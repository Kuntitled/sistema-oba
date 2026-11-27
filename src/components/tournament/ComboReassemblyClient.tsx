"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  Wrench,
  Clock,
  Lock,
  CheckCircle2,
  AlertCircle,
  Plus,
  Trash2,
  RotateCcw,
  Unplug,
  Loader2,
  Sparkles,
  PackageCheck,
  ArrowLeftRight,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ComboBuilder } from "@/components/blader/ComboBuilder";
import { useToast } from "@/components/ui/toast-provider";
import {
  comboRowToSelection,
  createEmptyComboSelection,
  formatComboDisplay,
  getMissingComboPartLabels,
  validateTournamentDeckCombo,
  type ComboBadgeChip,
} from "@/lib/combo-rules";
import {
  buildPartCountsMap,
  computeBladerReassemblyState,
  extractMultisetPartIdsFromSelections,
  validateReassemblyAgainstOriginalPool,
} from "@/lib/deck-reassembly";
import { createClient } from "@/lib/supabase/client";
import { reassembleTournamentCombosAction } from "@/app/torneios/registration-actions";
import {
  PART_TYPE_LABELS,
  type BladerRow,
  type ComboSelection,
  type Match,
  type PartRow,
  type RegistrationComboRow,
  type Tournament,
} from "@/types/domain";

interface ComboReassemblyClientProps {
  tournament: Tournament;
  blader: BladerRow;
  initialMatches: Match[];
  initialCombos: RegistrationComboRow[];
  originalPartIds: string[];
  originalParts: PartRow[];
  bannedParts: PartRow[];
}

const CHIP_TONE_CLASSES: Record<ComboBadgeChip["tone"], string> = {
  primary: "border-primary/40 text-primary",
  orange: "border-fire-orange/40 text-fire-orange",
  yellow: "border-fire-yellow/40 text-fire-yellow",
  muted: "border-border/70 text-muted-foreground",
};

export function ComboReassemblyClient({
  tournament,
  blader,
  initialMatches,
  initialCombos,
  originalPartIds,
  originalParts,
  bannedParts,
}: ComboReassemblyClientProps) {
  const router = useRouter();
  const toast = useToast();
  const supabase = React.useMemo(() => createClient(), []);

  const partsById = React.useMemo(() => {
    const map = new Map<string, PartRow>();
    for (const part of originalParts) {
      map.set(part.id, part);
    }
    return map;
  }, [originalParts]);

  const bannedPartIds = React.useMemo(
    () => new Set(bannedParts.map((p) => p.id)),
    [bannedParts]
  );

  const [matchesState, setMatchesState] = React.useState<
    Array<
      Pick<
        Match,
        "id" | "player1_id" | "player2_id" | "status" | "is_bye" | "round" | "stage"
      >
    >
  >(initialMatches);
  const [savedCombos, setSavedCombos] =
    React.useState<RegistrationComboRow[]>(initialCombos);

  const buildSelectionsFromRows = React.useCallback(
    (rows: RegistrationComboRow[]) => {
      if (rows.length === 0) return [createEmptyComboSelection()];
      return [...rows]
        .sort((a, b) => a.slot_number - b.slot_number)
        .map((row) => comboRowToSelection(row, partsById));
    },
    [partsById]
  );

  const [combos, setCombos] = React.useState<ComboSelection[]>(() =>
    buildSelectionsFromRows(initialCombos)
  );
  const [editorOpen, setEditorOpen] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null);
  const [successMsg, setSuccessMsg] = React.useState<string | null>(null);

  // Realtime exclusivamente nas partidas deste torneio para liberar/travar automaticamente
  React.useEffect(() => {
    if (tournament.status !== "ongoing") return;

    const refreshBladerMatches = async () => {
      const { data } = await supabase
        .from("matches")
        .select("id, player1_id, player2_id, status, is_bye, round, stage")
        .eq("tournament_id", tournament.id)
        .or(`player1_id.eq.${blader.id},player2_id.eq.${blader.id}`);

      if (data) {
        setMatchesState(data);
      }
    };

    const channel = supabase
      .channel(`blader-reassembly-${tournament.id}-${blader.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "matches",
          filter: `tournament_id=eq.${tournament.id}`,
        },
        () => {
          void refreshBladerMatches();
        }
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [supabase, tournament.id, tournament.status, blader.id]);

  const reassemblyState = React.useMemo(
    () =>
      computeBladerReassemblyState({
        tournamentStatus: tournament.status,
        bladerId: blader.id,
        matches: matchesState,
      }),
    [tournament.status, blader.id, matchesState]
  );

  const isWindowOpen = reassemblyState.status === "open";

  const originalCounts = React.useMemo(
    () => buildPartCountsMap(originalPartIds),
    [originalPartIds]
  );

  const usedCountsInDraft = React.useMemo(
    () => buildPartCountsMap(extractMultisetPartIdsFromSelections(combos)),
    [combos]
  );

  const sortedSavedCombos = React.useMemo(
    () => [...savedCombos].sort((a, b) => a.slot_number - b.slot_number),
    [savedCombos]
  );

  const activeBattleCombosCount = React.useMemo(
    () => sortedSavedCombos.filter((c) => c.slot_number <= 3).length,
    [sortedSavedCombos]
  );

  const sparePartsCountInPool = React.useMemo(() => {
    const usedInSaved = sortedSavedCombos.reduce((acc, row) => {
      const count = [
        row.lock_chip_id,
        row.over_blade_id,
        row.blade_id,
        row.assist_blade_id,
        row.ratchet_id,
        row.bit_id,
      ].filter(Boolean).length;
      return acc + count;
    }, 0);
    return Math.max(0, originalPartIds.length - usedInSaved);
  }, [sortedSavedCombos, originalPartIds.length]);

  const incompleteCombos = React.useMemo(() => {
    return combos
      .map((combo, index) => ({
        slot: index + 1,
        isDeposit: index === 3,
        missing: getMissingComboPartLabels(combo, partsById),
      }))
      .filter((item) => item.missing.length > 0);
  }, [combos, partsById]);

  // Pool de peças únicas ordenadas para exibição dos chips de peças disponíveis
  const poolSummaryItems = React.useMemo(() => {
    return originalParts.map((part) => {
      const total = originalCounts.get(part.id) ?? 0;
      const used = usedCountsInDraft.get(part.id) ?? 0;
      const remaining = Math.max(0, total - used);
      return {
        part,
        total,
        used,
        remaining,
      };
    });
  }, [originalParts, originalCounts, usedCountsInDraft]);

  // Filtra ESTRITAMENTE para o slot `slotIndex`: apenas peças do pool original com cópia livre
  // (ou que já estejam selecionadas naquele próprio slot).
  const getAvailablePartsForSlot = React.useCallback(
    (slotIndex: number): PartRow[] => {
      const currentCombo = combos[slotIndex];
      const selectedInThisSlot = new Set(
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

      const usedInOtherSlots = new Map<string, number>();
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
          usedInOtherSlots.set(id, (usedInOtherSlots.get(id) ?? 0) + 1);
        }
      });

      return originalParts.filter((part) => {
        if (selectedInThisSlot.has(part.id)) return true;
        const totalAllowed = originalCounts.get(part.id) ?? 0;
        const usedElsewhere = usedInOtherSlots.get(part.id) ?? 0;
        return usedElsewhere < totalAllowed;
      });
    },
    [combos, originalParts, originalCounts]
  );

  const handleComboChange = (index: number, next: ComboSelection) => {
    setCombos((prev) => prev.map((c, i) => (i === index ? next : c)));
    setErrorMsg(null);
    setSuccessMsg(null);
  };

  const handleDisassembleAll = () => {
    const mainSlotsCount = Math.max(1, Math.min(combos.length, 3));
    setCombos(
      Array.from({ length: mainSlotsCount }, () => createEmptyComboSelection())
    );
    setErrorMsg(null);
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
    setErrorMsg(null);
    setSuccessMsg(null);
  };

  const handleRestoreSaved = () => {
    setCombos(buildSelectionsFromRows(savedCombos));
    setErrorMsg(null);
    setSuccessMsg(null);
  };

  const handleAddCombo = () => {
    if (combos.length >= 4) return;
    setCombos((prev) => [...prev, createEmptyComboSelection()]);
  };

  const handleRemoveCombo = (index: number) => {
    if (combos.length <= 1) return;
    setCombos((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSaveReassembly = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isWindowOpen) return;

    setErrorMsg(null);
    setSuccessMsg(null);

    for (let i = 0; i < combos.length; i += 1) {
      const check = validateTournamentDeckCombo(
        combos[i],
        partsById,
        bannedPartIds,
        i + 1
      );
      if (!check.valid) {
        setErrorMsg(check.error);
        return;
      }
    }

    const poolCheck = validateReassemblyAgainstOriginalPool(
      combos,
      originalPartIds,
      partsById
    );
    if (!poolCheck.valid) {
      setErrorMsg(poolCheck.error);
      return;
    }

    setSaving(true);
    const res = await reassembleTournamentCombosAction({
      tournamentId: tournament.id,
      combos,
    });
    setSaving(false);

    if (res.error) {
      setErrorMsg(res.error);
      toast.error(res.error);
      return;
    }

    if (res.combos) {
      setSavedCombos(res.combos);
      setCombos(buildSelectionsFromRows(res.combos));
    }

    setEditorOpen(false);
    const msg =
      "Combos remontados com sucesso! O Placar do Juiz já está atualizado para sua próxima rodada.";
    setSuccessMsg(msg);
    toast.success(msg);
    router.refresh();
  };

  return (
    <Card
      id="remontagem"
      className={`overflow-hidden shadow-lg ${
        isWindowOpen
          ? "border-emerald-500/50 bg-gradient-to-b from-emerald-500/10 via-card to-card"
          : "border-primary/35 bg-card/85"
      }`}
    >
      <div
        className={`h-1.5 ${
          isWindowOpen
            ? "bg-gradient-to-r from-emerald-500 via-primary to-fire-orange"
            : "bg-gradient-to-r from-primary/60 to-fire-orange/60"
        }`}
      />

      <CardHeader className="p-5 pb-3 space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2 flex-wrap">
            <Badge
              variant="outline"
              className="text-[10px] font-bold border-primary/40 text-primary bg-primary/10"
            >
              Área Exclusiva do Competidor • {blader.nickname}
            </Badge>

            {isWindowOpen ? (
              <Badge className="bg-emerald-600 text-white font-black text-[10px] gap-1.5 animate-pulse">
                <Wrench className="h-3 w-3" />
                Janela Entre Rodadas Aberta
              </Badge>
            ) : reassemblyState.status === "waiting_match" ? (
              <Badge className="bg-amber-500/20 text-amber-400 border border-amber-500/40 font-bold text-[10px] gap-1">
                <Clock className="h-3 w-3" />
                Aguardando Fim da Partida Atual
              </Badge>
            ) : (
              <Badge
                variant="outline"
                className="text-[10px] border-border/70 text-muted-foreground gap-1"
              >
                <Lock className="h-3 w-3" />
                Aguardando 1ª Rodada
              </Badge>
            )}
          </div>

          {isWindowOpen && !editorOpen && (
            <Button
              type="button"
              size="sm"
              onClick={() => {
                setEditorOpen(true);
                setErrorMsg(null);
                setSuccessMsg(null);
              }}
              className="bg-emerald-600 hover:bg-emerald-600/90 text-white font-black text-xs gap-1.5 shadow-md"
            >
              <Wrench className="h-3.5 w-3.5" />
              Remontar Combos Agora
            </Button>
          )}
        </div>

        <CardTitle className="text-lg sm:text-xl font-black text-foreground">
          Remontagem de Combos (Entre Rodadas)
        </CardTitle>

        <p className="text-xs text-muted-foreground leading-relaxed">
          {isWindowOpen ? (
            <>
              Você já concluiu sua batalha da rodada{" "}
              <strong className="text-foreground">
                #{reassemblyState.latestRound}
              </strong>
              . Selecione{" "}
              <strong className="text-foreground">
                apenas seus 3 combos principais (#1, #2 e #3)
              </strong>{" "}
              para a arena utilizando{" "}
              <strong className="text-foreground">
                somente as peças originalmente cadastradas por você neste
                torneio
              </strong>
              . O 4º slot (ou peças sobrando no pool) funciona só como{" "}
              <strong className="text-amber-500">
                depósito de peças extras
              </strong>{" "}
              e não entra no placar do juiz.
            </>
          ) : reassemblyState.status === "waiting_match" ? (
            <>
              Você tem uma partida{" "}
              <strong className="text-foreground">
                {reassemblyState.currentMatchStatus === "in_progress"
                  ? "ao vivo"
                  : "na fila"}
              </strong>{" "}
              na rodada atual. Assim que o placar for encerrado, esta área será
              liberada automaticamente para você remontar seus 3 combos
              principais usando as peças do seu pool/depósito original.
            </>
          ) : (
            <>
              A remontagem entre rodadas é liberada automaticamente após você
              concluir sua primeira partida neste torneio, permitindo ajustar
              seus 3 combos principais com as peças cadastradas originalmente
              (incluindo o depósito #4).
            </>
          )}
        </p>
      </CardHeader>

      <CardContent className="p-5 pt-2 space-y-4">
        {errorMsg && (
          <div className="p-3 rounded-lg bg-destructive/15 border border-destructive/35 text-destructive text-xs flex items-center gap-2">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {successMsg && (
          <div className="p-3 rounded-lg bg-emerald-500/15 border border-emerald-500/35 text-emerald-400 text-xs flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Pool fixo de peças cadastradas neste torneio */}
        <div className="rounded-xl border border-border/60 bg-background/50 p-3.5 space-y-2">
          <div className="flex items-center justify-between gap-2 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <PackageCheck className="h-3.5 w-3.5 text-primary" />
              Suas Peças Permitidas neste Torneio ({originalPartIds.length} no
              total)
            </span>
            {editorOpen && (
              <span className="text-[10px] font-semibold normal-case text-muted-foreground">
                Livres / Cadastradas
              </span>
            )}
          </div>

          <div className="flex flex-wrap gap-1.5">
            {poolSummaryItems.map(({ part, total, remaining }) => (
              <Badge
                key={part.id}
                variant="outline"
                className={`text-[10px] gap-1 ${
                  editorOpen
                    ? remaining > 0
                      ? "border-emerald-500/45 bg-emerald-500/10 text-emerald-400 font-bold"
                      : "border-border/50 text-muted-foreground opacity-70"
                    : "border-border/60 text-foreground"
                }`}
              >
                <span className="text-[9px] text-muted-foreground">
                  {PART_TYPE_LABELS[part.part_type]}:
                </span>
                <span className="font-bold">{part.name}</span>
                <span className="font-mono text-[10px] font-black">
                  {editorOpen ? `${remaining}/${total}` : `${total}x`}
                </span>
              </Badge>
            ))}
          </div>
        </div>

        {/* Visualização compacta dos combos ativos atuais */}
        {!editorOpen && (
          <div className="space-y-2.5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <Sparkles className="h-3.5 w-3.5 text-fire-yellow" />
                Sua Montagem Atual ({activeBattleCombosCount}{" "}
                {activeBattleCombosCount === 1
                  ? "combo principal"
                  : "combos principais"}
                {sortedSavedCombos.some((c) => c.slot_number === 4)
                  ? " + Depósito #4"
                  : ""}
                )
              </div>
              {sparePartsCountInPool > 0 && (
                <Badge
                  variant="outline"
                  className="text-[10px] border-amber-500/45 bg-amber-500/10 text-amber-500 font-bold"
                >
                  +{sparePartsCountInPool} peça(s) extra(s) no depósito
                </Badge>
              )}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {sortedSavedCombos.map((row) => {
                const isDeposit = row.slot_number === 4;
                const display = formatComboDisplay({
                  system: row.system,
                  blade: row.blade_id
                    ? (partsById.get(row.blade_id) ?? null)
                    : null,
                  lockChip: row.lock_chip_id
                    ? (partsById.get(row.lock_chip_id) ?? null)
                    : null,
                  overBlade: row.over_blade_id
                    ? (partsById.get(row.over_blade_id) ?? null)
                    : null,
                  assistBlade: row.assist_blade_id
                    ? (partsById.get(row.assist_blade_id) ?? null)
                    : null,
                  ratchet: row.ratchet_id
                    ? (partsById.get(row.ratchet_id) ?? null)
                    : null,
                  bit: row.bit_id ? (partsById.get(row.bit_id) ?? null) : null,
                });

                return (
                  <div
                    key={row.id}
                    className={`rounded-lg border p-2.5 space-y-1.5 text-xs ${
                      isDeposit
                        ? "border-dashed border-amber-500/45 bg-amber-500/5"
                        : "border-border/55 bg-background/60"
                    }`}
                  >
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <Badge
                        variant={isDeposit ? "outline" : "secondary"}
                        className={`text-[10px] font-black px-1.5 py-0 ${
                          isDeposit
                            ? "border-amber-500/50 text-amber-500"
                            : ""
                        }`}
                      >
                        {isDeposit
                          ? "#4 • Depósito (Reserva)"
                          : `Principal #${row.slot_number}`}
                      </Badge>
                      {display.system && (
                        <Badge
                          variant="outline"
                          className="text-[10px] border-primary/40 text-primary px-1.5 py-0"
                        >
                          {display.system}
                        </Badge>
                      )}
                      <span className="font-bold text-foreground truncate">
                        {display.summaryText}
                      </span>
                    </div>
                    {isDeposit && (
                      <p className="text-[10px] text-amber-500/90 font-medium">
                        Apenas depósito de peças extras — não aparece no placar do juiz.
                      </p>
                    )}
                    <div className="flex flex-wrap gap-1">
                      {display.chips.map((chip, idx) => (
                        <Badge
                          key={`${chip.slot}-${idx}`}
                          variant="outline"
                          className={`text-[9px] px-1.5 py-0 ${CHIP_TONE_CLASSES[chip.tone]}`}
                        >
                          {chip.name}
                        </Badge>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Editor de Remontagem (somente quando janela aberta e editor ativo) */}
        {isWindowOpen && editorOpen && (
          <form onSubmit={handleSaveReassembly} className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl border border-emerald-500/35 bg-emerald-500/5 p-3.5">
              <div className="space-y-1 text-xs text-muted-foreground">
                <p>
                  <strong className="text-foreground">
                    Monte seus 3 combos principais (#1, #2 e #3)
                  </strong>{" "}
                  usando exclusivamente as peças livres do seu pool acima.
                </p>
                <p className="text-[11px]">
                  O <strong className="text-amber-500">4º slot (#4)</strong> é{" "}
                  <strong>opcional</strong> e serve apenas como{" "}
                  <strong className="text-amber-500">
                    depósito de peças extras
                  </strong>{" "}
                  (não aparece para batalha no Placar do Juiz) — você também pode
                  remover o slot #4 e deixar peças sobrando guardadas no pool.
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2 shrink-0">
                <Button
                  type="button"
                  size="xs"
                  variant="outline"
                  disabled={saving}
                  onClick={handleDisassembleAll}
                  className="text-[11px] font-bold gap-1"
                >
                  <Unplug className="h-3 w-3 text-fire-orange" />
                  Desmontar Tudo
                </Button>
                <Button
                  type="button"
                  size="xs"
                  variant="ghost"
                  disabled={saving}
                  onClick={handleRestoreSaved}
                  className="text-[11px] font-semibold gap-1"
                >
                  <RotateCcw className="h-3 w-3" />
                  Restaurar Atual
                </Button>
              </div>
            </div>

            {/* Troca rápida do Depósito (#4) para um dos 3 combos principais */}
            {combos.length >= 4 && (
              <div className="rounded-xl border border-amber-500/35 bg-amber-500/10 p-3 flex flex-wrap items-center justify-between gap-2">
                <div className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                  <ArrowLeftRight className="h-3.5 w-3.5 text-amber-500" />
                  <span>Promover combo do Depósito (#4) para Principal:</span>
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
                      className="text-[11px] font-bold border-amber-500/50 text-amber-500 hover:bg-amber-500/15"
                    >
                      #4 ↔ Principal #{slotIdx + 1}
                    </Button>
                  ))}
                </div>
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
                        ? "border-dashed border-amber-500/50 bg-amber-500/5"
                        : "border-border/60 bg-background/50"
                    }`}
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge
                          variant="outline"
                          className={`text-xs font-black ${
                            isDeposit
                              ? "border-amber-500/50 text-amber-500 bg-amber-500/10"
                              : "border-primary/40 text-primary"
                          }`}
                        >
                          {isDeposit
                            ? "Combo #4 — Depósito de Peças Extras (Opcional)"
                            : `Combo Principal #${index + 1}`}
                        </Badge>
                        <span className="text-[11px] text-muted-foreground font-medium">
                          {isDeposit
                            ? "Não entra no placar do juiz — apenas reserva"
                            : "Ativo para batalha na arena"}
                        </span>
                      </div>

                      {combos.length > 1 && (
                        <Button
                          type="button"
                          size="xs"
                          variant="ghost"
                          disabled={saving}
                          onClick={() => handleRemoveCombo(index)}
                          className="text-destructive hover:text-destructive text-[11px] gap-1"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                          {isDeposit
                            ? "Remover #4 (deixar peças no depósito)"
                            : "Remover"}
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
                        isDeposit
                          ? "Depósito #4 (opcional — reserva de peças extras)"
                          : `Combo Principal #${index + 1} (somente peças do seu pool original)`
                      }
                    />
                  </div>
                );
              })}
            </div>

            {incompleteCombos.length > 0 && (
              <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 p-3 text-xs text-amber-500 space-y-1">
                <div className="font-bold">
                  Complete todos os slots abertos antes de confirmar a remontagem:
                </div>
                {incompleteCombos.map((item) => (
                  <div key={item.slot} className="text-[11px]">
                    •{" "}
                    {item.isDeposit
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
                      : "Adicionar Depósito de Peças Extras (#4 — opcional)"}
                  </Button>
                )}
              </div>

              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={saving}
                  onClick={() => {
                    handleRestoreSaved();
                    setEditorOpen(false);
                  }}
                  className="text-xs"
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  disabled={saving || incompleteCombos.length > 0}
                  className="bg-emerald-600 hover:bg-emerald-600/90 text-white font-black text-xs gap-1.5"
                >
                  {saving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                  Confirmar Remontagem
                </Button>
              </div>
            </div>
          </form>
        )}
      </CardContent>
    </Card>
  );
}
