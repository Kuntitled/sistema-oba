import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { inferComboSystem } from "@/lib/combo-rules";
import { isMissingTableError, isValidUuid } from "@/lib/services/arena-queries";
import { RECEIPTS_BUCKET } from "@/lib/receipt-upload";
import type { Database } from "@/types/database";
import type {
  BladerRegistrationSummary,
  BladerRow,
  HydratedRegistrationCombo,
  LeagueSettingsRow,
  PartRow,
  RegistrationComboRow,
  RulesetRow,
  SeasonRow,
  Tournament,
  TournamentRegistrationAdminItem,
  TournamentRegistrationRow,
  TournamentRow,
} from "@/types/domain";

const RECEIPT_SIGNED_URL_TTL_SECONDS = 900; // 15 minutos

export interface TournamentRegistrationStats {
  total: number;
  pending: number;
  approved: number;
  rejected: number;
  participantsCount: number;
}

function hydrateCombosForRegistration(
  comboRows: RegistrationComboRow[],
  partsById: Map<string, PartRow>,
  bannedPartIds: Set<string>
): HydratedRegistrationCombo[] {
  return [...comboRows]
    .sort((a, b) => a.slot_number - b.slot_number)
    .map((row) => {
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

      const slotParts = [
        lockChip,
        overBlade,
        blade,
        assistBlade,
        ratchet,
        bit,
      ].filter((p): p is PartRow => Boolean(p));

      const bannedPartNames = slotParts
        .filter((p) => bannedPartIds.has(p.id))
        .map((p) => p.name);

      return {
        id: row.id,
        slotNumber: row.slot_number,
        system: inferComboSystem({
          system: row.system,
          blade,
          lockChip,
          overBlade,
          assistBlade,
        }),
        blade,
        lockChip,
        overBlade,
        assistBlade,
        ratchet,
        bit,
        hasBannedPart: bannedPartNames.length > 0,
        bannedPartNames,
      };
    });
}

async function fetchPartsMapByComboRows(
  supabase: SupabaseClient<Database>,
  comboRows: RegistrationComboRow[]
): Promise<Map<string, PartRow>> {
  const partIds = new Set<string>();
  for (const row of comboRows) {
    if (row.blade_id) partIds.add(row.blade_id);
    if (row.lock_chip_id) partIds.add(row.lock_chip_id);
    if (row.over_blade_id) partIds.add(row.over_blade_id);
    if (row.assist_blade_id) partIds.add(row.assist_blade_id);
    if (row.ratchet_id) partIds.add(row.ratchet_id);
    if (row.bit_id) partIds.add(row.bit_id);
  }

  const map = new Map<string, PartRow>();
  if (partIds.size === 0) return map;

  const { data } = await supabase
    .from("parts_catalog")
    .select("*")
    .in("id", Array.from(partIds));

  for (const part of data ?? []) {
    map.set(part.id, part);
  }
  return map;
}

export async function createReceiptSignedUrl(
  supabase: SupabaseClient<Database>,
  receiptPath: string | null | undefined
): Promise<string | null> {
  if (!receiptPath?.trim()) return null;
  try {
    const { data, error } = await supabase.storage
      .from(RECEIPTS_BUCKET)
      .createSignedUrl(receiptPath.trim(), RECEIPT_SIGNED_URL_TTL_SECONDS);

    if (error || !data?.signedUrl) {
      return null;
    }
    return data.signedUrl;
  } catch {
    return null;
  }
}

export async function getLeagueSettings(): Promise<{
  settings: LeagueSettingsRow | null;
  schemaMissing: boolean;
}> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("league_settings")
      .select("*")
      .eq("id", 1)
      .maybeSingle();

    if (error) {
      if (isMissingTableError(error)) {
        return { settings: null, schemaMissing: true };
      }
      console.error("Erro ao buscar league_settings:", error);
      return { settings: null, schemaMissing: false };
    }

    return { settings: data ?? null, schemaMissing: false };
  } catch (err) {
    console.error("Exceção ao buscar league_settings:", err);
    return { settings: null, schemaMissing: false };
  }
}

export async function getRulesetBannedParts(
  rulesetId: string | null
): Promise<{
  bannedPartIds: string[];
  bannedParts: PartRow[];
}> {
  if (!rulesetId || !isValidUuid(rulesetId)) {
    return { bannedPartIds: [], bannedParts: [] };
  }

  try {
    const supabase = await createClient();
    const { data: banRows, error } = await supabase
      .from("ruleset_banned_parts")
      .select("part_id")
      .eq("ruleset_id", rulesetId);

    if (error || !banRows || banRows.length === 0) {
      return { bannedPartIds: [], bannedParts: [] };
    }

    const bannedPartIds = Array.from(new Set(banRows.map((b) => b.part_id)));
    const { data: partRows } = await supabase
      .from("parts_catalog")
      .select("*")
      .in("id", bannedPartIds)
      .order("name", { ascending: true });

    return {
      bannedPartIds,
      bannedParts: partRows ?? [],
    };
  } catch (err) {
    console.error("Exceção ao buscar peças banidas do ruleset:", err);
    return { bannedPartIds: [], bannedParts: [] };
  }
}

export async function getBladerTournamentRegistration(
  tournamentId: string,
  bladerId: string
): Promise<{
  registration: TournamentRegistrationRow | null;
  combos: RegistrationComboRow[];
  receiptSignedUrl: string | null;
}> {
  if (!isValidUuid(tournamentId) || !isValidUuid(bladerId)) {
    return { registration: null, combos: [], receiptSignedUrl: null };
  }

  try {
    const supabase = await createClient();
    const { data: reg, error } = await supabase
      .from("tournament_registrations")
      .select("*")
      .eq("tournament_id", tournamentId)
      .eq("blader_id", bladerId)
      .maybeSingle();

    if (error || !reg) {
      return { registration: null, combos: [], receiptSignedUrl: null };
    }

    const [{ data: comboRows }, receiptSignedUrl] = await Promise.all([
      supabase
        .from("registration_combos")
        .select("*")
        .eq("registration_id", reg.id)
        .order("slot_number", { ascending: true }),
      createReceiptSignedUrl(supabase, reg.receipt_path),
    ]);

    return {
      registration: reg,
      combos: comboRows ?? [],
      receiptSignedUrl,
    };
  } catch (err) {
    console.error("Exceção ao buscar inscrição do Blader:", err);
    return { registration: null, combos: [], receiptSignedUrl: null };
  }
}

export async function getBladerRegistrationsOverview(bladerId: string): Promise<{
  registrations: BladerRegistrationSummary[];
  openTournaments: Array<Tournament & { confirmedCount: number }>;
}> {
  if (!isValidUuid(bladerId)) {
    return { registrations: [], openTournaments: [] };
  }

  try {
    const supabase = await createClient();

    const [regsRes, openToursRes] = await Promise.all([
      supabase
        .from("tournament_registrations")
        .select("*")
        .eq("blader_id", bladerId)
        .order("updated_at", { ascending: false }),
      supabase
        .from("tournaments")
        .select("*")
        .eq("registration_status", "open")
        .order("event_date", { ascending: true }),
    ]);

    const regRows = regsRes.error ? [] : (regsRes.data ?? []);
    const openTourRows = openToursRes.error ? [] : (openToursRes.data ?? []);

    const regTournamentIds = Array.from(
      new Set(regRows.map((r) => r.tournament_id))
    );
    const openTourIds = openTourRows.map((t) => t.id);
    const allTourIds = Array.from(new Set([...regTournamentIds, ...openTourIds]));

    const regIds = regRows.map((r) => r.id);

    const [toursRes, combosRes, participantsRes, rulesetsRes] =
      await Promise.all([
        regTournamentIds.length > 0
          ? supabase
              .from("tournaments")
              .select("*")
              .in("id", regTournamentIds)
          : Promise.resolve({ data: [] as TournamentRow[], error: null }),
        regIds.length > 0
          ? supabase
              .from("registration_combos")
              .select("*")
              .in("registration_id", regIds)
              .order("slot_number", { ascending: true })
          : Promise.resolve({ data: [] as RegistrationComboRow[], error: null }),
        allTourIds.length > 0
          ? supabase
              .from("tournament_participants")
              .select("tournament_id")
              .in("tournament_id", allTourIds)
          : Promise.resolve({
              data: [] as Array<{ tournament_id: string }>,
              error: null,
            }),
        supabase.from("rulesets").select("*"),
      ]);

    const toursById = new Map<string, TournamentRow>();
    for (const t of [...openTourRows, ...(toursRes.data ?? [])]) {
      toursById.set(t.id, t);
    }

    const rulesetsById = new Map<string, RulesetRow>();
    for (const rs of rulesetsRes.data ?? []) {
      rulesetsById.set(rs.id, rs);
    }

    const confirmedCountByTour = new Map<string, number>();
    for (const row of participantsRes.data ?? []) {
      confirmedCountByTour.set(
        row.tournament_id,
        (confirmedCountByTour.get(row.tournament_id) ?? 0) + 1
      );
    }

    const comboRows = combosRes.data ?? [];
    const partsById = await fetchPartsMapByComboRows(supabase, comboRows);

    const combosByRegId = new Map<string, RegistrationComboRow[]>();
    for (const combo of comboRows) {
      const list = combosByRegId.get(combo.registration_id) ?? [];
      list.push(combo);
      combosByRegId.set(combo.registration_id, list);
    }

    const signedUrls = await Promise.all(
      regRows.map((reg) => createReceiptSignedUrl(supabase, reg.receipt_path))
    );

    const registrations: BladerRegistrationSummary[] = [];
    for (let i = 0; i < regRows.length; i += 1) {
      const reg = regRows[i];
      const tour = toursById.get(reg.tournament_id);
      if (!tour) continue;

      registrations.push({
        ...reg,
        tournament: {
          id: tour.id,
          name: tour.name,
          slug: tour.slug,
          event_date: tour.event_date,
          location: tour.location,
          entry_fee: tour.entry_fee,
          registration_status: tour.registration_status,
          status: tour.status,
          max_players: tour.max_players,
        },
        combos: hydrateCombosForRegistration(
          combosByRegId.get(reg.id) ?? [],
          partsById,
          new Set<string>()
        ),
        receiptSignedUrl: signedUrls[i] ?? null,
      });
    }

    const openTournaments = openTourRows.map((t) => ({
      ...t,
      category: t.category ?? "semanal",
      swiss_rounds: t.swiss_rounds ?? 4,
      ruleset: t.ruleset_id ? (rulesetsById.get(t.ruleset_id) ?? null) : null,
      confirmedCount: confirmedCountByTour.get(t.id) ?? 0,
    }));

    return { registrations, openTournaments };
  } catch (err) {
    console.error("Exceção ao buscar resumo de inscrições do Blader:", err);
    return { registrations: [], openTournaments: [] };
  }
}

export async function getTournamentsRegistrationStats(
  tournamentIds: string[]
): Promise<Map<string, TournamentRegistrationStats>> {
  const stats = new Map<string, TournamentRegistrationStats>();
  if (tournamentIds.length === 0) return stats;

  try {
    const supabase = await createClient();
    const [regsRes, participantsRes] = await Promise.all([
      supabase
        .from("tournament_registrations")
        .select("tournament_id, status")
        .in("tournament_id", tournamentIds),
      supabase
        .from("tournament_participants")
        .select("tournament_id")
        .in("tournament_id", tournamentIds),
    ]);

    for (const id of tournamentIds) {
      stats.set(id, {
        total: 0,
        pending: 0,
        approved: 0,
        rejected: 0,
        participantsCount: 0,
      });
    }

    if (!regsRes.error) {
      for (const row of regsRes.data ?? []) {
        const entry = stats.get(row.tournament_id);
        if (!entry) continue;
        entry.total += 1;
        if (row.status === "pending") entry.pending += 1;
        else if (row.status === "approved") entry.approved += 1;
        else if (row.status === "rejected") entry.rejected += 1;
      }
    }

    if (!participantsRes.error) {
      for (const row of participantsRes.data ?? []) {
        const entry = stats.get(row.tournament_id);
        if (!entry) continue;
        entry.participantsCount += 1;
      }
    }

    return stats;
  } catch (err) {
    console.error("Exceção ao buscar estatísticas de inscrições:", err);
    return stats;
  }
}

export async function getAdminTournamentRegistrations(
  tournamentId: string
): Promise<{
  tournament: Tournament | null;
  registrations: TournamentRegistrationAdminItem[];
  participantsCount: number;
  bannedParts: PartRow[];
  schemaMissing: boolean;
}> {
  if (!isValidUuid(tournamentId)) {
    return {
      tournament: null,
      registrations: [],
      participantsCount: 0,
      bannedParts: [],
      schemaMissing: false,
    };
  }

  try {
    const supabase = await createClient();
    const { data: tournamentRow, error: tourError } = await supabase
      .from("tournaments")
      .select("*")
      .eq("id", tournamentId)
      .maybeSingle();

    if (tourError) {
      if (isMissingTableError(tourError)) {
        return {
          tournament: null,
          registrations: [],
          participantsCount: 0,
          bannedParts: [],
          schemaMissing: true,
        };
      }
      console.error("Erro ao buscar torneio para inscrições:", tourError);
      return {
        tournament: null,
        registrations: [],
        participantsCount: 0,
        bannedParts: [],
        schemaMissing: false,
      };
    }

    if (!tournamentRow) {
      return {
        tournament: null,
        registrations: [],
        participantsCount: 0,
        bannedParts: [],
        schemaMissing: false,
      };
    }

    const [
      seasonRes,
      rulesetRes,
      bansData,
      regsRes,
      participantsRes,
    ] = await Promise.all([
      tournamentRow.season_id
        ? supabase
            .from("seasons")
            .select("*")
            .eq("id", tournamentRow.season_id)
            .maybeSingle()
        : Promise.resolve({ data: null as SeasonRow | null, error: null }),
      tournamentRow.ruleset_id
        ? supabase
            .from("rulesets")
            .select("*")
            .eq("id", tournamentRow.ruleset_id)
            .maybeSingle()
        : Promise.resolve({ data: null as RulesetRow | null, error: null }),
      getRulesetBannedParts(tournamentRow.ruleset_id),
      supabase
        .from("tournament_registrations")
        .select("*")
        .eq("tournament_id", tournamentId)
        .order("created_at", { ascending: true }),
      supabase
        .from("tournament_participants")
        .select("blader_id")
        .eq("tournament_id", tournamentId),
    ]);

    if (regsRes.error && isMissingTableError(regsRes.error)) {
      return {
        tournament: null,
        registrations: [],
        participantsCount: 0,
        bannedParts: [],
        schemaMissing: true,
      };
    }

    const regRows = regsRes.data ?? [];
    const participantBladerIds = new Set(
      (participantsRes.data ?? []).map((p) => p.blader_id)
    );

    const regIds = regRows.map((r) => r.id);
    const bladerIds = Array.from(new Set(regRows.map((r) => r.blader_id)));

    const [bladersRes, combosRes] = await Promise.all([
      bladerIds.length > 0
        ? supabase.from("bladers").select("*").in("id", bladerIds)
        : Promise.resolve({ data: [] as BladerRow[], error: null }),
      regIds.length > 0
        ? supabase
            .from("registration_combos")
            .select("*")
            .in("registration_id", regIds)
            .order("slot_number", { ascending: true })
        : Promise.resolve({ data: [] as RegistrationComboRow[], error: null }),
    ]);

    const bladersById = new Map<string, BladerRow>();
    for (const b of bladersRes.data ?? []) {
      bladersById.set(b.id, b);
    }

    const comboRows = combosRes.data ?? [];
    const partsById = await fetchPartsMapByComboRows(supabase, comboRows);
    const bannedSet = new Set(bansData.bannedPartIds);

    const combosByRegId = new Map<string, RegistrationComboRow[]>();
    for (const combo of comboRows) {
      const list = combosByRegId.get(combo.registration_id) ?? [];
      list.push(combo);
      combosByRegId.set(combo.registration_id, list);
    }

    const signedUrls = await Promise.all(
      regRows.map((reg) => createReceiptSignedUrl(supabase, reg.receipt_path))
    );

    const statusPriority: Record<TournamentRegistrationRow["status"], number> = {
      pending: 0,
      approved: 1,
      rejected: 2,
    };

    const items: TournamentRegistrationAdminItem[] = regRows
      .map((reg, index) => {
        const combos = hydrateCombosForRegistration(
          combosByRegId.get(reg.id) ?? [],
          partsById,
          bannedSet
        );
        return {
          ...reg,
          blader: bladersById.get(reg.blader_id) ?? null,
          combos,
          receiptSignedUrl: signedUrls[index] ?? null,
          isParticipant: participantBladerIds.has(reg.blader_id),
          hasBannedParts: combos.some((c) => Boolean(c.hasBannedPart)),
        };
      })
      .sort((a, b) => {
        const diff = statusPriority[a.status] - statusPriority[b.status];
        if (diff !== 0) return diff;
        return a.created_at.localeCompare(b.created_at);
      });

    const tournament: Tournament = {
      ...tournamentRow,
      category: tournamentRow.category ?? "semanal",
      swiss_rounds: tournamentRow.swiss_rounds ?? 4,
      season: seasonRes.data ?? null,
      ruleset: rulesetRes.data ?? null,
      player_count: participantBladerIds.size,
    };

    return {
      tournament,
      registrations: items,
      participantsCount: participantBladerIds.size,
      bannedParts: bansData.bannedParts,
      schemaMissing: false,
    };
  } catch (err) {
    console.error("Exceção ao carregar inscrições do torneio (admin):", err);
    return {
      tournament: null,
      registrations: [],
      participantsCount: 0,
      bannedParts: [],
      schemaMissing: false,
    };
  }
}
