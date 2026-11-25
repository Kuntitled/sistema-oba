"use client";

import * as React from "react";
import Link from "next/link";
import {
  ChevronLeft,
  ArrowLeftRight,
  RotateCw,
  ArrowUpRight,
  Zap,
  Flame,
  Undo2,
  RotateCcw,
  Trophy,
  CheckCircle2,
  Play,
  Swords,
  AlertCircle,
  Loader2,
  Radio,
  Unlock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ThemeToggle } from "@/components/layout/ThemeToggle";
import { QuickStartMatchDialog } from "@/components/arena/QuickStartMatchDialog";
import {
  assignExistingMatchToArenaAction,
  recordMatchGameAction,
  releaseArenaAction,
  resetMatchScoreAction,
  undoLastGameAction,
  updateArenaStatusAction,
} from "@/app/admin/arena/actions";
import { createClient } from "@/lib/supabase/client";
import { fetchArenaLiveSnapshot } from "@/lib/services/arena-queries";
import { BX_FINISH_OPTIONS, MATCH_POINT_OFFSET } from "@/lib/constants";
import {
  ARENA_STATUS_LABELS,
  FINISH_TYPE_LABELS,
  MATCH_STAGE_LABELS,
  type Arena,
  type ArenaPlayerComboOption,
  type Blader,
  type BladerRow,
  type FinishType,
  type Match,
  type MatchGame,
  type MatchGameRow,
  type MatchRow,
} from "@/types/domain";

interface RefereeScoreboardProps {
  initialArena: Arena;
  initialMatch: Match | null;
  initialGames: MatchGame[];
  initialPlayer1Combos?: ArenaPlayerComboOption[];
  initialPlayer2Combos?: ArenaPlayerComboOption[];
  pendingMatches: Match[];
  bladers: Blader[];
  canQuickStart?: boolean;
}

const FINISH_ICONS: Record<Exclude<FinishType, "draw">, React.ElementType> = {
  spin: RotateCw,
  over: ArrowUpRight,
  burst: Zap,
  xtreme: Flame,
};

function resolvePlayerById(
  playerId: string | null | undefined,
  player1?: BladerRow | null,
  player2?: BladerRow | null
): BladerRow | null {
  if (!playerId) return null;
  if (player1 && player1.id === playerId) return player1;
  if (player2 && player2.id === playerId) return player2;
  return null;
}

function getSuggestedComboId(
  combos: ArenaPlayerComboOption[],
  roundIndex: number
): string | null {
  if (combos.length === 0) return null;
  const cycleSize = Math.min(combos.length, 3);
  return combos[roundIndex % cycleSize]?.id ?? combos[0].id;
}

export function RefereeScoreboard({
  initialArena,
  initialMatch,
  initialGames,
  initialPlayer1Combos = [],
  initialPlayer2Combos = [],
  pendingMatches: initialPendingMatches,
  bladers,
  canQuickStart = true,
}: RefereeScoreboardProps) {
  const supabase = React.useMemo(() => createClient(), []);

  const [arena, setArena] = React.useState<Arena>(initialArena);
  const [match, setMatch] = React.useState<Match | null>(initialMatch);
  const [games, setGames] = React.useState<MatchGame[]>(initialGames);
  const [player1Combos, setPlayer1Combos] = React.useState<
    ArenaPlayerComboOption[]
  >(initialPlayer1Combos);
  const [player2Combos, setPlayer2Combos] = React.useState<
    ArenaPlayerComboOption[]
  >(initialPlayer2Combos);
  const [selectedP1ComboId, setSelectedP1ComboId] = React.useState<
    string | null
  >(() => getSuggestedComboId(initialPlayer1Combos, initialGames.length));
  const [selectedP2ComboId, setSelectedP2ComboId] = React.useState<
    string | null
  >(() => getSuggestedComboId(initialPlayer2Combos, initialGames.length));
  const [pendingMatches, setPendingMatches] = React.useState<Match[]>(
    initialPendingMatches
  );

  const [swappedSides, setSwappedSides] = React.useState(false);
  const [realtimeStatus, setRealtimeStatus] = React.useState<
    "connecting" | "live" | "error"
  >("connecting");
  const [pendingAction, setPendingAction] = React.useState<string | null>(null);
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null);
  const [quickStartOpen, setQuickStartOpen] = React.useState(false);
  const [resetConfirmOpen, setResetConfirmOpen] = React.useState(false);

  const submittingRef = React.useRef(false);

  const syncComboSuggestions = React.useCallback(
    (
      p1List: ArenaPlayerComboOption[],
      p2List: ArenaPlayerComboOption[],
      roundCount: number
    ) => {
      setSelectedP1ComboId(getSuggestedComboId(p1List, roundCount));
      setSelectedP2ComboId(getSuggestedComboId(p2List, roundCount));
    },
    []
  );

  const refreshArenaData = React.useCallback(async () => {
    const snapshot = await fetchArenaLiveSnapshot(supabase, initialArena.id);
    if (!snapshot.schemaMissing && snapshot.arena) {
      setArena(snapshot.arena);
      setMatch(snapshot.arena.current_match ?? null);
      setGames(snapshot.games);
      setPlayer1Combos(snapshot.player1Combos);
      setPlayer2Combos(snapshot.player2Combos);
      setPendingMatches(snapshot.pendingMatches);
      syncComboSuggestions(
        snapshot.player1Combos,
        snapshot.player2Combos,
        snapshot.games.length
      );
    }
  }, [supabase, initialArena.id, syncComboSuggestions]);

  // Canal 1: mudanças na arena e nas partidas do torneio
  React.useEffect(() => {
    const channel = supabase
      .channel(`arena-watch-${arena.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "arenas",
          filter: `id=eq.${arena.id}`,
        },
        () => {
          void refreshArenaData();
        }
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "matches",
          filter: `tournament_id=eq.${arena.tournament_id}`,
        },
        () => {
          void refreshArenaData();
        }
      )
      .subscribe((status) => {
        if (status === "SUBSCRIBED") {
          setRealtimeStatus("live");
        } else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
          setRealtimeStatus("error");
        } else {
          setRealtimeStatus("connecting");
        }
      });

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [supabase, arena.id, arena.tournament_id, refreshArenaData]);

  // Canal 2: lances (match_games) da partida atual
  const activeMatchId = match?.id ?? null;
  React.useEffect(() => {
    if (!activeMatchId) return;

    const channel = supabase
      .channel(`match-games-${activeMatchId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "match_games",
          filter: `match_id=eq.${activeMatchId}`,
        },
        () => {
          void refreshArenaData();
        }
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [supabase, activeMatchId, refreshArenaData]);

  const applyMatchSync = (
    updatedRow: MatchRow,
    updatedGamesRows: MatchGameRow[]
  ) => {
    setMatch((prev) => {
      const p1 = prev?.player1 ?? null;
      const p2 = prev?.player2 ?? null;
      const hydratedGames: MatchGame[] = updatedGamesRows.map((g) => ({
        ...g,
        scoring_player: resolvePlayerById(g.scoring_player_id, p1, p2),
      }));
      setGames(hydratedGames);
      return {
        ...updatedRow,
        player1: p1,
        player2: p2,
        winner: resolvePlayerById(updatedRow.winner_id, p1, p2),
        games: hydratedGames,
      };
    });
  };

  const triggerHaptic = () => {
    if (typeof navigator !== "undefined" && typeof navigator.vibrate === "function") {
      navigator.vibrate(25);
    }
  };

  const handleScorePoint = async (
    playerId: string | null | undefined,
    finishType: Exclude<FinishType, "draw">
  ) => {
    if (!match || !playerId || submittingRef.current) return;
    if (match.status !== "in_progress") return;

    submittingRef.current = true;
    setErrorMsg(null);
    setPendingAction(`${playerId}:${finishType}`);
    triggerHaptic();

    const res = await recordMatchGameAction(match.id, playerId, finishType, {
      player1ComboId: selectedP1ComboId,
      player2ComboId: selectedP2ComboId,
    });

    submittingRef.current = false;
    setPendingAction(null);

    if (res.error) {
      setErrorMsg(res.error);
      return;
    }

    if (res.match && res.games) {
      applyMatchSync(res.match, res.games);
      syncComboSuggestions(player1Combos, player2Combos, res.games.length);
    }
  };

  const handleUndo = async () => {
    if (!match || games.length === 0 || submittingRef.current) return;

    submittingRef.current = true;
    setErrorMsg(null);
    setPendingAction("undo");
    triggerHaptic();

    const res = await undoLastGameAction(match.id);

    submittingRef.current = false;
    setPendingAction(null);

    if (res.error) {
      setErrorMsg(res.error);
      return;
    }

    if (res.match && res.games) {
      applyMatchSync(res.match, res.games);
      syncComboSuggestions(player1Combos, player2Combos, res.games.length);
    }
  };

  const handleResetScore = async () => {
    if (!match || submittingRef.current) return;

    submittingRef.current = true;
    setErrorMsg(null);
    setPendingAction("reset");

    const res = await resetMatchScoreAction(match.id);

    submittingRef.current = false;
    setPendingAction(null);
    setResetConfirmOpen(false);

    if (res.error) {
      setErrorMsg(res.error);
      return;
    }

    if (res.match && res.games) {
      applyMatchSync(res.match, res.games);
      syncComboSuggestions(player1Combos, player2Combos, res.games.length);
    }
  };

  const handleReleaseArena = async (returnPendingIfUnfinished = false) => {
    if (submittingRef.current) return;
    submittingRef.current = true;
    setErrorMsg(null);
    setPendingAction("release");

    const res = await releaseArenaAction(arena.id, {
      returnPendingIfUnfinished,
    });

    submittingRef.current = false;
    setPendingAction(null);

    if (res.error) {
      setErrorMsg(res.error);
      return;
    }

    await refreshArenaData();
  };

  const handlePullPendingMatch = async (matchId: string) => {
    if (submittingRef.current) return;
    submittingRef.current = true;
    setErrorMsg(null);
    setPendingAction(`assign:${matchId}`);

    const res = await assignExistingMatchToArenaAction(arena.id, matchId);

    submittingRef.current = false;
    setPendingAction(null);

    if (res.error) {
      setErrorMsg(res.error);
      return;
    }

    await refreshArenaData();
  };

  const handleEnableMaintenanceExit = async () => {
    if (submittingRef.current) return;
    submittingRef.current = true;
    setErrorMsg(null);
    setPendingAction("status");
    const res = await updateArenaStatusAction(arena.id, "available");
    submittingRef.current = false;
    setPendingAction(null);
    if (res.error) {
      setErrorMsg(res.error);
      return;
    }
    await refreshArenaData();
  };

  const isBusy = pendingAction !== null;

  // Configuração parametrizada das 2 colunas (evita duplicação de JSX)
  const sides = React.useMemo(() => {
    if (!match) return [];
    const p1Side = {
      slot: "p1" as const,
      roleLabel: "Blader 1",
      player: match.player1 ?? null,
      playerId: match.player1_id,
      score: match.player1_score,
      combos: player1Combos,
      selectedComboId: selectedP1ComboId,
      onSelectCombo: (id: string | null) => setSelectedP1ComboId(id),
      accentText: "text-primary",
      accentBg: "bg-primary",
      accentSoftBg: "bg-primary/10",
      accentBorder: "border-primary/40",
      buttonBorder: "border-primary/35 hover:border-primary active:bg-primary/20",
      glowClass: "border-glow-purple",
    };
    const p2Side = {
      slot: "p2" as const,
      roleLabel: "Blader 2",
      player: match.player2 ?? null,
      playerId: match.player2_id,
      score: match.player2_score,
      combos: player2Combos,
      selectedComboId: selectedP2ComboId,
      onSelectCombo: (id: string | null) => setSelectedP2ComboId(id),
      accentText: "text-fire-orange",
      accentBg: "bg-fire-orange",
      accentSoftBg: "bg-fire-orange/10",
      accentBorder: "border-fire-orange/40",
      buttonBorder:
        "border-fire-orange/35 hover:border-fire-orange active:bg-fire-orange/20",
      glowClass: "border-glow-fire",
    };
    return swappedSides ? [p2Side, p1Side] : [p1Side, p2Side];
  }, [
    match,
    swappedSides,
    player1Combos,
    player2Combos,
    selectedP1ComboId,
    selectedP2ComboId,
  ]);

  const combosById = React.useMemo(() => {
    const map = new Map<string, ArenaPlayerComboOption>();
    for (const c of player1Combos) map.set(c.id, c);
    for (const c of player2Combos) map.set(c.id, c);
    return map;
  }, [player1Combos, player2Combos]);

  const lastGame = games.length > 0 ? games[games.length - 1] : null;
  const reversedGames = React.useMemo(() => [...games].reverse(), [games]);

  return (
    <div className="min-h-[100dvh] flex flex-col bg-background text-foreground select-none">
      {/* ─── Header Compacto Mobile-First ───────────────────────────── */}
      <header className="sticky top-0 z-30 border-b border-border/50 bg-card/85 backdrop-blur-md px-3 py-2.5 sm:px-5">
        <div className="max-w-3xl mx-auto flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <Link href="/admin/arenas" aria-label="Voltar para Arenas">
              <Button
                variant="outline"
                size="icon-sm"
                className="h-9 w-9 shrink-0 border-border/80"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
            </Link>

            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <h1 className="font-black text-sm sm:text-base text-foreground truncate">
                  {arena.name}
                </h1>
                {match && (
                  <Badge variant="outline" className="text-[10px] shrink-0">
                    {MATCH_STAGE_LABELS[match.stage]} • R{match.round}
                    {match.bracket_label ? ` • ${match.bracket_label}` : ""}
                  </Badge>
                )}
              </div>
              <p className="text-[11px] text-muted-foreground truncate">
                {arena.tournament?.name ?? "Torneio OBA"}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            {/* Indicador Realtime */}
            <div className="inline-flex items-center gap-1.5 px-2 py-1 rounded-full border border-border/60 bg-background/70 text-[10px] font-bold">
              <span
                className={`h-2 w-2 rounded-full ${
                  realtimeStatus === "live"
                    ? "bg-emerald-500 animate-pulse"
                    : realtimeStatus === "error"
                      ? "bg-destructive"
                      : "bg-amber-500"
                }`}
              />
              <span className="hidden xs:inline text-muted-foreground">
                {realtimeStatus === "live"
                  ? "AO VIVO"
                  : realtimeStatus === "error"
                    ? "Reconectando"
                    : "Conectando"}
              </span>
            </div>

            {match && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setSwappedSides((prev) => !prev)}
                title="Inverter lados esquerdo e direito"
                className="h-9 px-2.5 text-xs font-semibold gap-1 border-border/80"
              >
                <ArrowLeftRight className="h-3.5 w-3.5 text-primary" />
                <span className="hidden sm:inline">Inverter</span>
              </Button>
            )}

            <ThemeToggle />
          </div>
        </div>
      </header>

      {/* ─── Conteúdo Principal ─────────────────────────────────────── */}
      <main className="flex-1 w-full max-w-3xl mx-auto px-3 py-3 sm:px-5 sm:py-5 flex flex-col gap-3">
        {errorMsg && (
          <div className="p-3 rounded-xl bg-destructive/15 border border-destructive/40 text-destructive text-xs font-medium flex items-center gap-2">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {!match ? (
          /* ─── Estado: Arena Livre / Fila ────────────────────────── */
          <div className="flex-1 flex flex-col justify-center gap-5 py-4">
            <Card className="border-border/60 bg-card/70">
              <CardContent className="p-6 text-center space-y-4">
                <div className="mx-auto h-14 w-14 rounded-full bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-500">
                  <Radio className="h-7 w-7" />
                </div>

                <div className="space-y-1">
                  <Badge
                    variant="outline"
                    className="border-emerald-500/40 text-emerald-500 bg-emerald-500/10 text-[11px]"
                  >
                    {ARENA_STATUS_LABELS[arena.status]} • Sincronização automática ativa
                  </Badge>
                  <h2 className="text-xl font-black text-foreground pt-1">
                    {arena.status === "maintenance"
                      ? "Arena em Manutenção"
                      : "Arena Livre — Aguardando Partida"}
                  </h2>
                  <p className="text-xs sm:text-sm text-muted-foreground max-w-md mx-auto">
                    {arena.status === "maintenance"
                      ? "Ative a arena para poder iniciar ou receber novas batalhas."
                      : canQuickStart
                        ? "Puxe uma partida da fila do torneio ou inicie uma partida rápida diretamente deste aparelho."
                        : "Puxe uma partida da fila do torneio abaixo ou aguarde a mesa diretora despachar a próxima batalha."}
                  </p>
                </div>

                <div className="flex flex-wrap items-center justify-center gap-2.5 pt-2">
                  {arena.status === "maintenance" ? (
                    <Button
                      type="button"
                      disabled={isBusy}
                      onClick={() => void handleEnableMaintenanceExit()}
                      className="h-12 px-6 bg-emerald-600 hover:bg-emerald-600/90 text-white font-bold text-sm gap-2"
                    >
                      {isBusy ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <CheckCircle2 className="h-4 w-4" />
                      )}
                      Reativar Arena
                    </Button>
                  ) : (
                    canQuickStart && (
                      <Button
                        type="button"
                        onClick={() => setQuickStartOpen(true)}
                        className="h-12 px-6 bg-primary hover:bg-primary/90 text-primary-foreground font-black text-sm gap-2 shadow-lg shadow-primary/25"
                      >
                        <Swords className="h-4 w-4" />
                        Iniciar Partida Rápida nesta Arena
                      </Button>
                    )
                  )}
                </div>
              </CardContent>
            </Card>

            {arena.status !== "maintenance" && pendingMatches.length > 0 && (
              <Card className="border-border/60 bg-card/60">
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                      Fila do Torneio ({pendingMatches.length})
                    </h3>
                  </div>

                  <div className="space-y-2">
                    {pendingMatches.map((pm) => (
                      <div
                        key={pm.id}
                        className="p-3 rounded-xl border border-border/50 bg-background/60 flex items-center justify-between gap-3"
                      >
                        <div className="min-w-0 space-y-0.5">
                          <div className="text-[10px] font-semibold text-muted-foreground">
                            {MATCH_STAGE_LABELS[pm.stage]} • Rodada {pm.round}
                            {pm.bracket_label ? ` • ${pm.bracket_label}` : ""}
                          </div>
                          <div className="text-sm font-black text-foreground truncate">
                            <span className="text-primary">
                              {pm.player1?.nickname ?? "TBD"}
                            </span>{" "}
                            <span className="text-muted-foreground font-normal">
                              vs
                            </span>{" "}
                            <span className="text-fire-orange">
                              {pm.player2?.nickname ?? "TBD"}
                            </span>
                          </div>
                        </div>

                        <Button
                          type="button"
                          size="sm"
                          disabled={isBusy}
                          onClick={() => void handlePullPendingMatch(pm.id)}
                          className="h-10 px-4 bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-xs gap-1.5 shrink-0"
                        >
                          {pendingAction === `assign:${pm.id}` ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <Play className="h-3.5 w-3.5" />
                          )}
                          Puxar para Arena
                        </Button>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        ) : (
          /* ─── Estado: Partida em Andamento ou Finalizada ────────── */
          <>
            {/* Banner de Vitória Automática */}
            {match.status === "finished" && (
              <Card className="border-fire-yellow/60 border-glow-fire bg-gradient-to-r from-primary/15 via-card to-fire-orange/15">
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="h-11 w-11 rounded-full bg-fire-yellow/20 border border-fire-yellow/50 flex items-center justify-center text-fire-yellow shrink-0">
                        <Trophy className="h-5 w-5" />
                      </div>
                      <div className="min-w-0">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-fire-yellow block">
                          Partida Encerrada
                        </span>
                        <h2 className="text-lg sm:text-xl font-black text-foreground truncate">
                          Vitória de {match.winner?.nickname ?? "Vencedor"}!
                        </h2>
                        <p className="text-xs text-muted-foreground">
                          Placar final: {match.player1_score} × {match.player2_score}
                          {lastGame
                            ? ` • ${FINISH_TYPE_LABELS[lastGame.finish_type]} (+${lastGame.points_awarded})`
                            : ""}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <Button
                      type="button"
                      disabled={isBusy}
                      onClick={() => void handleReleaseArena(false)}
                      className="h-12 bg-emerald-600 hover:bg-emerald-600/90 text-white font-black text-sm gap-2 shadow-md"
                    >
                      {pendingAction === "release" ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Unlock className="h-4 w-4" />
                      )}
                      Confirmar e Liberar Arena
                    </Button>

                    <Button
                      type="button"
                      variant="outline"
                      disabled={isBusy || games.length === 0}
                      onClick={() => void handleUndo()}
                      className="h-12 border-border/80 font-bold text-xs sm:text-sm gap-2"
                    >
                      {pendingAction === "undo" ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Undo2 className="h-4 w-4" />
                      )}
                      Desfazer Último Lance
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Placar Gigante + Botões Táteis 1-Tap por Coluna */}
            <div className="grid grid-cols-2 gap-2.5 sm:gap-4">
              {sides.map((side) => {
                const isWinner =
                  match.status === "finished" &&
                  match.winner_id === side.playerId;
                const isMatchPoint =
                  match.status === "in_progress" &&
                  side.score > 0 &&
                  side.score >= match.target_score - MATCH_POINT_OFFSET;

                return (
                  <div key={side.slot} className="flex flex-col gap-2.5">
                    {/* Card do Placar do Blader */}
                    <Card
                      className={`relative overflow-hidden bg-card/80 transition-all ${
                        isWinner
                          ? `${side.accentBorder} ${side.glowClass}`
                          : isMatchPoint
                            ? `${side.accentBorder} border-2`
                            : "border-border/60"
                      }`}
                    >
                      <CardContent className="p-3 sm:p-4 text-center space-y-2">
                        <div className="flex items-center justify-between gap-1 text-[10px] font-bold uppercase tracking-wider">
                          <span className={side.accentText}>
                            {side.roleLabel}
                          </span>
                          <span className="text-muted-foreground">
                            Meta: {match.target_score}
                          </span>
                        </div>

                        <div className="font-black text-base sm:text-xl text-foreground truncate">
                          {side.player?.nickname ?? side.roleLabel}
                        </div>

                        {/* Número Gigante */}
                        <div
                          className={`text-6xl sm:text-7xl font-black tabular-nums leading-none py-1 ${side.accentText}`}
                        >
                          {side.score}
                        </div>

                        {/* Indicadores visuais de pontos até a meta */}
                        <div className="flex items-center justify-center gap-1.5 pt-1">
                          {Array.from({ length: match.target_score }).map(
                            (_, idx) => {
                              const filled = idx < side.score;
                              return (
                                <span
                                  key={idx}
                                  className={`h-2.5 flex-1 max-w-6 rounded-full transition-colors ${
                                    filled
                                      ? side.accentBg
                                      : "bg-muted/70 border border-border/50"
                                  }`}
                                />
                              );
                            }
                          )}
                        </div>

                        {/* Badge Match Point / Vencedor */}
                        <div className="min-h-5 flex items-center justify-center">
                          {isWinner ? (
                            <Badge className="bg-fire-yellow text-slate-950 font-black text-[10px] gap-1">
                              <Trophy className="h-3 w-3" />
                              VENCEDOR
                            </Badge>
                          ) : isMatchPoint ? (
                            <Badge className="bg-fire-orange text-slate-950 font-black text-[10px] animate-pulse">
                              MATCH POINT!
                            </Badge>
                          ) : null}
                        </div>
                      </CardContent>
                    </Card>

                    {/* Seletor rápido 1-toque de Combo do Round (opcional) */}
                    {side.combos.length > 0 && (
                      <div className="rounded-xl border border-border/50 bg-card/65 p-2 space-y-1.5">
                        <div className="flex items-center justify-between gap-1 px-0.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                          <span>Bey R#{games.length + 1}</span>
                          {side.selectedComboId && (
                            <button
                              type="button"
                              disabled={isBusy || match.status !== "in_progress"}
                              onClick={() => side.onSelectCombo(null)}
                              className="text-[10px] font-semibold text-muted-foreground hover:text-foreground disabled:opacity-40"
                            >
                              Limpar
                            </button>
                          )}
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-1">
                          {side.combos.map((combo) => {
                            const isSelected = side.selectedComboId === combo.id;
                            return (
                              <button
                                key={combo.id}
                                type="button"
                                title={combo.summaryText}
                                disabled={
                                  isBusy || match.status !== "in_progress"
                                }
                                onClick={() =>
                                  side.onSelectCombo(
                                    isSelected ? null : combo.id
                                  )
                                }
                                className={`min-h-[36px] px-2 py-1 rounded-lg border text-left transition-all touch-manipulation flex items-center gap-1.5 min-w-0 disabled:opacity-45 ${
                                  isSelected
                                    ? `${side.accentBorder} ${side.accentSoftBg} text-foreground font-bold`
                                    : "border-border/50 bg-background/60 text-muted-foreground hover:text-foreground"
                                }`}
                              >
                                <span
                                  className={`text-[10px] font-black shrink-0 ${
                                    isSelected ? side.accentText : "text-muted-foreground"
                                  }`}
                                >
                                  #{combo.slotNumber}
                                </span>
                                <span className="text-[11px] truncate">
                                  {combo.shortLabel}
                                </span>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* 4 Botões Táteis Beyblade X */}
                    <div className="flex flex-col gap-2">
                      {BX_FINISH_OPTIONS.map((option) => {
                        const Icon = FINISH_ICONS[option.type];
                        const isXtreme = option.type === "xtreme";
                        const isThisPending =
                          pendingAction === `${side.playerId}:${option.type}`;

                        return (
                          <button
                            key={option.type}
                            type="button"
                            disabled={
                              isBusy ||
                              match.status !== "in_progress" ||
                              !side.playerId
                            }
                            onClick={() =>
                              void handleScorePoint(side.playerId, option.type)
                            }
                            className={`w-full min-h-[68px] sm:min-h-[76px] rounded-xl border px-3 py-2.5 flex items-center justify-between gap-2 text-left transition-all touch-manipulation active:scale-[0.97] disabled:opacity-45 disabled:pointer-events-none ${
                              isXtreme
                                ? "bg-gradient-to-r from-primary/20 via-card to-fire-orange/20 border-fire-orange/50 hover:border-fire-orange shadow-sm"
                                : `bg-card/85 ${side.buttonBorder}`
                            }`}
                          >
                            <div className="flex items-center gap-2.5 min-w-0">
                              <span
                                className={`h-10 w-10 sm:h-11 sm:w-11 rounded-lg flex items-center justify-center font-black text-base sm:text-lg shrink-0 ${
                                  isXtreme
                                    ? "bg-fire-gradient text-white shadow-sm"
                                    : `${side.accentSoftBg} ${side.accentText}`
                                }`}
                              >
                                {isThisPending ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  `+${option.points}`
                                )}
                              </span>

                              <div className="min-w-0">
                                <div className="font-black text-sm sm:text-base text-foreground leading-tight">
                                  {option.label}
                                </div>
                                <div className="text-[10px] sm:text-[11px] text-muted-foreground truncate">
                                  {option.shortDesc}
                                </div>
                              </div>
                            </div>

                            <Icon
                              className={`h-4 w-4 sm:h-5 sm:w-5 shrink-0 ${
                                isXtreme ? "text-fire-yellow" : side.accentText
                              }`}
                            />
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Histórico Lance a Lance */}
            <Card className="border-border/60 bg-card/60">
              <CardContent className="p-3.5 sm:p-4 space-y-2.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold uppercase tracking-wider text-muted-foreground">
                    Histórico de Lances ({games.length})
                  </span>
                  {lastGame && (
                    <span className="text-[11px] text-muted-foreground">
                      Último: #{lastGame.round_number} •{" "}
                      {lastGame.scoring_player?.nickname ?? "Blader"}
                    </span>
                  )}
                </div>

                {reversedGames.length === 0 ? (
                  <p className="text-xs text-muted-foreground py-2 text-center">
                    Nenhum ponto registrado ainda. Toque em um Finish acima para pontuar.
                  </p>
                ) : (
                  <div className="max-h-40 overflow-y-auto space-y-1.5 pr-1">
                    {reversedGames.map((game) => {
                      const isP1 = game.scoring_player_id === match.player1_id;
                      const p1Combo = game.player1_combo_id
                        ? (combosById.get(game.player1_combo_id) ?? null)
                        : null;
                      const p2Combo = game.player2_combo_id
                        ? (combosById.get(game.player2_combo_id) ?? null)
                        : null;

                      return (
                        <div
                          key={game.id}
                          className="px-3 py-2 rounded-lg border border-border/50 bg-background/60 space-y-1 text-xs"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2 min-w-0">
                              <span className="font-mono text-[11px] font-bold text-muted-foreground">
                                #{game.round_number}
                              </span>
                              <span
                                className={`h-2 w-2 rounded-full shrink-0 ${
                                  isP1 ? "bg-primary" : "bg-fire-orange"
                                }`}
                              />
                              <span className="font-bold text-foreground truncate">
                                {game.scoring_player?.nickname ?? "Blader"}
                              </span>
                            </div>

                            <div className="flex items-center gap-1.5 shrink-0">
                              <span className="text-muted-foreground text-[11px]">
                                {FINISH_TYPE_LABELS[game.finish_type]}
                              </span>
                              <Badge
                                variant="outline"
                                className={`font-black text-[11px] ${
                                  isP1
                                    ? "border-primary/40 text-primary"
                                    : "border-fire-orange/40 text-fire-orange"
                                }`}
                              >
                                +{game.points_awarded}
                              </Badge>
                            </div>
                          </div>

                          {(p1Combo || p2Combo) && (
                            <div className="text-[10px] text-muted-foreground flex flex-wrap items-center gap-1.5 pl-6">
                              <span className="text-primary font-semibold truncate max-w-[140px]">
                                #{p1Combo?.slotNumber ?? "?"}{" "}
                                {p1Combo?.shortLabel ?? "Sem combo"}
                              </span>
                              <span>vs</span>
                              <span className="text-fire-orange font-semibold truncate max-w-[140px]">
                                #{p2Combo?.slotNumber ?? "?"}{" "}
                                {p2Combo?.shortLabel ?? "Sem combo"}
                              </span>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </>
        )}
      </main>

      {/* ─── Barra Fixa na Zona do Polegar (Bottom Control Dock) ────── */}
      {match && (
        <footer className="sticky bottom-0 z-30 border-t border-border/60 bg-card/95 backdrop-blur-md px-3 py-2.5 sm:px-5">
          <div className="max-w-3xl mx-auto flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              disabled={isBusy || games.length === 0}
              onClick={() => void handleUndo()}
              className="flex-1 h-12 rounded-xl border-border/80 font-bold text-xs sm:text-sm gap-2 justify-center"
            >
              {pendingAction === "undo" ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Undo2 className="h-4 w-4 text-amber-500" />
              )}
              <span className="truncate">
                {lastGame
                  ? `Desfazer #${lastGame.round_number} (${lastGame.scoring_player?.nickname ?? "Blader"} +${lastGame.points_awarded})`
                  : "Desfazer Último Lance"}
              </span>
            </Button>

            {games.length === 0 && match.status === "in_progress" && (
              <Button
                type="button"
                variant="outline"
                disabled={isBusy}
                onClick={() => void handleReleaseArena(true)}
                className="h-12 px-3.5 rounded-xl border-border/80 text-xs font-semibold shrink-0"
              >
                Devolver à Fila
              </Button>
            )}

            <Button
              type="button"
              variant="destructive"
              disabled={isBusy || games.length === 0}
              onClick={() => setResetConfirmOpen(true)}
              title="Reiniciar Placar (0×0)"
              className="h-12 px-3.5 rounded-xl text-xs font-bold gap-1.5 shrink-0"
            >
              <RotateCcw className="h-4 w-4" />
              <span className="hidden sm:inline">Reiniciar</span>
            </Button>
          </div>
        </footer>
      )}

      {/* Dialog Iniciar Partida Rápida */}
      {canQuickStart && (
        <QuickStartMatchDialog
          open={quickStartOpen}
          onOpenChange={setQuickStartOpen}
          arenaId={arena.id}
          arenaName={arena.name}
          tournamentId={arena.tournament_id}
          bladers={bladers}
          onStarted={() => {
            void refreshArenaData();
          }}
        />
      )}

      {/* Dialog Confirmação Reiniciar Placar */}
      <Dialog open={resetConfirmOpen} onOpenChange={setResetConfirmOpen}>
        <DialogContent className="max-w-sm bg-card border-border/80">
          <DialogHeader>
            <DialogTitle className="text-base font-black text-foreground flex items-center gap-2">
              <RotateCcw className="h-4 w-4 text-destructive" />
              Reiniciar Placar da Partida?
            </DialogTitle>
          </DialogHeader>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Todos os lances registrados nesta batalha serão apagados e o placar voltará para{" "}
            <strong className="text-foreground">0 × 0</strong>.
          </p>
          <div className="flex items-center justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setResetConfirmOpen(false)}
              className="text-xs"
            >
              Cancelar
            </Button>
            <Button
              type="button"
              variant="destructive"
              size="sm"
              disabled={isBusy}
              onClick={() => void handleResetScore()}
              className="text-xs font-bold gap-1.5"
            >
              {pendingAction === "reset" && (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              )}
              Sim, Zerar Placar
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
