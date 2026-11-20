"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import {
  calculateOfficialTournamentPoints,
  DEFAULT_SWISS_ROUNDS,
  type ObaTournamentCategory,
} from "@/lib/constants";
import {
  ensureSeasonForDate,
  recalculateAllSeasonsRanking,
  recalculateSeasonRanking,
} from "@/lib/services/ranking-recalc";
import type {
  TournamentCategory,
  TournamentFormat,
  TournamentStatus,
} from "@/types/domain";

async function requireAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user || user.user_metadata?.role !== "admin") {
    return {
      supabase,
      error: "Acesso negado. Faça login como administrador.",
    } as const;
  }

  return { supabase, error: null } as const;
}

/**
 * Cadastra um novo Blader e inicializa sua entrada na temporada ativa.
 */
export async function createBladerAction(formData: FormData) {
  const auth = await requireAdmin();
  if (auth.error) return { error: auth.error };

  const name = (formData.get("name") as string)?.trim();
  const nickname = (formData.get("nickname") as string)?.trim();
  const city = (formData.get("city") as string)?.trim() || null;
  const bio = (formData.get("bio") as string)?.trim() || null;
  const avatar_url = (formData.get("avatar_url") as string)?.trim() || null;

  if (!name || !nickname) {
    return { error: "Nome e Apelido são obrigatórios." };
  }

  const { data: blader, error } = await auth.supabase
    .from("bladers")
    .insert({
      name,
      nickname,
      city,
      bio,
      avatar_url,
      is_active: true,
    })
    .select()
    .single();

  if (error) {
    if (error.code === "23505") {
      return {
        error: `O apelido "${nickname}" já está em uso por outro Blader.`,
      };
    }
    return { error: `Erro ao cadastrar Blader: ${error.message}` };
  }

  const { data: activeSeason } = await auth.supabase
    .from("seasons")
    .select("id")
    .eq("is_active", true)
    .maybeSingle();

  const seasonId =
    activeSeason?.id ??
    (await ensureSeasonForDate(
      auth.supabase,
      new Date().toISOString().slice(0, 10)
    ));

  if (seasonId) {
    await auth.supabase.from("ranking").upsert(
      {
        season_id: seasonId,
        blader_id: blader.id,
        total_points: 0,
        tournaments_played: 0,
        swiss_wins: 0,
        podiums_count: 0,
        first_places: 0,
        second_places: 0,
        third_places: 0,
        best_podium: null,
        best_position: null,
      },
      { onConflict: "season_id,blader_id" }
    );
  }

  revalidatePath("/", "layout");
  return { success: true, blader };
}

/**
 * Exclui um Blader e recalcula os rankings de todas as temporadas.
 */
export async function deleteBladerAction(bladerId: string) {
  const auth = await requireAdmin();
  if (auth.error) return { error: auth.error };

  const { error } = await auth.supabase
    .from("bladers")
    .delete()
    .eq("id", bladerId);
  if (error) {
    return { error: `Erro ao excluir Blader: ${error.message}` };
  }

  await recalculateAllSeasonsRanking(auth.supabase);
  revalidatePath("/", "layout");
  return { success: true };
}

/**
 * Cria um Torneio (futuro ou retroativo) alinhado ao regulamento OBA.
 */
export async function createTournamentAction(formData: FormData) {
  const auth = await requireAdmin();
  if (auth.error) return { error: auth.error };

  const name = (formData.get("name") as string)?.trim();
  const location = (formData.get("location") as string)?.trim() || null;
  const event_date = formData.get("event_date") as string;
  const categoryRaw = (formData.get("category") as string) || "semanal";
  const formatRaw = (formData.get("format") as string) || "swiss_top_cut";
  const statusRaw = (formData.get("status") as string) || "finished";
  const description = (formData.get("description") as string)?.trim() || null;
  const max_players_str = formData.get("max_players") as string;
  const max_players = max_players_str ? parseInt(max_players_str, 10) : null;
  const swissRoundsStr = formData.get("swiss_rounds") as string;
  const swissRoundsParsed = swissRoundsStr
    ? parseInt(swissRoundsStr, 10)
    : DEFAULT_SWISS_ROUNDS;
  const swiss_rounds =
    !isNaN(swissRoundsParsed) && swissRoundsParsed >= 1 && swissRoundsParsed <= 10
      ? swissRoundsParsed
      : DEFAULT_SWISS_ROUNDS;
  const topCutStr = formData.get("top_cut_size") as string;
  const topCutParsed = topCutStr ? parseInt(topCutStr, 10) : null;
  const top_cut_size =
    topCutParsed === 4 || topCutParsed === 8 || topCutParsed === 16
      ? topCutParsed
      : null;

  if (!name || !event_date) {
    return { error: "Nome e Data do Torneio são obrigatórios." };
  }

  const category: TournamentCategory =
    categoryRaw === "oficial" ? "oficial" : "semanal";
  const format = formatRaw as TournamentFormat;
  const status = statusRaw as TournamentStatus;

  const baseSlug = name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "");
  const slug = `${baseSlug}-${event_date}`;

  const seasonId = await ensureSeasonForDate(auth.supabase, event_date);

  const { data, error } = await auth.supabase
    .from("tournaments")
    .insert({
      season_id: seasonId,
      name,
      slug,
      description,
      location,
      event_date,
      category,
      format,
      swiss_rounds,
      top_cut_size: format === "swiss_only" ? null : top_cut_size,
      status,
      max_players,
    })
    .select()
    .single();

  if (error) {
    if (error.code === "23505") {
      return { error: "Já existe um torneio com esse nome na mesma data." };
    }
    return { error: `Erro ao criar torneio: ${error.message}` };
  }

  revalidatePath("/", "layout");
  return { success: true, tournament: data };
}

/**
 * Altera o status de um Torneio.
 */
export async function updateTournamentStatusAction(
  tournamentId: string,
  newStatus: TournamentStatus
) {
  const auth = await requireAdmin();
  if (auth.error) return { error: auth.error };

  const { error } = await auth.supabase
    .from("tournaments")
    .update({ status: newStatus })
    .eq("id", tournamentId);

  if (error) {
    return { error: `Erro ao atualizar status: ${error.message}` };
  }

  revalidatePath("/", "layout");
  return { success: true };
}

/**
 * Exclui um Torneio e recalcula o ranking das temporadas.
 */
export async function deleteTournamentAction(tournamentId: string) {
  const auth = await requireAdmin();
  if (auth.error) return { error: auth.error };

  const { error } = await auth.supabase
    .from("tournaments")
    .delete()
    .eq("id", tournamentId);

  if (error) {
    return { error: `Erro ao excluir torneio: ${error.message}` };
  }

  await recalculateAllSeasonsRanking(auth.supabase);
  revalidatePath("/", "layout");
  return { success: true };
}

/**
 * Salva os resultados manuais/retroativos de um torneio e recalcula o ranking da temporada.
 */
export async function saveTournamentResultsAction(
  tournamentId: string,
  results: Array<{
    blader_id: string;
    final_position: number;
    swiss_wins?: number;
    is_swiss_leader?: boolean;
    points_earned?: number;
  }>
) {
  const auth = await requireAdmin();
  if (auth.error) return { error: auth.error };

  if (!tournamentId || results.length === 0) {
    return { error: "Dados de resultado inválidos." };
  }

  const { data: tournament, error: tourError } = await auth.supabase
    .from("tournaments")
    .select("*")
    .eq("id", tournamentId)
    .single();

  if (tourError || !tournament) {
    return { error: "Torneio não encontrado." };
  }

  const category: ObaTournamentCategory =
    tournament.category === "oficial" ? "oficial" : "semanal";

  const formattedResults = results.map((r) => {
    const swissWins = Math.max(0, Math.floor(r.swiss_wins ?? 0));
    const isSwissLeader = Boolean(r.is_swiss_leader);
    const calc = calculateOfficialTournamentPoints({
      category,
      format: tournament.format,
      finalPosition: r.final_position,
      swissWins,
      isSwissLeader,
    });

    const pointsEarned =
      r.points_earned !== undefined && r.points_earned !== null
        ? r.points_earned
        : calc.totalPoints;

    return {
      tournament_id: tournamentId,
      blader_id: r.blader_id,
      final_position: r.final_position,
      swiss_wins: swissWins,
      swiss_points: calc.swissPoints,
      is_swiss_leader:
        tournament.format === "swiss_only" ? false : isSwissLeader,
      swiss_leader_bonus: calc.swissLeaderBonus,
      podium_points: calc.podiumPoints,
      points_earned: pointsEarned,
    };
  });

  await auth.supabase
    .from("tournament_results")
    .delete()
    .eq("tournament_id", tournamentId);

  const { error: insertError } = await auth.supabase
    .from("tournament_results")
    .insert(formattedResults);

  if (insertError) {
    return { error: `Erro ao salvar resultados: ${insertError.message}` };
  }

  const seasonId =
    tournament.season_id ??
    (await ensureSeasonForDate(auth.supabase, tournament.event_date));

  await auth.supabase
    .from("tournaments")
    .update({ status: "finished", season_id: seasonId })
    .eq("id", tournamentId);

  if (seasonId) {
    await recalculateSeasonRanking(auth.supabase, seasonId);
  } else {
    await recalculateAllSeasonsRanking(auth.supabase);
  }

  revalidatePath("/", "layout");
  return { success: true };
}
