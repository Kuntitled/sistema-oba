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

  const incompleteCombos = React.useMemo(() => {
    return combos
      .map((combo, index) => ({
        slot: index + 1,
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
    setCombos((prev) => prev.map(() => createEmptyComboSelection()));
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
              . Enquanto a próxima rodada não é gerada, você pode remontar seus
              combos utilizando{" "}
              <strong className="text-foreground">
                somente as peças originalmente cadastradas por você neste
                torneio
              </strong>
              .
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
              liberada automaticamente para você remontar seus combos usando o
              seu pool original de peças.
            </>
          ) : (
            <>
              A remontagem entre rodadas é liberada automaticamente após você
              concluir sua primeira partida neste torneio, mantendo estritamente
              as peças cadastradas originalmente na sua inscrição.
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
          <div className="space-y-2">
            <div className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <Sparkles className="h-3.5 w-3.5 text-fire-yellow" />
              Sua Montagem Atual ({savedCombos.length}{" "}
              {savedCombos.length === 1 ? "combo" : "combos"})
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {savedCombos.map((row) => {
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
                    className="rounded-lg border border-border/55 bg-background/60 p-2.5 space-y-1.5 text-xs"
                  >
                    <div className="flex items-center gap-1.5">
                      <Badge
                        variant="secondary"
                        className="text-[10px] font-black px-1.5 py-0"
                      >
                        #{row.slot_number}
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
            <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-emerald-500/35 bg-emerald-500/5 p-3">
              <p className="text-xs text-muted-foreground">
                Os seletores abaixo exibem{" "}
                <strong className="text-foreground">
                  exclusivamente as peças livres do seu cadastro original
                </strong>{" "}
                neste torneio.
              </p>
              <div className="flex flex-wrap items-center gap-2">
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

            <div className="space-y-3">
              {combos.map((combo, index) => (
                <div
                  key={index}
                  className="rounded-xl border border-border/60 bg-background/50 p-3.5 space-y-3"
                >
                  <div className="flex items-center justify-between gap-2">
                    <Badge
                      variant="outline"
                      className="text-xs font-black border-primary/40 text-primary"
                    >
                      Combo #{index + 1}
                    </Badge>
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
                    title={`Remontar Combo #${index + 1} (somente peças do seu pool original)`}
                  />
                </div>
              ))}
            </div>

            {incompleteCombos.length > 0 && (
              <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 p-3 text-xs text-amber-500 space-y-1">
                <div className="font-bold">
                  Complete todos os combos antes de confirmar a remontagem:
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
