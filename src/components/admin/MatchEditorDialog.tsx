"use client";

import * as React from "react";
import {
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  ClipboardCheck,
  Loader2,
  Pencil,
  RotateCcw,
  Trash2,
  Trophy,
  Zap,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/toast-provider";
import { BX_FINISH_OPTIONS } from "@/lib/constants";
import {
  editMatchResultAction,
  type EditableMatchGameInput,
} from "@/app/admin/torneios/engine-actions";
import {
  FINISH_POINTS,
  MATCH_STAGE_LABELS,
  type FinishType,
  type Match,
  type MatchGame,
  type TournamentStatus,
} from "@/types/domain";

type EditMode = "finishes" | "direct" | "wo";
type EditableFinishType = Exclude<FinishType, "draw">;

interface DraftGameRow {
  key: string;
  scoringPlayerId: string;
  finishType: EditableFinishType;
  player1ComboId: string | null;
  player2ComboId: string | null;
}

interface MatchEditorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  match: Match | null;
  matchGames: MatchGame[];
  tournamentStatus: TournamentStatus;
  onSaved: () => Promise<void> | void;
}

const FINISH_SHORT_BADGE_CLASSES: Record<EditableFinishType, string> = {
  spin: "border-sky-500/40 text-sky-400 bg-sky-500/10",
  over: "border-emerald-500/40 text-emerald-400 bg-emerald-500/10",
  burst: "border-fire-orange/45 text-fire-orange bg-fire-orange/10",
  xtreme: "border-fire-yellow/50 text-fire-yellow bg-fire-yellow/10",
};

function createDraftKey(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function MatchEditorDialogBody({
  onOpenChange,
  match,
  matchGames,
  tournamentStatus,
  onSaved,
}: Omit<MatchEditorDialogProps, "open"> & { match: Match }) {
  const toast = useToast();
  const p1Id = match.player1_id ?? "";
  const p2Id = match.player2_id ?? "";
  const p1Nick = match.player1?.nickname ?? "Blader 1";
  const p2Nick = match.player2?.nickname ?? "Blader 2";

  const sortedInitialGames = React.useMemo(
    () =>
      [...matchGames]
        .filter((g) => g.scoring_player_id && g.finish_type !== "draw")
        .sort((a, b) => a.round_number - b.round_number),
    [matchGames]
  );

  const [mode, setMode] = React.useState<EditMode>(() => {
    if (match.status === "finished" && sortedInitialGames.length === 0) {
      return "direct";
    }
    return "finishes";
  });

  const [draftGames, setDraftGames] = React.useState<DraftGameRow[]>(() =>
    sortedInitialGames.map((g, idx) => ({
      key: g.id || `init-${idx}`,
      scoringPlayerId: g.scoring_player_id ?? p1Id,
      finishType: (g.finish_type === "draw"
        ? "spin"
        : g.finish_type) as EditableFinishType,
      player1ComboId: g.player1_combo_id ?? null,
      player2ComboId: g.player2_combo_id ?? null,
    }))
  );

  const [winnerId, setWinnerId] = React.useState<string>(() => {
    if (match.winner_id === p1Id || match.winner_id === p2Id) {
      return match.winner_id;
    }
    if (match.player2_score > match.player1_score) return p2Id;
    return p1Id;
  });

  const [directP1Score, setDirectP1Score] = React.useState<string>(() => {
    if (match.status === "finished") return String(match.player1_score);
    return String(winnerId === p2Id ? 0 : match.target_score);
  });

  const [directP2Score, setDirectP2Score] = React.useState<string>(() => {
    if (match.status === "finished") return String(match.player2_score);
    return String(winnerId === p2Id ? match.target_score : 0);
  });

  const [saving, setSaving] = React.useState(false);
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null);

  const finishesTotals = React.useMemo(() => {
    let p1Score = 0;
    let p2Score = 0;
    for (const g of draftGames) {
      const pts = FINISH_POINTS[g.finishType] ?? 0;
      if (g.scoringPlayerId === p1Id) {
        p1Score += pts;
      } else if (g.scoringPlayerId === p2Id) {
        p2Score += pts;
      }
    }
    return { p1Score, p2Score };
  }, [draftGames, p1Id, p2Id]);

  const syncWinnerFromGames = (nextGames: DraftGameRow[]) => {
    let p1 = 0;
    let p2 = 0;
    for (const g of nextGames) {
      const pts = FINISH_POINTS[g.finishType] ?? 0;
      if (g.scoringPlayerId === p1Id) p1 += pts;
      else if (g.scoringPlayerId === p2Id) p2 += pts;
    }
    if (p1 > p2 && p1Id) setWinnerId(p1Id);
    else if (p2 > p1 && p2Id) setWinnerId(p2Id);
  };

  const handleAddFinish = (
    scoringPlayerId: string,
    finishType: EditableFinishType
  ) => {
    if (!scoringPlayerId) return;
    setErrorMsg(null);
    const nextGames: DraftGameRow[] = [
      ...draftGames,
      {
        key: createDraftKey(),
        scoringPlayerId,
        finishType,
        player1ComboId: null,
        player2ComboId: null,
      },
    ];
    setDraftGames(nextGames);
    syncWinnerFromGames(nextGames);
  };

  const handleChangeGameField = (
    key: string,
    patch: Partial<Pick<DraftGameRow, "scoringPlayerId" | "finishType">>
  ) => {
    setErrorMsg(null);
    const nextGames = draftGames.map((g) =>
      g.key === key ? { ...g, ...patch } : g
    );
    setDraftGames(nextGames);
    syncWinnerFromGames(nextGames);
  };

  const handleRemoveGame = (key: string) => {
    setErrorMsg(null);
    const nextGames = draftGames.filter((g) => g.key !== key);
    setDraftGames(nextGames);
    syncWinnerFromGames(nextGames);
  };

  const handleClearGames = () => {
    setErrorMsg(null);
    setDraftGames([]);
  };

  const handleSelectDirectWinner = (selectedId: string) => {
    setErrorMsg(null);
    setWinnerId(selectedId);
    if (mode === "direct") {
      const p1Won = selectedId === p1Id;
      const cur1 = parseInt(directP1Score, 10) || 0;
      const cur2 = parseInt(directP2Score, 10) || 0;
      if ((p1Won && cur1 <= cur2) || (!p1Won && cur2 <= cur1)) {
        setDirectP1Score(String(p1Won ? match.target_score : 0));
        setDirectP2Score(String(p1Won ? 0 : match.target_score));
      }
    }
  };

  const finishesTiedOrMismatched =
    mode === "finishes" &&
    draftGames.length > 0 &&
    ((winnerId === p1Id && finishesTotals.p1Score <= finishesTotals.p2Score) ||
      (winnerId === p2Id && finishesTotals.p2Score <= finishesTotals.p1Score));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!winnerId) {
      setErrorMsg("Selecione o Blader vencedor da partida.");
      return;
    }

    if (mode === "finishes") {
      if (draftGames.length === 0) {
        setErrorMsg(
          "Adicione pelo menos 1 finish abaixo ou selecione Vitória Direta / W.O."
        );
        return;
      }
      if (finishesTiedOrMismatched) {
        setErrorMsg(
          "O placar somado dos finishes precisa dar vantagem ao vencedor selecionado (ou ajuste para Vitória Direta)."
        );
        return;
      }
    }

    const gamesPayload: EditableMatchGameInput[] | undefined =
      mode === "finishes"
        ? draftGames.map((g) => ({
            scoringPlayerId: g.scoringPlayerId,
            finishType: g.finishType,
            player1ComboId: g.player1ComboId,
            player2ComboId: g.player2ComboId,
          }))
        : undefined;

    setSaving(true);
    const res = await editMatchResultAction({
      matchId: match.id,
      mode,
      winnerId,
      games: gamesPayload,
      player1Score:
        mode === "direct" ? parseInt(directP1Score, 10) || 0 : undefined,
      player2Score:
        mode === "direct" ? parseInt(directP2Score, 10) || 0 : undefined,
    });
    setSaving(false);

    if (res.error) {
      setErrorMsg(res.error);
      toast.error(res.error);
      return;
    }

    const winnerNick = winnerId === p1Id ? p1Nick : p2Nick;
    const baseMsg =
      mode === "wo"
        ? `W.O. salvo (${winnerNick} venceu).`
        : mode === "finishes"
          ? `Partida salva com ${draftGames.length} finish(es) (${finishesTotals.p1Score} × ${finishesTotals.p2Score} para ${winnerNick}).`
          : `Placar salvo (${directP1Score} × ${directP2Score} para ${winnerNick}).`;

    toast.success(
      res.recalculatedRanking
        ? `${baseMsg} Resultados e Ranking da temporada recalculados!`
        : baseMsg
    );

    if (res.warning) {
      toast.info(res.warning);
    }

    await onSaved();
    onOpenChange(false);
  };

  return (
    <DialogContent className="max-w-2xl max-h-[92dvh] overflow-y-auto bg-card border-border/80">
      <DialogHeader>
        <DialogTitle className="text-base sm:text-lg font-black text-foreground flex items-center gap-2 flex-wrap">
          {match.status === "finished" ? (
            <Pencil className="h-4 w-4 text-primary" />
          ) : (
            <ClipboardCheck className="h-4 w-4 text-amber-500" />
          )}
          <span>
            {match.status === "finished"
              ? "Editar Partida & Finishes"
              : "Registrar Resultado & Finishes"}
          </span>
          <Badge variant="outline" className="text-[10px] font-bold">
            {MATCH_STAGE_LABELS[match.stage]} •{" "}
            {match.bracket_label || `Mesa ${match.match_number}`}
          </Badge>
        </DialogTitle>
        <p className="text-xs text-muted-foreground">
          {p1Nick} vs {p2Nick} • Meta oficial da batalha: {match.target_score} pts
        </p>
      </DialogHeader>

      <form onSubmit={handleSubmit} className="space-y-4">
        {tournamentStatus === "finished" && (
          <div className="rounded-lg border border-amber-500/45 bg-amber-500/10 p-3 text-xs text-amber-500 flex items-start gap-2">
            <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
            <span>
              <strong>Torneio já publicado:</strong> ao salvar qualquer edição
              aqui, os resultados oficiais do torneio e a classificação do{" "}
              <strong>Ranking da Temporada</strong> serão recalculados
              automaticamente.
            </span>
          </div>
        )}

        {errorMsg && (
          <div className="p-3 rounded-lg bg-destructive/15 border border-destructive/30 text-destructive text-xs flex items-center gap-2">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Abas de Modo de Edição */}
        <div className="grid grid-cols-3 gap-2">
          <Button
            type="button"
            size="sm"
            variant={mode === "finishes" ? "default" : "outline"}
            onClick={() => {
              setMode("finishes");
              setErrorMsg(null);
            }}
            className="text-xs font-bold gap-1.5"
          >
            <Zap className="h-3.5 w-3.5" />
            Por Finish
          </Button>
          <Button
            type="button"
            size="sm"
            variant={mode === "direct" ? "default" : "outline"}
            onClick={() => {
              setMode("direct");
              setErrorMsg(null);
            }}
            className="text-xs font-bold gap-1.5"
          >
            <Trophy className="h-3.5 w-3.5" />
            Vitória Direta
          </Button>
          <Button
            type="button"
            size="sm"
            variant={mode === "wo" ? "default" : "outline"}
            onClick={() => {
              setMode("wo");
              setErrorMsg(null);
            }}
            className="text-xs font-bold"
          >
            W.O. ({match.target_score} × 0)
          </Button>
        </div>

        {/* MODO 1: SELEÇÃO DE PONTUAÇÃO POR FINISH */}
        {mode === "finishes" && (
          <div className="space-y-4">
            {/* Placar ao Vivo calculado pelos Finishes */}
            <div className="rounded-xl border border-border/70 bg-background/60 p-3.5 flex items-center justify-between gap-3">
              <div className="min-w-0 flex-1 text-left">
                <div className="text-[10px] font-bold uppercase text-primary">
                  Blader 1
                </div>
                <div className="text-sm font-black text-foreground truncate">
                  {p1Nick}
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <span className="px-3 py-1 rounded-lg bg-primary/15 border border-primary/40 text-lg font-black text-primary tabular-nums">
                  {finishesTotals.p1Score}
                </span>
                <span className="text-xs font-bold text-muted-foreground">×</span>
                <span className="px-3 py-1 rounded-lg bg-fire-orange/15 border border-fire-orange/40 text-lg font-black text-fire-orange tabular-nums">
                  {finishesTotals.p2Score}
                </span>
              </div>

              <div className="min-w-0 flex-1 text-right">
                <div className="text-[10px] font-bold uppercase text-fire-orange">
                  Blader 2
                </div>
                <div className="text-sm font-black text-foreground truncate">
                  {p2Nick}
                </div>
              </div>
            </div>

            {/* Botões rápidos para adicionar Finish por jogador */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {[
                { id: p1Id, nick: p1Nick, tone: "primary" as const },
                { id: p2Id, nick: p2Nick, tone: "fire" as const },
              ].map((player) => (
                <div
                  key={player.id}
                  className={`rounded-xl border p-3 space-y-2 ${
                    player.tone === "primary"
                      ? "border-primary/35 bg-primary/5"
                      : "border-fire-orange/35 bg-fire-orange/5"
                  }`}
                >
                  <div className="text-[11px] font-black text-foreground truncate">
                    + Ponto para {player.nick}
                  </div>
                  <div className="grid grid-cols-2 gap-1.5">
                    {BX_FINISH_OPTIONS.map((opt) => (
                      <Button
                        key={opt.type}
                        type="button"
                        size="xs"
                        variant="outline"
                        disabled={saving}
                        onClick={() => handleAddFinish(player.id, opt.type)}
                        className="h-8 justify-between text-[11px] font-bold px-2.5"
                      >
                        <span>{opt.label}</span>
                        <span className="font-mono font-black text-primary">
                          +{opt.points}
                        </span>
                      </Button>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            {/* Lista editável de Lances (Finishes) */}
            <div className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-bold text-foreground">
                  Lances Registrados ({draftGames.length})
                </span>
                {draftGames.length > 0 && (
                  <Button
                    type="button"
                    size="xs"
                    variant="ghost"
                    disabled={saving}
                    onClick={handleClearGames}
                    className="text-[11px] text-muted-foreground hover:text-destructive gap-1"
                  >
                    <RotateCcw className="h-3 w-3" />
                    Limpar lances
                  </Button>
                )}
              </div>

              {draftGames.length === 0 ? (
                <div className="rounded-lg border border-dashed border-border/70 bg-background/30 p-4 text-center text-xs text-muted-foreground">
                  Nenhum finish adicionado. Use os botões acima para selecionar a
                  pontuação por finish desta partida.
                </div>
              ) : (
                <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
                  {draftGames.map((g, idx) => (
                    <div
                      key={g.key}
                      className="rounded-lg border border-border/55 bg-background/55 px-2.5 py-2 flex flex-wrap items-center justify-between gap-2 text-xs"
                    >
                      <div className="flex items-center gap-2 flex-wrap min-w-0">
                        <Badge
                          variant="secondary"
                          className="text-[10px] font-black px-1.5 py-0"
                        >
                          R{idx + 1}
                        </Badge>

                        <select
                          value={g.scoringPlayerId}
                          disabled={saving}
                          onChange={(e) =>
                            handleChangeGameField(g.key, {
                              scoringPlayerId: e.target.value,
                            })
                          }
                          className="h-7 rounded border border-input bg-background px-2 text-[11px] font-semibold"
                        >
                          <option value={p1Id}>{p1Nick}</option>
                          <option value={p2Id}>{p2Nick}</option>
                        </select>

                        <select
                          value={g.finishType}
                          disabled={saving}
                          onChange={(e) =>
                            handleChangeGameField(g.key, {
                              finishType: e.target.value as EditableFinishType,
                            })
                          }
                          className="h-7 rounded border border-input bg-background px-2 text-[11px] font-semibold"
                        >
                          {BX_FINISH_OPTIONS.map((opt) => (
                            <option key={opt.type} value={opt.type}>
                              {opt.fullLabel} (+{opt.points})
                            </option>
                          ))}
                        </select>

                        <Badge
                          variant="outline"
                          className={`text-[10px] font-black px-1.5 py-0 ${
                            FINISH_SHORT_BADGE_CLASSES[g.finishType]
                          }`}
                        >
                          +{FINISH_POINTS[g.finishType]} pts
                        </Badge>
                      </div>

                      <Button
                        type="button"
                        size="xs"
                        variant="ghost"
                        disabled={saving}
                        onClick={() => handleRemoveGame(g.key)}
                        className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                        title="Remover lance"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {finishesTiedOrMismatched && (
              <div className="rounded-lg border border-amber-500/45 bg-amber-500/10 p-2.5 text-[11px] text-amber-500 flex items-center gap-2">
                <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                <span>
                  A soma atual ({finishesTotals.p1Score} × {finishesTotals.p2Score})
                  não dá vitória ao vencedor selecionado. Adicione/edite um finish
                  ou selecione o vencedor correto abaixo.
                </span>
              </div>
            )}
          </div>
        )}

        {/* MODO 2: PLACAR DIRETO */}
        {mode === "direct" && (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label
                  htmlFor="edit-p1-score"
                  className="text-xs font-semibold truncate block"
                >
                  Pts {p1Nick}
                </Label>
                <Input
                  id="edit-p1-score"
                  type="number"
                  min={0}
                  max={20}
                  value={directP1Score}
                  onChange={(e) => setDirectP1Score(e.target.value)}
                  className="h-9 text-center font-black tabular-nums"
                />
              </div>
              <div className="space-y-1.5">
                <Label
                  htmlFor="edit-p2-score"
                  className="text-xs font-semibold truncate block"
                >
                  Pts {p2Nick}
                </Label>
                <Input
                  id="edit-p2-score"
                  type="number"
                  min={0}
                  max={20}
                  value={directP2Score}
                  onChange={(e) => setDirectP2Score(e.target.value)}
                  className="h-9 text-center font-black tabular-nums"
                />
              </div>
            </div>
            <p className="text-[11px] text-muted-foreground rounded-lg bg-muted/40 border border-border/40 p-2.5">
              Neste modo o placar é gravado diretamente sem detalhamento lance a
              lance de finishes (lances anteriores da partida serão limpos).
            </p>
          </div>
        )}

        {/* SELEÇÃO EXPLÍCITA DE VITÓRIA (VENCEDOR) */}
        <div className="space-y-1.5 pt-1 border-t border-border/50">
          <Label className="text-xs font-bold flex items-center gap-1.5">
            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
            Vitória da Partida (Blader Vencedor) *
          </Label>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => handleSelectDirectWinner(p1Id)}
              className={`p-3 rounded-xl border text-left transition-all ${
                winnerId === p1Id
                  ? "border-primary bg-primary/15 ring-1 ring-primary"
                  : "border-border/60 bg-background/50 hover:bg-muted/40"
              }`}
            >
              <div className="text-[10px] font-bold uppercase text-muted-foreground">
                Vitória Blader 1
              </div>
              <div className="text-sm font-black text-foreground truncate">
                {p1Nick}
              </div>
            </button>

            <button
              type="button"
              onClick={() => handleSelectDirectWinner(p2Id)}
              className={`p-3 rounded-xl border text-left transition-all ${
                winnerId === p2Id
                  ? "border-fire-orange bg-fire-orange/15 ring-1 ring-fire-orange"
                  : "border-border/60 bg-background/50 hover:bg-muted/40"
              }`}
            >
              <div className="text-[10px] font-bold uppercase text-muted-foreground">
                Vitória Blader 2
              </div>
              <div className="text-sm font-black text-foreground truncate">
                {p2Nick}
              </div>
            </button>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 pt-2 border-t border-border/40">
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
              saving ||
              !winnerId ||
              (mode === "finishes" &&
                (draftGames.length === 0 || finishesTiedOrMismatched))
            }
            className="bg-emerald-600 hover:bg-emerald-600/90 text-white font-bold text-xs gap-1.5"
          >
            {saving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            {match.status === "finished"
              ? "Salvar Alterações da Partida"
              : "Confirmar Resultado"}
          </Button>
        </div>
      </form>
    </DialogContent>
  );
}

export function MatchEditorDialog({
  open,
  onOpenChange,
  match,
  ...rest
}: MatchEditorDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {open && match && (
        <MatchEditorDialogBody
          key={match.id}
          onOpenChange={onOpenChange}
          match={match}
          {...rest}
        />
      )}
    </Dialog>
  );
}
