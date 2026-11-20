"use client";

import * as React from "react";
import Image from "next/image";
import {
  Radio,
  Trophy,
  Medal,
  Swords,
  GitBranch,
  Crown,
  AlertTriangle,
  Flame,
  MapPin,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { LiveArenaCard } from "@/components/tournament/LiveArenaCard";
import { OBA_SWISS_LEADER_BONUS } from "@/lib/constants";
import { computeSwissStandings } from "@/lib/engine/tournament-engine";
import { createClient } from "@/lib/supabase/client";
import { fetchTournamentEngineSnapshot } from "@/lib/services/tournament-queries";
import {
  FINISH_TYPE_LABELS,
  MATCH_STATUS_LABELS,
  type Arena,
  type Match,
  type MatchGame,
  type Tournament,
  type TournamentParticipant,
  type TournamentResult,
} from "@/types/domain";

interface PublicTournamentLiveProps {
  initialTournament: Tournament;
  initialParticipants: TournamentParticipant[];
  initialMatches: Match[];
  initialGames: MatchGame[];
  initialArenas: Arena[];
  results: TournamentResult[];
}

type PublicTab = "top_cut" | "swiss" | "results";

function inferBracketColumnTitle(roundNum: number, roundMatches: Match[]): string {
  const labels = roundMatches.map((m) => m.bracket_label ?? "").join(" ");
  if (labels.includes("Oitavas")) return "Oitavas de Final";
  if (labels.includes("Quartas")) return "Quartas de Final";
  if (labels.includes("Semifinal")) return "Semifinais";
  if (labels.includes("Grande Final") || labels.includes("3º Lugar")) {
    return "Finais";
  }
  return `Etapa ${roundNum}`;
}

export function PublicTournamentLive({
  initialTournament,
  initialParticipants,
  initialMatches,
  initialGames,
  initialArenas,
  results,
}: PublicTournamentLiveProps) {
  const supabase = React.useMemo(() => createClient(), []);

  const [tournament, setTournament] =
    React.useState<Tournament>(initialTournament);
  const [participants, setParticipants] =
    React.useState<TournamentParticipant[]>(initialParticipants);
  const [matches, setMatches] = React.useState<Match[]>(initialMatches);
  const [games, setGames] = React.useState<MatchGame[]>(initialGames);
  const [arenas, setArenas] = React.useState<Arena[]>(initialArenas);
  const [realtimeStatus, setRealtimeStatus] = React.useState<
    "connecting" | "live" | "error"
  >("connecting");

  const matchIdsRef = React.useRef<Set<string>>(
    new Set(initialMatches.map((m) => m.id))
  );
  React.useEffect(() => {
    matchIdsRef.current = new Set(matches.map((m) => m.id));
  }, [matches]);

  React.useEffect(() => {
    const refresh = async () => {
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
      }
    };

    const channel = supabase
      .channel(`public-tournament-live-${initialTournament.id}`)
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

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [supabase, initialTournament.id]);

  const swissSummary = React.useMemo(
    () => computeSwissStandings(participants, matches, games),
    [participants, matches, games]
  );

  const topCutMatches = React.useMemo(
    () => matches.filter((m) => m.stage === "top_cut" && m.status !== "cancelled"),
    [matches]
  );

  const swissMatches = React.useMemo(
    () => matches.filter((m) => m.stage === "swiss" && m.status !== "cancelled"),
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

  const swissRounds = React.useMemo(() => {
    const rounds = Array.from(new Set(swissMatches.map((m) => m.round))).sort(
      (a, b) => a - b
    );
    return rounds;
  }, [swissMatches]);

  const [selectedSwissRound, setSelectedSwissRound] = React.useState<
    number | null
  >(null);

  const effectiveSwissRound =
    selectedSwissRound && swissRounds.includes(selectedSwissRound)
      ? selectedSwissRound
      : swissRounds[swissRounds.length - 1] ?? null;

  const visibleSwissMatches = React.useMemo(() => {
    if (!effectiveSwissRound) return [];
    return swissMatches.filter((m) => m.round === effectiveSwissRound);
  }, [swissMatches, effectiveSwissRound]);

  const sortedArenas = React.useMemo(() => {
    return [...arenas].sort((a, b) => {
      const aLive = a.status === "in_match" ? 0 : 1;
      const bLive = b.status === "in_match" ? 0 : 1;
      if (aLive !== bLive) return aLive - bLive;
      return a.display_order - b.display_order;
    });
  }, [arenas]);

  const hasTopCut = topCutMatches.length > 0;
  const hasSwiss = swissMatches.length > 0 || participants.length > 0;
  const hasResults = results.length > 0;

  const availableTabs = React.useMemo(() => {
    const tabs: Array<{ id: PublicTab; label: string }> = [];
    if (hasTopCut) tabs.push({ id: "top_cut", label: "Chave Top Cut" });
    if (hasSwiss) tabs.push({ id: "swiss", label: "Fase Suíça" });
    if (hasResults || (!hasTopCut && !hasSwiss)) {
      tabs.push({ id: "results", label: "Classificação Final" });
    }
    return tabs;
  }, [hasTopCut, hasSwiss, hasResults]);

  const [activeTab, setActiveTab] = React.useState<PublicTab>(() => {
    if (initialTournament.status === "finished" && hasResults) return "results";
    if (hasTopCut) return "top_cut";
    if (hasSwiss) return "swiss";
    return "results";
  });

  const resolvedTab = availableTabs.some((t) => t.id === activeTab)
    ? activeTab
    : availableTabs[0]?.id ?? "results";

  const supportsLeaderBonus = tournament.format !== "swiss_only";
  const topCutCutoff =
    tournament.top_cut_size ??
    (tournament.format === "swiss_top_cut" ? 8 : 0);

  const getPositionBadge = (pos: number) => {
    switch (pos) {
      case 1:
        return (
          <div className="flex items-center justify-center h-8 w-8 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/40 font-black text-sm">
            <Trophy className="h-4 w-4" />
          </div>
        );
      case 2:
        return (
          <div className="flex items-center justify-center h-8 w-8 rounded-full bg-slate-400/20 text-slate-300 border border-slate-400/40 font-black text-sm">
            <Medal className="h-4 w-4" />
          </div>
        );
      case 3:
        return (
          <div className="flex items-center justify-center h-8 w-8 rounded-full bg-amber-700/20 text-amber-600 border border-amber-700/40 font-black text-sm">
            <Medal className="h-4 w-4" />
          </div>
        );
      default:
        return (
          <div className="flex items-center justify-center h-8 w-8 rounded-full bg-muted text-muted-foreground font-bold text-xs border border-border/40">
            {pos}º
          </div>
        );
    }
  };

  return (
    <div className="space-y-8">
      {/* ─── Seção 1: Arenas em Tempo Real ───────────────────────────── */}
      {sortedArenas.length > 0 && (
        <section className="space-y-4">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Radio className="h-5 w-5 text-fire-orange" />
              <h2 className="text-xl font-black text-foreground">
                Arenas ao Vivo
              </h2>
            </div>

            {tournament.status === "ongoing" && (
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border border-border/60 bg-card/60 text-[11px] font-semibold">
                <span
                  className={`h-2 w-2 rounded-full ${
                    realtimeStatus === "live"
                      ? "bg-emerald-500 animate-pulse"
                      : realtimeStatus === "error"
                        ? "bg-destructive"
                        : "bg-amber-500"
                  }`}
                />
                <span className="text-muted-foreground">
                  {realtimeStatus === "live" ? "Tempo Real" : "Conectando..."}
                </span>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {sortedArenas.map((arena) => (
              <LiveArenaCard key={arena.id} arena={arena} />
            ))}
          </div>
        </section>
      )}

      {/* ─── Seção 2: Abas de Chaveamento / Resultados ───────────────── */}
      <section className="space-y-4">
        {availableTabs.length > 1 && (
          <div className="flex flex-wrap items-center gap-2 border-b border-border/60 pb-3">
            {availableTabs.map((tab) => {
              const Icon =
                tab.id === "top_cut"
                  ? GitBranch
                  : tab.id === "swiss"
                    ? Swords
                    : Trophy;
              return (
                <Button
                  key={tab.id}
                  type="button"
                  size="sm"
                  variant={resolvedTab === tab.id ? "default" : "outline"}
                  onClick={() => setActiveTab(tab.id)}
                  className="text-xs font-bold gap-1.5"
                >
                  <Icon className="h-3.5 w-3.5" />
                  {tab.label}
                </Button>
              );
            })}
          </div>
        )}

        {/* ─── ABA: CHAVE TOP CUT ────────────────────────────────────── */}
        {resolvedTab === "top_cut" && (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <GitBranch className="h-5 w-5 text-primary" />
              <h2 className="text-xl font-black text-foreground">
                Chaveamento Top Cut
              </h2>
            </div>

            <div className="flex gap-4 overflow-x-auto pb-3">
              {topCutColumns.map(([roundNum, colMatches]) => (
                <div
                  key={roundNum}
                  className="min-w-[260px] sm:min-w-[280px] flex-1 space-y-3"
                >
                  <div className="px-3 py-1.5 rounded-lg bg-muted/50 border border-border/50 text-xs font-black uppercase tracking-wider text-center text-muted-foreground">
                    {inferBracketColumnTitle(roundNum, colMatches)}
                  </div>

                  <div className="space-y-3">
                    {colMatches.map((m) => {
                      const isLive = m.status === "in_progress";
                      const p1Win = m.winner_id && m.winner_id === m.player1_id;
                      const p2Win = m.winner_id && m.winner_id === m.player2_id;

                      return (
                        <Card
                          key={m.id}
                          className={`overflow-hidden ${
                            isLive
                              ? "border-fire-orange/60 border-glow-fire bg-card/90"
                              : "border-border/60 bg-card/70"
                          }`}
                        >
                          <CardContent className="p-3.5 space-y-2.5">
                            <div className="flex items-center justify-between gap-2 text-[10px]">
                              <span className="font-bold uppercase tracking-wider text-muted-foreground">
                                {m.bracket_label || `Mesa ${m.match_number}`}
                              </span>

                              <div className="flex items-center gap-1.5">
                                {m.arena && (
                                  <Badge
                                    variant="outline"
                                    className="text-[10px] border-primary/40 text-primary gap-1"
                                  >
                                    <MapPin className="h-2.5 w-2.5" />
                                    {m.arena.name}
                                  </Badge>
                                )}
                                <Badge
                                  className={`text-[10px] ${
                                    isLive
                                      ? "bg-fire-orange text-slate-950 font-black animate-pulse"
                                      : m.status === "finished"
                                        ? "bg-emerald-600/20 text-emerald-500 border-emerald-500/40"
                                        : "bg-muted text-muted-foreground"
                                  }`}
                                >
                                  {MATCH_STATUS_LABELS[m.status]}
                                </Badge>
                              </div>
                            </div>

                            <div className="space-y-1.5 text-xs">
                              <div
                                className={`flex items-center justify-between gap-2 px-2.5 py-2 rounded-lg border ${
                                  p1Win
                                    ? "border-primary/50 bg-primary/10 font-black"
                                    : "border-border/40 bg-background/50"
                                }`}
                              >
                                <span
                                  className={`truncate ${
                                    m.player1
                                      ? p1Win
                                        ? "text-primary"
                                        : "text-foreground font-bold"
                                      : "text-muted-foreground italic"
                                  }`}
                                >
                                  {m.player1?.nickname ?? "A definir"}
                                </span>
                                <span className="font-black tabular-nums text-sm shrink-0">
                                  {m.player1_score}
                                </span>
                              </div>

                              <div
                                className={`flex items-center justify-between gap-2 px-2.5 py-2 rounded-lg border ${
                                  p2Win
                                    ? "border-fire-orange/50 bg-fire-orange/10 font-black"
                                    : "border-border/40 bg-background/50"
                                }`}
                              >
                                <span
                                  className={`truncate ${
                                    m.player2
                                      ? p2Win
                                        ? "text-fire-orange"
                                        : "text-foreground font-bold"
                                      : "text-muted-foreground italic"
                                  }`}
                                >
                                  {m.player2?.nickname ?? "A definir"}
                                </span>
                                <span className="font-black tabular-nums text-sm shrink-0">
                                  {m.player2_score}
                                </span>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ─── ABA: FASE SUÍÇA ───────────────────────────────────────── */}
        {resolvedTab === "swiss" && (
          <div className="space-y-6">
            {/* Confrontos por Rodada */}
            {swissRounds.length > 0 && (
              <div className="space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Swords className="h-5 w-5 text-primary" />
                    <h2 className="text-xl font-black text-foreground">
                      Confrontos da Fase Suíça
                    </h2>
                  </div>

                  <div className="flex flex-wrap items-center gap-1.5">
                    {swissRounds.map((roundNum) => (
                      <Button
                        key={roundNum}
                        type="button"
                        size="xs"
                        variant={
                          effectiveSwissRound === roundNum
                            ? "default"
                            : "outline"
                        }
                        onClick={() => setSelectedSwissRound(roundNum)}
                        className="font-bold"
                      >
                        Rodada {roundNum}
                      </Button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {visibleSwissMatches.map((m) => {
                    const isLive = m.status === "in_progress";
                    const lastGame =
                      m.games && m.games.length > 0
                        ? m.games[m.games.length - 1]
                        : null;

                    return (
                      <Card
                        key={m.id}
                        className={`border-border/60 bg-card/70 ${
                          isLive ? "border-fire-orange/50 border-glow-fire" : ""
                        }`}
                      >
                        <CardContent className="p-4 space-y-2.5">
                          <div className="flex items-center justify-between gap-2 flex-wrap">
                            <div className="flex items-center gap-1.5">
                              <Badge variant="outline" className="text-[10px]">
                                {m.bracket_label || `Mesa ${m.match_number}`}
                              </Badge>
                              {m.is_tiebreaker && (
                                <Badge className="bg-amber-500/20 text-amber-500 border-amber-500/40 text-[10px]">
                                  Desempate
                                </Badge>
                              )}
                            </div>

                            <div className="flex items-center gap-1.5">
                              {m.arena && (
                                <Badge
                                  variant="outline"
                                  className="text-[10px] border-primary/40 text-primary gap-1"
                                >
                                  <MapPin className="h-2.5 w-2.5" />
                                  {m.arena.name}
                                </Badge>
                              )}
                              <Badge
                                className={`text-[10px] ${
                                  isLive
                                    ? "bg-fire-orange text-slate-950 font-black animate-pulse"
                                    : m.status === "finished"
                                      ? "bg-emerald-600/20 text-emerald-500 border-emerald-500/40"
                                      : "bg-muted text-muted-foreground"
                                }`}
                              >
                                {m.is_bye ? "BYE" : MATCH_STATUS_LABELS[m.status]}
                              </Badge>
                            </div>
                          </div>

                          <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 text-xs sm:text-sm">
                            <span
                              className={`truncate font-bold ${
                                m.winner_id === m.player1_id
                                  ? "text-primary font-black"
                                  : "text-foreground"
                              }`}
                            >
                              {m.player1?.nickname ?? "A definir"}
                            </span>

                            {m.is_bye ? (
                              <span className="text-xs text-muted-foreground px-2">
                                Folga (+1 vit.)
                              </span>
                            ) : (
                              <span className="px-2.5 py-0.5 rounded bg-muted/70 font-black tabular-nums text-xs sm:text-sm">
                                {m.player1_score} × {m.player2_score}
                              </span>
                            )}

                            <span
                              className={`truncate text-right font-bold ${
                                m.winner_id === m.player2_id
                                  ? "text-fire-orange font-black"
                                  : "text-foreground"
                              }`}
                            >
                              {m.is_bye ? "—" : (m.player2?.nickname ?? "A definir")}
                            </span>
                          </div>

                          {isLive && lastGame && (
                            <div className="pt-1.5 border-t border-border/40 text-[11px] text-muted-foreground flex items-center gap-1.5">
                              <Flame className="h-3 w-3 text-fire-yellow shrink-0" />
                              <span className="truncate">
                                #{lastGame.round_number}:{" "}
                                <strong className="text-foreground">
                                  {lastGame.scoring_player?.nickname ?? "Blader"}
                                </strong>{" "}
                                +{lastGame.points_awarded}{" "}
                                {FINISH_TYPE_LABELS[lastGame.finish_type]}
                              </span>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Aviso de empate absoluto pela liderança */}
            {swissSummary.hasAbsoluteLeaderTie && (
              <div className="p-3.5 rounded-xl border border-amber-500/50 bg-amber-500/10 text-xs flex items-start gap-2.5">
                <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold text-foreground">
                    Empate absoluto pela liderança do Suíço:
                  </span>{" "}
                  <span className="text-muted-foreground">
                    {swissSummary.tiedLeaders
                      .map((l) => l.blader?.nickname ?? l.bladerId)
                      .join(", ")}{" "}
                    empataram em vitórias e em todos os Finishes (aguardando partida extra de desempate).
                  </span>
                </div>
              </div>
            )}

            {/* Tabela de Classificação do Suíço */}
            {swissSummary.standings.length > 0 && (
              <Card className="border-border/60 bg-card/60 overflow-hidden">
                <CardHeader className="p-4 sm:p-5 pb-2">
                  <CardTitle className="text-sm sm:text-base font-black flex flex-wrap items-center justify-between gap-2">
                    <span>Classificação da Fase Suíça (Critérios OBA)</span>
                    {supportsLeaderBonus && (
                      <span className="text-[11px] font-semibold text-muted-foreground">
                        Líder ganha +{OBA_SWISS_LEADER_BONUS} pts de bônus
                      </span>
                    )}
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0 overflow-x-auto">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-muted/40 text-muted-foreground uppercase text-[10px]">
                      <tr>
                        <th className="py-2.5 px-3">Pos</th>
                        <th className="py-2.5 px-3">Blader</th>
                        <th className="py-2.5 px-2 text-center">Vit</th>
                        <th className="py-2.5 px-2 text-center">Xtr</th>
                        <th className="py-2.5 px-2 text-center">Brs</th>
                        <th className="py-2.5 px-2 text-center">Ovr</th>
                        <th className="py-2.5 px-2 text-center">Spn</th>
                        <th className="py-2.5 px-3 text-right">Pts Suíço</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/40">
                      {swissSummary.standings.map((row) => {
                        const isLeader =
                          row.position === 1 && swissSummary.currentSwissRound > 0;
                        const inCut =
                          topCutCutoff > 0 && row.position <= topCutCutoff;

                        return (
                          <tr
                            key={row.bladerId}
                            className={`${inCut ? "bg-primary/5" : ""} ${
                              row.isDropped ? "opacity-50" : ""
                            }`}
                          >
                            <td className="py-2.5 px-3 font-black">
                              <span className="inline-flex items-center gap-1">
                                {row.position}º
                                {isLeader && supportsLeaderBonus && (
                                  <Crown className="h-3.5 w-3.5 text-fire-yellow" />
                                )}
                              </span>
                            </td>
                            <td className="py-2.5 px-3 font-bold text-foreground">
                              {row.blader?.nickname ?? row.bladerId}
                              {row.tiebreakerWins > 0 && (
                                <Badge
                                  variant="outline"
                                  className="ml-1.5 text-[9px] border-amber-500/40 text-amber-500"
                                >
                                  Líder no desempate
                                </Badge>
                              )}
                            </td>
                            <td className="py-2.5 px-2 text-center font-black">
                              {row.wins}
                            </td>
                            <td className="py-2.5 px-2 text-center font-bold text-fire-orange">
                              {row.xtremeFinishes}
                            </td>
                            <td className="py-2.5 px-2 text-center font-semibold">
                              {row.burstFinishes}
                            </td>
                            <td className="py-2.5 px-2 text-center font-semibold">
                              {row.overFinishes}
                            </td>
                            <td className="py-2.5 px-2 text-center text-muted-foreground">
                              {row.spinFinishes}
                            </td>
                            <td className="py-2.5 px-3 text-right font-black text-primary">
                              +{row.swissPoints}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {/* ─── ABA: CLASSIFICAÇÃO FINAL ──────────────────────────────── */}
        {resolvedTab === "results" && (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Trophy className="h-5 w-5 text-amber-500" />
              <h2 className="text-xl font-black text-foreground">
                Classificação Final do Torneio
              </h2>
            </div>

            {results.length === 0 ? (
              <Card className="border-dashed border-border/80 bg-card/40 p-8 text-center">
                <div className="flex flex-col items-center justify-center gap-3">
                  <Swords className="h-8 w-8 text-muted-foreground" />
                  <h3 className="font-bold text-base text-foreground">
                    {tournament.status === "ongoing"
                      ? "Chaveamento em preparação"
                      : "Resultados ainda não lançados"}
                  </h3>
                  <p className="text-xs text-muted-foreground max-w-sm">
                    {tournament.status === "ongoing"
                      ? "As partidas e colocações aparecerão aqui automaticamente assim que a primeira rodada for gerada."
                      : "Os organizadores lançarão as colocações finais e pontuações deste torneio no encerramento."}
                  </p>
                </div>
              </Card>
            ) : (
              <div className="space-y-2.5">
                {results.map((res) => {
                  const blader = res.blader;
                  return (
                    <Card
                      key={res.id}
                      className="border-border/50 bg-card/60 backdrop-blur-sm overflow-hidden"
                    >
                      <div className="p-4 flex items-center justify-between gap-4">
                        <div className="flex items-center gap-3 sm:gap-4 min-w-0">
                          <div className="shrink-0">
                            {getPositionBadge(res.final_position)}
                          </div>

                          <div className="relative h-10 w-10 rounded-full overflow-hidden border border-border/60 bg-muted shrink-0">
                            {blader?.avatar_url ? (
                              <Image
                                src={blader.avatar_url}
                                alt={blader.nickname}
                                fill
                                className="object-cover"
                              />
                            ) : (
                              <div className="h-full w-full flex items-center justify-center font-bold text-xs text-muted-foreground">
                                {blader?.nickname?.slice(0, 2).toUpperCase() ??
                                  "BX"}
                              </div>
                            )}
                          </div>

                          <div className="min-w-0">
                            <div className="font-bold text-sm sm:text-base text-foreground truncate">
                              {blader?.nickname}
                            </div>
                            <div className="text-xs text-muted-foreground truncate">
                              {blader?.name}{" "}
                              {blader?.city ? `• ${blader.city}` : ""}
                            </div>
                            {(res.swiss_wins > 0 ||
                              res.is_swiss_leader ||
                              res.podium_points > 0) && (
                              <div className="text-[11px] text-muted-foreground/90 mt-0.5 flex flex-wrap items-center gap-1.5">
                                {res.swiss_wins > 0 && (
                                  <span>
                                    {res.swiss_wins} vit. Suíço (+
                                    {res.swiss_points})
                                  </span>
                                )}
                                {res.swiss_leader_bonus > 0 && (
                                  <span className="text-fire-yellow font-semibold">
                                    • Líder (+{res.swiss_leader_bonus})
                                  </span>
                                )}
                                {res.podium_points > 0 && (
                                  <span className="text-primary font-semibold">
                                    • Pódio (+{res.podium_points})
                                  </span>
                                )}
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="bg-primary/10 border border-primary/20 rounded-xl px-3 py-1 text-right shrink-0">
                          <span className="text-sm sm:text-base font-black text-primary">
                            +{res.points_earned}
                          </span>
                          <span className="text-[10px] font-semibold text-muted-foreground ml-1">
                            pts
                          </span>
                        </div>
                      </div>
                    </Card>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </section>
    </div>
  );
}
