import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getBladers } from "@/lib/services/league";
import { isValidUuid } from "@/lib/services/arena-queries";
import { formatComboDisplay } from "@/lib/combo-rules";
import {
  fetchTournamentEngineSnapshot,
  type TournamentEngineSnapshot,
} from "@/lib/services/tournament-queries";
import type { Blader, PartRow } from "@/types/domain";

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

/**
 * Retorna um mapa seguro { [comboId]: labelCompacto } APENAS dos combos já
 * utilizados em lances (`match_games`) de torneios `ongoing` ou `finished`,
 * preservando integralmente o sigilo de decklists em torneios `draft`/`open`.
 */
export async function getTournamentLiveComboLabels(
  tournamentId: string
): Promise<Record<string, string>> {
  if (!isValidUuid(tournamentId)) return {};

  const admin = createAdminClient();
  if (!admin) return {};

  try {
    const { data: tournament } = await admin
      .from("tournaments")
      .select("status")
      .eq("id", tournamentId)
      .maybeSingle();

    if (
      !tournament ||
      (tournament.status !== "ongoing" && tournament.status !== "finished")
    ) {
      return {};
    }

    const { data: matchRows } = await admin
      .from("matches")
      .select("id")
      .eq("tournament_id", tournamentId);

    const matchIds = (matchRows ?? []).map((m) => m.id);
    if (matchIds.length === 0) return {};

    const { data: gameRows } = await admin
      .from("match_games")
      .select("player1_combo_id, player2_combo_id")
      .in("match_id", matchIds);

    const comboIds = new Set<string>();
    for (const g of gameRows ?? []) {
      if (g.player1_combo_id) comboIds.add(g.player1_combo_id);
      if (g.player2_combo_id) comboIds.add(g.player2_combo_id);
    }

    if (comboIds.size === 0) return {};

    const { data: comboRows } = await admin
      .from("registration_combos")
      .select("*")
      .in("id", Array.from(comboIds));

    if (!comboRows || comboRows.length === 0) return {};

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
      const { data: partRows } = await admin
        .from("parts_catalog")
        .select("*")
        .in("id", Array.from(partIds));
      for (const p of partRows ?? []) {
        partsById.set(p.id, p);
      }
    }

    const labels: Record<string, string> = {};
    for (const row of comboRows) {
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

      const titleParts = [
        overBlade?.name,
        blade?.name ?? lockChip?.name,
        assistBlade?.name,
      ].filter(Boolean);
      const tailParts = [ratchet?.name, bit?.name].filter(Boolean);
      const compact =
        titleParts.length > 0 || tailParts.length > 0
          ? `${titleParts.join(" ")}${tailParts.length > 0 ? ` ${tailParts.join(" ")}` : ""}`.trim()
          : display.summaryText;

      if (compact) {
        labels[row.id] = compact;
      }
    }

    return labels;
  } catch (err) {
    console.error("Erro ao resolver labels de combos do telão:", err);
    return {};
  }
}
