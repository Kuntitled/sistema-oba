import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { formatComboDisplay, inferComboSystem } from "@/lib/combo-rules";
import {
  computeFinalTournamentResults,
  computeSwissStandings,
} from "@/lib/engine/tournament-engine";
import { isValidUuid } from "@/lib/services/arena-queries";
import { fetchTournamentEngineSnapshot } from "@/lib/services/tournament-queries";
import type {
  BeySystem,
  BladerRow,
  PartRow,
  RegistrationComboRow,
  TournamentCategory,
  TournamentFormat,
  TournamentStatus,
} from "@/types/domain";

export interface PodiumComboItem {
  slotNumber: number;
  system: BeySystem | null;
  summaryText: string;
}

export interface PodiumFinisherItem {
  position: 1 | 2 | 3;
  bladerId: string;
  nickname: string;
  name: string;
  avatarUrl: string | null;
  pointsEarned: number;
  swissWins: number;
  isSwissLeader: boolean;
  initialCombos: PodiumComboItem[];
}

export interface PodiumSwissLeaderItem {
  bladerId: string;
  nickname: string;
  name: string;
  avatarUrl: string | null;
  wins: number;
  losses: number | null;
  pointDiff: number | null;
  swissPoints: number;
  podiumPosition: number | null;
  initialCombos: PodiumComboItem[];
}

export interface TournamentPodiumCardData {
  tournament: {
    id: string;
    name: string;
    slug: string;
    eventDate: string;
    category: TournamentCategory;
    format: TournamentFormat;
    location: string | null;
    rulesetName: string | null;
    seasonName: string | null;
    participantsCount: number;
    status: TournamentStatus;
  };
  podium: PodiumFinisherItem[];
  swissLeader: PodiumSwissLeaderItem | null;
}

const INITIAL_BATCH_WINDOW_MS = 10_000;

function selectInitialRegisteredCombos(
  rows: RegistrationComboRow[]
): RegistrationComboRow[] {
  if (rows.length === 0) return [];

  const sorted = [...rows].sort((a, b) => {
    const timeA = Date.parse(a.created_at);
    const timeB = Date.parse(b.created_at);
    if (!Number.isNaN(timeA) && !Number.isNaN(timeB) && timeA !== timeB) {
      return timeA - timeB;
    }
    return a.slot_number - b.slot_number;
  });

  const firstMs = Date.parse(sorted[0].created_at);
  const bySlot = new Map<number, RegistrationComboRow>();

  for (const row of sorted) {
    const rowMs = Date.parse(row.created_at);
    const withinInitialWindow =
      Number.isNaN(firstMs) ||
      Number.isNaN(rowMs) ||
      rowMs - firstMs <= INITIAL_BATCH_WINDOW_MS;

    if (!withinInitialWindow) break;
    if (!bySlot.has(row.slot_number)) {
      bySlot.set(row.slot_number, row);
    }
  }

  // Fallback defensivo se nenhum slot entrou
  if (bySlot.size === 0) {
    for (const row of sorted) {
      if (!bySlot.has(row.slot_number)) {
        bySlot.set(row.slot_number, row);
      }
    }
  }

  return Array.from(bySlot.values()).sort(
    (a, b) => a.slot_number - b.slot_number
  );
}

function formatPodiumComboItem(
  row: RegistrationComboRow,
  partsById: Map<string, PartRow>
): PodiumComboItem {
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

  const system = inferComboSystem({
    system: row.system,
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

  return {
    slotNumber: row.slot_number,
    system: display.system,
    summaryText: display.summaryText || `Combo #${row.slot_number}`,
  };
}

export async function getTournamentPodiumCardData(
  tournamentId: string,
  options?: { allowUnfinishedForAdmin?: boolean }
): Promise<TournamentPodiumCardData | null> {
  if (!isValidUuid(tournamentId)) return null;

  const client = createAdminClient() ?? (await createClient());
  const snapshot = await fetchTournamentEngineSnapshot(client, tournamentId);

  if (snapshot.schemaMissing || !snapshot.tournament) {
    return null;
  }

  const tournament = snapshot.tournament;
  const isFinished = tournament.status === "finished";
  if (!isFinished && !options?.allowUnfinishedForAdmin) {
    return null;
  }

  const [resultsRes, rulesetRes] = await Promise.all([
    client
      .from("tournament_results")
      .select("*")
      .eq("tournament_id", tournamentId)
      .order("final_position", { ascending: true }),
    tournament.ruleset_id
      ? client
          .from("rulesets")
          .select("name")
          .eq("id", tournament.ruleset_id)
          .maybeSingle()
      : Promise.resolve({ data: null as { name: string } | null }),
  ]);

  const savedResults = resultsRes.data ?? [];
  const swissSummary = computeSwissStandings(
    snapshot.participants,
    snapshot.matches,
    snapshot.games,
    {
      format: tournament.format,
      topCutSize: tournament.top_cut_size,
    }
  );
  const swissStandingByBladerId = new Map(
    swissSummary.standings.map((s) => [s.bladerId, s])
  );

  type RawPodiumEntry = {
    position: 1 | 2 | 3;
    bladerId: string;
    pointsEarned: number;
    swissWins: number;
    isSwissLeader: boolean;
  };

  let rawPodium: RawPodiumEntry[] = [];
  if (savedResults.length > 0) {
    rawPodium = savedResults
      .filter((r) => r.final_position >= 1 && r.final_position <= 3)
      .slice(0, 3)
      .map((r) => ({
        position: r.final_position as 1 | 2 | 3,
        bladerId: r.blader_id,
        pointsEarned: r.points_earned,
        swissWins: r.swiss_wins,
        isSwissLeader: Boolean(r.is_swiss_leader),
      }));
  } else {
    const computed = computeFinalTournamentResults(
      tournament,
      snapshot.participants,
      snapshot.matches,
      snapshot.games
    );
    rawPodium = computed
      .filter((r) => r.finalPosition >= 1 && r.finalPosition <= 3)
      .slice(0, 3)
      .map((r) => ({
        position: r.finalPosition as 1 | 2 | 3,
        bladerId: r.bladerId,
        pointsEarned: r.pointsEarned,
        swissWins: r.swissWins,
        isSwissLeader: Boolean(r.isSwissLeader),
      }));
  }

  // Identifica o Líder da Fase Suíça (flag oficial ou 1º do Suíço nas partidas)
  const savedSwissLeader = savedResults.find((r) => r.is_swiss_leader) ?? null;
  const standingsLeader =
    swissSummary.currentSwissRound > 0 ? (swissSummary.standings[0] ?? null) : null;

  const swissLeaderBladerId =
    savedSwissLeader?.blader_id ?? standingsLeader?.bladerId ?? null;

  const targetBladerIds = Array.from(
    new Set(
      [
        ...rawPodium.map((p) => p.bladerId),
        swissLeaderBladerId,
      ].filter((id): id is string => Boolean(id))
    )
  );

  const bladersById = new Map<string, BladerRow>();
  for (const p of snapshot.participants) {
    if (p.blader) bladersById.set(p.blader_id, p.blader);
  }

  const missingBladerIds = targetBladerIds.filter((id) => !bladersById.has(id));
  if (missingBladerIds.length > 0) {
    const { data: extraBladers } = await client
      .from("bladers")
      .select("*")
      .in("id", missingBladerIds);
    for (const b of extraBladers ?? []) {
      bladersById.set(b.id, b);
    }
  }

  // Busca as inscrições e o lote inicial de combos registrados por cada Blader
  const initialCombosByBladerId = new Map<string, PodiumComboItem[]>();
  if (targetBladerIds.length > 0) {
    const { data: regRows } = await client
      .from("tournament_registrations")
      .select("id, blader_id, status, created_at")
      .eq("tournament_id", tournamentId)
      .in("blader_id", targetBladerIds);

    const bestRegByBladerId = new Map<
      string,
      { id: string; blader_id: string; status: string; created_at: string }
    >();
    for (const reg of regRows ?? []) {
      const existing = bestRegByBladerId.get(reg.blader_id);
      if (!existing) {
        bestRegByBladerId.set(reg.blader_id, reg);
      } else if (existing.status !== "approved" && reg.status === "approved") {
        bestRegByBladerId.set(reg.blader_id, reg);
      }
    }

    const regIds = Array.from(bestRegByBladerId.values()).map((r) => r.id);
    if (regIds.length > 0) {
      const { data: comboRows } = await client
        .from("registration_combos")
        .select("*")
        .in("registration_id", regIds)
        .order("created_at", { ascending: true })
        .order("slot_number", { ascending: true });

      const allComboRows = comboRows ?? [];
      const partIds = new Set<string>();
      for (const row of allComboRows) {
        if (row.blade_id) partIds.add(row.blade_id);
        if (row.lock_chip_id) partIds.add(row.lock_chip_id);
        if (row.over_blade_id) partIds.add(row.over_blade_id);
        if (row.assist_blade_id) partIds.add(row.assist_blade_id);
        if (row.ratchet_id) partIds.add(row.ratchet_id);
        if (row.bit_id) partIds.add(row.bit_id);
      }

      const partsById = new Map<string, PartRow>();
      if (partIds.size > 0) {
        const { data: partRows } = await client
          .from("parts_catalog")
          .select("*")
          .in("id", Array.from(partIds));
        for (const p of partRows ?? []) {
          partsById.set(p.id, p);
        }
      }

      const combosByRegId = new Map<string, RegistrationComboRow[]>();
      for (const row of allComboRows) {
        const list = combosByRegId.get(row.registration_id) ?? [];
        list.push(row);
        combosByRegId.set(row.registration_id, list);
      }

      for (const [bladerId, reg] of bestRegByBladerId.entries()) {
        const initialRows = selectInitialRegisteredCombos(
          combosByRegId.get(reg.id) ?? []
        );
        initialCombosByBladerId.set(
          bladerId,
          initialRows.map((row) => formatPodiumComboItem(row, partsById))
        );
      }
    }
  }

  const podium: PodiumFinisherItem[] = rawPodium.map((item) => {
    const b = bladersById.get(item.bladerId);
    return {
      position: item.position,
      bladerId: item.bladerId,
      nickname: b?.nickname ?? "Blader",
      name: b?.name ?? b?.nickname ?? "Blader",
      avatarUrl: b?.avatar_url ?? null,
      pointsEarned: item.pointsEarned,
      swissWins: item.swissWins,
      isSwissLeader: item.isSwissLeader,
      initialCombos: initialCombosByBladerId.get(item.bladerId) ?? [],
    };
  });

  let swissLeader: PodiumSwissLeaderItem | null = null;
  if (swissLeaderBladerId) {
    const b = bladersById.get(swissLeaderBladerId);
    const standing = swissStandingByBladerId.get(swissLeaderBladerId) ?? null;
    const savedPos =
      savedResults.find((r) => r.blader_id === swissLeaderBladerId)
        ?.final_position ??
      rawPodium.find((p) => p.bladerId === swissLeaderBladerId)?.position ??
      null;

    swissLeader = {
      bladerId: swissLeaderBladerId,
      nickname: b?.nickname ?? standing?.blader?.nickname ?? "Blader",
      name: b?.name ?? standing?.blader?.name ?? "Blader",
      avatarUrl: b?.avatar_url ?? standing?.blader?.avatar_url ?? null,
      wins: standing?.wins ?? savedSwissLeader?.swiss_wins ?? 0,
      losses: standing ? standing.losses : null,
      pointDiff: standing ? standing.pointDiff : null,
      swissPoints: standing?.swissPoints ?? savedSwissLeader?.swiss_points ?? 0,
      podiumPosition: savedPos,
      initialCombos: initialCombosByBladerId.get(swissLeaderBladerId) ?? [],
    };
  }

  const participantsCount = Math.max(
    snapshot.participants.length,
    savedResults.length
  );

  return {
    tournament: {
      id: tournament.id,
      name: tournament.name,
      slug: tournament.slug,
      eventDate: tournament.event_date,
      category: tournament.category ?? "semanal",
      format: tournament.format,
      location: tournament.location,
      rulesetName: rulesetRes.data?.name ?? null,
      seasonName: tournament.season?.name ?? null,
      participantsCount,
      status: tournament.status,
    },
    podium,
    swissLeader,
  };
}
