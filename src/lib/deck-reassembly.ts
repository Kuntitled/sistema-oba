import type {
  ComboSelection,
  MatchRow,
  PartRow,
  RegistrationComboRow,
  TournamentStatus,
} from "@/types/domain";

type ComboPartFields = Pick<
  RegistrationComboRow,
  | "lock_chip_id"
  | "over_blade_id"
  | "blade_id"
  | "assist_blade_id"
  | "ratchet_id"
  | "bit_id"
>;

/**
 * Extrai a lista multiset (preservando quantidade de cópias) de IDs de peças
 * a partir de combos salvos no banco.
 */
export function extractMultisetPartIdsFromCombos(
  combos: ComboPartFields[]
): string[] {
  const result: string[] = [];
  for (const row of combos) {
    const ids = [
      row.lock_chip_id,
      row.over_blade_id,
      row.blade_id,
      row.assist_blade_id,
      row.ratchet_id,
      row.bit_id,
    ];
    for (const id of ids) {
      if (id) result.push(id);
    }
  }
  return result;
}

/**
 * Extrai a lista multiset (preservando quantidade de cópias) de IDs de peças
 * a partir de seleções de combos no editor.
 */
export function extractMultisetPartIdsFromSelections(
  combos: ComboSelection[]
): string[] {
  const result: string[] = [];
  for (const combo of combos) {
    const ids = [
      combo.lockChipId,
      combo.overBladeId,
      combo.bladeId,
      combo.assistBladeId,
      combo.ratchetId,
      combo.bitId,
    ];
    for (const id of ids) {
      if (id) result.push(id);
    }
  }
  return result;
}

export function buildPartCountsMap(partIds: string[]): Map<string, number> {
  const counts = new Map<string, number>();
  for (const id of partIds) {
    if (!id) continue;
    counts.set(id, (counts.get(id) ?? 0) + 1);
  }
  return counts;
}

/**
 * Valida estritamente se a nova montagem utiliza apenas peças do pool original
 * da inscrição e respeita a quantidade exata de cópias cadastradas originalmente.
 */
export function validateReassemblyAgainstOriginalPool(
  combos: ComboSelection[],
  originalPartIds: string[],
  partsById: Map<string, PartRow>
): { valid: true } | { valid: false; error: string } {
  const allowedCounts = buildPartCountsMap(originalPartIds);
  const usedCounts = new Map<string, number>();

  for (const combo of combos) {
    const slotPartIds = [
      combo.lockChipId,
      combo.overBladeId,
      combo.bladeId,
      combo.assistBladeId,
      combo.ratchetId,
      combo.bitId,
    ].filter(Boolean);

    for (const partId of slotPartIds) {
      const nextUsed = (usedCounts.get(partId) ?? 0) + 1;
      usedCounts.set(partId, nextUsed);

      const allowed = allowedCounts.get(partId) ?? 0;
      const partName = partsById.get(partId)?.name ?? "Peça";

      if (allowed === 0) {
        return {
          valid: false,
          error: `A peça "${partName}" não faz parte das peças originalmente cadastradas por você neste torneio.`,
        };
      }

      if (nextUsed > allowed) {
        return {
          valid: false,
          error: `Você cadastrou apenas ${allowed}x "${partName}" originalmente neste torneio e tentou usar ${nextUsed}x na remontagem.`,
        };
      }
    }
  }

  return { valid: true };
}

export type ReassemblyWindowStatus =
  | "open"
  | "waiting_match"
  | "waiting_round_1"
  | "closed";

export interface BladerReassemblyState {
  status: ReassemblyWindowStatus;
  finishedMatchesCount: number;
  hasPendingOrInProgress: boolean;
  currentMatchStatus: "pending" | "in_progress" | null;
  latestRound: number;
}

/**
 * Calcula a elegibilidade automática por Blader para remontagem entre rodadas:
 * libera quando o torneio está em andamento, o Blader já concluiu pelo menos
 * 1 partida na etapa (incluindo BYE) e não possui partida pendente/ao vivo.
 */
export function computeBladerReassemblyState(params: {
  tournamentStatus: TournamentStatus;
  bladerId: string;
  matches: Array<
    Pick<
      MatchRow,
      "player1_id" | "player2_id" | "status" | "is_bye" | "round" | "stage"
    >
  >;
}): BladerReassemblyState {
  const bladerMatches = params.matches.filter(
    (m) =>
      m.status !== "cancelled" &&
      (m.player1_id === params.bladerId || m.player2_id === params.bladerId)
  );

  const finishedMatchesCount = bladerMatches.filter(
    (m) => m.status === "finished"
  ).length;

  const inProgressMatch = bladerMatches.find((m) => m.status === "in_progress");
  const pendingMatch = bladerMatches.find((m) => m.status === "pending");
  const hasPendingOrInProgress = Boolean(inProgressMatch || pendingMatch);

  const latestRound = bladerMatches.reduce(
    (max, m) => (m.round > max ? m.round : max),
    0
  );

  if (params.tournamentStatus !== "ongoing") {
    return {
      status: "closed",
      finishedMatchesCount,
      hasPendingOrInProgress,
      currentMatchStatus: inProgressMatch
        ? "in_progress"
        : pendingMatch
          ? "pending"
          : null,
      latestRound,
    };
  }

  if (hasPendingOrInProgress) {
    return {
      status: "waiting_match",
      finishedMatchesCount,
      hasPendingOrInProgress: true,
      currentMatchStatus: inProgressMatch ? "in_progress" : "pending",
      latestRound,
    };
  }

  if (finishedMatchesCount >= 1) {
    return {
      status: "open",
      finishedMatchesCount,
      hasPendingOrInProgress: false,
      currentMatchStatus: null,
      latestRound,
    };
  }

  return {
    status: "waiting_round_1",
    finishedMatchesCount: 0,
    hasPendingOrInProgress: false,
    currentMatchStatus: null,
    latestRound: 0,
  };
}
