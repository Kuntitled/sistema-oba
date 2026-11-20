import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

export async function ensureSeasonForDate(
  supabase: SupabaseClient<Database>,
  eventDate: string
): Promise<string | null> {
  const parsedYear = parseInt((eventDate ?? "").slice(0, 4), 10);
  const year =
    !isNaN(parsedYear) && parsedYear >= 2020 && parsedYear <= 2100
      ? parsedYear
      : new Date().getFullYear();

  const { data: existing } = await supabase
    .from("seasons")
    .select("id")
    .eq("year", year)
    .maybeSingle();

  if (existing?.id) {
    return existing.id;
  }

  const { data: active } = await supabase
    .from("seasons")
    .select("id")
    .eq("is_active", true)
    .maybeSingle();

  const { data: created, error } = await supabase
    .from("seasons")
    .insert({
      year,
      name: `Temporada ${year}`,
      starts_at: `${year}-01-01`,
      ends_at: `${year}-12-31`,
      is_active: !active,
    })
    .select("id")
    .single();

  if (error) {
    console.error("Erro ao criar temporada automática:", error);
    return active?.id ?? null;
  }

  return created.id;
}

export async function recalculateSeasonRanking(
  supabase: SupabaseClient<Database>,
  seasonId: string
): Promise<void> {
  const { data: season } = await supabase
    .from("seasons")
    .select("*")
    .eq("id", seasonId)
    .maybeSingle();

  if (!season) return;

  const [tournamentsRes, bladersRes, existingRankingRes] = await Promise.all([
    supabase
      .from("tournaments")
      .select("id")
      .eq("season_id", seasonId),
    supabase.from("bladers").select("id, is_active"),
    supabase
      .from("ranking")
      .select("blader_id")
      .eq("season_id", seasonId),
  ]);

  const tournamentIds = (tournamentsRes.data ?? []).map((t) => t.id);

  const { data: seasonResults } =
    tournamentIds.length > 0
      ? await supabase
          .from("tournament_results")
          .select(
            "tournament_id, blader_id, final_position, swiss_wins, points_earned"
          )
          .in("tournament_id", tournamentIds)
      : { data: [] };

  interface SeasonStat {
    total_points: number;
    tournaments_played: Set<string>;
    swiss_wins: number;
    first_places: number;
    second_places: number;
    third_places: number;
    best_position: number | null;
    best_podium: number | null;
  }

  const stats = new Map<string, SeasonStat>();
  const ensureStat = (bladerId: string) => {
    const existing = stats.get(bladerId);
    if (existing) return existing;
    const created: SeasonStat = {
      total_points: 0,
      tournaments_played: new Set<string>(),
      swiss_wins: 0,
      first_places: 0,
      second_places: 0,
      third_places: 0,
      best_position: null,
      best_podium: null,
    };
    stats.set(bladerId, created);
    return created;
  };

  if (season.is_active) {
    for (const b of bladersRes.data ?? []) {
      if (b.is_active) {
        ensureStat(b.id);
      }
    }
  }

  for (const r of existingRankingRes.data ?? []) {
    ensureStat(r.blader_id);
  }

  for (const res of seasonResults ?? []) {
    const stat = ensureStat(res.blader_id);
    stat.total_points += res.points_earned ?? 0;
    stat.tournaments_played.add(res.tournament_id);
    stat.swiss_wins += res.swiss_wins ?? 0;

    if (res.final_position === 1) stat.first_places += 1;
    if (res.final_position === 2) stat.second_places += 1;
    if (res.final_position === 3) stat.third_places += 1;

    if (
      stat.best_position === null ||
      res.final_position < stat.best_position
    ) {
      stat.best_position = res.final_position;
    }

    if (
      res.final_position >= 1 &&
      res.final_position <= 3 &&
      (stat.best_podium === null || res.final_position < stat.best_podium)
    ) {
      stat.best_podium = res.final_position;
    }
  }

  if (stats.size === 0) return;

  const nowIso = new Date().toISOString();
  const rows = Array.from(stats.entries()).map(([bladerId, s]) => ({
    season_id: seasonId,
    blader_id: bladerId,
    total_points: s.total_points,
    tournaments_played: s.tournaments_played.size,
    swiss_wins: s.swiss_wins,
    first_places: s.first_places,
    second_places: s.second_places,
    third_places: s.third_places,
    podiums_count: s.first_places + s.second_places + s.third_places,
    best_podium: s.best_podium,
    best_position: s.best_position,
    updated_at: nowIso,
  }));

  const { error: upsertError } = await supabase
    .from("ranking")
    .upsert(rows, { onConflict: "season_id,blader_id" });

  if (upsertError) {
    console.error("Erro ao atualizar ranking da temporada:", upsertError);
  }
}

export async function recalculateAllSeasonsRanking(
  supabase: SupabaseClient<Database>
): Promise<void> {
  const { data: seasons } = await supabase.from("seasons").select("id");
  for (const s of seasons ?? []) {
    await recalculateSeasonRanking(supabase, s.id);
  }
}
