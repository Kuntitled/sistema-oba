import { createClient } from "@/lib/supabase/server";
import { sortSeasonRankingEntries } from "@/lib/engine/tournament-engine";
import { isMissingTableError } from "@/lib/services/arena-queries";
import type {
  Blader,
  BladerRow,
  RankingEntry,
  Season,
  Tournament,
  TournamentResult,
} from "@/types/domain";

export interface SeasonRankingData {
  ranking: RankingEntry[];
  seasons: Season[];
  activeSeason: Season | null;
  selectedSeason: Season | null;
  schemaMissing: boolean;
}

/**
 * Lista todas as temporadas cadastradas (mais recente primeiro).
 */
export async function getSeasons(): Promise<{
  seasons: Season[];
  schemaMissing: boolean;
}> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("seasons")
      .select("*")
      .order("year", { ascending: false });

    if (error) {
      if (isMissingTableError(error)) {
        return { seasons: [], schemaMissing: true };
      }
      console.error("Erro ao buscar temporadas:", error);
      return { seasons: [], schemaMissing: false };
    }

    return { seasons: data ?? [], schemaMissing: false };
  } catch (err) {
    console.error("Exceção ao buscar temporadas:", err);
    return { seasons: [], schemaMissing: false };
  }
}

export interface SeasonWithStats extends Season {
  tournamentsCount: number;
  finishedTournamentsCount: number;
  rankedBladersCount: number;
}

/**
 * Lista todas as temporadas com métricas resumidas de torneios e competidores.
 */
export async function getSeasonsWithStats(): Promise<{
  seasons: SeasonWithStats[];
  schemaMissing: boolean;
}> {
  const { seasons, schemaMissing } = await getSeasons();
  if (schemaMissing || seasons.length === 0) {
    return { seasons: [], schemaMissing };
  }

  try {
    const supabase = await createClient();
    const [{ data: tournamentRows }, { data: rankingRows }] = await Promise.all([
      supabase.from("tournaments").select("id, season_id, status"),
      supabase.from("ranking").select("id, season_id, total_points"),
    ]);

    const tournamentStats = new Map<
      string,
      { total: number; finished: number }
    >();
    for (const t of tournamentRows ?? []) {
      if (!t.season_id) continue;
      const entry = tournamentStats.get(t.season_id) ?? {
        total: 0,
        finished: 0,
      };
      entry.total += 1;
      if (t.status === "finished") entry.finished += 1;
      tournamentStats.set(t.season_id, entry);
    }

    const rankingCounts = new Map<string, number>();
    for (const r of rankingRows ?? []) {
      if (r.total_points > 0) {
        rankingCounts.set(r.season_id, (rankingCounts.get(r.season_id) ?? 0) + 1);
      }
    }

    return {
      seasons: seasons.map((season) => {
        const tStat = tournamentStats.get(season.id);
        return {
          ...season,
          tournamentsCount: tStat?.total ?? 0,
          finishedTournamentsCount: tStat?.finished ?? 0,
          rankedBladersCount: rankingCounts.get(season.id) ?? 0,
        };
      }),
      schemaMissing: false,
    };
  } catch (err) {
    console.error("Exceção ao buscar estatísticas das temporadas:", err);
    return {
      seasons: seasons.map((season) => ({
        ...season,
        tournamentsCount: 0,
        finishedTournamentsCount: 0,
        rankedBladersCount: 0,
      })),
      schemaMissing: false,
    };
  }
}

/**
 * Obtém o ranking oficial de uma temporada (ou da temporada ativa por padrão),
 * ordenado pelos 4 critérios oficiais de desempate da OBA.
 */
export async function getSeasonRanking(
  seasonParam?: string
): Promise<SeasonRankingData> {
  try {
    const supabase = await createClient();
    const { seasons, schemaMissing } = await getSeasons();

    if (schemaMissing) {
      // Fallback seguro enquanto migration 004 não foi aplicada
      const { data: legacyRows } = await supabase
        .from("ranking")
        .select("*")
        .order("total_points", { ascending: false });

      const bladerIds = (legacyRows ?? []).map((r) => r.blader_id);
      const { data: bladerRows } =
        bladerIds.length > 0
          ? await supabase.from("bladers").select("*").in("id", bladerIds)
          : { data: [] as BladerRow[] };

      const bladersById = new Map<string, BladerRow>();
      for (const b of bladerRows ?? []) {
        bladersById.set(b.id, b);
      }

      const entries: RankingEntry[] = (legacyRows ?? []).map((r, index) => ({
        ...r,
        season_id: r.season_id ?? "",
        swiss_wins: r.swiss_wins ?? 0,
        podiums_count: r.podiums_count ?? 0,
        first_places: r.first_places ?? 0,
        second_places: r.second_places ?? 0,
        third_places: r.third_places ?? 0,
        best_podium:
          r.best_podium ??
          (r.best_position && r.best_position <= 3 ? r.best_position : null),
        created_at: r.created_at ?? r.updated_at,
        position: index + 1,
        blader: bladersById.get(r.blader_id),
      }));

      return {
        ranking: sortSeasonRankingEntries(entries),
        seasons: [],
        activeSeason: null,
        selectedSeason: null,
        schemaMissing: true,
      };
    }

    const activeSeason =
      seasons.find((s) => s.is_active) ?? seasons[0] ?? null;
    const trimmedParam = seasonParam?.trim();
    const selectedSeason =
      (trimmedParam
        ? seasons.find(
            (s) => String(s.year) === trimmedParam || s.id === trimmedParam
          )
        : null) ?? activeSeason;

    if (!selectedSeason) {
      return {
        ranking: [],
        seasons,
        activeSeason,
        selectedSeason: null,
        schemaMissing: false,
      };
    }

    const { data: rankingRows, error } = await supabase
      .from("ranking")
      .select("*")
      .eq("season_id", selectedSeason.id);

    if (error) {
      console.error("Erro ao buscar ranking da temporada:", error);
      return {
        ranking: [],
        seasons,
        activeSeason,
        selectedSeason,
        schemaMissing: false,
      };
    }

    const rows = rankingRows ?? [];
    const bladerIds = Array.from(new Set(rows.map((r) => r.blader_id)));
    const { data: bladerRows } =
      bladerIds.length > 0
        ? await supabase
            .from("bladers")
            .select("*")
            .in("id", bladerIds)
            .eq("is_active", true)
        : { data: [] as BladerRow[] };

    const bladersById = new Map<string, BladerRow>();
    for (const b of bladerRows ?? []) {
      bladersById.set(b.id, b);
    }

    const entries: RankingEntry[] = rows
      .filter((r) => bladersById.has(r.blader_id))
      .map((r) => ({
        ...r,
        blader: bladersById.get(r.blader_id),
        season: selectedSeason,
      }));

    return {
      ranking: sortSeasonRankingEntries(entries),
      seasons,
      activeSeason,
      selectedSeason,
      schemaMissing: false,
    };
  } catch (err) {
    console.error("Exceção ao buscar ranking por temporada:", err);
    return {
      ranking: [],
      seasons: [],
      activeSeason: null,
      selectedSeason: null,
      schemaMissing: false,
    };
  }
}

/**
 * Atalho compatível para obter o ranking da temporada ativa.
 */
export async function getRanking(seasonParam?: string): Promise<RankingEntry[]> {
  const { ranking } = await getSeasonRanking(seasonParam);
  return ranking;
}

/**
 * Obtém a lista de torneios (passados e agendados).
 */
export async function getTournaments(): Promise<Tournament[]> {
  try {
    const supabase = await createClient();

    const [{ data, error }, { seasons }] = await Promise.all([
      supabase
        .from("tournaments")
        .select("*")
        .order("event_date", { ascending: false }),
      getSeasons(),
    ]);

    if (error) {
      console.error("Erro ao buscar torneios:", error);
      return [];
    }

    const seasonsById = new Map<string, Season>();
    for (const s of seasons) {
      seasonsById.set(s.id, s);
    }

    return (data ?? []).map((t) => ({
      ...t,
      category: t.category ?? "semanal",
      swiss_rounds: t.swiss_rounds ?? 4,
      season: t.season_id ? (seasonsById.get(t.season_id) ?? null) : null,
    }));
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

    const [seasonRes, resultsRes] = await Promise.all([
      tournament.season_id
        ? supabase
            .from("seasons")
            .select("*")
            .eq("id", tournament.season_id)
            .maybeSingle()
        : Promise.resolve({ data: null as Season | null, error: null }),
      supabase
        .from("tournament_results")
        .select("*")
        .eq("tournament_id", tournament.id)
        .order("final_position", { ascending: true }),
    ]);

    if (resultsRes.error) {
      console.error("Erro ao buscar resultados do torneio:", resultsRes.error);
    }

    const rawResults = resultsRes.data ?? [];
    const bladerIds = Array.from(new Set(rawResults.map((r) => r.blader_id)));
    const { data: bladerRows } =
      bladerIds.length > 0
        ? await supabase.from("bladers").select("*").in("id", bladerIds)
        : { data: [] as BladerRow[] };

    const bladersById = new Map<string, BladerRow>();
    for (const b of bladerRows ?? []) {
      bladersById.set(b.id, b);
    }

    const formattedResults: TournamentResult[] = rawResults.map((r) => ({
      ...r,
      swiss_wins: r.swiss_wins ?? 0,
      swiss_points: r.swiss_points ?? 0,
      is_swiss_leader: r.is_swiss_leader ?? false,
      swiss_leader_bonus: r.swiss_leader_bonus ?? 0,
      podium_points: r.podium_points ?? 0,
      blader: bladersById.get(r.blader_id),
    }));

    const hydratedTournament: Tournament = {
      ...tournament,
      category: tournament.category ?? "semanal",
      swiss_rounds: tournament.swiss_rounds ?? 4,
      season: seasonRes.data ?? null,
    };

    return {
      tournament: hydratedTournament,
      results: formattedResults,
    };
  } catch (err) {
    console.error("Exceção ao buscar torneio por slug:", err);
    return null;
  }
}

/**
 * Obtém todos os Bladers cadastrados com pontuação da temporada ativa.
 */
export async function getBladers(options?: {
  includeInactive?: boolean;
}): Promise<Blader[]> {
  try {
    const supabase = await createClient();

    let bladersQuery = supabase
      .from("bladers")
      .select("*")
      .order("name", { ascending: true });

    if (!options?.includeInactive) {
      bladersQuery = bladersQuery.eq("is_active", true);
    }

    const [{ data: bladerRows, error }, { seasons, schemaMissing }] =
      await Promise.all([bladersQuery, getSeasons()]);

    if (error) {
      console.error("Erro ao buscar bladers:", error);
      return [];
    }

    const activeSeason =
      seasons.find((s) => s.is_active) ?? seasons[0] ?? null;

    let rankingQuery = supabase.from("ranking").select("*");
    if (!schemaMissing && activeSeason) {
      rankingQuery = rankingQuery.eq("season_id", activeSeason.id);
    }

    const { data: rankingRows } = await rankingQuery;
    const rankingByBladerId = new Map<string, RankingEntry>();
    for (const r of rankingRows ?? []) {
      rankingByBladerId.set(r.blader_id, {
        ...r,
        season_id: r.season_id ?? activeSeason?.id ?? "",
        swiss_wins: r.swiss_wins ?? 0,
        podiums_count: r.podiums_count ?? 0,
        first_places: r.first_places ?? 0,
        second_places: r.second_places ?? 0,
        third_places: r.third_places ?? 0,
        best_podium: r.best_podium ?? null,
        created_at: r.created_at ?? r.updated_at,
      });
    }

    return (bladerRows ?? []).map((b) => ({
      ...b,
      ranking: rankingByBladerId.get(b.id),
    }));
  } catch (err) {
    console.error("Exceção ao buscar bladers:", err);
    return [];
  }
}
