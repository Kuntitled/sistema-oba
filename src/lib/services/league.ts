import { createClient } from "@/lib/supabase/server";
import type { RankingEntry, Tournament, Blader } from "@/types/domain";

/**
 * Obtém a tabela de classificação geral da liga OBA.
 */
export async function getRanking(): Promise<RankingEntry[]> {
  try {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from("ranking")
      .select(`
        id,
        blader_id,
        total_points,
        tournaments_played,
        best_position,
        updated_at,
        bladers:blader_id (
          id,
          name,
          nickname,
          city,
          avatar_url,
          bio,
          is_active
        )
      `)
      .order("total_points", { ascending: false });

    if (error) {
      console.error("Erro ao buscar ranking:", error);
      return [];
    }

    if (!data) return [];

    return data.map((item: any, index: number) => ({
      id: item.id,
      blader_id: item.blader_id,
      total_points: item.total_points,
      tournaments_played: item.tournaments_played,
      best_position: item.best_position,
      updated_at: item.updated_at,
      position: index + 1,
      blader: Array.isArray(item.bladers) ? item.bladers[0] : item.bladers,
    }));
  } catch (err) {
    console.error("Exceção ao buscar ranking:", err);
    return [];
  }
}

/**
 * Obtém a lista de torneios (passados e agendados).
 */
export async function getTournaments(): Promise<Tournament[]> {
  try {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from("tournaments")
      .select("*")
      .order("event_date", { ascending: false });

    if (error) {
      console.error("Erro ao buscar torneios:", error);
      return [];
    }

    return (data as Tournament[]) ?? [];
  } catch (err) {
    console.error("Exceção ao buscar torneios:", err);
    return [];
  }
}

/**
 * Obtém os detalhes de um torneio específico pelo slug.
 */
export async function getTournamentBySlug(slug: string) {
  try {
    const supabase = await createClient();

    const { data: tournament, error: tourError } = await supabase
      .from("tournaments")
      .select("*")
      .eq("slug", slug)
      .single();

    if (tourError || !tournament) {
      return null;
    }

    // Busca os resultados com os bladers associados
    const { data: results, error: resError } = await supabase
      .from("tournament_results")
      .select(`
        id,
        tournament_id,
        blader_id,
        final_position,
        points_earned,
        bladers:blader_id (
          id,
          name,
          nickname,
          city,
          avatar_url
        )
      `)
      .eq("tournament_id", tournament.id)
      .order("final_position", { ascending: true });

    if (resError) {
      console.error("Erro ao buscar resultados do torneio:", resError);
    }

    const formattedResults = (results ?? []).map((r: any) => ({
      id: r.id,
      tournament_id: r.tournament_id,
      blader_id: r.blader_id,
      final_position: r.final_position,
      points_earned: r.points_earned,
      blader: Array.isArray(r.bladers) ? r.bladers[0] : r.bladers,
    }));

    return {
      tournament: tournament as Tournament,
      results: formattedResults,
    };
  } catch (err) {
    console.error("Exceção ao buscar torneio por slug:", err);
    return null;
  }
}

/**
 * Obtém todos os Bladers cadastrados.
 */
export async function getBladers(): Promise<Blader[]> {
  try {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from("bladers")
      .select(`
        *,
        ranking (
          total_points,
          tournaments_played,
          best_position
        )
      `)
      .eq("is_active", true)
      .order("name", { ascending: true });

    if (error) {
      console.error("Erro ao buscar bladers:", error);
      return [];
    }

    return (data ?? []).map((b: any) => ({
      ...b,
      ranking: Array.isArray(b.ranking) ? b.ranking[0] : b.ranking,
    }));
  } catch (err) {
    console.error("Exceção ao buscar bladers:", err);
    return [];
  }
}
