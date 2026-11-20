import type { SupabaseClient } from "@supabase/supabase-js";
import { isMissingTableError, isValidUuid } from "@/lib/services/arena-queries";
import type { Database } from "@/types/database";
import type {
  Arena,
  BladerRow,
  Match,
  MatchGame,
  MatchGameRow,
  MatchRow,
  SeasonRow,
  Tournament,
  TournamentParticipant,
} from "@/types/domain";

export interface TournamentEngineSnapshot {
  tournament: Tournament | null;
  participants: TournamentParticipant[];
  matches: Match[];
  games: MatchGame[];
  arenas: Arena[];
  schemaMissing: boolean;
}

export async function fetchTournamentEngineSnapshot(
  supabase: SupabaseClient<Database>,
  tournamentId: string
): Promise<TournamentEngineSnapshot> {
  if (!isValidUuid(tournamentId)) {
    return {
      tournament: null,
      participants: [],
      matches: [],
      games: [],
      arenas: [],
      schemaMissing: false,
    };
  }

  const { data: tournamentRow, error: tourError } = await supabase
    .from("tournaments")
    .select("*")
    .eq("id", tournamentId)
    .maybeSingle();

  if (tourError) {
    if (isMissingTableError(tourError)) {
      return {
        tournament: null,
        participants: [],
        matches: [],
        games: [],
        arenas: [],
        schemaMissing: true,
      };
    }
    console.error("Erro ao carregar torneio:", tourError);
    return {
      tournament: null,
      participants: [],
      matches: [],
      games: [],
      arenas: [],
      schemaMissing: false,
    };
  }

  if (!tournamentRow) {
    return {
      tournament: null,
      participants: [],
      matches: [],
      games: [],
      arenas: [],
      schemaMissing: false,
    };
  }

  const [seasonRes, participantsRes, matchesRes, arenasRes] = await Promise.all([
    tournamentRow.season_id
      ? supabase
          .from("seasons")
          .select("*")
          .eq("id", tournamentRow.season_id)
          .maybeSingle()
      : Promise.resolve({ data: null as SeasonRow | null, error: null }),
    supabase
      .from("tournament_participants")
      .select("*")
      .eq("tournament_id", tournamentId)
      .order("seed", { ascending: true, nullsFirst: false })
      .order("created_at", { ascending: true }),
    supabase
      .from("matches")
      .select("*")
      .eq("tournament_id", tournamentId)
      .order("stage", { ascending: true })
      .order("round", { ascending: true })
      .order("match_number", { ascending: true }),
    supabase
      .from("arenas")
      .select("*")
      .eq("tournament_id", tournamentId)
      .order("display_order", { ascending: true })
      .order("created_at", { ascending: true }),
  ]);

  if (
    isMissingTableError(participantsRes.error) ||
    isMissingTableError(matchesRes.error) ||
    isMissingTableError(arenasRes.error)
  ) {
    return {
      tournament: null,
      participants: [],
      matches: [],
      games: [],
      arenas: [],
      schemaMissing: true,
    };
  }

  const participantRows = participantsRes.data ?? [];
  const matchRows: MatchRow[] = matchesRes.data ?? [];
  const arenaRows = arenasRes.data ?? [];

  const matchIds = matchRows.map((m) => m.id);
  const { data: gameRows } =
    matchIds.length > 0
      ? await supabase
          .from("match_games")
          .select("*")
          .in("match_id", matchIds)
          .order("round_number", { ascending: true })
      : { data: [] as MatchGameRow[] };

  const bladerIds = new Set<string>();
  for (const p of participantRows) bladerIds.add(p.blader_id);
  for (const m of matchRows) {
    if (m.player1_id) bladerIds.add(m.player1_id);
    if (m.player2_id) bladerIds.add(m.player2_id);
    if (m.winner_id) bladerIds.add(m.winner_id);
  }

  const { data: bladerRows } =
    bladerIds.size > 0
      ? await supabase
          .from("bladers")
          .select("*")
          .in("id", Array.from(bladerIds))
      : { data: [] as BladerRow[] };

  const bladersById = new Map<string, BladerRow>();
  for (const b of bladerRows ?? []) {
    bladersById.set(b.id, b);
  }

  const arenaById = new Map(arenaRows.map((a) => [a.id, a]));

  const games: MatchGame[] = (gameRows ?? []).map((g) => ({
    ...g,
    scoring_player: g.scoring_player_id
      ? (bladersById.get(g.scoring_player_id) ?? null)
      : null,
  }));

  const gamesByMatch = new Map<string, MatchGame[]>();
  for (const g of games) {
    const arr = gamesByMatch.get(g.match_id) ?? [];
    arr.push(g);
    gamesByMatch.set(g.match_id, arr);
  }

  const matches: Match[] = matchRows.map((m) => ({
    ...m,
    player1: m.player1_id ? (bladersById.get(m.player1_id) ?? null) : null,
    player2: m.player2_id ? (bladersById.get(m.player2_id) ?? null) : null,
    winner: m.winner_id ? (bladersById.get(m.winner_id) ?? null) : null,
    arena: m.arena_id ? (arenaById.get(m.arena_id) ?? null) : null,
    games: gamesByMatch.get(m.id) ?? [],
  }));

  const matchById = new Map(matches.map((m) => [m.id, m]));

  const arenas: Arena[] = arenaRows.map((a) => ({
    ...a,
    current_match: a.current_match_id
      ? (matchById.get(a.current_match_id) ?? null)
      : null,
  }));

  const participants: TournamentParticipant[] = participantRows.map((p) => ({
    ...p,
    blader: bladersById.get(p.blader_id) ?? null,
  }));

  const tournament: Tournament = {
    ...tournamentRow,
    category: tournamentRow.category ?? "semanal",
    swiss_rounds: tournamentRow.swiss_rounds ?? 4,
    season: seasonRes.data ?? null,
  };

  return {
    tournament,
    participants,
    matches,
    games,
    arenas,
    schemaMissing: false,
  };
}
