import type { SupabaseClient } from "@supabase/supabase-js";
import { formatComboDisplay } from "@/lib/combo-rules";
import type { Database } from "@/types/database";
import type {
  Arena,
  ArenaPlayerComboOption,
  BladerRow,
  Match,
  MatchGame,
  MatchRow,
  PartRow,
  TournamentRow,
} from "@/types/domain";

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isValidUuid(value: string | null | undefined): value is string {
  return typeof value === "string" && UUID_REGEX.test(value);
}

export function isMissingTableError(
  error: { code?: string; message?: string } | null | undefined
): boolean {
  if (!error) return false;
  if (error.code === "42P01" || error.code === "PGRST205") return true;
  const msg = error.message ?? "";
  return (
    msg.includes("does not exist") ||
    msg.includes("Could not find the table") ||
    msg.includes("schema cache")
  );
}

function hydrateMatch(
  match: MatchRow,
  bladersById: Map<string, BladerRow>
): Match {
  return {
    ...match,
    player1: match.player1_id ? (bladersById.get(match.player1_id) ?? null) : null,
    player2: match.player2_id ? (bladersById.get(match.player2_id) ?? null) : null,
    winner: match.winner_id ? (bladersById.get(match.winner_id) ?? null) : null,
  };
}

async function fetchBladersMap(
  supabase: SupabaseClient<Database>,
  matches: MatchRow[]
): Promise<Map<string, BladerRow>> {
  const bladerIds = new Set<string>();
  for (const m of matches) {
    if (m.player1_id) bladerIds.add(m.player1_id);
    if (m.player2_id) bladerIds.add(m.player2_id);
    if (m.winner_id) bladerIds.add(m.winner_id);
  }

  const map = new Map<string, BladerRow>();
  if (bladerIds.size === 0) return map;

  const { data } = await supabase
    .from("bladers")
    .select("*")
    .in("id", Array.from(bladerIds));

  for (const b of data ?? []) {
    map.set(b.id, b);
  }
  return map;
}

export async function fetchArenasOverview(
  supabase: SupabaseClient<Database>,
  tournamentId?: string
): Promise<{ arenas: Arena[]; schemaMissing: boolean }> {
  let query = supabase
    .from("arenas")
    .select("*")
    .order("display_order", { ascending: true })
    .order("created_at", { ascending: true });

  if (tournamentId && isValidUuid(tournamentId)) {
    query = query.eq("tournament_id", tournamentId);
  }

  const { data: arenaRows, error } = await query;

  if (error) {
    if (isMissingTableError(error)) {
      return { arenas: [], schemaMissing: true };
    }
    console.error("Erro ao buscar arenas:", error);
    return { arenas: [], schemaMissing: false };
  }

  if (!arenaRows || arenaRows.length === 0) {
    return { arenas: [], schemaMissing: false };
  }

  const tournamentIds = Array.from(
    new Set(arenaRows.map((a) => a.tournament_id))
  );
  const matchIds = Array.from(
    new Set(
      arenaRows
        .map((a) => a.current_match_id)
        .filter((id): id is string => Boolean(id))
    )
  );

  const [tournamentsRes, matchesRes] = await Promise.all([
    supabase.from("tournaments").select("*").in("id", tournamentIds),
    matchIds.length > 0
      ? supabase.from("matches").select("*").in("id", matchIds)
      : Promise.resolve({ data: [] as MatchRow[], error: null }),
  ]);

  const tournamentsById = new Map<string, TournamentRow>();
  for (const t of tournamentsRes.data ?? []) {
    tournamentsById.set(t.id, t);
  }

  const matchRows = matchesRes.data ?? [];
  const bladersById = await fetchBladersMap(supabase, matchRows);

  const matchesById = new Map<string, Match>();
  for (const m of matchRows) {
    matchesById.set(m.id, hydrateMatch(m, bladersById));
  }

  const arenas: Arena[] = arenaRows.map((arena) => ({
    ...arena,
    tournament: tournamentsById.get(arena.tournament_id) ?? null,
    current_match: arena.current_match_id
      ? (matchesById.get(arena.current_match_id) ?? null)
      : null,
  }));

  return { arenas, schemaMissing: false };
}

export interface ArenaLiveSnapshot {
  arena: Arena | null;
  games: MatchGame[];
  pendingMatches: Match[];
  player1Combos: ArenaPlayerComboOption[];
  player2Combos: ArenaPlayerComboOption[];
  schemaMissing: boolean;
}

function buildCompactComboLabel(parts: {
  blade?: PartRow | null;
  lockChip?: PartRow | null;
  overBlade?: PartRow | null;
  assistBlade?: PartRow | null;
  ratchet?: PartRow | null;
  bit?: PartRow | null;
  summaryText: string;
}): string {
  const mainName =
    parts.blade?.name ??
    parts.overBlade?.name ??
    parts.lockChip?.name ??
    "Combo";
  const tail = [parts.ratchet?.name, parts.bit?.name].filter(Boolean).join(" ");
  if (tail) return `${mainName} ${tail}`;
  return parts.summaryText || mainName;
}

async function fetchMatchApprovedCombos(
  supabase: SupabaseClient<Database>,
  tournamentId: string,
  player1Id: string | null,
  player2Id: string | null
): Promise<{
  player1Combos: ArenaPlayerComboOption[];
  player2Combos: ArenaPlayerComboOption[];
}> {
  const empty = { player1Combos: [], player2Combos: [] };
  const playerIds = [player1Id, player2Id].filter((id): id is string =>
    Boolean(id)
  );
  if (playerIds.length === 0) return empty;

  try {
    const { data: regRows, error: regError } = await supabase
      .from("tournament_registrations")
      .select("id, blader_id")
      .eq("tournament_id", tournamentId)
      .eq("status", "approved")
      .in("blader_id", playerIds);

    if (regError || !regRows || regRows.length === 0) {
      return empty;
    }

    const bladerByRegId = new Map<string, string>();
    for (const reg of regRows) {
      bladerByRegId.set(reg.id, reg.blader_id);
    }

    const { data: comboRows, error: comboError } = await supabase
      .from("registration_combos")
      .select("*")
      .in("registration_id", Array.from(bladerByRegId.keys()))
      .eq("is_active", true)
      .order("slot_number", { ascending: true });

    if (comboError || !comboRows || comboRows.length === 0) {
      return empty;
    }

    const partIds = new Set<string>();
    for (const row of comboRows) {
      if (row.blade_id) partIds.add(row.blade_id);
      if (row.lock_chip_id) partIds.add(row.lock_chip_id);
      if (row.over_blade_id) partIds.add(row.over_blade_id);
      if (row.assist_blade_id) partIds.add(row.assist_blade_id);
      if (row.ratchet_id) partIds.add(row.ratchet_id);
      if (row.bit_id) partIds.add(row.bit_id);
    }

    const partsById = new Map<string, PartRow>();
    if (partIds.size > 0) {
      const { data: partRows } = await supabase
        .from("parts_catalog")
        .select("*")
        .in("id", Array.from(partIds));

      for (const part of partRows ?? []) {
        partsById.set(part.id, part);
      }
    }

    const player1Combos: ArenaPlayerComboOption[] = [];
    const player2Combos: ArenaPlayerComboOption[] = [];

    for (const row of comboRows) {
      const ownerId = bladerByRegId.get(row.registration_id);
      if (!ownerId) continue;

      const blade = row.blade_id ? (partsById.get(row.blade_id) ?? null) : null;
      const lockChip = row.lock_chip_id
        ? (partsById.get(row.lock_chip_id) ?? null)
        : null;
      const overBlade = row.over_blade_id
        ? (partsById.get(row.over_blade_id) ?? null)
        : null;
      const assistBlade = row.assist_blade_id
        ? (partsById.get(row.assist_blade_id) ?? null)
        : null;
      const ratchet = row.ratchet_id
        ? (partsById.get(row.ratchet_id) ?? null)
        : null;
      const bit = row.bit_id ? (partsById.get(row.bit_id) ?? null) : null;

      const display = formatComboDisplay({
        system: row.system,
        blade,
        lockChip,
        overBlade,
        assistBlade,
        ratchet,
        bit,
      });

      const option: ArenaPlayerComboOption = {
        id: row.id,
        slotNumber: row.slot_number,
        system: display.system,
        shortLabel: buildCompactComboLabel({
          blade,
          lockChip,
          overBlade,
          assistBlade,
          ratchet,
          bit,
          summaryText: display.summaryText,
        }),
        summaryText: display.summaryText || `Combo #${row.slot_number}`,
      };

      if (ownerId === player1Id) {
        player1Combos.push(option);
      } else if (ownerId === player2Id) {
        player2Combos.push(option);
      }
    }

    player1Combos.sort((a, b) => a.slotNumber - b.slotNumber);
    player2Combos.sort((a, b) => a.slotNumber - b.slotNumber);

    return { player1Combos, player2Combos };
  } catch {
    return empty;
  }
}

export async function fetchArenaLiveSnapshot(
  supabase: SupabaseClient<Database>,
  arenaId: string
): Promise<ArenaLiveSnapshot> {
  if (!isValidUuid(arenaId)) {
    return {
      arena: null,
      games: [],
      pendingMatches: [],
      player1Combos: [],
      player2Combos: [],
      schemaMissing: false,
    };
  }

  const { data: arenaRow, error: arenaError } = await supabase
    .from("arenas")
    .select("*")
    .eq("id", arenaId)
    .maybeSingle();

  if (arenaError) {
    if (isMissingTableError(arenaError)) {
      return {
        arena: null,
        games: [],
        pendingMatches: [],
        player1Combos: [],
        player2Combos: [],
        schemaMissing: true,
      };
    }
    console.error("Erro ao buscar arena:", arenaError);
    return {
      arena: null,
      games: [],
      pendingMatches: [],
      player1Combos: [],
      player2Combos: [],
      schemaMissing: false,
    };
  }

  if (!arenaRow) {
    return {
      arena: null,
      games: [],
      pendingMatches: [],
      player1Combos: [],
      player2Combos: [],
      schemaMissing: false,
    };
  }

  const [tournamentRes, currentMatchRes, gamesRes, pendingMatchesRes] =
    await Promise.all([
      supabase
        .from("tournaments")
        .select("*")
        .eq("id", arenaRow.tournament_id)
        .maybeSingle(),
      arenaRow.current_match_id
        ? supabase
            .from("matches")
            .select("*")
            .eq("id", arenaRow.current_match_id)
            .maybeSingle()
        : Promise.resolve({ data: null as MatchRow | null, error: null }),
      arenaRow.current_match_id
        ? supabase
            .from("match_games")
            .select("*")
            .eq("match_id", arenaRow.current_match_id)
            .order("round_number", { ascending: true })
        : Promise.resolve({ data: [], error: null }),
      supabase
        .from("matches")
        .select("*")
        .eq("tournament_id", arenaRow.tournament_id)
        .eq("status", "pending")
        .order("stage", { ascending: true })
        .order("round", { ascending: true })
        .order("match_number", { ascending: true }),
    ]);

  const allMatchesToHydrate: MatchRow[] = [];
  if (currentMatchRes.data) allMatchesToHydrate.push(currentMatchRes.data);
  if (pendingMatchesRes.data) {
    allMatchesToHydrate.push(...pendingMatchesRes.data);
  }

  const [bladersById, combosRes] = await Promise.all([
    fetchBladersMap(supabase, allMatchesToHydrate),
    currentMatchRes.data
      ? fetchMatchApprovedCombos(
          supabase,
          arenaRow.tournament_id,
          currentMatchRes.data.player1_id,
          currentMatchRes.data.player2_id
        )
      : Promise.resolve({ player1Combos: [], player2Combos: [] }),
  ]);

  const games: MatchGame[] = (gamesRes.data ?? []).map((game) => ({
    ...game,
    scoring_player: game.scoring_player_id
      ? (bladersById.get(game.scoring_player_id) ?? null)
      : null,
  }));

  const currentMatch: Match | null = currentMatchRes.data
    ? {
        ...hydrateMatch(currentMatchRes.data, bladersById),
        games,
      }
    : null;

  const pendingMatches: Match[] = (pendingMatchesRes.data ?? []).map((m) =>
    hydrateMatch(m, bladersById)
  );

  const arena: Arena = {
    ...arenaRow,
    tournament: tournamentRes.data ?? null,
    current_match: currentMatch,
  };

  return {
    arena,
    games,
    pendingMatches,
    player1Combos: combosRes.player1Combos,
    player2Combos: combosRes.player2Combos,
    schemaMissing: false,
  };
}
