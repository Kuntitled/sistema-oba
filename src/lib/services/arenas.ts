import { createClient } from "@/lib/supabase/server";
import { getBladers } from "@/lib/services/league";
import {
  fetchArenaLiveSnapshot,
  fetchArenasOverview,
  type ArenaLiveSnapshot,
} from "@/lib/services/arena-queries";
import type { Arena, Blader } from "@/types/domain";

export async function getArenasOverview(
  tournamentId?: string
): Promise<{ arenas: Arena[]; schemaMissing: boolean }> {
  try {
    const supabase = await createClient();
    return await fetchArenasOverview(supabase, tournamentId);
  } catch (err) {
    console.error("Exceção ao buscar arenas:", err);
    return { arenas: [], schemaMissing: false };
  }
}

export interface ArenaLiveState extends ArenaLiveSnapshot {
  bladers: Blader[];
}

export async function getArenaLiveState(
  arenaId: string
): Promise<ArenaLiveState> {
  try {
    const supabase = await createClient();
    const [snapshot, bladers] = await Promise.all([
      fetchArenaLiveSnapshot(supabase, arenaId),
      getBladers(),
    ]);

    return {
      ...snapshot,
      bladers,
    };
  } catch (err) {
    console.error("Exceção ao carregar estado ao vivo da arena:", err);
    return {
      arena: null,
      games: [],
      pendingMatches: [],
      bladers: [],
      schemaMissing: false,
    };
  }
}
