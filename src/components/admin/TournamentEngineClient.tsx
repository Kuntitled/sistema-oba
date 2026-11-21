"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ChevronLeft,
  Users,
  Swords,
  GitBranch,
  Trophy,
  Play,
  Smartphone,
  AlertTriangle,
  AlertCircle,
  CheckCircle2,
  Loader2,
  Crown,
  Search,
  Radio,
  ExternalLink,
  UserMinus,
  UserCheck,
  Send,
  ClipboardCheck,
  Tv,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  ALLOWED_TOP_CUT_SIZES,
  OBA_SWISS_LEADER_BONUS,
  OBA_SWISS_WIN_POINTS,
} from "@/lib/constants";
import {
  computeFinalTournamentResults,
  computeSwissStandings,
} from "@/lib/engine/tournament-engine";
import { createClient } from "@/lib/supabase/client";
import { fetchTournamentEngineSnapshot } from "@/lib/services/tournament-queries";
import { assignExistingMatchToArenaAction } from "@/app/admin/arena/actions";
import {
  createSwissLeaderTiebreakerAction,
  finalizeAndPublishTournamentAction,
  generateNextSwissRoundAction,
  generateTopCutBracketAction,
  recordManualMatchResultAction,
  setTournamentParticipantsAction,
  toggleParticipantDropAction,
} from "@/app/admin/torneios/engine-actions";
import {
  MATCH_STATUS_LABELS,
  TOURNAMENT_CATEGORY_LABELS,
  TOURNAMENT_FORMAT_LABELS,
  TOURNAMENT_STATUS_LABELS,
  type Arena,
  type Blader,
  type Match,
  type MatchGame,
  type Tournament,
  type TournamentParticipant,
} from "@/types/domain";

interface TournamentEngineClientProps {
  initialTournament: Tournament;
  initialParticipants: TournamentParticipant[];
  initialMatches: Match[];
  initialGames: MatchGame[];
  initialArenas: Arena[];
  allBladers: Blader[];
}

type EngineTab = "participants" | "swiss" | "top_cut" | "finalize";

export function TournamentEngineClient({
  initialTournament,
  initialParticipants,
  initialMatches,
  initialGames,
  initialArenas,
  allBladers,
}: TournamentEngineClientProps) {
  const router = useRouter();
  const supabase = React.useMemo(() => createClient(), []);

  const [tournament, setTournament] = React.useState<Tournament>(initialTournament);
  const [participants, setParticipants] =
    React.useState<TournamentParticipant[]>(initialParticipants);
  const [matches, setMatches] = React.useState<Match[]>(initialMatches);
  const [games, setGames] = React.useState<MatchGame[]>(initialGames);
  const [arenas, setArenas] = React.useState<Arena[]>(initialArenas);

  const [realtimeStatus, setRealtimeStatus] = React.useState<
    "connecting" | "live" | "error"
  >("connecting");

  const [activeTab, setActiveTab] = React.useState<EngineTab>(() => {
    if (
      initialMatches.some(
        (m) => m.stage === "top_cut" && m.status !== "cancelled"
      )
    ) {
      return "top_cut";
    }
    if (initialMatches.length > 0) return "swiss";
    return "participants";
  });

  // Participants editor state
  const [selectedBladerIds, setSelectedBladerIds] = React.useState<string[]>(() =>
    initialParticipants.map((p) => p.blader_id)
  );
  const [bladerSearch, setBladerSearch] = React.useState("");

  // Tiebreaker selection state
  const [tiePlayer1Id, setTiePlayer1Id] = React.useState("");
  const [tiePlayer2Id, setTiePlayer2Id] = React.useState("");

  // Top Cut config state
  const [topCutSize, setTopCutSize] = React.useState<4 | 8 | 16>(() => {
    if (
      initialTournament.top_cut_size === 4 ||
      initialTournament.top_cut_size === 8 ||
      initialTournament.top_cut_size === 16
    ) {
      return initialTournament.top_cut_size;
    }
    return initialParticipants.length >= 16
      ? 8
      : initialParticipants.length >= 8
        ? 8
        : 4;
  });

  // Arena dispatch selection per matchId
  const [arenaChoiceByMatch, setArenaChoiceByMatch] = React.useState<
    Record<string, string>
  >({});

  const [busyAction, setBusyAction] = React.useState<string | null>(null);
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null);
  const [successMsg, setSuccessMsg] = React.useState<string | null>(null);

  // Fallback manual result / W.O. dialog state
  const [manualMatch, setManualMatch] = React.useState<Match | null>(null);
  const [manualMode, setManualMode] = React.useState<"score" | "wo">("score");
  const [manualWinnerId, setManualWinnerId] = React.useState("");
  const [manualP1Score, setManualP1Score] = React.useState("4");
  const [manualP2Score, setManualP2Score] = React.useState("0");
  const [manualError, setManualError] = React.useState<string | null>(null);

  const matchIdsRef = React.useRef<Set<string>>(
    new Set(initialMatches.map((m) => m.id))
  );
  React.useEffect(() => {
    matchIdsRef.current = new Set(matches.map((m) => m.id));
  }, [matches]);

  const refreshSnapshot = React.useCallback(async () => {
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
  }, [supabase, initialTournament.id]);

  React.useEffect(() => {
    const channel = supabase
      .channel(`tournament-engine-${initialTournament.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "matches",
          filter: `tournament_id=eq.${initialTournament.id}`,
        },
        () => {
          void refreshSnapshot();
        }
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "arenas",
          filter: `tournament_id=eq.${initialTournament.id}`,
        },
        () => {
          void refreshSnapshot();
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
          void refreshSnapshot();
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
            void refreshSnapshot();
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
  }, [supabase, initialTournament.id, refreshSnapshot]);

  const swissSummary = React.useMemo(
    () => computeSwissStandings(participants, matches, games),
    [participants, matches, games]
  );

  const swissMatchesByRound = React.useMemo(() => {
    const swiss = matches.filter(
      (m) => m.stage === "swiss" && m.status !== "cancelled"
    );
    const grouped = new Map<number, Match[]>();
    for (const m of swiss) {
      const list = grouped.get(m.round) ?? [];
      list.push(m);
      grouped.set(m.round, list);
    }
    return Array.from(grouped.entries()).sort((a, b) => b[0] - a[0]);
  }, [matches]);

  const topCutMatchesByRound = React.useMemo(() => {
    const topCut = matches.filter(
      (m) => m.stage === "top_cut" && m.status !== "cancelled"
    );
    const grouped = new Map<number, Match[]>();
    for (const m of topCut) {
      const list = grouped.get(m.round) ?? [];
      list.push(m);
      grouped.set(m.round, list);
    }
    return Array.from(grouped.entries()).sort((a, b) => a[0] - b[0]);
  }, [matches]);

  const finalPreview = React.useMemo(
    () =>
      computeFinalTournamentResults(tournament, participants, matches, games),
    [tournament, participants, matches, games]
  );

  const availableArenas = React.useMemo(
    () => arenas.filter((a) => a.status === "available" && !a.current_match_id),
    [arenas]
  );

  const filteredBladers = React.useMemo(() => {
    const term = bladerSearch.trim().toLowerCase();
    if (!term) return allBladers;
    return allBladers.filter(
      (b) =>
        b.nickname.toLowerCase().includes(term) ||
        b.name.toLowerCase().includes(term) ||
        (b.city?.toLowerCase().includes(term) ?? false)
    );
  }, [allBladers, bladerSearch]);

  const supportsTopCut = tournament.format !== "swiss_only";
  const hasTopCutMatches = topCutMatchesByRound.length > 0;
  const openMatchesCount = matches.filter(
    (m) => m.status === "pending" || m.status === "in_progress"
  ).length;

  const toggleSelectedBlader = (bladerId: string) => {
    setSelectedBladerIds((prev) =>
      prev.includes(bladerId)
        ? prev.filter((id) => id !== bladerId)
        : [...prev, bladerId]
    );
  };

  const handleSaveParticipants = async () => {
    setErrorMsg(null);
    setSuccessMsg(null);
    setBusyAction("participants");
    const res = await setTournamentParticipantsAction(
      tournament.id,
      selectedBladerIds
    );
    setBusyAction(null);
    if (res.error) {
      setErrorMsg(res.error);
      return;
    }
    setSuccessMsg("Lista de participantes atualizada.");
    await refreshSnapshot();
  };

  const handleToggleDrop = async (bladerId: string, currentDrop: boolean) => {
    setErrorMsg(null);
    setSuccessMsg(null);
    setBusyAction(`drop:${bladerId}`);
    const res = await toggleParticipantDropAction(
      tournament.id,
      bladerId,
      !currentDrop
    );
    setBusyAction(null);
    if (res.error) {
      setErrorMsg(res.error);
      return;
    }
    await refreshSnapshot();
  };

  const handleGenerateNextSwissRound = async () => {
    setErrorMsg(null);
    setSuccessMsg(null);
    setBusyAction("swiss_round");
    const res = await generateNextSwissRoundAction(tournament.id);
    setBusyAction(null);
    if (res.error) {
      setErrorMsg(res.error);
      return;
    }
    setSuccessMsg(
      `Rodada ${res.round} da Fase Suíça gerada!${
        res.hadForcedRematch
          ? " (Obs: alguns confrontos repetidos foram inevitáveis.)"
          : ""
      }`
    );
    setActiveTab("swiss");
    await refreshSnapshot();
  };

  const handleCreateTiebreaker = async () => {
    const p1 = tiePlayer1Id || swissSummary.tiedLeaders[0]?.bladerId || "";
    const p2 = tiePlayer2Id || swissSummary.tiedLeaders[1]?.bladerId || "";

    if (!p1 || !p2 || p1 === p2) {
      setErrorMsg("Selecione dois Bladers empatados diferentes para o desempate.");
      return;
    }

    setErrorMsg(null);
    setSuccessMsg(null);
    setBusyAction("tiebreaker");
    const res = await createSwissLeaderTiebreakerAction(tournament.id, p1, p2);
    setBusyAction(null);
    if (res.error) {
      setErrorMsg(res.error);
      return;
    }
    setSuccessMsg(
      "Partida extra de desempate pela liderança criada! Envie para uma arena livre."
    );
    await refreshSnapshot();
  };

  const handleGenerateTopCut = async () => {
    setErrorMsg(null);
    setSuccessMsg(null);
    setBusyAction("top_cut");
    const res = await generateTopCutBracketAction(tournament.id, topCutSize);
    setBusyAction(null);
    if (res.error) {
      setErrorMsg(res.error);
      return;
    }
    setSuccessMsg(`Chave Top ${topCutSize} gerada com sucesso!`);
    setActiveTab("top_cut");
    await refreshSnapshot();
  };

  const handleDispatchMatch = async (matchId: string) => {
    const chosenArenaId =
      arenaChoiceByMatch[matchId] || availableArenas[0]?.id || "";
    if (!chosenArenaId) {
      setErrorMsg("Nenhuma arena livre selecionada ou disponível.");
      return;
    }
    setErrorMsg(null);
    setSuccessMsg(null);
    setBusyAction(`dispatch:${matchId}`);
    const res = await assignExistingMatchToArenaAction(chosenArenaId, matchId);
    setBusyAction(null);
    if (res.error) {
      setErrorMsg(res.error);
      return;
    }
    setSuccessMsg("Partida enviada para a arena!");
    await refreshSnapshot();
  };

  const handleFinalizeTournament = async () => {
    if (
      !confirm(
        "Confirmar o encerramento oficial do torneio e publicação dos pontos no Ranking da Temporada?"
      )
    ) {
      return;
    }

    setErrorMsg(null);
    setSuccessMsg(null);
    setBusyAction("finalize");
    const res = await finalizeAndPublishTournamentAction(tournament.id);
    setBusyAction(null);
    if (res.error) {
      setErrorMsg(res.error);
      return;
    }
    setSuccessMsg(
      "Torneio encerrado e pontuação oficial OBA publicada no Ranking!"
    );
    await refreshSnapshot();
    router.refresh();
  };

  const openManualResultDialog = (m: Match) => {
    const defaultWinner =
      m.player2_id && m.player2_score > m.player1_score
        ? m.player2_id
        : m.player1_id ?? "";
    const p1IsDefault = defaultWinner === m.player1_id;

    setManualMatch(m);
    setManualMode("score");
    setManualWinnerId(defaultWinner);
    setManualP1Score(String(p1IsDefault ? m.target_score : 0));
    setManualP2Score(String(p1IsDefault ? 0 : m.target_score));
    setManualError(null);
  };

  const handleSelectManualWinner = (winnerId: string) => {
    if (!manualMatch) return;
    setManualWinnerId(winnerId);
    const p1Won = winnerId === manualMatch.player1_id;
    setManualP1Score(String(p1Won ? manualMatch.target_score : 0));
    setManualP2Score(String(p1Won ? 0 : manualMatch.target_score));
  };

  const handleConfirmManualResult = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualMatch || !manualWinnerId) return;

    setManualError(null);
    setErrorMsg(null);
    setSuccessMsg(null);
    setBusyAction(`manual:${manualMatch.id}`);

    const res = await recordManualMatchResultAction({
      matchId: manualMatch.id,
      winnerId: manualWinnerId,
      player1Score: parseInt(manualP1Score, 10) || 0,
      player2Score: parseInt(manualP2Score, 10) || 0,
      isWalkover: manualMode === "wo",
    });

    setBusyAction(null);
    if (res.error) {
      setManualError(res.error);
      return;
    }

    const winnerNick =
      manualWinnerId === manualMatch.player1_id
        ? manualMatch.player1?.nickname
        : manualMatch.player2?.nickname;

    setManualMatch(null);
    setSuccessMsg(
      manualMode === "wo"
        ? `W.O. registrado com sucesso (${winnerNick ?? "Vencedor"} avança).`
        : `Resultado registrado manualmente (${winnerNick ?? "Vencedor"} venceu).`
    );
    await refreshSnapshot();
    router.refresh();
  };

  const renderMatchCard = (match: Match) => {
    const selectedArenaId =
      arenaChoiceByMatch[match.id] || availableArenas[0]?.id || "";
    const isDispatchable =
      match.status === "pending" &&
      !match.is_bye &&
      Boolean(match.player1_id) &&
      Boolean(match.player2_id);
    const canRecordManually =
      (match.status === "pending" || match.status === "in_progress") &&
      !match.is_bye &&
      Boolean(match.player1_id) &&
      Boolean(match.player2_id);

    return (
      <div
        key={match.id}
        className={`p-3.5 rounded-xl border bg-background/60 flex flex-col md:flex-row md:items-center justify-between gap-3 ${
          match.status === "in_progress"
            ? "border-fire-orange/50 border-glow-fire"
            : "border-border/50"
        }`}
      >
        <div className="space-y-1.5 min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant="outline" className="text-[10px]">
              {match.bracket_label || `Mesa ${match.match_number}`}
            </Badge>

            {match.is_tiebreaker && (
              <Badge className="bg-amber-500/20 text-amber-500 border-amber-500/40 text-[10px]">
                Desempate (Sem +10 pts)
              </Badge>
            )}

            {match.is_bye ? (
              <Badge variant="secondary" className="text-[10px]">
                BYE (+1 vitória)
              </Badge>
            ) : (
              <Badge
                className={`text-[10px] ${
                  match.status === "in_progress"
                    ? "bg-fire-orange text-slate-950 font-bold"
                    : match.status === "finished"
                      ? "bg-emerald-600/20 text-emerald-500 border-emerald-500/40"
                      : "bg-muted text-muted-foreground"
                }`}
              >
                {MATCH_STATUS_LABELS[match.status]}
              </Badge>
            )}

            {match.arena && (
              <span className="text-[11px] font-semibold text-muted-foreground">
                • {match.arena.name}
              </span>
            )}
          </div>

          <div className="flex items-center gap-2.5 text-sm font-black">
            <span
              className={`truncate ${
                match.winner_id && match.winner_id === match.player1_id
                  ? "text-primary"
                  : "text-foreground"
              }`}
            >
              {match.player1?.nickname ?? "A definir"}
            </span>

            {match.is_bye ? (
              <span className="text-xs font-semibold text-muted-foreground">
                — Folga (BYE)
              </span>
            ) : (
              <>
                <span className="px-2 py-0.5 rounded bg-muted/70 text-xs tabular-nums shrink-0">
                  {match.player1_score} × {match.player2_score}
                </span>
                <span
                  className={`truncate ${
                    match.winner_id && match.winner_id === match.player2_id
                      ? "text-fire-orange"
                      : "text-foreground"
                  }`}
                >
                  {match.player2?.nickname ?? "A definir"}
                </span>
              </>
            )}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          {isDispatchable && (
            <>
              {availableArenas.length > 0 ? (
                <div className="flex items-center gap-1.5">
                  <select
                    value={selectedArenaId}
                    onChange={(e) =>
                      setArenaChoiceByMatch((prev) => ({
                        ...prev,
                        [match.id]: e.target.value,
                      }))
                    }
                    className="h-8 rounded-md border border-input bg-background px-2 text-xs"
                  >
                    {availableArenas.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.name}
                      </option>
                    ))}
                  </select>
                  <Button
                    type="button"
                    size="sm"
                    disabled={busyAction !== null}
                    onClick={() => void handleDispatchMatch(match.id)}
                    className="h-8 bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-semibold gap-1"
                  >
                    {busyAction === `dispatch:${match.id}` ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Send className="h-3 w-3" />
                    )}
                    Despachar
                  </Button>
                </div>
              ) : (
                <Link href="/admin/arenas">
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="h-8 text-[11px] border-amber-500/40 text-amber-500"
                  >
                    Sem arena livre
                  </Button>
                </Link>
              )}
            </>
          )}

          {match.arena_id && (
            <Link href={`/admin/arena/${match.arena_id}`}>
              <Button
                type="button"
                size="sm"
                variant={match.status === "in_progress" ? "default" : "outline"}
                className="h-8 text-xs font-semibold gap-1.5"
              >
                <Smartphone className="h-3.5 w-3.5" />
                Abrir Placar
              </Button>
            </Link>
          )}

          {canRecordManually && (
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={busyAction !== null}
              onClick={() => openManualResultDialog(match)}
              className="h-8 text-xs font-semibold gap-1.5 border-border/80"
              title="Registrar vencedor/placar manualmente ou W.O. sem usar arena"
            >
              <ClipboardCheck className="h-3.5 w-3.5 text-amber-500" />
              Resultado / W.O.
            </Button>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Navegação e Cabeçalho */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <Link
          href="/admin/torneios"
          className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground font-semibold transition-colors"
        >
          <ChevronLeft className="h-4 w-4" />
          Voltar para a lista de torneios
        </Link>

        <div className="flex flex-wrap items-center gap-2">
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
              {realtimeStatus === "live" ? "Tempo Real Ativo" : "Sincronizando..."}
            </span>
          </div>

          <Link href={`/admin/torneios/${tournament.id}/inscricoes`}>
            <Button size="sm" variant="outline" className="h-8 text-xs gap-1.5">
              <ClipboardCheck className="h-3.5 w-3.5 text-primary" />
              Inscrições
            </Button>
          </Link>

          <Link href="/admin/arenas">
            <Button size="sm" variant="outline" className="h-8 text-xs gap-1.5">
              <Radio className="h-3.5 w-3.5 text-emerald-500" />
              Gerenciar Arenas ({arenas.length})
            </Button>
          </Link>

          <Link href={`/torneios/${tournament.slug}/telao`} target="_blank">
            <Button size="sm" variant="outline" className="h-8 text-xs gap-1.5">
              <Tv className="h-3.5 w-3.5 text-fire-orange" />
              Modo Telão
            </Button>
          </Link>

          <Link href={`/torneios/${tournament.slug}`} target="_blank">
            <Button size="sm" variant="ghost" className="h-8 text-xs gap-1">
              <ExternalLink className="h-3.5 w-3.5" />
              Ver Público
            </Button>
          </Link>
        </div>
      </div>

      <Card className="border-border/60 bg-card/70">
        <CardContent className="p-5 space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="secondary" className="text-[10px]">
              {TOURNAMENT_STATUS_LABELS[tournament.status]}
            </Badge>
            <Badge
              variant="outline"
              className={`text-[10px] font-bold ${
                tournament.category === "oficial"
                  ? "border-fire-yellow/50 text-fire-yellow bg-fire-yellow/10"
                  : "border-primary/40 text-primary"
              }`}
            >
              {TOURNAMENT_CATEGORY_LABELS[tournament.category ?? "semanal"]}
            </Badge>
            <Badge variant="outline" className="text-[10px]">
              {TOURNAMENT_FORMAT_LABELS[tournament.format]}
            </Badge>
            {tournament.season && (
              <Badge variant="outline" className="text-[10px]">
                {tournament.season.name}
              </Badge>
            )}
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-foreground tracking-tight">
            {tournament.name}
          </h1>
          <p className="text-xs text-muted-foreground">
            Suíço: +{OBA_SWISS_WIN_POINTS} pts/vitória • Desempate: Extreme &gt; Burst &gt; Over &gt; Spin
            {supportsTopCut
              ? ` • Líder Suíço: +${OBA_SWISS_LEADER_BONUS} pts`
              : " • Sem bônus de liderança"}
          </p>
        </CardContent>
      </Card>

      {errorMsg && (
        <div className="p-3.5 rounded-lg bg-destructive/15 border border-destructive/30 text-destructive text-xs flex items-center gap-2">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {successMsg && (
        <div className="p-3.5 rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-emerald-500 text-xs flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Abas do Motor */}
      <div className="flex flex-wrap items-center gap-2 border-b border-border/60 pb-3">
        <Button
          type="button"
          size="sm"
          variant={activeTab === "participants" ? "default" : "outline"}
          onClick={() => setActiveTab("participants")}
          className="text-xs font-bold gap-1.5"
        >
          <Users className="h-3.5 w-3.5" />
          Participantes ({participants.length})
        </Button>

        <Button
          type="button"
          size="sm"
          variant={activeTab === "swiss" ? "default" : "outline"}
          onClick={() => setActiveTab("swiss")}
          className="text-xs font-bold gap-1.5"
        >
          <Swords className="h-3.5 w-3.5" />
          Fase Suíça (R{swissSummary.currentSwissRound})
        </Button>

        {supportsTopCut && (
          <Button
            type="button"
            size="sm"
            variant={activeTab === "top_cut" ? "default" : "outline"}
            onClick={() => setActiveTab("top_cut")}
            className="text-xs font-bold gap-1.5"
          >
            <GitBranch className="h-3.5 w-3.5" />
            Top Cut
          </Button>
        )}

        <Button
          type="button"
          size="sm"
          variant={activeTab === "finalize" ? "default" : "outline"}
          onClick={() => setActiveTab("finalize")}
          className="text-xs font-bold gap-1.5"
        >
          <Trophy className="h-3.5 w-3.5" />
          Encerrar &amp; Ranking
        </Button>
      </div>

      {/* ─── ABA 1: PARTICIPANTES ──────────────────────────────────────── */}
      {activeTab === "participants" && (
        <div className="space-y-4">
          <Card className="border-border/60 bg-card/60">
            <CardHeader className="p-5 pb-3">
              <CardTitle className="text-base font-bold flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <span>Selecionar Bladers do Torneio ({selectedBladerIds.length})</span>
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    size="xs"
                    variant="outline"
                    onClick={() =>
                      setSelectedBladerIds(allBladers.map((b) => b.id))
                    }
                  >
                    Marcar Todos
                  </Button>
                  <Button
                    type="button"
                    size="xs"
                    variant="outline"
                    onClick={() => setSelectedBladerIds([])}
                  >
                    Limpar
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    disabled={busyAction !== null}
                    onClick={() => void handleSaveParticipants()}
                    className="bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-bold gap-1.5"
                  >
                    {busyAction === "participants" && (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    )}
                    Salvar Participantes
                  </Button>
                </div>
              </CardTitle>
            </CardHeader>

            <CardContent className="p-5 pt-0 space-y-4">
              <div className="relative max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  value={bladerSearch}
                  onChange={(e) => setBladerSearch(e.target.value)}
                  placeholder="Filtrar blader..."
                  className="pl-9 h-9 text-xs"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                {filteredBladers.map((b) => {
                  const checked = selectedBladerIds.includes(b.id);
                  const participantRecord = participants.find(
                    (p) => p.blader_id === b.id
                  );

                  return (
                    <div
                      key={b.id}
                      className={`p-2.5 rounded-lg border text-xs flex items-center justify-between gap-2 transition-colors ${
                        checked
                          ? "border-primary/50 bg-primary/10"
                          : "border-border/50 bg-background/40"
                      }`}
                    >
                      <label className="flex items-center gap-2 min-w-0 flex-1 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggleSelectedBlader(b.id)}
                          className="accent-primary shrink-0"
                        />
                        <div className="min-w-0">
                          <div className="font-bold text-foreground truncate">
                            {b.nickname}
                          </div>
                          <div className="text-[10px] text-muted-foreground truncate">
                            {b.name}
                          </div>
                        </div>
                      </label>

                      {participantRecord && matches.length > 0 && (
                        <Button
                          type="button"
                          size="xs"
                          variant={
                            participantRecord.is_dropped ? "default" : "ghost"
                          }
                          disabled={busyAction !== null}
                          onClick={() =>
                            void handleToggleDrop(
                              b.id,
                              participantRecord.is_dropped
                            )
                          }
                          title={
                            participantRecord.is_dropped
                              ? "Reativar no Suíço"
                              : "Marcar desistência (Drop)"
                          }
                          className="shrink-0 text-[10px]"
                        >
                          {participantRecord.is_dropped ? (
                            <>
                              <UserCheck className="h-3 w-3" />
                              Voltar
                            </>
                          ) : (
                            <>
                              <UserMinus className="h-3 w-3 text-destructive" />
                              Drop
                            </>
                          )}
                        </Button>
                      )}
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ─── ABA 2: FASE SUÍÇA ─────────────────────────────────────────── */}
      {activeTab === "swiss" && (
        <div className="space-y-5">
          {/* Controle da Rodada */}
          <Card className="border-border/60 bg-card/60">
            <CardContent className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="space-y-0.5">
                <div className="text-sm font-black text-foreground">
                  Fase Suíça • Rodada atual: {swissSummary.currentSwissRound} /{" "}
                  {tournament.swiss_rounds}
                </div>
                <p className="text-xs text-muted-foreground">
                  {swissSummary.unfinishedSwissMatchesCount > 0
                    ? `${swissSummary.unfinishedSwissMatchesCount} partida(s) em aberto nesta rodada.`
                    : "Todas as partidas suíças estão concluídas."}
                </p>
              </div>

              <Button
                type="button"
                disabled={
                  busyAction !== null ||
                  tournament.status === "finished" ||
                  hasTopCutMatches ||
                  swissSummary.unfinishedSwissMatchesCount > 0 ||
                  swissSummary.hasPendingTiebreaker
                }
                onClick={() => void handleGenerateNextSwissRound()}
                className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-xs gap-1.5 h-10 px-4"
              >
                {busyAction === "swiss_round" ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Play className="h-4 w-4" />
                )}
                Gerar Rodada {swissSummary.currentSwissRound + 1}
              </Button>
            </CardContent>
          </Card>

          {/* Alerta de Empate Absoluto na Liderança */}
          {swissSummary.hasAbsoluteLeaderTie && (
            <Card className="border-amber-500/60 bg-amber-500/10">
              <CardContent className="p-4 sm:p-5 space-y-3">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <h3 className="font-black text-sm text-foreground">
                      Empate Absoluto pela Liderança do Suíço!
                    </h3>
                    <p className="text-xs text-muted-foreground">
                      Os seguintes Bladers empataram em vitórias e em todos os Finishes (Extreme, Burst, Over e Spin):{" "}
                      <strong className="text-foreground">
                        {swissSummary.tiedLeaders
                          .map((l) => l.blader?.nickname ?? l.bladerId)
                          .join(", ")}
                      </strong>
                      . Gere uma partida extra de desempate (não concede +10 pts no ranking).
                    </p>
                  </div>
                </div>

                {!swissSummary.hasPendingTiebreaker && (
                  <div className="flex flex-wrap items-center gap-2 pt-1">
                    <select
                      value={
                        tiePlayer1Id ||
                        swissSummary.tiedLeaders[0]?.bladerId ||
                        ""
                      }
                      onChange={(e) => setTiePlayer1Id(e.target.value)}
                      className="h-9 rounded-md border border-input bg-background px-2.5 text-xs"
                    >
                      {swissSummary.tiedLeaders.map((l) => (
                        <option key={l.bladerId} value={l.bladerId}>
                          {l.blader?.nickname}
                        </option>
                      ))}
                    </select>

                    <span className="text-xs font-bold text-muted-foreground">
                      vs
                    </span>

                    <select
                      value={
                        tiePlayer2Id ||
                        swissSummary.tiedLeaders[1]?.bladerId ||
                        ""
                      }
                      onChange={(e) => setTiePlayer2Id(e.target.value)}
                      className="h-9 rounded-md border border-input bg-background px-2.5 text-xs"
                    >
                      {swissSummary.tiedLeaders.map((l) => (
                        <option key={l.bladerId} value={l.bladerId}>
                          {l.blader?.nickname}
                        </option>
                      ))}
                    </select>

                    <Button
                      type="button"
                      size="sm"
                      disabled={busyAction !== null}
                      onClick={() => void handleCreateTiebreaker()}
                      className="h-9 bg-amber-500 hover:bg-amber-500/90 text-slate-950 font-bold text-xs gap-1.5"
                    >
                      {busyAction === "tiebreaker" && (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      )}
                      Gerar Partida Extra de Desempate
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Tabela de Classificação do Suíço (Finishes) */}
          <Card className="border-border/60 bg-card/60 overflow-hidden">
            <CardHeader className="p-4 sm:p-5 pb-2">
              <CardTitle className="text-sm sm:text-base font-black flex items-center justify-between">
                <span>Classificação da Fase Suíça (Critérios OBA)</span>
                {supportsTopCut && (
                  <span className="text-[11px] font-semibold text-muted-foreground">
                    1º lugar recebe +{OBA_SWISS_LEADER_BONUS} pts de bônus
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
                    <th className="py-2.5 px-2 text-center" title="Extreme Finish">
                      Xtr
                    </th>
                    <th className="py-2.5 px-2 text-center" title="Burst Finish">
                      Brs
                    </th>
                    <th className="py-2.5 px-2 text-center" title="Over Finish">
                      Ovr
                    </th>
                    <th className="py-2.5 px-2 text-center" title="Spin Finish">
                      Spn
                    </th>
                    <th className="py-2.5 px-3 text-right">Pts Suíço</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/40">
                  {swissSummary.standings.map((row) => {
                    const isLeader = row.position === 1 && swissSummary.currentSwissRound > 0;
                    const inCutZone =
                      supportsTopCut && row.position <= topCutSize;

                    return (
                      <tr
                        key={row.bladerId}
                        className={`${
                          inCutZone ? "bg-primary/5" : ""
                        } ${row.isDropped ? "opacity-50" : ""}`}
                      >
                        <td className="py-2.5 px-3 font-black">
                          <span className="inline-flex items-center gap-1">
                            {row.position}º
                            {isLeader && supportsTopCut && (
                              <Crown className="h-3.5 w-3.5 text-fire-yellow" />
                            )}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 font-bold text-foreground">
                          {row.blader?.nickname ?? row.bladerId}
                          {row.isDropped && (
                            <span className="ml-1.5 text-[10px] text-destructive">
                              (Drop)
                            </span>
                          )}
                          {row.tiebreakerWins > 0 && (
                            <Badge
                              variant="outline"
                              className="ml-1.5 text-[9px] border-amber-500/40 text-amber-500"
                            >
                              Desempate vencido
                            </Badge>
                          )}
                        </td>
                        <td className="py-2.5 px-2 text-center font-black text-foreground">
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

          {/* Partidas por Rodada */}
          {swissMatchesByRound.length === 0 ? (
            <Card className="border-dashed border-border/80 bg-card/40 p-8 text-center text-xs text-muted-foreground">
              Clique em <strong>Gerar Rodada 1</strong> acima após selecionar os participantes.
            </Card>
          ) : (
            <div className="space-y-4">
              {swissMatchesByRound.map(([roundNum, roundMatches]) => (
                <Card key={roundNum} className="border-border/60 bg-card/60">
                  <CardHeader className="p-4 pb-2">
                    <CardTitle className="text-sm font-black">
                      Rodada {roundNum} ({roundMatches.length} confronto(s))
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-4 pt-2 space-y-2.5">
                    {roundMatches.map((m) => renderMatchCard(m))}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ─── ABA 3: TOP CUT ────────────────────────────────────────────── */}
      {activeTab === "top_cut" && supportsTopCut && (
        <div className="space-y-5">
          {!hasTopCutMatches ? (
            <Card className="border-border/60 bg-card/60">
              <CardContent className="p-6 space-y-4">
                <div className="space-y-1">
                  <h2 className="text-base font-black text-foreground flex items-center gap-2">
                    <GitBranch className="h-5 w-5 text-primary" />
                    Gerar Chaves do Top Cut (Mata-mata)
                  </h2>
                  <p className="text-xs text-muted-foreground">
                    Avança os melhores colocados da classificação Suíça para o mata-mata com seeding oficial e Disputa de 3º Lugar.
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  <div className="flex items-center gap-2">
                    {ALLOWED_TOP_CUT_SIZES.map((size) => (
                      <Button
                        key={size}
                        type="button"
                        size="sm"
                        variant={topCutSize === size ? "default" : "outline"}
                        disabled={swissSummary.standings.length < size}
                        onClick={() => setTopCutSize(size)}
                        className="text-xs font-bold"
                      >
                        Top {size}
                      </Button>
                    ))}
                  </div>

                  <Button
                    type="button"
                    disabled={
                      busyAction !== null ||
                      swissSummary.currentSwissRound === 0 ||
                      swissSummary.unfinishedSwissMatchesCount > 0 ||
                      swissSummary.hasPendingTiebreaker ||
                      swissSummary.hasAbsoluteLeaderTie ||
                      swissSummary.standings.length < topCutSize
                    }
                    onClick={() => void handleGenerateTopCut()}
                    className="bg-emerald-600 hover:bg-emerald-600/90 text-white font-bold text-xs gap-1.5"
                  >
                    {busyAction === "top_cut" && (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    )}
                    Gerar Chave Top {topCutSize}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {topCutMatchesByRound.map(([roundNum, roundMatches]) => (
                <Card key={roundNum} className="border-border/60 bg-card/60">
                  <CardHeader className="p-4 pb-2">
                    <CardTitle className="text-sm font-black">
                      Fase Eliminatória — Etapa {roundNum}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-4 pt-2 space-y-2.5">
                    {roundMatches.map((m) => renderMatchCard(m))}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ─── ABA 4: ENCERRAR & RANKING ─────────────────────────────────── */}
      {activeTab === "finalize" && (
        <div className="space-y-5">
          <Card className="border-border/60 bg-card/60 overflow-hidden">
            <CardHeader className="p-5 pb-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <CardTitle className="text-base font-black">
                  Prévia Oficial de Pontuação OBA
                </CardTitle>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Confira o cálculo automático de vitórias no Suíço, bônus de liderança e pontos de pódio antes de publicar.
                </p>
              </div>

              <Button
                type="button"
                disabled={
                  busyAction !== null ||
                  openMatchesCount > 0 ||
                  swissSummary.currentSwissRound === 0 ||
                  swissSummary.hasAbsoluteLeaderTie ||
                  (tournament.format === "swiss_top_cut" && !hasTopCutMatches)
                }
                onClick={() => void handleFinalizeTournament()}
                className="bg-emerald-600 hover:bg-emerald-600/90 text-white font-black text-xs gap-1.5 h-10 px-5 shadow-md"
              >
                {busyAction === "finalize" ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Trophy className="h-4 w-4" />
                )}
                Encerrar Torneio e Publicar no Ranking
              </Button>
            </CardHeader>

            <CardContent className="p-0 overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-muted/40 text-muted-foreground uppercase text-[10px]">
                  <tr>
                    <th className="py-2.5 px-3">Pos</th>
                    <th className="py-2.5 px-3">Blader</th>
                    <th className="py-2.5 px-2 text-center">Vit. Suíço</th>
                    <th className="py-2.5 px-2 text-center">Pts Suíço</th>
                    <th className="py-2.5 px-2 text-center">Bônus Líder</th>
                    <th className="py-2.5 px-2 text-center">Pts Pódio</th>
                    <th className="py-2.5 px-3 text-right">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/40">
                  {finalPreview.map((item) => (
                    <tr key={item.bladerId}>
                      <td className="py-2.5 px-3 font-black">
                        {item.finalPosition}º
                      </td>
                      <td className="py-2.5 px-3 font-bold text-foreground">
                        {item.blader?.nickname ?? item.bladerId}
                      </td>
                      <td className="py-2.5 px-2 text-center">
                        {item.swissWins}
                      </td>
                      <td className="py-2.5 px-2 text-center">
                        +{item.swissPoints}
                      </td>
                      <td className="py-2.5 px-2 text-center">
                        {item.swissLeaderBonus > 0 ? (
                          <Badge className="bg-fire-yellow/20 text-fire-yellow border-fire-yellow/40 text-[10px]">
                            +{item.swissLeaderBonus}
                          </Badge>
                        ) : (
                          "—"
                        )}
                      </td>
                      <td className="py-2.5 px-2 text-center font-semibold">
                        {item.podiumPoints > 0 ? `+${item.podiumPoints}` : "—"}
                      </td>
                      <td className="py-2.5 px-3 text-right font-black text-primary">
                        +{item.pointsEarned} pts
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Modal: Fallback da Mesa Diretora (Resultado Manual / W.O.) */}
      <Dialog
        open={Boolean(manualMatch)}
        onOpenChange={(nextOpen) => {
          if (!nextOpen) {
            setManualMatch(null);
            setManualError(null);
          }
        }}
      >
        <DialogContent className="max-w-md bg-card border-border/80">
          <DialogHeader>
            <DialogTitle className="text-base font-black text-foreground flex items-center gap-2">
              <ClipboardCheck className="h-4 w-4 text-amber-500" />
              Resultado Direto / W.O. (Mesa Diretora)
            </DialogTitle>
          </DialogHeader>

          {manualMatch && (
            <form onSubmit={handleConfirmManualResult} className="space-y-4">
              <div className="flex items-center justify-between text-xs text-muted-foreground border-b border-border/40 pb-2">
                <span className="font-bold text-foreground">
                  {manualMatch.bracket_label || `Mesa ${manualMatch.match_number}`}
                </span>
                <span>Meta da partida: {manualMatch.target_score} pts</span>
              </div>

              {manualError && (
                <div className="p-3 rounded-lg bg-destructive/15 border border-destructive/30 text-destructive text-xs flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span>{manualError}</span>
                </div>
              )}

              {/* Modo: Placar Manual vs W.O. */}
              <div className="grid grid-cols-2 gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant={manualMode === "score" ? "default" : "outline"}
                  onClick={() => setManualMode("score")}
                  className="text-xs font-bold"
                >
                  Placar Manual
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant={manualMode === "wo" ? "default" : "outline"}
                  onClick={() => setManualMode("wo")}
                  className="text-xs font-bold"
                >
                  W.O. ({manualMatch.target_score} × 0)
                </Button>
              </div>

              {/* Escolha do Vencedor */}
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">
                  Selecione o Blader Vencedor *
                </Label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      manualMatch.player1_id &&
                      handleSelectManualWinner(manualMatch.player1_id)
                    }
                    className={`p-3 rounded-xl border text-left transition-all ${
                      manualWinnerId === manualMatch.player1_id
                        ? "border-primary bg-primary/15 ring-1 ring-primary"
                        : "border-border/60 bg-background/50 hover:bg-muted/40"
                    }`}
                  >
                    <div className="text-[10px] font-bold uppercase text-muted-foreground">
                      Blader 1
                    </div>
                    <div className="text-sm font-black text-foreground truncate">
                      {manualMatch.player1?.nickname ?? "Blader 1"}
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      manualMatch.player2_id &&
                      handleSelectManualWinner(manualMatch.player2_id)
                    }
                    className={`p-3 rounded-xl border text-left transition-all ${
                      manualWinnerId === manualMatch.player2_id
                        ? "border-fire-orange bg-fire-orange/15 ring-1 ring-fire-orange"
                        : "border-border/60 bg-background/50 hover:bg-muted/40"
                    }`}
                  >
                    <div className="text-[10px] font-bold uppercase text-muted-foreground">
                      Blader 2
                    </div>
                    <div className="text-sm font-black text-foreground truncate">
                      {manualMatch.player2?.nickname ?? "Blader 2"}
                    </div>
                  </button>
                </div>
              </div>

              {/* Placar editável quando modo = Placar Manual */}
              {manualMode === "score" && (
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label
                      htmlFor="manual-p1-score"
                      className="text-xs font-semibold truncate block"
                    >
                      Pts {manualMatch.player1?.nickname ?? "Blader 1"}
                    </Label>
                    <Input
                      id="manual-p1-score"
                      type="number"
                      min={0}
                      max={20}
                      value={manualP1Score}
                      onChange={(e) => setManualP1Score(e.target.value)}
                      className="h-9 text-center font-black tabular-nums"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label
                      htmlFor="manual-p2-score"
                      className="text-xs font-semibold truncate block"
                    >
                      Pts {manualMatch.player2?.nickname ?? "Blader 2"}
                    </Label>
                    <Input
                      id="manual-p2-score"
                      type="number"
                      min={0}
                      max={20}
                      value={manualP2Score}
                      onChange={(e) => setManualP2Score(e.target.value)}
                      className="h-9 text-center font-black tabular-nums"
                    />
                  </div>
                </div>
              )}

              <p className="text-[11px] text-muted-foreground leading-relaxed rounded-lg bg-muted/40 border border-border/40 p-2.5">
                Este registro encerra a partida sem exigir uma arena física (não
                computa Finishes detalhados em lance a lance). Em confrontos do{" "}
                <strong>Top Cut</strong>, vencedor e perdedor avançam
                automaticamente na chave.
              </p>

              <div className="flex items-center justify-end gap-2 pt-1">
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => setManualMatch(null)}
                  className="text-xs"
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  disabled={busyAction !== null || !manualWinnerId}
                  className="bg-emerald-600 hover:bg-emerald-600/90 text-white font-bold text-xs gap-1.5"
                >
                  {busyAction === `manual:${manualMatch.id}` && (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  )}
                  Confirmar Resultado
                </Button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
