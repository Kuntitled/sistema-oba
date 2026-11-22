import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { formatComboDisplay, inferComboSystem } from "@/lib/combo-rules";
import type { Database } from "@/types/database";
import type {
  BladerComboSummary,
  BladerRow,
  PartRow,
  RegistrationComboRow,
} from "@/types/domain";

export interface BladerCombosOverview {
  favoriteCombo: BladerComboSummary | null;
  mostUsedCombo: (BladerComboSummary & { count: number }) | null;
}

function addPartId(set: Set<string>, id: string | null | undefined) {
  if (id) set.add(id);
}

async function fetchMissingParts(
  supabase: SupabaseClient<Database>,
  ids: Iterable<string>,
  partsById: Map<string, PartRow>
) {
  const missing = Array.from(new Set(ids)).filter((id) => !partsById.has(id));
  if (missing.length === 0) return;

  const { data } = await supabase
    .from("parts_catalog")
    .select("*")
    .in("id", missing);

  for (const part of data ?? []) {
    partsById.set(part.id, part);
  }
}

function buildFavoriteComboSummary(
  blader: BladerRow,
  partsById: Map<string, PartRow>
): BladerComboSummary | null {
  const blade = blader.favorite_blade_id
    ? (partsById.get(blader.favorite_blade_id) ?? null)
    : null;
  const lockChip = blader.favorite_lock_chip_id
    ? (partsById.get(blader.favorite_lock_chip_id) ?? null)
    : null;
  const overBlade = blader.favorite_over_blade_id
    ? (partsById.get(blader.favorite_over_blade_id) ?? null)
    : null;
  const assistBlade = blader.favorite_assist_blade_id
    ? (partsById.get(blader.favorite_assist_blade_id) ?? null)
    : null;
  const ratchet = blader.favorite_ratchet_id
    ? (partsById.get(blader.favorite_ratchet_id) ?? null)
    : null;
  const bit = blader.favorite_bit_id
    ? (partsById.get(blader.favorite_bit_id) ?? null)
    : null;

  const display = formatComboDisplay({
    system: blader.favorite_system,
    blade,
    lockChip,
    overBlade,
    assistBlade,
    ratchet,
    bit,
  });

  if (!display.summaryText) return null;
  return {
    system: display.system,
    summaryText: display.summaryText,
  };
}

/**
 * Agrega o Combo Mais Usado por Blader considerando apenas inscrições aprovadas
 * em torneios em andamento ou já encerrados (mantendo sigilo de torneios abertos/rascunho).
 */
export async function getMostUsedCombosByBladerId(
  bladerIds: string[],
  existingPartsById?: Map<string, PartRow>
): Promise<Map<string, BladerComboSummary & { count: number }>> {
  const result = new Map<string, BladerComboSummary & { count: number }>();
  const uniqueBladerIds = Array.from(new Set(bladerIds.filter(Boolean)));
  if (uniqueBladerIds.length === 0) return result;

  const adminClient = createAdminClient();
  if (!adminClient) return result;

  try {
    const { data: regRows, error: regError } = await adminClient
      .from("tournament_registrations")
      .select("id, tournament_id, blader_id")
      .in("blader_id", uniqueBladerIds)
      .eq("status", "approved");

    if (regError || !regRows || regRows.length === 0) {
      return result;
    }

    const tournamentIds = Array.from(
      new Set(regRows.map((r) => r.tournament_id))
    );
    const { data: tourRows, error: tourError } = await adminClient
      .from("tournaments")
      .select("id")
      .in("id", tournamentIds)
      .in("status", ["ongoing", "finished"]);

    if (tourError || !tourRows || tourRows.length === 0) {
      return result;
    }

    const publicTourIds = new Set(tourRows.map((t) => t.id));
    const eligibleRegs = regRows.filter((r) =>
      publicTourIds.has(r.tournament_id)
    );
    if (eligibleRegs.length === 0) return result;

    const bladerByRegId = new Map<string, string>();
    for (const reg of eligibleRegs) {
      bladerByRegId.set(reg.id, reg.blader_id);
    }

    const { data: comboRows, error: combosError } = await adminClient
      .from("registration_combos")
      .select("*")
      .in("registration_id", Array.from(bladerByRegId.keys()));

    if (combosError || !comboRows || comboRows.length === 0) {
      return result;
    }

    const partsById = existingPartsById ?? new Map<string, PartRow>();
    const partIds = new Set<string>();
    for (const row of comboRows) {
      addPartId(partIds, row.blade_id);
      addPartId(partIds, row.lock_chip_id);
      addPartId(partIds, row.over_blade_id);
      addPartId(partIds, row.assist_blade_id);
      addPartId(partIds, row.ratchet_id);
      addPartId(partIds, row.bit_id);
    }

    await fetchMissingParts(adminClient, partIds, partsById);

    type ComboAggregate = {
      row: RegistrationComboRow;
      count: number;
      latestAt: string;
    };

    const countsByBlader = new Map<string, Map<string, ComboAggregate>>();

    for (const row of comboRows) {
      const bladerId = bladerByRegId.get(row.registration_id);
      if (!bladerId) continue;

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

      const system = inferComboSystem({
        system: row.system,
        blade,
        lockChip,
        overBlade,
        assistBlade,
      });

      const signature = [
        system ?? "",
        row.lock_chip_id ?? "",
        row.over_blade_id ?? "",
        row.blade_id ?? "",
        row.assist_blade_id ?? "",
        row.ratchet_id ?? "",
        row.bit_id ?? "",
      ].join("|");

      if (signature === "||||||") continue;

      let mapForBlader = countsByBlader.get(bladerId);
      if (!mapForBlader) {
        mapForBlader = new Map<string, ComboAggregate>();
        countsByBlader.set(bladerId, mapForBlader);
      }

      const current = mapForBlader.get(signature);
      if (!current) {
        mapForBlader.set(signature, {
          row,
          count: 1,
          latestAt: row.created_at,
        });
      } else {
        current.count += 1;
        if (row.created_at > current.latestAt) {
          current.latestAt = row.created_at;
        }
      }
    }

    for (const [bladerId, aggMap] of countsByBlader.entries()) {
      let best: ComboAggregate | null = null;
      for (const candidate of aggMap.values()) {
        if (
          !best ||
          candidate.count > best.count ||
          (candidate.count === best.count &&
            candidate.latestAt > best.latestAt)
        ) {
          best = candidate;
        }
      }

      if (!best) continue;

      const r = best.row;
      const display = formatComboDisplay({
        system: r.system,
        blade: r.blade_id ? (partsById.get(r.blade_id) ?? null) : null,
        lockChip: r.lock_chip_id
          ? (partsById.get(r.lock_chip_id) ?? null)
          : null,
        overBlade: r.over_blade_id
          ? (partsById.get(r.over_blade_id) ?? null)
          : null,
        assistBlade: r.assist_blade_id
          ? (partsById.get(r.assist_blade_id) ?? null)
          : null,
        ratchet: r.ratchet_id ? (partsById.get(r.ratchet_id) ?? null) : null,
        bit: r.bit_id ? (partsById.get(r.bit_id) ?? null) : null,
      });

      if (!display.summaryText) continue;

      result.set(bladerId, {
        system: display.system,
        summaryText: display.summaryText,
        count: best.count,
      });
    }

    return result;
  } catch (err) {
    console.error("Erro ao agregar combo mais usado dos Bladers:", err);
    return result;
  }
}

export async function getBladersComboSummaries(
  bladers: BladerRow[],
  clientOverride?: SupabaseClient<Database>
): Promise<Map<string, BladerCombosOverview>> {
  const summaries = new Map<string, BladerCombosOverview>();
  if (bladers.length === 0) return summaries;

  try {
    const supabase = clientOverride ?? (await createClient());
    const partsById = new Map<string, PartRow>();

    const favPartIds = new Set<string>();
    for (const blader of bladers) {
      addPartId(favPartIds, blader.favorite_blade_id);
      addPartId(favPartIds, blader.favorite_lock_chip_id);
      addPartId(favPartIds, blader.favorite_over_blade_id);
      addPartId(favPartIds, blader.favorite_assist_blade_id);
      addPartId(favPartIds, blader.favorite_ratchet_id);
      addPartId(favPartIds, blader.favorite_bit_id);
    }

    await fetchMissingParts(supabase, favPartIds, partsById);

    const mostUsedByBladerId = await getMostUsedCombosByBladerId(
      bladers.map((b) => b.id),
      partsById
    );

    for (const blader of bladers) {
      summaries.set(blader.id, {
        favoriteCombo: buildFavoriteComboSummary(blader, partsById),
        mostUsedCombo: mostUsedByBladerId.get(blader.id) ?? null,
      });
    }

    return summaries;
  } catch (err) {
    console.error("Erro ao montar resumo de combos dos Bladers:", err);
    return summaries;
  }
}
