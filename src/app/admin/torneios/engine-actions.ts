"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { POINTS_TO_WIN_MATCH } from "@/lib/constants";
import {
  buildTopCutBracketPlan,
  computeFinalTournamentResults,
  computeSwissStandings,
  generateNextSwissRoundPairings,
} from "@/lib/engine/tournament-engine";
import { isValidUuid } from "@/lib/services/arena-queries";
import { syncTopCutAdvancement } from "@/lib/services/bracket-advancement";
import {
  ensureSeasonForDate,
  recalculateSeasonRanking,
} from "@/lib/services/ranking-recalc";
import { fetchTournamentEngineSnapshot } from "@/lib/services/tournament-queries";

async function requireAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    return { supabase, error: "Sessão expirada. Faça login novamente." } as const;
  }

  if (user.user_metadata?.role !== "admin") {
    return {
      supabase,
      error: "Apenas administradores podem gerenciar o motor de torneios.",
    } as const;
  }

  return { supabase, error: null } as const;
}

function revalidateTournamentViews(tournamentId: string) {
  revalidatePath("/", "layout");
  revalidatePath("/torneios");
  revalidatePath("/bladers");
  revalidatePath("/admin");
  revalidatePath("/admin/torneios");
  revalidatePath("/admin/arenas");
  revalidatePath(`/admin/torneios/${tournamentId}/chaveamento`);
  revalidatePath(`/admin/torneios/${tournamentId}/resultados`);
}

export async function setTournamentParticipantsAction(
  tournamentId: string,
  bladerIds: string[]
) {
  const auth = await requireAdmin();
  if (auth.error) return { error: auth.error };

  if (!isValidUuid(tournamentId)) {
    return { error: "Torneio inválido." };
  }

  const uniqueIds = Array.from(new Set(bladerIds)).filter((id) =>
    isValidUuid(id)
  );

  const [existingRes, matchesRes] = await Promise.all([
    auth.supabase
      .from("tournament_participants")
      .select("id, blader_id")
      .eq("tournament_id", tournamentId),
    auth.supabase
      .from("matches")
      .select("id, player1_id, player2_id")
      .eq("tournament_id", tournamentId),
  ]);

  const existing = existingRes.data ?? [];
  const existingSet = new Set(existing.map((e) => e.blader_id));
  const desiredSet = new Set(uniqueIds);

  const toAdd = uniqueIds.filter((id) => !existingSet.has(id));
  const toRemove = existing.filter((e) => !desiredSet.has(e.blader_id));

  if (toRemove.length > 0) {
    const matches = matchesRes.data ?? [];
    const referencedBladers = new Set<string>();
    for (const m of matches) {
      if (m.player1_id) referencedBladers.add(m.player1_id);
      if (m.player2_id) referencedBladers.add(m.player2_id);
    }

    const blocked = toRemove.some((p) => referencedBladers.has(p.blader_id));
    if (blocked) {
      return {
        error:
          "Não é possível remover Bladers que já possuem partidas geradas. Use a opção Drop (Desistir).",
      };
    }

    const { error: deleteError } = await auth.supabase
      .from("tournament_participants")
      .delete()
      .in(
        "id",
        toRemove.map((p) => p.id)
      );

    if (deleteError) {
      return {
        error: `Erro ao remover participantes: ${deleteError.message}`,
      };
    }
  }

  if (toAdd.length > 0) {
    const { error: insertError } = await auth.supabase
      .from("tournament_participants")
      .insert(
        toAdd.map((bladerId) => ({
          tournament_id: tournamentId,
          blader_id: bladerId,
        }))
      );

    if (insertError) {
      return {
        error: `Erro ao adicionar participantes: ${insertError.message}`,
      };
    }
  }

  revalidateTournamentViews(tournamentId);
  return { success: true };
}

export async function toggleParticipantDropAction(
  tournamentId: string,
  bladerId: string,
  isDropped: boolean
) {
  const auth = await requireAdmin();
  if (auth.error) return { error: auth.error };

  if (!isValidUuid(tournamentId) || !isValidUuid(bladerId)) {
    return { error: "Identificadores inválidos." };
  }

  const { error } = await auth.supabase
    .from("tournament_participants")
    .update({ is_dropped: isDropped })
    .eq("tournament_id", tournamentId)
    .eq("blader_id", bladerId);

  if (error) {
    return { error: `Erro ao atualizar participante: ${error.message}` };
  }

  revalidateTournamentViews(tournamentId);
  return { success: true };
}

export async function generateNextSwissRoundAction(tournamentId: string) {
  const auth = await requireAdmin();
  if (auth.error) return { error: auth.error };

  if (!isValidUuid(tournamentId)) {
    return { error: "Torneio inválido." };
  }

  const snapshot = await fetchTournamentEngineSnapshot(
    auth.supabase,
    tournamentId
  );

  if (snapshot.schemaMissing || !snapshot.tournament) {
    return { error: "Torneio não encontrado ou migration 004 pendente." };
  }

  if (snapshot.tournament.status === "finished") {
    return { error: "Este torneio já está encerrado." };
  }

  const hasTopCut = snapshot.matches.some(
    (m) => m.stage === "top_cut" && m.status !== "cancelled"
  );
  if (hasTopCut) {
    return {
      error: "O Top Cut já foi iniciado. Não é possível gerar mais rodadas suíças.",
    };
  }

  const summary = computeSwissStandings(
    snapshot.participants,
    snapshot.matches,
    snapshot.games
  );

  if (summary.unfinishedSwissMatchesCount > 0 || summary.hasPendingTiebreaker) {
    return {
      error:
        "Finalize todas as partidas em aberto da rodada atual antes de gerar a próxima.",
    };
  }

  const activeCount = summary.standings.filter((s) => !s.isDropped).length;
  if (activeCount < 2) {
    return {
      error: "É necessário ter pelo menos 2 Bladers ativos inscritos.",
    };
  }

  const nextRound = summary.currentSwissRound + 1;
  const { pairings, hadForcedRematch } = generateNextSwissRoundPairings(
    summary.standings,
    nextRound
  );

  if (pairings.length === 0) {
    return { error: "Não foi possível gerar pareamentos para a rodada." };
  }

  const nowIso = new Date().toISOString();
  const rows = pairings.map((p) =>
    p.isBye
      ? {
          tournament_id: tournamentId,
          stage: "swiss" as const,
          round: nextRound,
          match_number: p.matchNumber,
          bracket_label: "BYE",
          player1_id: p.player1Id,
          player2_id: null,
          player1_score: 0,
          player2_score: 0,
          target_score: POINTS_TO_WIN_MATCH,
          winner_id: p.player1Id,
          status: "finished" as const,
          is_bye: true,
          is_tiebreaker: false,
          started_at: nowIso,
          finished_at: nowIso,
        }
      : {
          tournament_id: tournamentId,
          stage: "swiss" as const,
          round: nextRound,
          match_number: p.matchNumber,
          bracket_label: null,
          player1_id: p.player1Id,
          player2_id: p.player2Id,
          player1_score: 0,
          player2_score: 0,
          target_score: POINTS_TO_WIN_MATCH,
          winner_id: null,
          status: "pending" as const,
          is_bye: false,
          is_tiebreaker: false,
        }
  );

  const { error: insertError } = await auth.supabase
    .from("matches")
    .insert(rows);

  if (insertError) {
    return { error: `Erro ao criar rodada suíça: ${insertError.message}` };
  }

  if (
    snapshot.tournament.status === "draft" ||
    snapshot.tournament.status === "open"
  ) {
    await auth.supabase
      .from("tournaments")
      .update({ status: "ongoing" })
      .eq("id", tournamentId);
  }

  revalidateTournamentViews(tournamentId);
  return { success: true, round: nextRound, hadForcedRematch };
}

export async function createSwissLeaderTiebreakerAction(
  tournamentId: string,
  player1Id: string,
  player2Id: string
) {
  const auth = await requireAdmin();
  if (auth.error) return { error: auth.error };

  if (
    !isValidUuid(tournamentId) ||
    !isValidUuid(player1Id) ||
    !isValidUuid(player2Id)
  ) {
    return { error: "Identificadores inválidos." };
  }

  if (player1Id === player2Id) {
    return { error: "Selecione dois Bladers distintos para o desempate." };
  }

  const snapshot = await fetchTournamentEngineSnapshot(
    auth.supabase,
    tournamentId
  );

  if (!snapshot.tournament) {
    return { error: "Torneio não encontrado." };
  }

  const summary = computeSwissStandings(
    snapshot.participants,
    snapshot.matches,
    snapshot.games
  );

  if (summary.hasPendingTiebreaker) {
    return { error: "Já existe uma partida extra de desempate em andamento." };
  }

  const round = Math.max(1, summary.currentSwissRound);
  const existingRoundMatches = snapshot.matches.filter(
    (m) => m.stage === "swiss" && m.round === round
  );
  const nextMatchNumber =
    existingRoundMatches.length > 0
      ? Math.max(...existingRoundMatches.map((m) => m.match_number)) + 1
      : 1;

  const { error } = await auth.supabase.from("matches").insert({
    tournament_id: tournamentId,
    stage: "swiss",
    round,
    match_number: nextMatchNumber,
    bracket_label: "Desempate Liderança Suíço",
    player1_id: player1Id,
    player2_id: player2Id,
    player1_score: 0,
    player2_score: 0,
    target_score: POINTS_TO_WIN_MATCH,
    status: "pending",
    is_bye: false,
    is_tiebreaker: true,
  });

  if (error) {
    return { error: `Erro ao criar partida de desempate: ${error.message}` };
  }

  revalidateTournamentViews(tournamentId);
  return { success: true };
}

export async function generateTopCutBracketAction(
  tournamentId: string,
  topCutSize: 4 | 8 | 16
) {
  const auth = await requireAdmin();
  if (auth.error) return { error: auth.error };

  if (!isValidUuid(tournamentId)) {
    return { error: "Torneio inválido." };
  }

  if (![4, 8, 16].includes(topCutSize)) {
    return { error: "Tamanho de Top Cut inválido (use 4, 8 ou 16)." };
  }

  const snapshot = await fetchTournamentEngineSnapshot(
    auth.supabase,
    tournamentId
  );

  if (!snapshot.tournament) {
    return { error: "Torneio não encontrado." };
  }

  if (snapshot.tournament.format === "swiss_only") {
    return {
      error: "Torneios Exclusivamente Suíço não possuem fase Top Cut.",
    };
  }

  if (
    snapshot.matches.some(
      (m) => m.stage === "top_cut" && m.status !== "cancelled"
    )
  ) {
    return { error: "As chaves do Top Cut já foram geradas." };
  }

  const summary = computeSwissStandings(
    snapshot.participants,
    snapshot.matches,
    snapshot.games
  );

  if (summary.currentSwissRound === 0) {
    return { error: "Execute pelo menos 1 rodada suíça antes do Top Cut." };
  }

  if (summary.unfinishedSwissMatchesCount > 0 || summary.hasPendingTiebreaker) {
    return {
      error: "Finalize todas as partidas da Fase Suíça antes de gerar o Top Cut.",
    };
  }

  if (summary.hasAbsoluteLeaderTie) {
    return {
      error:
        "Há empate absoluto pela liderança do Suíço. Gere e conclua a partida de desempate antes do Top Cut.",
    };
  }

  if (summary.standings.length < topCutSize) {
    return {
      error: `São necessários pelo menos ${topCutSize} competidores para gerar o Top ${topCutSize}.`,
    };
  }

  const seededIds = summary.standings
    .slice(0, topCutSize)
    .map((s) => s.bladerId);
  const planNodes = buildTopCutBracketPlan(seededIds, topCutSize);

  // Insere da rodada final para a rodada 1 para ligar next_match_id diretamente
  const sortedForInsert = [...planNodes].sort(
    (a, b) => b.round - a.round || a.matchNumber - b.matchNumber
  );

  const insertedIdByKey = new Map<string, string>();

  for (const node of sortedForInsert) {
    const nextMatchId = node.nextKey
      ? (insertedIdByKey.get(node.nextKey) ?? null)
      : null;
    const loserNextMatchId = node.loserNextKey
      ? (insertedIdByKey.get(node.loserNextKey) ?? null)
      : null;

    const { data: created, error: insertError } = await auth.supabase
      .from("matches")
      .insert({
        tournament_id: tournamentId,
        stage: "top_cut",
        round: node.round,
        match_number: node.matchNumber,
        bracket_label: node.bracketLabel,
        player1_id: node.player1Id,
        player2_id: node.player2Id,
        player1_score: 0,
        player2_score: 0,
        target_score: POINTS_TO_WIN_MATCH,
        status: "pending",
        is_bye: false,
        is_tiebreaker: false,
        next_match_id: nextMatchId,
        next_match_slot: node.nextSlot,
        loser_next_match_id: loserNextMatchId,
        loser_next_match_slot: node.loserNextSlot,
      })
      .select("id")
      .single();

    if (insertError || !created) {
      return {
        error: `Erro ao montar chave ${node.bracketLabel}: ${insertError?.message ?? "falha ao inserir"}`,
      };
    }

    insertedIdByKey.set(node.key, created.id);
  }

  await auth.supabase
    .from("tournaments")
    .update({
      top_cut_size: topCutSize,
      status: "ongoing",
    })
    .eq("id", tournamentId);

  revalidateTournamentViews(tournamentId);
  return { success: true };
}

export async function finalizeAndPublishTournamentAction(tournamentId: string) {
  const auth = await requireAdmin();
  if (auth.error) return { error: auth.error };

  if (!isValidUuid(tournamentId)) {
    return { error: "Torneio inválido." };
  }

  const snapshot = await fetchTournamentEngineSnapshot(
    auth.supabase,
    tournamentId
  );

  if (!snapshot.tournament) {
    return { error: "Torneio não encontrado." };
  }

  const openMatches = snapshot.matches.filter(
    (m) => m.status === "pending" || m.status === "in_progress"
  );
  if (openMatches.length > 0) {
    return {
      error: `Ainda existem ${openMatches.length} partida(s) em aberto ou ao vivo neste torneio.`,
    };
  }

  const summary = computeSwissStandings(
    snapshot.participants,
    snapshot.matches,
    snapshot.games
  );

  if (summary.currentSwissRound === 0) {
    return {
      error: "Execute pelo menos 1 rodada antes de encerrar e publicar o torneio.",
    };
  }

  if (summary.hasAbsoluteLeaderTie) {
    return {
      error:
        "Há um empate absoluto pela liderança do Suíço. Resolva com a partida extra de desempate antes de publicar no ranking.",
    };
  }

  if (snapshot.tournament.format === "swiss_top_cut") {
    const hasTopCut = snapshot.matches.some(
      (m) => m.stage === "top_cut" && m.status !== "cancelled"
    );
    if (!hasTopCut) {
      return {
        error:
          "Este torneio é Suíço + Top Cut. Gere e finalize a chave Top Cut antes de encerrar.",
      };
    }
  }

  const previewResults = computeFinalTournamentResults(
    snapshot.tournament,
    snapshot.participants,
    snapshot.matches,
    snapshot.games
  );

  if (previewResults.length === 0) {
    return { error: "Nenhum resultado disponível para publicar." };
  }

  await auth.supabase
    .from("tournament_results")
    .delete()
    .eq("tournament_id", tournamentId);

  const { error: insertError } = await auth.supabase
    .from("tournament_results")
    .insert(
      previewResults.map((r) => ({
        tournament_id: tournamentId,
        blader_id: r.bladerId,
        final_position: r.finalPosition,
        swiss_wins: r.swissWins,
        swiss_points: r.swissPoints,
        is_swiss_leader: r.isSwissLeader,
        swiss_leader_bonus: r.swissLeaderBonus,
        podium_points: r.podiumPoints,
        points_earned: r.pointsEarned,
      }))
    );

  if (insertError) {
    return {
      error: `Erro ao gravar resultados oficiais: ${insertError.message}`,
    };
  }

  let seasonId = snapshot.tournament.season_id;
  if (!seasonId) {
    seasonId = await ensureSeasonForDate(
      auth.supabase,
      snapshot.tournament.event_date
    );
  }

  await auth.supabase
    .from("tournaments")
    .update({
      status: "finished",
      season_id: seasonId,
    })
    .eq("id", tournamentId);

  await auth.supabase
    .from("arenas")
    .update({
      status: "available",
      current_match_id: null,
    })
    .eq("tournament_id", tournamentId)
    .eq("status", "in_match");

  if (seasonId) {
    await recalculateSeasonRanking(auth.supabase, seasonId);
  }

  revalidateTournamentViews(tournamentId);
  return { success: true };
}

export async function recordManualMatchResultAction(params: {
  matchId: string;
  winnerId: string;
  player1Score: number;
  player2Score: number;
  isWalkover?: boolean;
}) {
  const auth = await requireAdmin();
  if (auth.error) return { error: auth.error };

  if (!isValidUuid(params.matchId) || !isValidUuid(params.winnerId)) {
    return { error: "Partida ou Blader vencedor inválido." };
  }

  const { data: match, error: matchError } = await auth.supabase
    .from("matches")
    .select("*")
    .eq("id", params.matchId)
    .maybeSingle();

  if (matchError || !match) {
    return { error: "Partida não encontrada." };
  }

  if (match.is_bye) {
    return { error: "Partidas BYE já são computadas automaticamente." };
  }

  if (!match.player1_id || !match.player2_id) {
    return { error: "Os dois Bladers precisam estar definidos para registrar resultado." };
  }

  if (match.status === "cancelled") {
    return { error: "Esta partida foi cancelada." };
  }

  if (match.status === "finished") {
    return {
      error:
        "Esta partida já foi finalizada. Reabra pelo Placar da Arena se precisar desfazer.",
    };
  }

  if (
    params.winnerId !== match.player1_id &&
    params.winnerId !== match.player2_id
  ) {
    return { error: "O vencedor selecionado não pertence a esta partida." };
  }

  const isP1Winner = params.winnerId === match.player1_id;
  let finalP1Score: number;
  let finalP2Score: number;

  if (params.isWalkover) {
    finalP1Score = isP1Winner ? match.target_score : 0;
    finalP2Score = isP1Winner ? 0 : match.target_score;
  } else {
    finalP1Score = Math.floor(Number(params.player1Score));
    finalP2Score = Math.floor(Number(params.player2Score));

    if (
      !Number.isFinite(finalP1Score) ||
      !Number.isFinite(finalP2Score) ||
      finalP1Score < 0 ||
      finalP2Score < 0 ||
      finalP1Score > 20 ||
      finalP2Score > 20
    ) {
      return { error: "Informe placares inteiros válidos entre 0 e 20." };
    }

    const winnerScore = isP1Winner ? finalP1Score : finalP2Score;
    const loserScore = isP1Winner ? finalP2Score : finalP1Score;
    if (winnerScore <= loserScore) {
      return {
        error: "O placar do vencedor precisa ser maior que o do adversário.",
      };
    }
  }

  if (match.arena_id) {
    await auth.supabase
      .from("arenas")
      .update({
        status: "available",
        current_match_id: null,
      })
      .eq("id", match.arena_id)
      .eq("current_match_id", match.id);
  }

  const nowIso = new Date().toISOString();
  const { data: updatedMatch, error: updateError } = await auth.supabase
    .from("matches")
    .update({
      player1_score: finalP1Score,
      player2_score: finalP2Score,
      winner_id: params.winnerId,
      status: "finished",
      started_at: match.started_at ?? nowIso,
      finished_at: nowIso,
    })
    .eq("id", match.id)
    .select("*")
    .single();

  if (updateError || !updatedMatch) {
    return {
      error: `Erro ao registrar resultado manual: ${updateError?.message ?? "tente novamente"}`,
    };
  }

  await syncTopCutAdvancement(auth.supabase, updatedMatch);

  revalidateTournamentViews(match.tournament_id);
  if (match.arena_id) {
    revalidatePath(`/admin/arena/${match.arena_id}`);
  }

  return { success: true, match: updatedMatch };
}

export async function createSeasonAction(formData: FormData) {
  const auth = await requireAdmin();
  if (auth.error) return { error: auth.error };

  const yearRaw = (formData.get("year") as string)?.trim();
  const year = parseInt(yearRaw, 10);
  const name = (formData.get("name") as string)?.trim() || `Temporada ${year}`;
  const makeActive = formData.get("is_active") === "true";

  if (isNaN(year) || year < 2020 || year > 2100) {
    return { error: "Informe um ano válido entre 2020 e 2100." };
  }

  if (makeActive) {
    await auth.supabase
      .from("seasons")
      .update({ is_active: false })
      .eq("is_active", true);
  }

  const { data: season, error } = await auth.supabase
    .from("seasons")
    .insert({
      year,
      name,
      starts_at: `${year}-01-01`,
      ends_at: `${year}-12-31`,
      is_active: makeActive,
    })
    .select("*")
    .single();

  if (error) {
    if (error.code === "23505") {
      return { error: `Já existe uma temporada cadastrada para ${year}.` };
    }
    return { error: `Erro ao criar temporada: ${error.message}` };
  }

  if (makeActive) {
    await recalculateSeasonRanking(auth.supabase, season.id);
  }

  revalidatePath("/", "layout");
  revalidatePath("/admin");
  revalidatePath("/admin/temporadas");
  return { success: true, season };
}

export async function activateSeasonAction(seasonId: string) {
  const auth = await requireAdmin();
  if (auth.error) return { error: auth.error };

  if (!isValidUuid(seasonId)) {
    return { error: "Temporada inválida." };
  }

  await auth.supabase
    .from("seasons")
    .update({ is_active: false })
    .eq("is_active", true);

  const { error } = await auth.supabase
    .from("seasons")
    .update({ is_active: true })
    .eq("id", seasonId);

  if (error) {
    return { error: `Erro ao ativar temporada: ${error.message}` };
  }

  await recalculateSeasonRanking(auth.supabase, seasonId);
  revalidatePath("/", "layout");
  revalidatePath("/admin");
  revalidatePath("/admin/temporadas");
  return { success: true };
}
