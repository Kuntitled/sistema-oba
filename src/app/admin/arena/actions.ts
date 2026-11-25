"use server";

import { revalidatePath } from "next/cache";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { POINTS_TO_WIN_MATCH } from "@/lib/constants";
import { isValidUuid } from "@/lib/services/arena-queries";
import { syncTopCutAdvancement } from "@/lib/services/bracket-advancement";
import type { Database } from "@/types/database";
import {
  FINISH_POINTS,
  type FinishType,
  type MatchGameRow,
  type MatchRow,
  type MatchStage,
} from "@/types/domain";

type AllowedRole = "admin" | "judge";

async function requireRole(allowedRoles: AllowedRole[]) {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    return {
      supabase,
      error: "Sessão expirada. Faça login novamente.",
    } as const;
  }

  const role = user.user_metadata?.role as string | undefined;
  if (!role || !allowedRoles.includes(role as AllowedRole)) {
    return {
      supabase,
      error: "Você não tem permissão para executar esta operação.",
    } as const;
  }

  return { supabase, error: null } as const;
}

function revalidateArenaPaths(
  arenaId?: string | null,
  tournamentId?: string | null
) {
  revalidatePath("/admin");
  revalidatePath("/admin/arenas");
  revalidatePath("/admin/torneios");
  if (arenaId) {
    revalidatePath(`/admin/arena/${arenaId}`);
  }
  if (tournamentId) {
    revalidatePath(`/admin/torneios/${tournamentId}/chaveamento`);
  }
}

async function syncMatchFromGames(
  supabase: SupabaseClient<Database>,
  match: MatchRow,
  games: MatchGameRow[]
): Promise<{ match: MatchRow | null; error: string | null }> {
  let player1Score = 0;
  let player2Score = 0;

  for (const g of games) {
    if (g.scoring_player_id && g.scoring_player_id === match.player1_id) {
      player1Score += g.points_awarded;
    } else if (g.scoring_player_id && g.scoring_player_id === match.player2_id) {
      player2Score += g.points_awarded;
    }
  }

  let winnerId: string | null = null;
  if (player1Score >= match.target_score && match.player1_id) {
    winnerId = match.player1_id;
  } else if (player2Score >= match.target_score && match.player2_id) {
    winnerId = match.player2_id;
  }

  const nextStatus = winnerId ? "finished" : "in_progress";
  const nextFinishedAt = winnerId
    ? (match.finished_at ?? new Date().toISOString())
    : null;

  const { data: updatedMatch, error } = await supabase
    .from("matches")
    .update({
      player1_score: player1Score,
      player2_score: player2Score,
      winner_id: winnerId,
      status: nextStatus,
      finished_at: nextFinishedAt,
    })
    .eq("id", match.id)
    .select("*")
    .single();

  if (error) {
    return { match: null, error: `Erro ao atualizar placar: ${error.message}` };
  }

  return { match: updatedMatch, error: null };
}

export async function createArenaAction(formData: FormData) {
  const auth = await requireRole(["admin"]);
  if (auth.error) return { error: auth.error };

  const tournamentId = (formData.get("tournament_id") as string)?.trim();
  const name = (formData.get("name") as string)?.trim();
  const displayOrderRaw = (formData.get("display_order") as string)?.trim();

  if (!isValidUuid(tournamentId)) {
    return { error: "Selecione um torneio válido." };
  }

  if (!name) {
    return { error: "O nome da arena é obrigatório." };
  }

  let displayOrder = displayOrderRaw ? parseInt(displayOrderRaw, 10) : NaN;
  if (isNaN(displayOrder) || displayOrder <= 0) {
    const { data: existing } = await auth.supabase
      .from("arenas")
      .select("display_order")
      .eq("tournament_id", tournamentId)
      .order("display_order", { ascending: false })
      .limit(1);

    displayOrder =
      existing && existing.length > 0 ? existing[0].display_order + 1 : 1;
  }

  const { data: arena, error } = await auth.supabase
    .from("arenas")
    .insert({
      tournament_id: tournamentId,
      name,
      display_order: displayOrder,
      status: "available",
    })
    .select("*")
    .single();

  if (error) {
    if (error.code === "23505") {
      return {
        error: `Já existe uma arena chamada "${name}" neste torneio.`,
      };
    }
    return { error: `Erro ao criar arena: ${error.message}` };
  }

  revalidateArenaPaths(arena.id);
  return { success: true, arena };
}

export async function updateArenaStatusAction(
  arenaId: string,
  status: "available" | "maintenance"
) {
  const auth = await requireRole(["admin", "judge"]);
  if (auth.error) return { error: auth.error };

  if (!isValidUuid(arenaId)) {
    return { error: "ID de arena inválido." };
  }

  const { data: arena, error: fetchError } = await auth.supabase
    .from("arenas")
    .select("*")
    .eq("id", arenaId)
    .maybeSingle();

  if (fetchError || !arena) {
    return { error: "Arena não encontrada." };
  }

  if (arena.current_match_id) {
    return {
      error: "Libere a partida atual da arena antes de alterar a disponibilidade.",
    };
  }

  const { error } = await auth.supabase
    .from("arenas")
    .update({ status })
    .eq("id", arenaId);

  if (error) {
    return { error: `Erro ao atualizar status da arena: ${error.message}` };
  }

  revalidateArenaPaths(arenaId, arena.tournament_id);
  return { success: true };
}

export async function deleteArenaAction(arenaId: string) {
  const auth = await requireRole(["admin"]);
  if (auth.error) return { error: auth.error };

  if (!isValidUuid(arenaId)) {
    return { error: "ID de arena inválido." };
  }

  const { data: arena } = await auth.supabase
    .from("arenas")
    .select("id, current_match_id")
    .eq("id", arenaId)
    .maybeSingle();

  if (arena?.current_match_id) {
    const { data: match } = await auth.supabase
      .from("matches")
      .select("status")
      .eq("id", arena.current_match_id)
      .maybeSingle();

    if (match?.status === "in_progress") {
      return {
        error: "Finalize ou libere a partida em andamento antes de excluir a arena.",
      };
    }
  }

  const { error } = await auth.supabase
    .from("arenas")
    .delete()
    .eq("id", arenaId);

  if (error) {
    return { error: `Erro ao excluir arena: ${error.message}` };
  }

  revalidateArenaPaths();
  return { success: true };
}

export interface CreateAndAssignMatchInput {
  tournamentId: string;
  arenaId: string;
  player1Id: string;
  player2Id: string;
  stage: MatchStage;
  round: number;
  bracketLabel?: string | null;
  targetScore?: number;
}

export async function createAndAssignMatchAction(
  input: CreateAndAssignMatchInput
) {
  const auth = await requireRole(["admin"]);
  if (auth.error) return { error: auth.error };

  if (
    !isValidUuid(input.tournamentId) ||
    !isValidUuid(input.arenaId) ||
    !isValidUuid(input.player1Id) ||
    !isValidUuid(input.player2Id)
  ) {
    return { error: "Dados da partida ou competidores inválidos." };
  }

  if (input.player1Id === input.player2Id) {
    return { error: "Selecione dois Bladers diferentes para a batalha." };
  }

  const round = Math.max(1, Math.floor(input.round || 1));
  const targetScore = Math.max(
    1,
    Math.floor(input.targetScore || POINTS_TO_WIN_MATCH)
  );
  const bracketLabel = input.bracketLabel?.trim() || null;

  const { data: arena, error: arenaError } = await auth.supabase
    .from("arenas")
    .select("*")
    .eq("id", input.arenaId)
    .maybeSingle();

  if (arenaError || !arena) {
    return { error: "Arena não encontrada." };
  }

  if (arena.tournament_id !== input.tournamentId) {
    return { error: "A arena não pertence ao torneio selecionado." };
  }

  if (arena.status === "maintenance") {
    return { error: "Esta arena está em manutenção." };
  }

  if (arena.current_match_id) {
    const { data: currentMatch } = await auth.supabase
      .from("matches")
      .select("status")
      .eq("id", arena.current_match_id)
      .maybeSingle();

    if (currentMatch?.status === "in_progress") {
      return { error: "Esta arena já possui uma partida em andamento." };
    }
  }

  const { data: lastMatches } = await auth.supabase
    .from("matches")
    .select("match_number")
    .eq("tournament_id", input.tournamentId)
    .eq("stage", input.stage)
    .eq("round", round)
    .order("match_number", { ascending: false })
    .limit(1);

  const nextMatchNumber =
    lastMatches && lastMatches.length > 0 ? lastMatches[0].match_number + 1 : 1;

  const { data: match, error: matchError } = await auth.supabase
    .from("matches")
    .insert({
      tournament_id: input.tournamentId,
      arena_id: input.arenaId,
      round,
      match_number: nextMatchNumber,
      stage: input.stage,
      bracket_label: bracketLabel,
      player1_id: input.player1Id,
      player2_id: input.player2Id,
      player1_score: 0,
      player2_score: 0,
      target_score: targetScore,
      status: "in_progress",
      started_at: new Date().toISOString(),
    })
    .select("*")
    .single();

  if (matchError || !match) {
    return {
      error: `Erro ao iniciar partida: ${matchError?.message ?? "desconhecido"}`,
    };
  }

  const { error: arenaUpdateError } = await auth.supabase
    .from("arenas")
    .update({
      current_match_id: match.id,
      status: "in_match",
    })
    .eq("id", input.arenaId);

  if (arenaUpdateError) {
    return {
      error: `Partida criada, mas falhou ao vincular na arena: ${arenaUpdateError.message}`,
    };
  }

  revalidateArenaPaths(input.arenaId, input.tournamentId);
  return { success: true, matchId: match.id };
}

export async function assignExistingMatchToArenaAction(
  arenaId: string,
  matchId: string
) {
  const auth = await requireRole(["admin", "judge"]);
  if (auth.error) return { error: auth.error };

  if (!isValidUuid(arenaId) || !isValidUuid(matchId)) {
    return { error: "Arena ou partida inválida." };
  }

  const [arenaRes, matchRes] = await Promise.all([
    auth.supabase.from("arenas").select("*").eq("id", arenaId).maybeSingle(),
    auth.supabase.from("matches").select("*").eq("id", matchId).maybeSingle(),
  ]);

  const arena = arenaRes.data;
  const match = matchRes.data;

  if (!arena || !match) {
    return { error: "Arena ou partida não encontrada." };
  }

  if (arena.tournament_id !== match.tournament_id) {
    return { error: "A partida não pertence ao torneio desta arena." };
  }

  if (arena.status === "maintenance") {
    return { error: "A arena está em manutenção." };
  }

  if (arena.current_match_id) {
    const { data: current } = await auth.supabase
      .from("matches")
      .select("status")
      .eq("id", arena.current_match_id)
      .maybeSingle();

    if (current?.status === "in_progress") {
      return { error: "A arena já possui uma partida em andamento." };
    }
  }

  if (match.status !== "pending") {
    return { error: "Apenas partidas na fila podem ser atribuídas à arena." };
  }

  const { error: matchError } = await auth.supabase
    .from("matches")
    .update({
      arena_id: arenaId,
      status: "in_progress",
      started_at: match.started_at ?? new Date().toISOString(),
    })
    .eq("id", matchId);

  if (matchError) {
    return { error: `Erro ao alocar partida: ${matchError.message}` };
  }

  const { error: arenaError } = await auth.supabase
    .from("arenas")
    .update({
      current_match_id: matchId,
      status: "in_match",
    })
    .eq("id", arenaId);

  if (arenaError) {
    return { error: `Erro ao atualizar arena: ${arenaError.message}` };
  }

  revalidateArenaPaths(arenaId, match.tournament_id);
  return { success: true };
}

async function validateApprovedMatchCombo(
  supabase: SupabaseClient<Database>,
  comboId: string | null | undefined,
  tournamentId: string,
  bladerId: string | null
): Promise<{ valid: boolean; id: string | null; error?: string }> {
  const normalized = typeof comboId === "string" ? comboId.trim() : "";
  if (!normalized) {
    return { valid: true, id: null };
  }

  if (!isValidUuid(normalized) || !bladerId) {
    return {
      valid: false,
      id: null,
      error: "Combo selecionado é inválido para este jogador.",
    };
  }

  const client = createAdminClient() ?? supabase;
  const { data: comboRow, error: comboErr } = await client
    .from("registration_combos")
    .select("id, registration_id")
    .eq("id", normalized)
    .maybeSingle();

  if (comboErr || !comboRow) {
    return {
      valid: false,
      id: null,
      error: "Combo selecionado não foi encontrado na decklist.",
    };
  }

  const { data: regRow, error: regErr } = await client
    .from("tournament_registrations")
    .select("id")
    .eq("id", comboRow.registration_id)
    .eq("tournament_id", tournamentId)
    .eq("blader_id", bladerId)
    .eq("status", "approved")
    .maybeSingle();

  if (regErr || !regRow) {
    return {
      valid: false,
      id: null,
      error: "O combo selecionado não pertence à inscrição aprovada deste Blader.",
    };
  }

  return { valid: true, id: comboRow.id };
}

export async function recordMatchGameAction(
  matchId: string,
  scoringPlayerId: string,
  finishType: Exclude<FinishType, "draw">,
  options?: {
    player1ComboId?: string | null;
    player2ComboId?: string | null;
  }
) {
  const auth = await requireRole(["admin", "judge"]);
  if (auth.error) return { error: auth.error };

  if (!isValidUuid(matchId) || !isValidUuid(scoringPlayerId)) {
    return { error: "Identificador de partida ou Blader inválido." };
  }

  if (!["spin", "over", "burst", "xtreme"].includes(finishType)) {
    return { error: "Tipo de finish inválido." };
  }

  const { data: match, error: matchError } = await auth.supabase
    .from("matches")
    .select("*")
    .eq("id", matchId)
    .maybeSingle();

  if (matchError || !match) {
    return { error: "Partida não encontrada." };
  }

  if (match.status !== "in_progress") {
    return {
      error: "Esta partida já foi finalizada. Use Desfazer se precisar corrigir o último lance.",
    };
  }

  if (
    scoringPlayerId !== match.player1_id &&
    scoringPlayerId !== match.player2_id
  ) {
    return { error: "O Blader selecionado não faz parte desta partida." };
  }

  const [p1ComboValidation, p2ComboValidation] = await Promise.all([
    validateApprovedMatchCombo(
      auth.supabase,
      options?.player1ComboId,
      match.tournament_id,
      match.player1_id
    ),
    validateApprovedMatchCombo(
      auth.supabase,
      options?.player2ComboId,
      match.tournament_id,
      match.player2_id
    ),
  ]);

  if (!p1ComboValidation.valid) {
    return { error: p1ComboValidation.error ?? "Combo do Blader 1 inválido." };
  }
  if (!p2ComboValidation.valid) {
    return { error: p2ComboValidation.error ?? "Combo do Blader 2 inválido." };
  }

  const pointsAwarded = FINISH_POINTS[finishType];

  const { data: existingGames, error: gamesFetchError } = await auth.supabase
    .from("match_games")
    .select("*")
    .eq("match_id", matchId)
    .order("round_number", { ascending: true });

  if (gamesFetchError) {
    return { error: `Erro ao ler histórico de lances: ${gamesFetchError.message}` };
  }

  const games = existingGames ?? [];
  const nextRound =
    games.length > 0 ? games[games.length - 1].round_number + 1 : 1;

  const insertPayload: Database["public"]["Tables"]["match_games"]["Insert"] = {
    match_id: matchId,
    round_number: nextRound,
    scoring_player_id: scoringPlayerId,
    finish_type: finishType,
    points_awarded: pointsAwarded,
  };

  if (p1ComboValidation.id) {
    insertPayload.player1_combo_id = p1ComboValidation.id;
  }
  if (p2ComboValidation.id) {
    insertPayload.player2_combo_id = p2ComboValidation.id;
  }

  const { data: insertedGame, error: insertError } = await auth.supabase
    .from("match_games")
    .insert(insertPayload)
    .select("*")
    .single();

  if (insertError || !insertedGame) {
    return {
      error: `Erro ao registrar ponto: ${insertError?.message ?? "tente novamente"}`,
    };
  }

  const updatedGames = [...games, insertedGame];
  const syncResult = await syncMatchFromGames(auth.supabase, match, updatedGames);

  if (syncResult.error || !syncResult.match) {
    return { error: syncResult.error ?? "Erro ao recalcular placar." };
  }

  await syncTopCutAdvancement(auth.supabase, syncResult.match);

  revalidateArenaPaths(match.arena_id, match.tournament_id);
  if (syncResult.match.status === "finished") {
    revalidatePath("/estatisticas");
  }
  return {
    success: true,
    match: syncResult.match,
    games: updatedGames,
  };
}

export async function undoLastGameAction(matchId: string) {
  const auth = await requireRole(["admin", "judge"]);
  if (auth.error) return { error: auth.error };

  if (!isValidUuid(matchId)) {
    return { error: "Partida inválida." };
  }

  const [matchRes, gamesRes] = await Promise.all([
    auth.supabase.from("matches").select("*").eq("id", matchId).maybeSingle(),
    auth.supabase
      .from("match_games")
      .select("*")
      .eq("match_id", matchId)
      .order("round_number", { ascending: true }),
  ]);

  const match = matchRes.data;
  if (!match) {
    return { error: "Partida não encontrada." };
  }

  const games = gamesRes.data ?? [];
  if (games.length === 0) {
    return { error: "Nenhum lance para desfazer." };
  }

  const lastGame = games[games.length - 1];
  const { error: deleteError } = await auth.supabase
    .from("match_games")
    .delete()
    .eq("id", lastGame.id);

  if (deleteError) {
    return { error: `Erro ao desfazer lance: ${deleteError.message}` };
  }

  const remainingGames = games.slice(0, -1);
  const syncResult = await syncMatchFromGames(
    auth.supabase,
    match,
    remainingGames
  );

  if (syncResult.error || !syncResult.match) {
    return { error: syncResult.error ?? "Erro ao recalcular placar." };
  }

  await syncTopCutAdvancement(auth.supabase, syncResult.match);

  if (match.arena_id) {
    await auth.supabase
      .from("arenas")
      .update({
        status: "in_match",
        current_match_id: match.id,
      })
      .eq("id", match.arena_id);
  }

  revalidateArenaPaths(match.arena_id, match.tournament_id);
  return {
    success: true,
    match: syncResult.match,
    games: remainingGames,
  };
}

export async function resetMatchScoreAction(matchId: string) {
  const auth = await requireRole(["admin", "judge"]);
  if (auth.error) return { error: auth.error };

  if (!isValidUuid(matchId)) {
    return { error: "Partida inválida." };
  }

  const { data: match, error: matchError } = await auth.supabase
    .from("matches")
    .select("*")
    .eq("id", matchId)
    .maybeSingle();

  if (matchError || !match) {
    return { error: "Partida não encontrada." };
  }

  const { error: deleteError } = await auth.supabase
    .from("match_games")
    .delete()
    .eq("match_id", matchId);

  if (deleteError) {
    return { error: `Erro ao limpar lances: ${deleteError.message}` };
  }

  const { data: updatedMatch, error: updateError } = await auth.supabase
    .from("matches")
    .update({
      player1_score: 0,
      player2_score: 0,
      winner_id: null,
      status: "in_progress",
      finished_at: null,
    })
    .eq("id", matchId)
    .select("*")
    .single();

  if (updateError) {
    return { error: `Erro ao reiniciar placar: ${updateError.message}` };
  }

  await syncTopCutAdvancement(auth.supabase, updatedMatch);

  if (match.arena_id) {
    await auth.supabase
      .from("arenas")
      .update({
        status: "in_match",
        current_match_id: match.id,
      })
      .eq("id", match.arena_id);
  }

  revalidateArenaPaths(match.arena_id, match.tournament_id);
  return {
    success: true,
    match: updatedMatch,
    games: [] as MatchGameRow[],
  };
}

export async function releaseArenaAction(
  arenaId: string,
  options?: { returnPendingIfUnfinished?: boolean }
) {
  const auth = await requireRole(["admin", "judge"]);
  if (auth.error) return { error: auth.error };

  if (!isValidUuid(arenaId)) {
    return { error: "Arena inválida." };
  }

  const { data: arena, error: arenaFetchError } = await auth.supabase
    .from("arenas")
    .select("*")
    .eq("id", arenaId)
    .maybeSingle();

  if (arenaFetchError || !arena) {
    return { error: "Arena não encontrada." };
  }

  if (arena.current_match_id) {
    const { data: match } = await auth.supabase
      .from("matches")
      .select("id, status")
      .eq("id", arena.current_match_id)
      .maybeSingle();

    if (
      match &&
      match.status === "in_progress" &&
      options?.returnPendingIfUnfinished
    ) {
      await auth.supabase
        .from("matches")
        .update({
          status: "pending",
          arena_id: null,
          started_at: null,
        })
        .eq("id", match.id);
    }
  }

  const { error: arenaUpdateError } = await auth.supabase
    .from("arenas")
    .update({
      status: "available",
      current_match_id: null,
    })
    .eq("id", arenaId);

  if (arenaUpdateError) {
    return { error: `Erro ao liberar arena: ${arenaUpdateError.message}` };
  }

  revalidateArenaPaths(arenaId, arena.tournament_id);
  return { success: true };
}
