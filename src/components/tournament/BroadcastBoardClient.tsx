"use client";

import * as React from "react";
import Link from "next/link";
import Image from "next/image";
import {
  Radio,
  Tv,
  Swords,
  GitBranch,
  Trophy,
  Medal,
  Crown,
  Flame,
  Maximize2,
  Minimize2,
  Pause,
  Play,
  ArrowLeft,
  Clock,
  Wrench,
  MapPin,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  MATCH_POINT_OFFSET,
  OBA_SWISS_LEADER_BONUS,
} from "@/lib/constants";
import {
  computeFinalTournamentResults,
  computeSwissStandings,
} from "@/lib/engine/tournament-engine";
import { createClient } from "@/lib/supabase/client";
import { fetchTournamentEngineSnapshot } from "@/lib/services/tournament-queries";
import {
  ARENA_STATUS_LABELS,
  FINISH_TYPE_LABELS,
  MATCH_STAGE_LABELS,
  MATCH_STATUS_LABELS,
  TOURNAMENT_CATEGORY_LABELS,
  TOURNAMENT_FORMAT_LABELS,
  type Arena,
  type Match,
  type MatchGame,
  type Tournament,
  type TournamentParticipant,
  type TournamentResult,
} from "@/types/domain";

interface BroadcastBoardClientProps {
  initialTournament: Tournament;
  initialParticipants: TournamentParticipant[];
  initialMatches: Match[];
  initialGames: MatchGame[];
  initialArenas: Arena[];
  initialComboLabels?: Record<string, string>;
  results: TournamentResult[];
}

type BroadcastViewMode = "auto" | "arenas" | "bracket" | "standings";
type SidePanelType = "top_cut" | "round" | "standings";

const STANDINGS_PAGE_SIZE = 10;
const FINAL_REST_PAGE_SIZE = 9;
const EMPTY_COMBO_LABELS: Record<string, string> = {};

const SIDE_PANEL_LABELS: Record<SidePanelType, string> = {
  top_cut: "Chaveamento Top Cut",
  round: "Rodada Atual do Suíço",
  standings: "Classificação / Pódio",
};

function inferBracketColumnTitle(
  roundNum: number,
  roundMatches: Match[]
): string {
  const labels = roundMatches.map((m) => m.bracket_label ?? "").join(" ");
  if (labels.includes("Oitavas")) return "Oitavas de Final";
  if (labels.includes("Quartas")) return "Quartas de Final";
  if (labels.includes("Semifinal")) return "Semifinais";
  if (labels.includes("Grande Final") || labels.includes("3º Lugar")) {
    return "Finais";
  }
  return `Etapa ${roundNum}`;
}

export function BroadcastBoardClient({
  initialTournament,
  initialParticipants,
  initialMatches,
  initialGames,
  initialArenas,
  initialComboLabels = EMPTY_COMBO_LABELS,
  results,
}: BroadcastBoardClientProps) {
  const supabase = React.useMemo(() => createClient(), []);
  const rootRef = React.useRef<HTMLDivElement | null>(null);

  const [tournament, setTournament] =
    React.useState<Tournament>(initialTournament);
  const [participants, setParticipants] =
    React.useState<TournamentParticipant[]>(initialParticipants);
  const [matches, setMatches] = React.useState<Match[]>(initialMatches);
  const [games, setGames] = React.useState<MatchGame[]>(initialGames);
  const [arenas, setArenas] = React.useState<Arena[]>(initialArenas);
  const [comboLabels, setComboLabels] =
    React.useState<Record<string, string>>(initialComboLabels);
  const [liveResults, setLiveResults] =
    React.useState<TournamentResult[]>(results);

  const [realtimeStatus, setRealtimeStatus] = React.useState<
    "connecting" | "live" | "error"
  >("connecting");
  const [isRefreshing, setIsRefreshing] = React.useState(false);
  const [clock, setClock] = React.useState("");
  const [viewMode, setViewMode] = React.useState<BroadcastViewMode>("auto");
  const [autoPaused, setAutoPaused] = React.useState(false);
  const [rotationIndex, setRotationIndex] = React.useState(0);
  const [standingsPage, setStandingsPage] = React.useState(0);
  const [isFullscreen, setIsFullscreen] = React.useState(false);

  const refreshingRef = React.useRef(false);
  const matchIdsRef = React.useRef<Set<string>>(
    new Set(initialMatches.map((m) => m.id))
  );
  React.useEffect(() => {
    matchIdsRef.current = new Set(matches.map((m) => m.id));
  }, [matches]);

  const refresh = React.useCallback(async () => {
    if (refreshingRef.current) return;
    refreshingRef.current = true;
    setIsRefreshing(true);

    try {
      const snap = await fetchTournamentEngineSnapshot(
        supabase,
        initialTournament.id
      );
      if (!snap.schemaMissing && snap.tournament) {
        setTournament(snap.tournament);
        setParticipants(snap.participants);
        setMatches(snap.matches);
        setGames(snap.games);
        setArenas(snap.arenas);

        if (
          snap.tournament.status === "ongoing" ||
          snap.tournament.status === "finished"
        ) {
          try {
            const labelsRes = await fetch(
              `/api/torneios/${initialTournament.id}/live-combo-labels`,
              { cache: "no-store" }
            );
            if (labelsRes.ok) {
              const payload = (await labelsRes.json()) as {
                comboLabels?: Record<string, string>;
              };
              if (payload.comboLabels) {
                setComboLabels(payload.comboLabels);
              }
            }
          } catch {
            // Melhor esforço — mantém labels atuais
          }
        }

        if (snap.tournament.status === "finished") {
          const { data: resultRows } = await supabase
            .from("tournament_results")
            .select("*")
            .eq("tournament_id", initialTournament.id)
            .order("final_position", { ascending: true });

          if (resultRows && resultRows.length > 0) {
            const bladersById = new Map(
              snap.participants
                .filter((p) => p.blader)
                .map((p) => [p.blader_id, p.blader!])
            );
            const missingIds = resultRows
              .map((r) => r.blader_id)
              .filter((id) => !bladersById.has(id));

            if (missingIds.length > 0) {
              const { data: extraBladers } = await supabase
                .from("bladers")
                .select("*")
                .in("id", missingIds);
              for (const b of extraBladers ?? []) {
                bladersById.set(b.id, b);
              }
            }

            setLiveResults(
              resultRows.map((r) => ({
                ...r,
                swiss_wins: r.swiss_wins ?? 0,
                swiss_points: r.swiss_points ?? 0,
                is_swiss_leader: r.is_swiss_leader ?? false,
                swiss_leader_bonus: r.swiss_leader_bonus ?? 0,
                podium_points: r.podium_points ?? 0,
                blader: bladersById.get(r.blader_id),
              }))
            );
          }
        }
      }
    } finally {
      refreshingRef.current = false;
      setIsRefreshing(false);
    }
  }, [supabase, initialTournament.id]);

  // Relógio local em formato HH:mm sem chamar setState sincronicamente no corpo do effect
  React.useEffect(() => {
    const updateClock = () => {
      const now = new Date();
      setClock(
        now.toLocaleTimeString("pt-BR", {
          hour: "2-digit",
          minute: "2-digit",
        })
      );
    };
    const initTimer = window.setTimeout(updateClock, 0);
    const interval = window.setInterval(updateClock, 15_000);
    return () => {
      window.clearTimeout(initTimer);
      window.clearInterval(interval);
    };
  }, []);

  // Fullscreen state sync
  React.useEffect(() => {
    const handleFsChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement));
    };
    document.addEventListener("fullscreenchange", handleFsChange);
    return () => document.removeEventListener("fullscreenchange", handleFsChange);
  }, []);

  // Subscrição Realtime (apenas tabelas presentes em supabase_realtime: arenas, matches, tournament_participants, match_games)
  React.useEffect(() => {
    const channel = supabase
      .channel(`broadcast-telao-${initialTournament.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "arenas",
          filter: `tournament_id=eq.${initialTournament.id}`,
        },
        () => {
          void refresh();
        }
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "matches",
          filter: `tournament_id=eq.${initialTournament.id}`,
        },
        () => {
          void refresh();
        }
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "tournament_participants",
          filter: `tournament_id=eq.${initialTournament.id}`,
        },
        () => {
          void refresh();
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "match_games" },
        (payload) => {
          const newMatchId =
            (payload.new as { match_id?: string } | null)?.match_id ?? null;
          const oldMatchId =
            (payload.old as { match_id?: string } | null)?.match_id ?? null;
          if (
            (newMatchId && matchIdsRef.current.has(newMatchId)) ||
            (oldMatchId && matchIdsRef.current.has(oldMatchId))
          ) {
            void refresh();
          }
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

    const handleVisibilityOrOnline = () => {
      if (document.visibilityState === "visible") {
        void refresh();
      }
    };

    window.addEventListener("online", handleVisibilityOrOnline);
    document.addEventListener("visibilitychange", handleVisibilityOrOnline);

    return () => {
      window.removeEventListener("online", handleVisibilityOrOnline);
      document.removeEventListener("visibilitychange", handleVisibilityOrOnline);
      void supabase.removeChannel(channel);
    };
  }, [supabase, initialTournament.id, refresh]);

  // Fallback de polling resiliente (4s se WebSocket não estiver live; 6s como rede de segurança durante o torneio)
  React.useEffect(() => {
    if (realtimeStatus === "live" && tournament.status !== "ongoing") {
      return;
    }
    const intervalMs = realtimeStatus !== "live" ? 4000 : 6000;
    const poll = window.setInterval(() => {
      void refresh();
    }, intervalMs);
    return () => window.clearInterval(poll);
  }, [realtimeStatus, tournament.status, refresh]);

  const topCutCutoff =
    tournament.top_cut_size ??
    (tournament.format === "swiss_top_cut" ? 8 : 0);
  const supportsLeaderBonus = tournament.format !== "swiss_only";

  const swissSummary = React.useMemo(
    () =>
      computeSwissStandings(participants, matches, games, {
        format: tournament.format,
        topCutSize: topCutCutoff || null,
      }),
    [participants, matches, games, tournament.format, topCutCutoff]
  );

  const sortedArenas = React.useMemo(() => {
    return [...arenas].sort((a, b) => {
      const aLive = a.status === "in_match" ? 0 : 1;
      const bLive = b.status === "in_match" ? 0 : 1;
      if (aLive !== bLive) return aLive - bLive;
      return a.display_order - b.display_order;
    });
  }, [arenas]);

  const topCutMatches = React.useMemo(
    () => matches.filter((m) => m.stage === "top_cut" && m.status !== "cancelled"),
    [matches]
  );

  const topCutColumns = React.useMemo(() => {
    const grouped = new Map<number, Match[]>();
    for (const m of topCutMatches) {
      const arr = grouped.get(m.round) ?? [];
      arr.push(m);
      grouped.set(m.round, arr);
    }
    return Array.from(grouped.entries()).sort((a, b) => a[0] - b[0]);
  }, [topCutMatches]);

  const swissMatches = React.useMemo(
    () => matches.filter((m) => m.stage === "swiss" && m.status !== "cancelled"),
    [matches]
  );

  const latestSwissRound = React.useMemo(() => {
    if (swissMatches.length === 0) return 0;
    return Math.max(...swissMatches.map((m) => m.round));
  }, [swissMatches]);

  const currentSwissRoundMatches = React.useMemo(() => {
    if (latestSwissRound === 0) return [];
    return swissMatches.filter((m) => m.round === latestSwissRound);
  }, [swissMatches, latestSwissRound]);

  const computedFallbackResults = React.useMemo(() => {
    if (tournament.status !== "finished" || liveResults.length > 0) return [];
    return computeFinalTournamentResults(tournament, participants, matches, games);
  }, [tournament, liveResults.length, participants, matches, games]);

  const hasOfficialOrComputedResults =
    liveResults.length > 0 || computedFallbackResults.length > 0;

  const availableSidePanels = React.useMemo<SidePanelType[]>(() => {
    const panels: SidePanelType[] = [];
    if (topCutMatches.length > 0) panels.push("top_cut");
    if (currentSwissRoundMatches.length > 0) panels.push("round");
    if (swissSummary.standings.length > 0 || hasOfficialOrComputedResults) {
      panels.push("standings");
    }
    return panels;
  }, [
    topCutMatches.length,
    currentSwissRoundMatches.length,
    swissSummary.standings.length,
    hasOfficialOrComputedResults,
  ]);

  const standingsTotalPages = React.useMemo(() => {
    if (tournament.status === "finished" && hasOfficialOrComputedResults) {
      const totalCount =
        liveResults.length > 0
          ? liveResults.length
          : computedFallbackResults.length;
      const restCount = Math.max(0, totalCount - 3);
      return Math.max(1, Math.ceil(restCount / FINAL_REST_PAGE_SIZE));
    }
    return Math.max(
      1,
      Math.ceil(swissSummary.standings.length / STANDINGS_PAGE_SIZE)
    );
  }, [
    tournament.status,
    hasOfficialOrComputedResults,
    liveResults.length,
    computedFallbackResults.length,
    swissSummary.standings.length,
  ]);

  // Rotação automática a cada 15s quando em modo "auto"
  React.useEffect(() => {
    if (
      viewMode !== "auto" ||
      autoPaused ||
      availableSidePanels.length <= 1
    ) {
      return;
    }
    const timer = window.setInterval(() => {
      setRotationIndex((prev) => prev + 1);
    }, 15_000);
    return () => window.clearInterval(timer);
  }, [viewMode, autoPaused, availableSidePanels.length]);

  const activeSidePanel: SidePanelType | null = React.useMemo(() => {
    if (viewMode === "arenas") return null;
    if (viewMode === "bracket") {
      if (topCutMatches.length > 0) return "top_cut";
      if (currentSwissRoundMatches.length > 0) return "round";
      return availableSidePanels[0] ?? null;
    }
    if (viewMode === "standings") {
      return "standings";
    }
    if (availableSidePanels.length === 0) return null;
    return availableSidePanels[rotationIndex % availableSidePanels.length];
  }, [
    viewMode,
    topCutMatches.length,
    currentSwissRoundMatches.length,
    availableSidePanels,
    rotationIndex,
  ]);

  // Paginação automática suave (~8.5s) para mostrar 100% dos participantes na TV
  React.useEffect(() => {
    if (
      activeSidePanel !== "standings" ||
      standingsTotalPages <= 1 ||
      autoPaused
    ) {
      return;
    }
    const timer = window.setInterval(() => {
      setStandingsPage((prev) => (prev + 1) % standingsTotalPages);
    }, 8_500);
    return () => window.clearInterval(timer);
  }, [activeSidePanel, standingsTotalPages, autoPaused]);

  const handleToggleFullscreen = async () => {
    try {
      if (!document.fullscreenElement) {
        await (rootRef.current ?? document.documentElement).requestFullscreen();
      } else {
        await document.exitFullscreen();
      }
    } catch {
      // Alguns navegadores móveis bloqueiam Fullscreen API sem gesto suportado
    }
  };

  const liveArenasCount = sortedArenas.filter(
    (a) => a.status === "in_match" || a.current_match?.status === "in_progress"
  ).length;

  const showArenasColumn =
    viewMode === "arenas" ||
    sortedArenas.length > 0 ||
    activeSidePanel === null;
  const showSideColumn = viewMode !== "arenas" && activeSidePanel !== null;

  const renderArenaBroadcastCard = (arena: Arena, wideLayout: boolean) => {
    const match = arena.current_match;
    const isLive =
      arena.status === "in_match" || match?.status === "in_progress";
    const p1MatchPoint =
      match?.status === "in_progress" &&
      match.player1_score > 0 &&
      match.player1_score >= match.target_score - MATCH_POINT_OFFSET;
    const p2MatchPoint =
      match?.status === "in_progress" &&
      match.player2_score > 0 &&
      match.player2_score >= match.target_score - MATCH_POINT_OFFSET;
    const lastGame =
      match?.games && match.games.length > 0
        ? match.games[match.games.length - 1]
        : null;

    const lastGameScoringComboId =
      lastGame && match
        ? lastGame.scoring_player_id === match.player1_id
          ? lastGame.player1_combo_id
          : lastGame.scoring_player_id === match.player2_id
            ? lastGame.player2_combo_id
            : null
        : null;
    const lastGameComboLabel = lastGameScoringComboId
      ? (comboLabels[lastGameScoringComboId] ?? null)
      : null;

    const matchStageLabel = match
      ? match.is_tiebreaker
        ? "Desempate Liderança"
        : match.stage === "top_cut"
          ? `${MATCH_STAGE_LABELS.top_cut} • ${match.bracket_label || `Etapa ${match.round}`}`
          : `${MATCH_STAGE_LABELS.swiss} • Rodada ${match.round}`
      : null;

    return (
      <div
        key={arena.id}
        className={`rounded-2xl border p-4 xl:p-5 flex flex-col justify-between gap-3 backdrop-blur-md transition-all ${
          isLive
            ? "border-[#e96b00]/70 bg-gradient-to-br from-[#1b0e24]/95 via-[#130a1b]/95 to-[#1f1008]/90 shadow-[0_0_28px_rgba(233,107,0,0.2)]"
            : "border-white/10 bg-white/[0.04]"
        }`}
      >
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0">
            <div className="font-black text-base xl:text-lg text-white truncate">
              {arena.name}
            </div>
            {matchStageLabel && (
              <div className="text-xs font-semibold text-slate-400 truncate">
                {matchStageLabel}
              </div>
            )}
          </div>

          {isLive ? (
            <Badge className="bg-[#e96b00] text-slate-950 font-black text-xs px-2.5 py-0.5 gap-1.5 shrink-0">
              <span className="h-2 w-2 rounded-full bg-slate-950 animate-ping" />
              AO VIVO
            </Badge>
          ) : arena.status === "maintenance" ? (
            <Badge
              variant="outline"
              className="text-xs border-amber-500/40 text-amber-400 gap-1 shrink-0"
            >
              <Wrench className="h-3.5 w-3.5" />
              {ARENA_STATUS_LABELS.maintenance}
            </Badge>
          ) : (
            <Badge
              variant="outline"
              className="text-xs border-emerald-500/40 text-emerald-400 bg-emerald-500/10 shrink-0"
            >
              {ARENA_STATUS_LABELS.available}
            </Badge>
          )}
        </div>

        {match ? (
          <div className="rounded-xl border border-white/10 bg-black/40 p-3.5 xl:p-4 space-y-3">
            <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3">
              <div className="min-w-0 space-y-1">
                <div
                  className={`font-black text-[#e47aff] truncate ${
                    wideLayout
                      ? "text-2xl xl:text-3xl"
                      : "text-xl xl:text-2xl"
                  }`}
                >
                  {match.player1?.nickname ?? "Blader 1"}
                </div>
                {p1MatchPoint && (
                  <Badge className="bg-[#bd08f5]/25 text-[#eba8ff] border-[#bd08f5]/50 text-[10px] font-black animate-pulse">
                    MATCH POINT
                  </Badge>
                )}
              </div>

              <div
                className={`px-4 py-1.5 rounded-xl bg-white/[0.08] border border-white/10 font-black tabular-nums tracking-tight shrink-0 ${
                  wideLayout ? "text-5xl xl:text-6xl" : "text-4xl xl:text-5xl"
                }`}
              >
                {match.player1_score}{" "}
                <span className="text-slate-400 font-bold">×</span>{" "}
                {match.player2_score}
              </div>

              <div className="min-w-0 text-right space-y-1">
                <div
                  className={`font-black text-[#ff8e2b] truncate ${
                    wideLayout
                      ? "text-2xl xl:text-3xl"
                      : "text-xl xl:text-2xl"
                  }`}
                >
                  {match.player2?.nickname ?? "Blader 2"}
                </div>
                {p2MatchPoint && (
                  <Badge className="bg-[#e96b00]/25 text-[#ffad66] border-[#e96b00]/50 text-[10px] font-black animate-pulse">
                    MATCH POINT
                  </Badge>
                )}
              </div>
            </div>

            {/* Barras de Progresso */}
            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-center gap-1.5">
                {Array.from({ length: match.target_score }).map((_, idx) => (
                  <span
                    key={idx}
                    className={`h-2 flex-1 rounded-full ${
                      idx < match.player1_score
                        ? "bg-[#bd08f5]"
                        : "bg-white/10"
                    }`}
                  />
                ))}
              </div>
              <div className="flex items-center gap-1.5">
                {Array.from({ length: match.target_score }).map((_, idx) => (
                  <span
                    key={idx}
                    className={`h-2 flex-1 rounded-full ${
                      idx < match.player2_score
                        ? "bg-[#e96b00]"
                        : "bg-white/10"
                    }`}
                  />
                ))}
              </div>
            </div>

            {match.status === "finished" && match.winner && (
              <div className="pt-2 border-t border-white/10 space-y-1 text-center">
                <div className="flex items-center justify-center gap-2 text-sm font-black text-[#edbd03]">
                  <Trophy className="h-4 w-4" />
                  <span>Vitória de {match.winner.nickname}</span>
                </div>
                {lastGame && (
                  <div className="text-[11px] text-slate-300 truncate">
                    Último lance: {FINISH_TYPE_LABELS[lastGame.finish_type]} (+
                    {lastGame.points_awarded})
                    {lastGameComboLabel && (
                      <>
                        {" "}
                        —{" "}
                        <strong className="text-[#e89eff]">
                          {lastGameComboLabel}
                        </strong>
                      </>
                    )}
                  </div>
                )}
              </div>
            )}

            {lastGame && match.status === "in_progress" && (
              <div className="pt-2 border-t border-white/10 flex items-center justify-center gap-2 text-xs text-slate-300">
                <Flame className="h-3.5 w-3.5 text-[#edbd03] shrink-0" />
                <span className="truncate">
                  Último lance #{lastGame.round_number}:{" "}
                  <strong className="text-white">
                    {lastGame.scoring_player?.nickname ?? "Blader"}
                  </strong>{" "}
                  +{lastGame.points_awarded}{" "}
                  {FINISH_TYPE_LABELS[lastGame.finish_type]}
                  {lastGameComboLabel && (
                    <>
                      {" "}
                      —{" "}
                      <strong className="text-[#e89eff]">
                        {lastGameComboLabel}
                      </strong>
                    </>
                  )}
                </span>
              </div>
            )}
          </div>
        ) : (
          <div className="rounded-xl border border-dashed border-white/15 bg-black/25 p-5 flex items-center justify-center gap-2 text-sm text-slate-400">
            <Radio className="h-4 w-4 shrink-0 opacity-70" />
            <span>
              {arena.status === "maintenance"
                ? "Arena em manutenção"
                : "Beystadium livre aguardando próxima partida"}
            </span>
          </div>
        )}
      </div>
    );
  };

  const renderSidePanelContent = () => {
    if (activeSidePanel === "top_cut" && topCutColumns.length > 0) {
      return (
        <div className="flex gap-3 overflow-x-auto pb-2 h-full items-start">
          {topCutColumns.map(([roundNum, colMatches]) => (
            <div key={roundNum} className="min-w-[230px] flex-1 space-y-2.5">
              <div className="px-3 py-1.5 rounded-lg bg-white/[0.06] border border-white/10 text-xs font-black uppercase tracking-wider text-center text-slate-300">
                {inferBracketColumnTitle(roundNum, colMatches)}
              </div>

              <div className="space-y-2.5">
                {colMatches.map((m) => {
                  const isLive = m.status === "in_progress";
                  const p1Win = m.winner_id && m.winner_id === m.player1_id;
                  const p2Win = m.winner_id && m.winner_id === m.player2_id;

                  return (
                    <div
                      key={m.id}
                      className={`rounded-xl border p-3 space-y-2 ${
                        isLive
                          ? "border-[#e96b00]/70 bg-[#1f1008]/70 shadow-[0_0_20px_rgba(233,107,0,0.18)]"
                          : "border-white/10 bg-black/35"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2 text-[11px]">
                        <span className="font-bold uppercase tracking-wider text-slate-400 truncate">
                          {m.bracket_label || `Mesa ${m.match_number}`}
                        </span>
                        <div className="flex items-center gap-1 shrink-0">
                          {m.arena && (
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-[#bd08f5]/20 text-[#e89eff] font-semibold text-[10px]">
                              <MapPin className="h-2.5 w-2.5" />
                              {m.arena.name}
                            </span>
                          )}
                          <span
                            className={`px-1.5 py-0.5 rounded font-bold text-[10px] ${
                              isLive
                                ? "bg-[#e96b00] text-slate-950 animate-pulse"
                                : m.status === "finished"
                                  ? "bg-emerald-500/20 text-emerald-400"
                                  : "bg-white/10 text-slate-300"
                            }`}
                          >
                            {MATCH_STATUS_LABELS[m.status]}
                          </span>
                        </div>
                      </div>

                      <div className="space-y-1 text-sm">
                        <div
                          className={`flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-lg border ${
                            p1Win
                              ? "border-[#bd08f5]/60 bg-[#bd08f5]/20 font-black"
                              : "border-white/10 bg-white/[0.03]"
                          }`}
                        >
                          <span className="truncate">
                            {m.player1?.nickname ?? "A definir"}
                          </span>
                          <span className="font-black tabular-nums text-base shrink-0">
                            {m.player1_score}
                          </span>
                        </div>
                        <div
                          className={`flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-lg border ${
                            p2Win
                              ? "border-[#e96b00]/60 bg-[#e96b00]/20 font-black"
                              : "border-white/10 bg-white/[0.03]"
                          }`}
                        >
                          <span className="truncate">
                            {m.player2?.nickname ?? "A definir"}
                          </span>
                          <span className="font-black tabular-nums text-base shrink-0">
                            {m.player2_score}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      );
    }

    if (activeSidePanel === "round" && currentSwissRoundMatches.length > 0) {
      return (
        <div className="space-y-3">
          <div className="flex items-center justify-between text-xs text-slate-300">
            <span className="font-black text-sm text-white">
              Rodada {latestSwissRound} de {tournament.swiss_rounds}
            </span>
            <span>{currentSwissRoundMatches.length} confrontos</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
            {currentSwissRoundMatches.map((m) => {
              const isLive = m.status === "in_progress";
              const p1Win = m.winner_id && m.winner_id === m.player1_id;
              const p2Win = m.winner_id && m.winner_id === m.player2_id;

              return (
                <div
                  key={m.id}
                  className={`rounded-xl border p-3 space-y-2 ${
                    isLive
                      ? "border-[#e96b00]/70 bg-[#1f1008]/70"
                      : "border-white/10 bg-black/35"
                  }`}
                >
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="font-bold text-slate-400">
                      {m.bracket_label || `Mesa ${m.match_number}`}
                    </span>
                    <div className="flex items-center gap-1.5">
                      {m.arena && (
                        <span className="text-[#e89eff] font-semibold">
                          {m.arena.name}
                        </span>
                      )}
                      <span
                        className={`px-1.5 py-0.5 rounded font-bold text-[10px] ${
                          m.is_bye
                            ? "bg-white/10 text-slate-300"
                            : isLive
                              ? "bg-[#e96b00] text-slate-950 animate-pulse"
                              : m.status === "finished"
                                ? "bg-emerald-500/20 text-emerald-400"
                                : "bg-white/10 text-slate-300"
                        }`}
                      >
                        {m.is_bye ? "BYE" : MATCH_STATUS_LABELS[m.status]}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between gap-2 text-base font-black">
                    <span
                      className={`truncate flex-1 ${
                        p1Win ? "text-[#e47aff]" : "text-white"
                      }`}
                    >
                      {m.player1?.nickname ?? "A definir"}
                    </span>
                    {m.is_bye ? (
                      <span className="text-xs font-semibold text-slate-400">
                        Folga
                      </span>
                    ) : (
                      <>
                        <span className="px-2.5 py-0.5 rounded-lg bg-white/10 tabular-nums shrink-0">
                          {m.player1_score} × {m.player2_score}
                        </span>
                        <span
                          className={`truncate flex-1 text-right ${
                            p2Win ? "text-[#ff8e2b]" : "text-white"
                          }`}
                        >
                          {m.player2?.nickname ?? "A definir"}
                        </span>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      );
    }

    const safeStandingsPage =
      standingsTotalPages > 0 ? standingsPage % standingsTotalPages : 0;

    // Painel de Classificação / Pódio Final (100% dos participantes via paginação)
    if (tournament.status === "finished" && hasOfficialOrComputedResults) {
      const displayRows =
        liveResults.length > 0
          ? liveResults.map((r) => ({
              id: r.id,
              position: r.final_position,
              nickname: r.blader?.nickname ?? "Blader",
              swissWins: r.swiss_wins,
              isSwissLeader: r.is_swiss_leader,
              pointsEarned: r.points_earned,
            }))
          : computedFallbackResults.map((r) => ({
              id: r.bladerId,
              position: r.finalPosition,
              nickname: r.blader?.nickname ?? r.bladerId,
              swissWins: r.swissWins,
              isSwissLeader: r.isSwissLeader,
              pointsEarned: r.pointsEarned,
            }));

      const podiumRows = displayRows.slice(0, 3);
      const restAllRows = displayRows.slice(3);
      const restStart = safeStandingsPage * FINAL_REST_PAGE_SIZE;
      const restRows = restAllRows.slice(
        restStart,
        restStart + FINAL_REST_PAGE_SIZE
      );

      return (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {podiumRows.map((row) => (
              <div
                key={row.id}
                className={`rounded-xl border p-3.5 text-center space-y-1 ${
                  row.position === 1
                    ? "border-[#edbd03]/60 bg-[#edbd03]/10"
                    : row.position === 2
                      ? "border-slate-300/40 bg-slate-300/10"
                      : "border-amber-700/50 bg-amber-700/10"
                }`}
              >
                <div className="flex items-center justify-center gap-1.5 text-xs font-black uppercase tracking-wider">
                  {row.position === 1 ? (
                    <Trophy className="h-4 w-4 text-[#edbd03]" />
                  ) : (
                    <Medal className="h-4 w-4 text-slate-300" />
                  )}
                  <span>{row.position}º Lugar</span>
                </div>
                <div className="text-lg xl:text-xl font-black text-white truncate">
                  {row.nickname}
                </div>
                <div
                  className={`text-sm font-black tabular-nums ${
                    tournament.category === "amistoso"
                      ? "text-sky-300"
                      : "text-[#e47aff]"
                  }`}
                >
                  {tournament.category === "amistoso"
                    ? `${row.swissWins} vit. • Amistoso`
                    : `+${row.pointsEarned} pts`}
                </div>
              </div>
            ))}
          </div>

          {restAllRows.length > 0 && (
            <div className="space-y-2">
              {standingsTotalPages > 1 && (
                <div className="flex items-center justify-between text-[11px] text-slate-300 px-1">
                  <span>
                    Demais posições ({displayRows.length} participantes)
                  </span>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() =>
                        setStandingsPage(
                          (prev) =>
                            (prev - 1 + standingsTotalPages) %
                            standingsTotalPages
                        )
                      }
                      className="p-1 rounded bg-white/10 hover:bg-white/20 text-white"
                      aria-label="Página anterior"
                    >
                      <ChevronLeft className="h-3.5 w-3.5" />
                    </button>
                    <span className="font-bold tabular-nums px-1.5">
                      Pág. {safeStandingsPage + 1}/{standingsTotalPages}
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        setStandingsPage(
                          (prev) => (prev + 1) % standingsTotalPages
                        )
                      }
                      className="p-1 rounded bg-white/10 hover:bg-white/20 text-white"
                      aria-label="Próxima página"
                    >
                      <ChevronRight className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              )}

              <div className="rounded-xl border border-white/10 bg-black/35 overflow-hidden">
                <table className="w-full text-sm text-left">
                  <thead className="bg-white/[0.06] text-slate-400 uppercase text-[11px]">
                    <tr>
                      <th className="py-2 px-3">Pos</th>
                      <th className="py-2 px-3">Blader</th>
                      <th className="py-2 px-3 text-center">Vit. Suíço</th>
                      <th className="py-2 px-3 text-right">
                        {tournament.category === "amistoso"
                          ? "Modalidade"
                          : "Pontos OBA"}
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/10">
                    {restRows.map((row) => (
                      <tr key={row.id}>
                        <td className="py-2 px-3 font-black text-slate-300">
                          {row.position}º
                        </td>
                        <td className="py-2 px-3 font-bold text-white">
                          {row.nickname}
                          {row.isSwissLeader && supportsLeaderBonus && (
                            <span className="ml-2 text-[10px] px-1.5 py-0.5 rounded bg-[#edbd03]/20 text-[#edbd03] font-bold">
                              +{OBA_SWISS_LEADER_BONUS} Líder
                            </span>
                          )}
                        </td>
                        <td className="py-2 px-3 text-center tabular-nums text-slate-300">
                          {row.swissWins}
                        </td>
                        <td className="py-2 px-3 text-right font-black text-[#e47aff] tabular-nums">
                          {tournament.category === "amistoso" ? (
                            <span className="text-sky-300 text-xs">Amistoso</span>
                          ) : (
                            `+${row.pointsEarned}`
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      );
    }

    // Classificação da Fase Suíça (todos os participantes paginados, V-D e Saldo de Pontos)
    const startIdx = safeStandingsPage * STANDINGS_PAGE_SIZE;
    const visibleStandings = swissSummary.standings.slice(
      startIdx,
      startIdx + STANDINGS_PAGE_SIZE
    );

    return (
      <div className="space-y-2.5">
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-300 px-1">
          <span>
            {swissSummary.standings.length} competidor(es) na classificação
          </span>
          {standingsTotalPages > 1 && (
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() =>
                  setStandingsPage(
                    (prev) =>
                      (prev - 1 + standingsTotalPages) % standingsTotalPages
                  )
                }
                className="p-1 rounded bg-white/10 hover:bg-white/20 text-white"
                aria-label="Página anterior"
              >
                <ChevronLeft className="h-3.5 w-3.5" />
              </button>
              <span className="font-bold tabular-nums px-1.5">
                Pág. {safeStandingsPage + 1}/{standingsTotalPages}
              </span>
              <button
                type="button"
                onClick={() =>
                  setStandingsPage((prev) => (prev + 1) % standingsTotalPages)
                }
                className="p-1 rounded bg-white/10 hover:bg-white/20 text-white"
                aria-label="Próxima página"
              >
                <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </div>
          )}
        </div>

        <div className="rounded-xl border border-white/10 bg-black/35 overflow-hidden">
          <table className="w-full text-sm text-left">
            <thead className="bg-white/[0.06] text-slate-400 uppercase text-[11px]">
              <tr>
                <th className="py-2.5 px-3">Pos</th>
                <th className="py-2.5 px-3">Blader</th>
                <th className="py-2.5 px-2 text-center">V</th>
                <th className="py-2.5 px-2 text-center">D</th>
                <th className="py-2.5 px-2 text-center">Saldo</th>
                <th className="py-2.5 px-3 text-right">Pts</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/10">
              {visibleStandings.map((row) => {
                const inCutZone =
                  topCutCutoff > 0 && row.position <= topCutCutoff;
                const isLeader =
                  row.position === 1 && swissSummary.currentSwissRound > 0;
                const diffLabel =
                  row.pointDiff > 0 ? `+${row.pointDiff}` : String(row.pointDiff);

                return (
                  <tr
                    key={row.bladerId}
                    className={`${inCutZone ? "bg-[#bd08f5]/10" : ""} ${
                      topCutCutoff > 0 && row.position === topCutCutoff
                        ? "border-b-2 border-dashed border-[#edbd03]/60"
                        : ""
                    } ${row.isDropped ? "opacity-50" : ""}`}
                  >
                    <td className="py-2 px-3 font-black">
                      <span className="inline-flex items-center gap-1">
                        {row.position}º
                        {isLeader && supportsLeaderBonus && (
                          <Crown className="h-3.5 w-3.5 text-[#edbd03]" />
                        )}
                      </span>
                    </td>
                    <td className="py-2 px-3 font-bold text-white truncate max-w-[200px]">
                      {row.blader?.nickname ?? row.bladerId}
                    </td>
                    <td className="py-2 px-2 text-center font-black tabular-nums text-white">
                      {row.wins}
                    </td>
                    <td className="py-2 px-2 text-center tabular-nums text-slate-400">
                      {row.losses}
                    </td>
                    <td
                      className={`py-2 px-2 text-center font-black tabular-nums ${
                        row.pointDiff > 0
                          ? "text-emerald-400"
                          : row.pointDiff < 0
                            ? "text-rose-400"
                            : "text-slate-400"
                      }`}
                    >
                      {diffLabel}
                    </td>
                    <td className="py-2 px-3 text-right font-black text-[#e47aff] tabular-nums">
                      +{row.swissPoints}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  return (
    <div
      ref={rootRef}
      className="min-h-screen lg:h-screen lg:overflow-hidden flex flex-col bg-[#080510] text-slate-50 relative isolate"
    >
      {/* Glow temático de fundo */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_top_left,rgba(189,8,245,0.18),transparent_48%),radial-gradient(ellipse_at_bottom_right,rgba(233,107,0,0.16),transparent_48%)]"
      />

      {/* ─── Barra Superior Compacta de Transmissão ──────────────────────── */}
      <header className="border-b border-white/10 bg-black/50 backdrop-blur-md px-4 sm:px-6 py-3 flex flex-wrap items-center justify-between gap-3 shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          <div className="relative h-10 w-10 rounded-full overflow-hidden border border-[#bd08f5]/60 shrink-0">
            <Image
              src="/images/logo.jpg"
              alt="Logo OBA"
              fill
              className="object-cover"
            />
          </div>

          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="font-black text-base sm:text-xl tracking-tight text-white truncate">
                {tournament.name}
              </h1>
              <Badge
                className={`text-[10px] font-bold ${
                  tournament.category === "oficial"
                    ? "bg-[#edbd03]/20 text-[#fde047] border-[#edbd03]/45"
                    : tournament.category === "amistoso"
                      ? "bg-sky-500/20 text-sky-300 border-sky-400/45"
                      : "bg-[#bd08f5]/20 text-[#e89eff] border-[#bd08f5]/40"
                }`}
              >
                {TOURNAMENT_CATEGORY_LABELS[tournament.category ?? "semanal"]}
              </Badge>
              <Badge
                variant="outline"
                className="border-white/20 text-slate-200 text-[10px]"
              >
                {TOURNAMENT_FORMAT_LABELS[tournament.format]}
              </Badge>
              {tournament.season && (
                <Badge
                  variant="outline"
                  className="border-white/15 text-slate-300 text-[10px]"
                >
                  {tournament.season.name}
                </Badge>
              )}
            </div>
          </div>
        </div>

        {/* Status, Relógio e Controles de Exibição */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border border-white/15 bg-white/[0.05] text-[11px] font-bold">
            <span
              className={`h-2 w-2 rounded-full ${
                realtimeStatus === "live"
                  ? "bg-emerald-400 animate-pulse"
                  : realtimeStatus === "error"
                    ? "bg-red-500"
                    : "bg-amber-400"
              }`}
            />
            <span>
              {realtimeStatus === "live" ? "AO VIVO" : "Conectando..."}
            </span>
          </div>

          {clock && (
            <div className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border border-white/15 bg-white/[0.05] text-xs font-black tabular-nums text-slate-200">
              <Clock className="h-3.5 w-3.5 text-[#edbd03]" />
              {clock}
            </div>
          )}

          <div className="flex items-center gap-1 rounded-lg border border-white/15 bg-white/[0.04] p-0.5">
            {(
              [
                { id: "auto", label: "Auto" },
                { id: "arenas", label: "Arenas" },
                { id: "bracket", label: "Chaveamento" },
                { id: "standings", label: "Classificação" },
              ] as const
            ).map((opt) => (
              <Button
                key={opt.id}
                type="button"
                size="xs"
                variant={viewMode === opt.id ? "default" : "ghost"}
                onClick={() => setViewMode(opt.id)}
                className={`text-[11px] font-bold ${
                  viewMode === opt.id
                    ? "bg-[#bd08f5] text-white"
                    : "text-slate-300 hover:text-white hover:bg-white/10"
                }`}
              >
                {opt.label}
              </Button>
            ))}
          </div>

          {viewMode === "auto" && availableSidePanels.length > 1 && (
            <Button
              type="button"
              size="xs"
              variant="outline"
              onClick={() => setAutoPaused((p) => !p)}
              className="border-white/20 bg-white/[0.04] text-slate-200 hover:bg-white/10 text-[11px] gap-1"
              title={
                autoPaused
                  ? "Retomar rotação automática (15s)"
                  : "Pausar rotação automática"
              }
            >
              {autoPaused ? (
                <Play className="h-3 w-3" />
              ) : (
                <Pause className="h-3 w-3" />
              )}
              {autoPaused ? "Retomar" : "Pausar"}
            </Button>
          )}

          <Button
            type="button"
            size="xs"
            variant="outline"
            disabled={isRefreshing}
            onClick={() => void refresh()}
            className="border-white/20 bg-white/[0.04] text-slate-200 hover:bg-white/10 text-[11px] gap-1"
            title="Sincronizar agora"
          >
            <RefreshCw
              className={`h-3.5 w-3.5 ${isRefreshing ? "animate-spin" : ""}`}
            />
            <span className="hidden xl:inline">Atualizar</span>
          </Button>

          <Button
            type="button"
            size="xs"
            variant="outline"
            onClick={() => void handleToggleFullscreen()}
            className="border-white/20 bg-white/[0.04] text-slate-200 hover:bg-white/10 text-[11px] gap-1"
            title="Alternar tela cheia"
          >
            {isFullscreen ? (
              <Minimize2 className="h-3.5 w-3.5" />
            ) : (
              <Maximize2 className="h-3.5 w-3.5" />
            )}
            <span className="hidden md:inline">
              {isFullscreen ? "Sair Tela Cheia" : "Tela Cheia"}
            </span>
          </Button>

          <Link href={`/torneios/${tournament.slug}`}>
            <Button
              type="button"
              size="xs"
              variant="ghost"
              className="text-slate-400 hover:text-white hover:bg-white/10 text-[11px] gap-1"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Voltar
            </Button>
          </Link>
        </div>
      </header>

      {/* ─── Grade Principal de Broadcast (16:9 sem rolagem no desktop) ──── */}
      <main className="flex-1 min-h-0 p-4 sm:p-5 grid grid-cols-1 lg:grid-cols-12 gap-4 lg:gap-5">
        {showArenasColumn && (
          <section
            className={`min-h-0 flex flex-col gap-3 ${
              showSideColumn ? "lg:col-span-5" : "lg:col-span-12"
            }`}
          >
            <div className="flex items-center justify-between gap-2 shrink-0">
              <div className="flex items-center gap-2">
                <Radio className="h-5 w-5 text-[#e96b00]" />
                <h2 className="text-base xl:text-lg font-black uppercase tracking-wider text-white">
                  Arenas ao Vivo
                </h2>
              </div>
              <span className="text-xs font-bold text-slate-400">
                {liveArenasCount} ativa(s) de {sortedArenas.length}
              </span>
            </div>

            {sortedArenas.length === 0 ? (
              <div className="flex-1 rounded-2xl border border-dashed border-white/15 bg-white/[0.02] flex flex-col items-center justify-center p-8 text-center gap-2 text-slate-400">
                <Tv className="h-10 w-10 opacity-50" />
                <p className="text-sm font-bold text-slate-200">
                  Nenhuma arena cadastrada neste torneio ainda
                </p>
                <p className="text-xs">
                  Assim que as arenas forem criadas e despachadas, os placares
                  aparecerão aqui em tempo real.
                </p>
              </div>
            ) : (
              <div
                className={`min-h-0 flex-1 overflow-y-auto pr-1 grid gap-3 content-start ${
                  showSideColumn
                    ? "grid-cols-1"
                    : "grid-cols-1 md:grid-cols-2 xl:grid-cols-3"
                }`}
              >
                {sortedArenas.map((arena) =>
                  renderArenaBroadcastCard(arena, !showSideColumn)
                )}
              </div>
            )}
          </section>
        )}

        {showSideColumn && activeSidePanel && (
          <section
            className={`min-h-0 flex flex-col gap-3 ${
              showArenasColumn ? "lg:col-span-7" : "lg:col-span-12"
            }`}
          >
            <div className="flex items-center justify-between gap-2 shrink-0">
              <div className="flex items-center gap-2">
                {activeSidePanel === "top_cut" ? (
                  <GitBranch className="h-5 w-5 text-[#bd08f5]" />
                ) : activeSidePanel === "round" ? (
                  <Swords className="h-5 w-5 text-[#e96b00]" />
                ) : (
                  <Trophy className="h-5 w-5 text-[#edbd03]" />
                )}
                <h2 className="text-base xl:text-lg font-black uppercase tracking-wider text-white">
                  {SIDE_PANEL_LABELS[activeSidePanel]}
                </h2>
              </div>

              {viewMode === "auto" && availableSidePanels.length > 1 && (
                <div className="flex items-center gap-1.5">
                  {availableSidePanels.map((panel, idx) => (
                    <button
                      key={panel}
                      type="button"
                      onClick={() => setRotationIndex(idx)}
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold transition-colors ${
                        activeSidePanel === panel
                          ? "bg-[#bd08f5] text-white"
                          : "bg-white/10 text-slate-400 hover:text-white"
                      }`}
                    >
                      {panel === "top_cut"
                        ? "Top Cut"
                        : panel === "round"
                          ? "Rodada"
                          : "Ranking"}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto rounded-2xl border border-white/10 bg-white/[0.03] p-4 backdrop-blur-md">
              {renderSidePanelContent()}
            </div>
          </section>
        )}
      </main>
    </div>
  );
}
