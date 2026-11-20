import { createClient } from "@/lib/supabase/server";
import { getBladers } from "@/lib/services/league";
import {
  fetchTournamentEngineSnapshot,
  type TournamentEngineSnapshot,
} from "@/lib/services/tournament-queries";
import type { Blader } from "@/types/domain";

export interface TournamentEngineState extends TournamentEngineSnapshot {
  allBladers: Blader[];
}

export async function getPublicTournamentLiveData(
  tournamentId: string
): Promise<TournamentEngineSnapshot> {
  try {
    const supabase = await createClient();
    return await fetchTournamentEngineSnapshot(supabase, tournamentId);
  } catch (err) {
    console.error("Exceção ao carregar dados públicos ao vivo do torneio:", err);
    return {
      tournament: null,
      participants: [],
      matches: [],
      games: [],
      arenas: [],
      schemaMissing: false,
    };
  }
}

export async function getTournamentEngineState(
  tournamentId: string
): Promise<TournamentEngineState> {
  try {
    const supabase = await createClient();
    const [snapshot, allBladers] = await Promise.all([
      fetchTournamentEngineSnapshot(supabase, tournamentId),
      getBladers(),
    ]);

    return {
      ...snapshot,
      allBladers,
    };
  } catch (err) {
    console.error("Exceção ao carregar estado do motor de torneio:", err);
    return {
      tournament: null,
      participants: [],
      matches: [],
      games: [],
      arenas: [],
      allBladers: [],
      schemaMissing: false,
    };
  }
}
