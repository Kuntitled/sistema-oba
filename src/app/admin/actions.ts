"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { RANKING_POINTS_BY_POSITION, DEFAULT_RANKING_POINTS } from "@/lib/constants";

/**
 * Função utilitária para recalcular todo o ranking da liga.
 */
async function recalculateAllRanking(supabase: any) {
  // 1. Busca todos os resultados de torneios
  const { data: allResults } = await supabase
    .from("tournament_results")
    .select("tournament_id, blader_id, final_position, points_earned");

  // Busca todos os bladers
  const { data: allBladers } = await supabase.from("bladers").select("id");

  if (!allBladers) return;

  const bladerStats: Record<
    string,
    { total_points: number; tournaments_played: Set<string>; best_position: number | null }
  > = {};

  // Inicializa todos com zero
  for (const b of allBladers) {
    bladerStats[b.id] = {
      total_points: 0,
      tournaments_played: new Set<string>(),
      best_position: null,
    };
  }

  // Agrega dados
  if (allResults) {
    for (const res of allResults) {
      if (!bladerStats[res.blader_id]) {
        bladerStats[res.blader_id] = {
          total_points: 0,
          tournaments_played: new Set<string>(),
          best_position: res.final_position,
        };
      }

      const stat = bladerStats[res.blader_id];
      stat.total_points += res.points_earned;
      stat.tournaments_played.add(res.tournament_id);
      if (stat.best_position === null || res.final_position < stat.best_position) {
        stat.best_position = res.final_position;
      }
    }
  }

  // Grava na tabela ranking
  for (const [bId, stat] of Object.entries(bladerStats)) {
    await supabase.from("ranking").upsert(
      {
        blader_id: bId,
        total_points: stat.total_points,
        tournaments_played: stat.tournaments_played.size,
        best_position: stat.best_position,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "blader_id" }
    );
  }
}

/**
 * Cadastra um novo Blader.
 */
export async function createBladerAction(formData: FormData) {
  const name = (formData.get("name") as string)?.trim();
  const nickname = (formData.get("nickname") as string)?.trim();
  const city = (formData.get("city") as string)?.trim() || null;
  const bio = (formData.get("bio") as string)?.trim() || null;
  const avatar_url = (formData.get("avatar_url") as string)?.trim() || null;

  if (!name || !nickname) {
    return { error: "Nome e Apelido são obrigatórios." };
  }

  const supabase = await createClient();

  const { data: blader, error } = await supabase
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
      return { error: `O apelido "${nickname}" já está em uso por outro Blader.` };
    }
    return { error: `Erro ao cadastrar Blader: ${error.message}` };
  }

  // Inicializa o ranking
  await supabase.from("ranking").insert({
    blader_id: blader.id,
    total_points: 0,
    tournaments_played: 0,
    best_position: null,
  });

  revalidatePath("/", "layout");
  return { success: true, blader };
}

/**
 * Exclui um Blader.
 */
export async function deleteBladerAction(bladerId: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("bladers").delete().eq("id", bladerId);
  if (error) {
    return { error: `Erro ao excluir Blader: ${error.message}` };
  }
  await recalculateAllRanking(supabase);
  revalidatePath("/", "layout");
  return { success: true };
}

/**
 * Cria um Torneio (futuro ou retroativo).
 */
export async function createTournamentAction(formData: FormData) {
  const name = (formData.get("name") as string)?.trim();
  const location = (formData.get("location") as string)?.trim() || null;
  const event_date = formData.get("event_date") as string;
  const format = (formData.get("format") as string) || "swiss";
  const status = (formData.get("status") as string) || "finished";
  const description = (formData.get("description") as string)?.trim() || null;
  const max_players_str = formData.get("max_players") as string;
  const max_players = max_players_str ? parseInt(max_players_str, 10) : null;

  if (!name || !event_date) {
    return { error: "Nome e Data do Torneio são obrigatórios." };
  }

  // Gera slug amigável
  const baseSlug = name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "");
  const slug = `${baseSlug}-${event_date}`;

  const supabase = await createClient();

  const { data, error } = await supabase
    .from("tournaments")
    .insert({
      name,
      slug,
      description,
      location,
      event_date,
      format: format as "swiss" | "single_elim" | "double_elim",
      status: status as "draft" | "open" | "ongoing" | "finished",
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
  newStatus: "draft" | "open" | "ongoing" | "finished"
) {
  const supabase = await createClient();

  const { error } = await supabase
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
 * Exclui um Torneio e recalcula o ranking.
 */
export async function deleteTournamentAction(tournamentId: string) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("tournaments")
    .delete()
    .eq("id", tournamentId);

  if (error) {
    return { error: `Erro ao excluir torneio: ${error.message}` };
  }

  await recalculateAllRanking(supabase);
  revalidatePath("/", "layout");
  return { success: true };
}

/**
 * Salva os resultados de um torneio e recalcula o ranking geral da liga.
 */
export async function saveTournamentResultsAction(
  tournamentId: string,
  results: Array<{
    blader_id: string;
    final_position: number;
    points_earned?: number;
  }>
) {
  if (!tournamentId || results.length === 0) {
    return { error: "Dados de resultado inválidos." };
  }

  const supabase = await createClient();

  const formattedResults = results.map((r) => {
    const points =
      r.points_earned !== undefined && r.points_earned !== null
        ? r.points_earned
        : RANKING_POINTS_BY_POSITION[r.final_position] ?? DEFAULT_RANKING_POINTS;

    return {
      tournament_id: tournamentId,
      blader_id: r.blader_id,
      final_position: r.final_position,
      points_earned: points,
    };
  });

  // Remove resultados anteriores desse torneio para recriar
  await supabase
    .from("tournament_results")
    .delete()
    .eq("tournament_id", tournamentId);

  // Insere novos resultados
  const { error: insertError } = await supabase
    .from("tournament_results")
    .insert(formattedResults);

  if (insertError) {
    return { error: `Erro ao salvar resultados: ${insertError.message}` };
  }

  // Marca como finished
  await supabase
    .from("tournaments")
    .update({ status: "finished" })
    .eq("id", tournamentId);

  // Recalcula ranking
  await recalculateAllRanking(supabase);

  revalidatePath("/", "layout");
  return { success: true };
}
