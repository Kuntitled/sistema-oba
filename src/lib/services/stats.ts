import type { SupabaseClient } from "@supabase/supabase-js";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { formatComboDisplay, inferComboSystem } from "@/lib/combo-rules";
import { isValidUuid } from "@/lib/services/arena-queries";
import type { Database } from "@/types/database";
import {
  BEY_SYSTEM_ORDER,
  PART_TYPE_ORDER,
  type BeySystem,
  type FinishType,
  type MatchGameRow,
  type MatchRow,
  type PartLine,
  type PartRow,
  type PartType,
  type RegistrationComboRow,
  type RulesetRow,
  type Season,
  type TournamentCategory,
  type TournamentRow,
} from "@/types/domain";

export type StatsCategoryFilter =
  | "ranked"
  | "all"
  | "oficial"
  | "semanal"
  | "amistoso";

export interface FinishCounts {
  xtreme: number;
  burst: number;
  over: number;
  spin: number;
}

export interface PartPerformanceStat {
  partId: string;
  name: string;
  aliases: string[];
  partType: PartType;
  line: PartLine | null;
  roundsPlayed: number;
  wins: number;
  losses: number;
  winRate: number;
  pointsScored: number;
  pointsConceded: number;
  avgPointsPerRound: number;
  finishesScored: FinishCounts;
  finishesConceded: FinishCounts;
  deckUsageCount: number;
}

export interface SystemUsageStat {
  system: BeySystem;
  combosCount: number;
  roundsPlayed: number;
  wins: number;
  winRate: number;
  sharePct: number;
}

export interface CollectionCensusPartStat {
  partId: string;
  name: string;
  aliases: string[];
  partType: PartType;
  line: PartLine | null;
  ownersCount: number;
  sharePct: number;
}

export interface CollectionCensusData {
  totalEntries: number;
  bladersWithCollectionCount: number;
  uniquePartsOwnedCount: number;
  byPartType: Array<{
    partType: PartType;
    totalOwned: number;
    uniquePartsCount: number;
  }>;
  byLine: Array<{
    line: string;
    totalOwned: number;
    uniquePartsCount: number;
  }>;
  parts: CollectionCensusPartStat[];
}

export interface BladerSimpleOption {
  id: string;
  name: string;
  nickname: string;
  avatar_url: string | null;
}

export interface RegionalStatsOverview {
  tournamentsCount: number;
  matchesCount: number;
  roundsCount: number;
  trackedComboRoundsCount: number;
  approvedDecklistsCount: number;
  registeredCombosCount: number;
  finishes: FinishCounts;
  systemsUsage: SystemUsageStat[];
}

export interface RegionalStatsData {
  seasons: Season[];
  rulesets: RulesetRow[];
  selectedSeasonId: string;
  selectedCategory: StatsCategoryFilter;
  selectedRulesetId: string;
  overview: RegionalStatsOverview;
  partPerformance: PartPerformanceStat[];
  collectionCensus: CollectionCensusData;
  bladers: BladerSimpleOption[];
}

export interface HeadToHeadMatchItem {
  matchId: string;
  tournamentId: string;
  tournamentName: string;
  tournamentSlug: string;
  tournamentDate: string;
  tournamentCategory: TournamentCategory;
  stage: "swiss" | "top_cut";
  round: number;
  bracketLabel: string | null;
  scoreA: number;
  scoreB: number;
  winnerId: string | null;
  finishesA: FinishCounts;
  finishesB: FinishCounts;
}

export interface HeadToHeadStatsData {
  bladerA: BladerSimpleOption;
  bladerB: BladerSimpleOption;
  totalMatches: number;
  aWins: number;
  bWins: number;
  aWinRate: number;
  bWinRate: number;
  totalPointsA: number;
  totalPointsB: number;
  finishesA: FinishCounts;
  finishesB: FinishCounts;
  matches: HeadToHeadMatchItem[];
}

export interface TournamentComboUsageItem {
  signature: string;
  system: BeySystem | null;
  summaryText: string;
  count: number;
  sharePct: number;
  topCutCount: number;
  podiumCount: number;
}

export interface TournamentPodiumDeckItem {
  bladerId: string;
  nickname: string;
  name: string;
  avatarUrl: string | null;
  finalPosition: number | null;
  inTopCut: boolean;
  combos: Array<{
    id: string;
    slotNumber: number;
    system: BeySystem | null;
    summaryText: string;
  }>;
}

export interface TournamentPartUsageItem {
  partId: string;
  name: string;
  aliases: string[];
  partType: PartType;
  line: PartLine | null;
  count: number;
  sharePct: number;
}

export interface TournamentMetaBreakdown {
  tournamentId: string;
  approvedDecklistsCount: number;
  registeredCombosCount: number;
  matchesCount: number;
  roundsCount: number;
  trackedComboRoundsCount: number;
  finishes: FinishCounts;
  systemsUsage: SystemUsageStat[];
  comboRanking: TournamentComboUsageItem[];
  topCutDecks: TournamentPodiumDeckItem[];
  topPartsByGroup: {
    blades: TournamentPartUsageItem[];
    ratchets: TournamentPartUsageItem[];
    bits: TournamentPartUsageItem[];
    cxParts: TournamentPartUsageItem[];
  };
  partPerformance: PartPerformanceStat[];
}

function emptyFinishes(): FinishCounts {
  return { xtreme: 0, burst: 0, over: 0, spin: 0 };
}

function addFinish(
  counts: FinishCounts,
  finishType: FinishType | string
): void {
  if (finishType === "xtreme") counts.xtreme += 1;
  else if (finishType === "burst") counts.burst += 1;
  else if (finishType === "over") counts.over += 1;
  else if (finishType === "spin") counts.spin += 1;
}

const PAGE_SIZE = 1000;

async function fetchAllPages<T>(
  queryBuilder: (
    from: number,
    to: number
  ) => PromiseLike<{ data: T[] | null; error: unknown }>
): Promise<T[]> {
  const rows: T[] = [];
  let from = 0;

  while (true) {
    const to = from + PAGE_SIZE - 1;
    const { data, error } = await queryBuilder(from, to);
    if (error || !data || data.length === 0) {
      break;
    }
    rows.push(...data);
    if (data.length < PAGE_SIZE) {
      break;
    }
    from += PAGE_SIZE;
  }

  return rows;
}

function getComboPartIds(combo: RegistrationComboRow): string[] {
  const ids = [
    combo.lock_chip_id,
    combo.over_blade_id,
    combo.blade_id,
    combo.assist_blade_id,
    combo.ratchet_id,
    combo.bit_id,
  ].filter((id): id is string => Boolean(id));
  return Array.from(new Set(ids));
}

function buildComboSignatureAndDisplay(
  combo: RegistrationComboRow,
  partsById: Map<string, PartRow>
) {
  const blade = combo.blade_id ? (partsById.get(combo.blade_id) ?? null) : null;
  const lockChip = combo.lock_chip_id
    ? (partsById.get(combo.lock_chip_id) ?? null)
    : null;
  const overBlade = combo.over_blade_id
    ? (partsById.get(combo.over_blade_id) ?? null)
    : null;
  const assistBlade = combo.assist_blade_id
    ? (partsById.get(combo.assist_blade_id) ?? null)
    : null;
  const ratchet = combo.ratchet_id
    ? (partsById.get(combo.ratchet_id) ?? null)
    : null;
  const bit = combo.bit_id ? (partsById.get(combo.bit_id) ?? null) : null;

  const system = inferComboSystem({
    system: combo.system,
    blade,
    lockChip,
    overBlade,
    assistBlade,
  });

  const display = formatComboDisplay({
    system,
    blade,
    lockChip,
    overBlade,
    assistBlade,
    ratchet,
    bit,
  });

  const signature = [
    system ?? "",
    combo.lock_chip_id ?? "",
    combo.over_blade_id ?? "",
    combo.blade_id ?? "",
    combo.assist_blade_id ?? "",
    combo.ratchet_id ?? "",
    combo.bit_id ?? "",
  ].join("|");

  return {
    system,
    signature,
    summaryText: display.summaryText,
  };
}

/**
 * Helper puro compartilhado para agregar performance por peça e sistema
 * a partir de decklists aprovadas e lances (match_games).
 */
export function computePartPerformance(params: {
  partsById: Map<string, PartRow>;
  combosById: Map<string, RegistrationComboRow>;
  matchesById: Map<string, MatchRow>;
  games: MatchGameRow[];
}): {
  partPerformance: PartPerformanceStat[];
  systemsUsage: SystemUsageStat[];
  trackedComboRoundsCount: number;
  finishes: FinishCounts;
} {
  const { partsById, combosById, matchesById, games } = params;

  type MutablePartAcc = {
    part: PartRow;
    wins: number;
    losses: number;
    pointsScored: number;
    pointsConceded: number;
    finishesScored: FinishCounts;
    finishesConceded: FinishCounts;
    deckUsageCount: number;
  };

  const partAccMap = new Map<string, MutablePartAcc>();
  const ensurePartAcc = (partId: string): MutablePartAcc | null => {
    const part = partsById.get(partId);
    if (!part) return null;
    let existing = partAccMap.get(partId);
    if (!existing) {
      existing = {
        part,
        wins: 0,
        losses: 0,
        pointsScored: 0,
        pointsConceded: 0,
        finishesScored: emptyFinishes(),
        finishesConceded: emptyFinishes(),
        deckUsageCount: 0,
      };
      partAccMap.set(partId, existing);
    }
    return existing;
  };

  const systemAcc = new Map<
    BeySystem,
    { combosCount: number; wins: number; roundsPlayed: number }
  >();
  for (const sys of BEY_SYSTEM_ORDER) {
    systemAcc.set(sys, { combosCount: 0, wins: 0, roundsPlayed: 0 });
  }

  const comboSystemById = new Map<string, BeySystem | null>();
  const comboPartIdsById = new Map<string, string[]>();

  for (const combo of combosById.values()) {
    const uniqueParts = getComboPartIds(combo);
    comboPartIdsById.set(combo.id, uniqueParts);

    const { system } = buildComboSignatureAndDisplay(combo, partsById);
    comboSystemById.set(combo.id, system);

    // Contabiliza uso em decks/sistemas apenas para a montagem ativa atual (evita duplicação por remontagem)
    if (combo.is_active !== false) {
      for (const partId of uniqueParts) {
        const acc = ensurePartAcc(partId);
        if (acc) acc.deckUsageCount += 1;
      }
      if (system) {
        const sysEntry = systemAcc.get(system);
        if (sysEntry) sysEntry.combosCount += 1;
      }
    }
  }

  const finishes = emptyFinishes();
  let trackedComboRoundsCount = 0;

  for (const game of games) {
    if (game.finish_type === "draw") continue;
    addFinish(finishes, game.finish_type);

    const match = matchesById.get(game.match_id);
    if (!match || !game.scoring_player_id) continue;

    const p1Scored = game.scoring_player_id === match.player1_id;
    const p2Scored = game.scoring_player_id === match.player2_id;
    if (!p1Scored && !p2Scored) continue;

    const p1Combo =
      game.player1_combo_id && combosById.has(game.player1_combo_id)
        ? game.player1_combo_id
        : null;
    const p2Combo =
      game.player2_combo_id && combosById.has(game.player2_combo_id)
        ? game.player2_combo_id
        : null;

    if (p1Combo || p2Combo) {
      trackedComboRoundsCount += 1;
    }

    const applyComboRound = (comboId: string | null, wonRound: boolean) => {
      if (!comboId) return;
      const partIds = comboPartIdsById.get(comboId) ?? [];
      for (const partId of partIds) {
        const acc = ensurePartAcc(partId);
        if (!acc) continue;
        if (wonRound) {
          acc.wins += 1;
          acc.pointsScored += game.points_awarded;
          addFinish(acc.finishesScored, game.finish_type);
        } else {
          acc.losses += 1;
          acc.pointsConceded += game.points_awarded;
          addFinish(acc.finishesConceded, game.finish_type);
        }
      }

      const sys = comboSystemById.get(comboId) ?? null;
      if (sys) {
        const sysEntry = systemAcc.get(sys);
        if (sysEntry) {
          sysEntry.roundsPlayed += 1;
          if (wonRound) sysEntry.wins += 1;
        }
      }
    };

    applyComboRound(p1Combo, p1Scored);
    applyComboRound(p2Combo, p2Scored);
  }

  const partPerformance: PartPerformanceStat[] = Array.from(partAccMap.values())
    .map((acc) => {
      const roundsPlayed = acc.wins + acc.losses;
      return {
        partId: acc.part.id,
        name: acc.part.name,
        aliases: acc.part.aliases ?? [],
        partType: acc.part.part_type,
        line: acc.part.line,
        roundsPlayed,
        wins: acc.wins,
        losses: acc.losses,
        winRate: roundsPlayed > 0 ? (acc.wins / roundsPlayed) * 100 : 0,
        pointsScored: acc.pointsScored,
        pointsConceded: acc.pointsConceded,
        avgPointsPerRound:
          roundsPlayed > 0 ? acc.pointsScored / roundsPlayed : 0,
        finishesScored: acc.finishesScored,
        finishesConceded: acc.finishesConceded,
        deckUsageCount: acc.deckUsageCount,
      };
    })
    .sort((a, b) => {
      if (b.roundsPlayed !== a.roundsPlayed) {
        return b.roundsPlayed - a.roundsPlayed;
      }
      if (b.deckUsageCount !== a.deckUsageCount) {
        return b.deckUsageCount - a.deckUsageCount;
      }
      return a.name.localeCompare(b.name, "pt-BR");
    });

  const totalSystemCombos = Array.from(systemAcc.values()).reduce(
    (sum, item) => sum + item.combosCount,
    0
  );

  const systemsUsage: SystemUsageStat[] = BEY_SYSTEM_ORDER.map((system) => {
    const item = systemAcc.get(system) ?? {
      combosCount: 0,
      wins: 0,
      roundsPlayed: 0,
    };
    return {
      system,
      combosCount: item.combosCount,
      roundsPlayed: item.roundsPlayed,
      wins: item.wins,
      winRate: item.roundsPlayed > 0 ? (item.wins / item.roundsPlayed) * 100 : 0,
      sharePct:
        totalSystemCombos > 0
          ? (item.combosCount / totalSystemCombos) * 100
          : 0,
    };
  });

  return {
    partPerformance,
    systemsUsage,
    trackedComboRoundsCount,
    finishes,
  };
}

function filterEligibleTournaments(
  tournaments: TournamentRow[],
  filters: {
    seasonId: string;
    category: StatsCategoryFilter;
    rulesetId: string;
  }
): TournamentRow[] {
  return tournaments.filter((t) => {
    if (t.status !== "ongoing" && t.status !== "finished") return false;

    if (filters.seasonId !== "all" && t.season_id !== filters.seasonId) {
      return false;
    }

    const cat = t.category ?? "semanal";
    if (filters.category === "ranked") {
      if (cat !== "semanal" && cat !== "oficial") return false;
    } else if (filters.category !== "all" && cat !== filters.category) {
      return false;
    }

    if (filters.rulesetId !== "all" && t.ruleset_id !== filters.rulesetId) {
      return false;
    }

    return true;
  });
}

function normalizeCategoryFilter(raw?: string | null): StatsCategoryFilter {
  if (
    raw === "all" ||
    raw === "oficial" ||
    raw === "semanal" ||
    raw === "amistoso" ||
    raw === "ranked"
  ) {
    return raw;
  }
  return "ranked";
}

async function getStatsClient(): Promise<SupabaseClient<Database>> {
  const admin = createAdminClient();
  if (admin) return admin;
  return await createClient();
}

async function fetchPartsMap(
  client: SupabaseClient<Database>
): Promise<Map<string, PartRow>> {
  const parts = await fetchAllPages<PartRow>((from, to) =>
    client
      .from("parts_catalog")
      .select("*")
      .order("name", { ascending: true })
      .range(from, to)
  );
  const map = new Map<string, PartRow>();
  for (const part of parts) {
    map.set(part.id, part);
  }
  return map;
}

async function fetchMatchesForTournaments(
  client: SupabaseClient<Database>,
  tournamentIds: string[],
  onlyFinished = true
): Promise<MatchRow[]> {
  if (tournamentIds.length === 0) return [];
  const allMatches: MatchRow[] = [];

  for (let i = 0; i < tournamentIds.length; i += 40) {
    const chunk = tournamentIds.slice(i, i + 40);
    const rows = await fetchAllPages<MatchRow>((from, to) => {
      let query = client
        .from("matches")
        .select("*")
        .in("tournament_id", chunk)
        .eq("is_bye", false);

      if (onlyFinished) {
        query = query.eq("status", "finished");
      } else {
        query = query.neq("status", "cancelled");
      }

      return query.order("created_at", { ascending: true }).range(from, to);
    });
    allMatches.push(...rows);
  }

  return allMatches;
}

async function fetchGamesForMatches(
  client: SupabaseClient<Database>,
  matchIds: string[]
): Promise<MatchGameRow[]> {
  if (matchIds.length === 0) return [];
  const allGames: MatchGameRow[] = [];

  for (let i = 0; i < matchIds.length; i += 80) {
    const chunk = matchIds.slice(i, i + 80);
    const rows = await fetchAllPages<MatchGameRow>((from, to) =>
      client
        .from("match_games")
        .select("*")
        .in("match_id", chunk)
        .order("round_number", { ascending: true })
        .range(from, to)
    );
    allGames.push(...rows);
  }

  return allGames;
}

async function fetchApprovedCombosForTournaments(
  client: SupabaseClient<Database>,
  tournamentIds: string[]
): Promise<{
  registrations: Array<{ id: string; tournament_id: string; blader_id: string }>;
  combos: RegistrationComboRow[];
}> {
  if (tournamentIds.length === 0) {
    return { registrations: [], combos: [] };
  }

  const registrations: Array<{
    id: string;
    tournament_id: string;
    blader_id: string;
  }> = [];

  for (let i = 0; i < tournamentIds.length; i += 40) {
    const chunk = tournamentIds.slice(i, i + 40);
    const rows = await fetchAllPages<{
      id: string;
      tournament_id: string;
      blader_id: string;
    }>((from, to) =>
      client
        .from("tournament_registrations")
        .select("id, tournament_id, blader_id")
        .in("tournament_id", chunk)
        .eq("status", "approved")
        .range(from, to)
    );
    registrations.push(...rows);
  }

  if (registrations.length === 0) {
    return { registrations: [], combos: [] };
  }

  const regIds = registrations.map((r) => r.id);
  const combos: RegistrationComboRow[] = [];

  for (let i = 0; i < regIds.length; i += 80) {
    const chunk = regIds.slice(i, i + 80);
    const rows = await fetchAllPages<RegistrationComboRow>((from, to) =>
      client
        .from("registration_combos")
        .select("*")
        .in("registration_id", chunk)
        .order("slot_number", { ascending: true })
        .range(from, to)
    );
    combos.push(...rows);
  }

  return { registrations, combos };
}

export async function getRegionalStatsData(filters?: {
  season?: string | null;
  category?: string | null;
  ruleset?: string | null;
}): Promise<RegionalStatsData> {
  const client = await getStatsClient();

  const [seasonsRes, rulesetsRes, tournamentsRes, bladersRes, partsById] =
    await Promise.all([
      client.from("seasons").select("*").order("year", { ascending: false }),
      client
        .from("rulesets")
        .select("*")
        .order("name", { ascending: true }),
      client
        .from("tournaments")
        .select("*")
        .in("status", ["ongoing", "finished"])
        .order("event_date", { ascending: false }),
      client
        .from("bladers")
        .select("id, name, nickname, avatar_url")
        .eq("is_active", true)
        .order("nickname", { ascending: true }),
      fetchPartsMap(client),
    ]);

  const seasons = seasonsRes.data ?? [];
  const rulesets = rulesetsRes.data ?? [];
  const activeSeason = seasons.find((s) => s.is_active) ?? seasons[0] ?? null;

  const rawSeason = filters?.season?.trim();
  let selectedSeasonId = activeSeason?.id ?? "all";
  if (rawSeason === "all") {
    selectedSeasonId = "all";
  } else if (rawSeason) {
    const found = seasons.find(
      (s) => s.id === rawSeason || String(s.year) === rawSeason
    );
    if (found) selectedSeasonId = found.id;
  }

  const selectedCategory = normalizeCategoryFilter(filters?.category);

  const rawRuleset = filters?.ruleset?.trim();
  const selectedRulesetId =
    rawRuleset && rulesets.some((r) => r.id === rawRuleset) ? rawRuleset : "all";

  const eligibleTournaments = filterEligibleTournaments(
    tournamentsRes.data ?? [],
    {
      seasonId: selectedSeasonId,
      category: selectedCategory,
      rulesetId: selectedRulesetId,
    }
  );
  const tournamentIds = eligibleTournaments.map((t) => t.id);

  const bladers = (bladersRes.data ?? []) as BladerSimpleOption[];
  const activeBladerIdSet = new Set(bladers.map((b) => b.id));

  const [matches, approvedDeckData, inventoryRows] = await Promise.all([
    fetchMatchesForTournaments(client, tournamentIds, true),
    fetchApprovedCombosForTournaments(client, tournamentIds),
    fetchAllPages<{ blader_id: string; part_id: string }>((from, to) =>
      client.from("blader_inventory").select("blader_id, part_id").range(from, to)
    ),
  ]);

  const matchesById = new Map<string, MatchRow>();
  for (const m of matches) {
    matchesById.set(m.id, m);
  }

  const games = await fetchGamesForMatches(
    client,
    matches.map((m) => m.id)
  );

  const combosById = new Map<string, RegistrationComboRow>();
  for (const c of approvedDeckData.combos) {
    combosById.set(c.id, c);
  }

  const perf = computePartPerformance({
    partsById,
    combosById,
    matchesById,
    games,
  });

  // Censo 100% anônimo da coleção (blader_inventory)
  const ownersCountByPart = new Map<string, number>();
  const collectorBladerIds = new Set<string>();
  let totalInventoryEntries = 0;

  for (const row of inventoryRows) {
    if (!activeBladerIdSet.has(row.blader_id)) continue;
    if (!partsById.has(row.part_id)) continue;
    collectorBladerIds.add(row.blader_id);
    totalInventoryEntries += 1;
    ownersCountByPart.set(
      row.part_id,
      (ownersCountByPart.get(row.part_id) ?? 0) + 1
    );
  }

  const bladersWithCollectionCount = collectorBladerIds.size;
  const activeCatalogParts = Array.from(partsById.values()).filter(
    (p) => p.is_active
  );

  const byTypeMap = new Map<
    PartType,
    { totalOwned: number; uniquePartsCount: number }
  >();
  for (const pt of PART_TYPE_ORDER) {
    byTypeMap.set(pt, { totalOwned: 0, uniquePartsCount: 0 });
  }

  const byLineMap = new Map<
    string,
    { totalOwned: number; uniquePartsCount: number }
  >();
  for (const line of [...BEY_SYSTEM_ORDER, "Universal"]) {
    byLineMap.set(line, { totalOwned: 0, uniquePartsCount: 0 });
  }

  const censusParts: CollectionCensusPartStat[] = activeCatalogParts
    .map((part) => {
      const ownersCount = ownersCountByPart.get(part.id) ?? 0;
      const typeEntry = byTypeMap.get(part.part_type);
      if (typeEntry && ownersCount > 0) {
        typeEntry.totalOwned += ownersCount;
        typeEntry.uniquePartsCount += 1;
      }

      const lineKey = part.line ?? "Universal";
      const lineEntry = byLineMap.get(lineKey) ?? {
        totalOwned: 0,
        uniquePartsCount: 0,
      };
      if (ownersCount > 0) {
        lineEntry.totalOwned += ownersCount;
        lineEntry.uniquePartsCount += 1;
      }
      byLineMap.set(lineKey, lineEntry);

      return {
        partId: part.id,
        name: part.name,
        aliases: part.aliases ?? [],
        partType: part.part_type,
        line: part.line,
        ownersCount,
        sharePct:
          bladersWithCollectionCount > 0
            ? (ownersCount / bladersWithCollectionCount) * 100
            : 0,
      };
    })
    .sort((a, b) => {
      if (b.ownersCount !== a.ownersCount) {
        return b.ownersCount - a.ownersCount;
      }
      return a.name.localeCompare(b.name, "pt-BR");
    });

  const nonDrawRoundsCount = games.filter((g) => g.finish_type !== "draw").length;

  return {
    seasons,
    rulesets,
    selectedSeasonId,
    selectedCategory,
    selectedRulesetId,
    overview: {
      tournamentsCount: eligibleTournaments.length,
      matchesCount: matches.length,
      roundsCount: nonDrawRoundsCount,
      trackedComboRoundsCount: perf.trackedComboRoundsCount,
      approvedDecklistsCount: approvedDeckData.registrations.length,
      registeredCombosCount: approvedDeckData.combos.length,
      finishes: perf.finishes,
      systemsUsage: perf.systemsUsage,
    },
    partPerformance: perf.partPerformance,
    collectionCensus: {
      totalEntries: totalInventoryEntries,
      bladersWithCollectionCount,
      uniquePartsOwnedCount: ownersCountByPart.size,
      byPartType: PART_TYPE_ORDER.map((partType) => {
        const entry = byTypeMap.get(partType) ?? {
          totalOwned: 0,
          uniquePartsCount: 0,
        };
        return { partType, ...entry };
      }),
      byLine: Array.from(byLineMap.entries()).map(([line, entry]) => ({
        line,
        ...entry,
      })),
      parts: censusParts,
    },
    bladers,
  };
}

export async function getHeadToHeadStats(params: {
  bladerAId: string;
  bladerBId: string;
  season?: string | null;
  category?: string | null;
  ruleset?: string | null;
}): Promise<HeadToHeadStatsData | null> {
  if (
    !isValidUuid(params.bladerAId) ||
    !isValidUuid(params.bladerBId) ||
    params.bladerAId === params.bladerBId
  ) {
    return null;
  }

  const client = await getStatsClient();

  const [bladersRes, seasonsRes, tournamentsRes] = await Promise.all([
    client
      .from("bladers")
      .select("id, name, nickname, avatar_url")
      .in("id", [params.bladerAId, params.bladerBId]),
    client.from("seasons").select("*").order("year", { ascending: false }),
    client
      .from("tournaments")
      .select("*")
      .in("status", ["ongoing", "finished"])
      .order("event_date", { ascending: false }),
  ]);

  const bladerMap = new Map<string, BladerSimpleOption>();
  for (const b of bladersRes.data ?? []) {
    bladerMap.set(b.id, b);
  }

  const bladerA = bladerMap.get(params.bladerAId);
  const bladerB = bladerMap.get(params.bladerBId);
  if (!bladerA || !bladerB) return null;

  const seasons = seasonsRes.data ?? [];
  const activeSeason = seasons.find((s) => s.is_active) ?? seasons[0] ?? null;

  const rawSeason = params.season?.trim();
  let selectedSeasonId = activeSeason?.id ?? "all";
  if (rawSeason === "all") {
    selectedSeasonId = "all";
  } else if (rawSeason) {
    const found = seasons.find(
      (s) => s.id === rawSeason || String(s.year) === rawSeason
    );
    if (found) selectedSeasonId = found.id;
  }

  const selectedCategory = normalizeCategoryFilter(params.category);
  const selectedRulesetId = params.ruleset?.trim() || "all";

  const eligibleTournaments = filterEligibleTournaments(
    tournamentsRes.data ?? [],
    {
      seasonId: selectedSeasonId,
      category: selectedCategory,
      rulesetId: selectedRulesetId,
    }
  );

  const tournamentsById = new Map<string, TournamentRow>();
  for (const t of eligibleTournaments) {
    tournamentsById.set(t.id, t);
  }

  const tournamentIds = eligibleTournaments.map((t) => t.id);
  if (tournamentIds.length === 0) {
    return {
      bladerA,
      bladerB,
      totalMatches: 0,
      aWins: 0,
      bWins: 0,
      aWinRate: 0,
      bWinRate: 0,
      totalPointsA: 0,
      totalPointsB: 0,
      finishesA: emptyFinishes(),
      finishesB: emptyFinishes(),
      matches: [],
    };
  }

  const { data: rawMatches } = await client
    .from("matches")
    .select("*")
    .in("tournament_id", tournamentIds)
    .eq("status", "finished")
    .eq("is_bye", false)
    .or(
      `and(player1_id.eq.${params.bladerAId},player2_id.eq.${params.bladerBId}),and(player1_id.eq.${params.bladerBId},player2_id.eq.${params.bladerAId})`
    );

  const matches = rawMatches ?? [];
  const games = await fetchGamesForMatches(
    client,
    matches.map((m) => m.id)
  );

  const gamesByMatchId = new Map<string, MatchGameRow[]>();
  for (const g of games) {
    const list = gamesByMatchId.get(g.match_id) ?? [];
    list.push(g);
    gamesByMatchId.set(g.match_id, list);
  }

  let aWins = 0;
  let bWins = 0;
  let totalPointsA = 0;
  let totalPointsB = 0;
  const finishesA = emptyFinishes();
  const finishesB = emptyFinishes();

  const items: HeadToHeadMatchItem[] = [];

  for (const m of matches) {
    const tournament = tournamentsById.get(m.tournament_id);
    if (!tournament) continue;

    const aIsP1 = m.player1_id === bladerA.id;
    const scoreA = aIsP1 ? m.player1_score : m.player2_score;
    const scoreB = aIsP1 ? m.player2_score : m.player1_score;

    totalPointsA += scoreA;
    totalPointsB += scoreB;
    if (m.winner_id === bladerA.id) aWins += 1;
    else if (m.winner_id === bladerB.id) bWins += 1;

    const matchFinishesA = emptyFinishes();
    const matchFinishesB = emptyFinishes();

    for (const g of gamesByMatchId.get(m.id) ?? []) {
      if (g.finish_type === "draw") continue;
      if (g.scoring_player_id === bladerA.id) {
        addFinish(matchFinishesA, g.finish_type);
        addFinish(finishesA, g.finish_type);
      } else if (g.scoring_player_id === bladerB.id) {
        addFinish(matchFinishesB, g.finish_type);
        addFinish(finishesB, g.finish_type);
      }
    }

    items.push({
      matchId: m.id,
      tournamentId: tournament.id,
      tournamentName: tournament.name,
      tournamentSlug: tournament.slug,
      tournamentDate: tournament.event_date,
      tournamentCategory: tournament.category ?? "semanal",
      stage: m.stage,
      round: m.round,
      bracketLabel: m.bracket_label,
      scoreA,
      scoreB,
      winnerId: m.winner_id,
      finishesA: matchFinishesA,
      finishesB: matchFinishesB,
    });
  }

  items.sort((a, b) => {
    if (a.tournamentDate !== b.tournamentDate) {
      return b.tournamentDate.localeCompare(a.tournamentDate);
    }
    if (a.stage !== b.stage) {
      return a.stage === "top_cut" ? -1 : 1;
    }
    return b.round - a.round;
  });

  const totalMatches = items.length;

  return {
    bladerA,
    bladerB,
    totalMatches,
    aWins,
    bWins,
    aWinRate: totalMatches > 0 ? (aWins / totalMatches) * 100 : 0,
    bWinRate: totalMatches > 0 ? (bWins / totalMatches) * 100 : 0,
    totalPointsA,
    totalPointsB,
    finishesA,
    finishesB,
    matches: items,
  };
}

/**
 * Breakdown de Meta & Combos de um campeonato específico.
 * Trava rígida de sigilo: retorna null se status não for ongoing/finished.
 */
export async function getTournamentMetaBreakdown(
  tournamentId: string
): Promise<TournamentMetaBreakdown | null> {
  if (!isValidUuid(tournamentId)) return null;

  const client = await getStatsClient();

  const { data: tournament, error: tourErr } = await client
    .from("tournaments")
    .select("id, status")
    .eq("id", tournamentId)
    .maybeSingle();

  if (
    tourErr ||
    !tournament ||
    (tournament.status !== "ongoing" && tournament.status !== "finished")
  ) {
    return null;
  }

  const [partsById, deckData, matches, resultsRes] = await Promise.all([
    fetchPartsMap(client),
    fetchApprovedCombosForTournaments(client, [tournamentId]),
    fetchMatchesForTournaments(client, [tournamentId], false),
    client
      .from("tournament_results")
      .select("blader_id, final_position")
      .eq("tournament_id", tournamentId),
  ]);

  const finishedMatches = matches.filter((m) => m.status === "finished");
  const matchesById = new Map<string, MatchRow>();
  const topCutBladerIds = new Set<string>();

  for (const m of matches) {
    matchesById.set(m.id, m);
    if (m.stage === "top_cut") {
      if (m.player1_id) topCutBladerIds.add(m.player1_id);
      if (m.player2_id) topCutBladerIds.add(m.player2_id);
    }
  }

  const positionByBladerId = new Map<string, number>();
  const podiumBladerIds = new Set<string>();
  for (const r of resultsRes.data ?? []) {
    positionByBladerId.set(r.blader_id, r.final_position);
    if (r.final_position <= 3) {
      podiumBladerIds.add(r.blader_id);
    }
  }

  const games = await fetchGamesForMatches(
    client,
    matches.map((m) => m.id)
  );

  const combosById = new Map<string, RegistrationComboRow>();
  for (const c of deckData.combos) {
    combosById.set(c.id, c);
  }

  const perf = computePartPerformance({
    partsById,
    combosById,
    matchesById,
    games,
  });

  const regBladerById = new Map<string, string>();
  const combosByBladerId = new Map<string, RegistrationComboRow[]>();
  for (const reg of deckData.registrations) {
    regBladerById.set(reg.id, reg.blader_id);
    combosByBladerId.set(reg.blader_id, []);
  }

  const activeDeckCombos = deckData.combos.filter((c) => c.is_active !== false);

  for (const combo of activeDeckCombos) {
    const bladerId = regBladerById.get(combo.registration_id);
    if (!bladerId) continue;
    const list = combosByBladerId.get(bladerId) ?? [];
    list.push(combo);
    combosByBladerId.set(bladerId, list);
  }

  const comboAggMap = new Map<
    string,
    {
      signature: string;
      system: BeySystem | null;
      summaryText: string;
      count: number;
      topCutCount: number;
      podiumCount: number;
    }
  >();

  const partUsageCounts = new Map<string, number>();

  for (const combo of activeDeckCombos) {
    const bladerId = regBladerById.get(combo.registration_id);
    const inTopCut = bladerId ? topCutBladerIds.has(bladerId) : false;
    const inPodium = bladerId ? podiumBladerIds.has(bladerId) : false;

    const { signature, system, summaryText } = buildComboSignatureAndDisplay(
      combo,
      partsById
    );
    if (summaryText) {
      const existing = comboAggMap.get(signature);
      if (!existing) {
        comboAggMap.set(signature, {
          signature,
          system,
          summaryText,
          count: 1,
          topCutCount: inTopCut ? 1 : 0,
          podiumCount: inPodium ? 1 : 0,
        });
      } else {
        existing.count += 1;
        if (inTopCut) existing.topCutCount += 1;
        if (inPodium) existing.podiumCount += 1;
      }
    }

    for (const partId of getComboPartIds(combo)) {
      partUsageCounts.set(partId, (partUsageCounts.get(partId) ?? 0) + 1);
    }
  }

  const totalCombos = activeDeckCombos.length;
  const comboRanking: TournamentComboUsageItem[] = Array.from(
    comboAggMap.values()
  )
    .map((item) => ({
      ...item,
      sharePct: totalCombos > 0 ? (item.count / totalCombos) * 100 : 0,
    }))
    .sort((a, b) => {
      if (b.count !== a.count) return b.count - a.count;
      if (b.podiumCount !== a.podiumCount) return b.podiumCount - a.podiumCount;
      if (b.topCutCount !== a.topCutCount) return b.topCutCount - a.topCutCount;
      return a.summaryText.localeCompare(b.summaryText, "pt-BR");
    });

  // Top Cut / Pódio com Decklists
  const highlightBladerIds = Array.from(
    new Set([...podiumBladerIds, ...topCutBladerIds])
  ).filter((id) => (combosByBladerId.get(id)?.length ?? 0) > 0);

  let topCutDecks: TournamentPodiumDeckItem[] = [];
  if (highlightBladerIds.length > 0) {
    const { data: highlightBladers } = await client
      .from("bladers")
      .select("id, name, nickname, avatar_url")
      .in("id", highlightBladerIds);

    topCutDecks = (highlightBladers ?? [])
      .map((b) => {
        const rawCombos = (combosByBladerId.get(b.id) ?? []).sort(
          (a, c) => a.slot_number - c.slot_number
        );
        return {
          bladerId: b.id,
          nickname: b.nickname,
          name: b.name,
          avatarUrl: b.avatar_url,
          finalPosition: positionByBladerId.get(b.id) ?? null,
          inTopCut: topCutBladerIds.has(b.id),
          combos: rawCombos.map((c) => {
            const { system, summaryText } = buildComboSignatureAndDisplay(
              c,
              partsById
            );
            return {
              id: c.id,
              slotNumber: c.slot_number,
              system,
              summaryText: summaryText || `Combo #${c.slot_number}`,
            };
          }),
        };
      })
      .sort((a, b) => {
        const posA = a.finalPosition ?? 999;
        const posB = b.finalPosition ?? 999;
        if (posA !== posB) return posA - posB;
        return a.nickname.localeCompare(b.nickname, "pt-BR");
      });
  }

  const buildTopPartsForTypes = (
    types: PartType[]
  ): TournamentPartUsageItem[] => {
    const items: TournamentPartUsageItem[] = [];
    for (const [partId, count] of partUsageCounts.entries()) {
      const part = partsById.get(partId);
      if (!part || !types.includes(part.part_type)) continue;
      items.push({
        partId: part.id,
        name: part.name,
        aliases: part.aliases ?? [],
        partType: part.part_type,
        line: part.line,
        count,
        sharePct: totalCombos > 0 ? (count / totalCombos) * 100 : 0,
      });
    }
    return items.sort((a, b) => {
      if (b.count !== a.count) return b.count - a.count;
      return a.name.localeCompare(b.name, "pt-BR");
    });
  };

  return {
    tournamentId,
    approvedDecklistsCount: deckData.registrations.length,
    registeredCombosCount: totalCombos,
    matchesCount: finishedMatches.length,
    roundsCount: games.filter((g) => g.finish_type !== "draw").length,
    trackedComboRoundsCount: perf.trackedComboRoundsCount,
    finishes: perf.finishes,
    systemsUsage: perf.systemsUsage,
    comboRanking,
    topCutDecks,
    topPartsByGroup: {
      blades: buildTopPartsForTypes([
        "blade",
        "main_blade",
        "metal_blade",
        "over_blade",
      ]),
      ratchets: buildTopPartsForTypes(["ratchet"]),
      bits: buildTopPartsForTypes(["bit"]),
      cxParts: buildTopPartsForTypes(["assist_blade", "lock_chip"]),
    },
    partPerformance: perf.partPerformance,
  };
}
