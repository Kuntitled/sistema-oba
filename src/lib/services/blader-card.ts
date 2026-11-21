import type { SupabaseClient } from "@supabase/supabase-js";
import { sortSeasonRankingEntries } from "@/lib/engine/tournament-engine";
import { inferComboSystem } from "@/lib/combo-rules";
import { isMissingTableError, isValidUuid } from "@/lib/services/arena-queries";
import type { Database } from "@/types/database";
import type {
  BladerCardProfile,
  BladerRow,
  PartRow,
  RankingEntry,
  SeasonRow,
} from "@/types/domain";

export async function getBladerCardProfile(
  supabase: SupabaseClient<Database>,
  bladerId: string
): Promise<BladerCardProfile | null> {
  if (!isValidUuid(bladerId)) {
    return null;
  }

  const { data: blader, error: bladerError } = await supabase
    .from("bladers")
    .select("*")
    .eq("id", bladerId)
    .maybeSingle();

  if (bladerError || !blader) {
    return null;
  }

  // Temporada ativa (ou mais recente)
  const { data: seasons, error: seasonsError } = await supabase
    .from("seasons")
    .select("*")
    .order("year", { ascending: false });

  let targetSeason: SeasonRow | null = null;
  if (!seasonsError && seasons && seasons.length > 0) {
    targetSeason = seasons.find((s) => s.is_active) ?? seasons[0] ?? null;
  }

  let position: number | null = null;
  let totalPoints = 0;
  let tournamentsPlayed = 0;
  let swissWins = 0;
  let podiumsCount = 0;
  let firstPlaces = 0;
  let secondPlaces = 0;
  let thirdPlaces = 0;

  if (targetSeason) {
    const [{ data: rankingRows }, { data: activeBladers }] = await Promise.all([
      supabase
        .from("ranking")
        .select("*")
        .eq("season_id", targetSeason.id),
      supabase.from("bladers").select("*").eq("is_active", true),
    ]);

    const activeById = new Map<string, BladerRow>();
    for (const b of activeBladers ?? []) {
      activeById.set(b.id, b);
    }

    const entries: RankingEntry[] = (rankingRows ?? [])
      .filter((r) => activeById.has(r.blader_id))
      .map((r) => ({
        ...r,
        blader: activeById.get(r.blader_id),
      }));

    const sorted = sortSeasonRankingEntries(entries);
    const found = sorted.find((entry) => entry.blader_id === bladerId);

    if (found) {
      position = found.position ?? null;
      totalPoints = found.total_points;
      tournamentsPlayed = found.tournaments_played;
      swissWins = found.swiss_wins;
      podiumsCount = found.podiums_count;
      firstPlaces = found.first_places;
      secondPlaces = found.second_places;
      thirdPlaces = found.third_places;
    }
  } else if (isMissingTableError(seasonsError)) {
    const { data: legacyRow } = await supabase
      .from("ranking")
      .select("*")
      .eq("blader_id", bladerId)
      .maybeSingle();
    if (legacyRow) {
      totalPoints = legacyRow.total_points;
      tournamentsPlayed = legacyRow.tournaments_played;
      swissWins = legacyRow.swiss_wins ?? 0;
      podiumsCount = legacyRow.podiums_count ?? 0;
      firstPlaces = legacyRow.first_places ?? 0;
      secondPlaces = legacyRow.second_places ?? 0;
      thirdPlaces = legacyRow.third_places ?? 0;
    }
  }

  // Combo favorito (se migrations 005–008 já aplicadas e colunas preenchidas)
  const favIds = [
    blader.favorite_blade_id,
    blader.favorite_lock_chip_id,
    blader.favorite_over_blade_id,
    blader.favorite_assist_blade_id,
    blader.favorite_ratchet_id,
    blader.favorite_bit_id,
  ].filter((id): id is string => Boolean(id));

  const partsById = new Map<string, PartRow>();
  if (favIds.length > 0) {
    const { data: partRows, error: partsError } = await supabase
      .from("parts_catalog")
      .select("*")
      .in("id", favIds);

    if (!partsError && partRows) {
      for (const p of partRows) {
        partsById.set(p.id, p);
      }
    }
  }

  const favoriteBlade = blader.favorite_blade_id
    ? (partsById.get(blader.favorite_blade_id) ?? null)
    : null;
  const favoriteLockChip = blader.favorite_lock_chip_id
    ? (partsById.get(blader.favorite_lock_chip_id) ?? null)
    : null;
  const favoriteOverBlade = blader.favorite_over_blade_id
    ? (partsById.get(blader.favorite_over_blade_id) ?? null)
    : null;
  const favoriteAssistBlade = blader.favorite_assist_blade_id
    ? (partsById.get(blader.favorite_assist_blade_id) ?? null)
    : null;
  const favoriteRatchet = blader.favorite_ratchet_id
    ? (partsById.get(blader.favorite_ratchet_id) ?? null)
    : null;
  const favoriteBit = blader.favorite_bit_id
    ? (partsById.get(blader.favorite_bit_id) ?? null)
    : null;

  const favoriteSystem = inferComboSystem({
    system: blader.favorite_system,
    blade: favoriteBlade,
    lockChip: favoriteLockChip,
    overBlade: favoriteOverBlade,
    assistBlade: favoriteAssistBlade,
  });

  return {
    blader,
    seasonName: targetSeason?.name ?? null,
    position,
    totalPoints,
    tournamentsPlayed,
    swissWins,
    podiumsCount,
    firstPlaces,
    secondPlaces,
    thirdPlaces,
    favoriteCombo: {
      system: favoriteSystem,
      blade: favoriteBlade,
      lockChip: favoriteLockChip,
      overBlade: favoriteOverBlade,
      assistBlade: favoriteAssistBlade,
      ratchet: favoriteRatchet,
      bit: favoriteBit,
    },
    mostUsedCombo: null,
  };
}
