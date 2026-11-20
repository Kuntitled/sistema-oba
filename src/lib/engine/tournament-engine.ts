import {
  calculateOfficialTournamentPoints,
  OBA_SWISS_WIN_POINTS,
  type ObaTournamentCategory,
} from "@/lib/constants";
import type {
  BladerRow,
  FinalTournamentResultPreview,
  Match,
  MatchGame,
  RankingEntry,
  SwissStandingRow,
  Tournament,
  TournamentParticipant,
} from "@/types/domain";

export interface SwissStandingsSummary {
  standings: SwissStandingRow[];
  hasAbsoluteLeaderTie: boolean;
  tiedLeaders: SwissStandingRow[];
  currentSwissRound: number;
  unfinishedSwissMatchesCount: number;
  hasPendingTiebreaker: boolean;
}

function compareCreatedAndName(
  aBlader: BladerRow | null,
  bBlader: BladerRow | null,
  aId: string,
  bId: string
): number {
  const aCreated = aBlader?.created_at ?? "";
  const bCreated = bBlader?.created_at ?? "";
  if (aCreated !== bCreated) {
    return aCreated < bCreated ? -1 : 1;
  }
  const aNick = aBlader?.nickname ?? "";
  const bNick = bBlader?.nickname ?? "";
  if (aNick !== bNick) {
    return aNick.localeCompare(bNick, "pt-BR");
  }
  return aId.localeCompare(bId);
}

/**
 * Calcula a classificação oficial da Fase Suíça (OBA — sem Buchholz).
 * Desempates: Vitórias > Xtreme > Burst > Over > Spin > Tiebreaker > created_at.
 */
export function computeSwissStandings(
  participants: TournamentParticipant[],
  matches: Match[],
  games: MatchGame[]
): SwissStandingsSummary {
  const statsMap = new Map<
    string,
    {
      blader: BladerRow | null;
      isDropped: boolean;
      wins: number;
      losses: number;
      matchesPlayed: number;
      xtremeFinishes: number;
      burstFinishes: number;
      overFinishes: number;
      spinFinishes: number;
      tiebreakerWins: number;
      hadBye: boolean;
      opponents: Set<string>;
    }
  >();

  const ensureEntry = (
    bladerId: string,
    blader?: BladerRow | null,
    isDropped = false
  ) => {
    const existing = statsMap.get(bladerId);
    if (existing) {
      if (!existing.blader && blader) existing.blader = blader;
      return existing;
    }
    const created = {
      blader: blader ?? null,
      isDropped,
      wins: 0,
      losses: 0,
      matchesPlayed: 0,
      xtremeFinishes: 0,
      burstFinishes: 0,
      overFinishes: 0,
      spinFinishes: 0,
      tiebreakerWins: 0,
      hadBye: false,
      opponents: new Set<string>(),
    };
    statsMap.set(bladerId, created);
    return created;
  };

  for (const p of participants) {
    ensureEntry(p.blader_id, p.blader ?? null, p.is_dropped);
  }

  const swissMatches = matches.filter(
    (m) => m.stage === "swiss" && m.status !== "cancelled"
  );
  const regularSwissMatches = swissMatches.filter((m) => !m.is_tiebreaker);
  const tiebreakerMatches = swissMatches.filter((m) => m.is_tiebreaker);

  const regularSwissMatchIds = new Set(regularSwissMatches.map((m) => m.id));

  let currentSwissRound = 0;
  let unfinishedSwissMatchesCount = 0;

  for (const m of regularSwissMatches) {
    if (m.round > currentSwissRound) {
      currentSwissRound = m.round;
    }
    if (m.status !== "finished") {
      unfinishedSwissMatchesCount += 1;
    }

    if (m.player1_id) ensureEntry(m.player1_id, m.player1);
    if (m.player2_id) ensureEntry(m.player2_id, m.player2);

    if (m.status !== "finished") continue;

    if (m.is_bye && m.player1_id) {
      const p1 = ensureEntry(m.player1_id, m.player1);
      p1.wins += 1;
      p1.matchesPlayed += 1;
      p1.hadBye = true;
      continue;
    }

    if (m.player1_id && m.player2_id) {
      const p1 = ensureEntry(m.player1_id, m.player1);
      const p2 = ensureEntry(m.player2_id, m.player2);
      p1.matchesPlayed += 1;
      p2.matchesPlayed += 1;
      p1.opponents.add(m.player2_id);
      p2.opponents.add(m.player1_id);

      if (m.winner_id === m.player1_id) {
        p1.wins += 1;
        p2.losses += 1;
      } else if (m.winner_id === m.player2_id) {
        p2.wins += 1;
        p1.losses += 1;
      }
    }
  }

  for (const g of games) {
    if (!regularSwissMatchIds.has(g.match_id) || !g.scoring_player_id) {
      continue;
    }
    const stat = statsMap.get(g.scoring_player_id);
    if (!stat) continue;

    switch (g.finish_type) {
      case "xtreme":
        stat.xtremeFinishes += 1;
        break;
      case "burst":
        stat.burstFinishes += 1;
        break;
      case "over":
        stat.overFinishes += 1;
        break;
      case "spin":
        stat.spinFinishes += 1;
        break;
      default:
        break;
    }
  }

  let hasPendingTiebreaker = false;
  for (const tb of tiebreakerMatches) {
    if (tb.status !== "finished") {
      hasPendingTiebreaker = true;
      continue;
    }
    if (tb.winner_id) {
      const winnerStat = statsMap.get(tb.winner_id);
      if (winnerStat) {
        winnerStat.tiebreakerWins += 1;
      }
    }
  }

  const rows: SwissStandingRow[] = Array.from(statsMap.entries()).map(
    ([bladerId, s]) => ({
      position: 0,
      bladerId,
      blader: s.blader,
      isDropped: s.isDropped,
      wins: s.wins,
      losses: s.losses,
      matchesPlayed: s.matchesPlayed,
      swissPoints: s.wins * OBA_SWISS_WIN_POINTS,
      xtremeFinishes: s.xtremeFinishes,
      burstFinishes: s.burstFinishes,
      overFinishes: s.overFinishes,
      spinFinishes: s.spinFinishes,
      tiebreakerWins: s.tiebreakerWins,
      hadBye: s.hadBye,
      opponents: Array.from(s.opponents),
    })
  );

  rows.sort((a, b) => {
    if (b.wins !== a.wins) return b.wins - a.wins;
    if (b.xtremeFinishes !== a.xtremeFinishes) {
      return b.xtremeFinishes - a.xtremeFinishes;
    }
    if (b.burstFinishes !== a.burstFinishes) {
      return b.burstFinishes - a.burstFinishes;
    }
    if (b.overFinishes !== a.overFinishes) {
      return b.overFinishes - a.overFinishes;
    }
    if (b.spinFinishes !== a.spinFinishes) {
      return b.spinFinishes - a.spinFinishes;
    }
    if (b.tiebreakerWins !== a.tiebreakerWins) {
      return b.tiebreakerWins - a.tiebreakerWins;
    }
    return compareCreatedAndName(a.blader, b.blader, a.bladerId, b.bladerId);
  });

  const standings = rows.map((row, idx) => ({
    ...row,
    position: idx + 1,
  }));

  let tiedLeaders: SwissStandingRow[] = [];
  if (standings.length >= 2) {
    const first = standings[0];
    tiedLeaders = standings.filter(
      (r) =>
        r.wins === first.wins &&
        r.xtremeFinishes === first.xtremeFinishes &&
        r.burstFinishes === first.burstFinishes &&
        r.overFinishes === first.overFinishes &&
        r.spinFinishes === first.spinFinishes &&
        r.tiebreakerWins === first.tiebreakerWins
    );
  }

  const hasAbsoluteLeaderTie =
    currentSwissRound > 0 && tiedLeaders.length >= 2;

  return {
    standings,
    hasAbsoluteLeaderTie,
    tiedLeaders,
    currentSwissRound,
    unfinishedSwissMatchesCount,
    hasPendingTiebreaker,
  };
}

export interface SwissPairingPlan {
  player1Id: string;
  player2Id: string | null;
  isBye: boolean;
  matchNumber: number;
}

/**
 * Gera os pareamentos da próxima rodada Suíça evitando rematches e tratando BYE.
 */
export function generateNextSwissRoundPairings(
  standings: SwissStandingRow[],
  nextRound: number
): { pairings: SwissPairingPlan[]; hadForcedRematch: boolean } {
  const active = standings.filter((s) => !s.isDropped);
  if (active.length < 2) {
    return { pairings: [], hadForcedRematch: false };
  }

  let ordered = [...active];
  if (nextRound === 1) {
    for (let i = ordered.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [ordered[i], ordered[j]] = [ordered[j], ordered[i]];
    }
  }

  let byePlayer: SwissStandingRow | null = null;
  if (ordered.length % 2 === 1) {
    for (let i = ordered.length - 1; i >= 0; i--) {
      if (!ordered[i].hadBye) {
        byePlayer = ordered[i];
        ordered = ordered.filter((_, idx) => idx !== i);
        break;
      }
    }
    if (!byePlayer) {
      byePlayer = ordered[ordered.length - 1];
      ordered = ordered.slice(0, -1);
    }
  }

  const opponentSets = new Map<string, Set<string>>();
  for (const s of ordered) {
    opponentSets.set(s.bladerId, new Set(s.opponents));
  }

  const solvePairs = (allowRematch: boolean): Array<[number, number]> | null => {
    const used = new Array<boolean>(ordered.length).fill(false);
    const result: Array<[number, number]> = [];
    let steps = 0;
    const MAX_STEPS = 50000;

    const backtrack = (): boolean => {
      steps += 1;
      if (steps > MAX_STEPS) return false;

      let firstIdx = -1;
      for (let i = 0; i < ordered.length; i++) {
        if (!used[i]) {
          firstIdx = i;
          break;
        }
      }

      if (firstIdx === -1) return true;

      used[firstIdx] = true;
      const p1 = ordered[firstIdx];
      const p1Opps = opponentSets.get(p1.bladerId);

      for (let j = firstIdx + 1; j < ordered.length; j++) {
        if (used[j]) continue;
        const p2 = ordered[j];
        const alreadyPlayed = p1Opps?.has(p2.bladerId) ?? false;
        if (!allowRematch && alreadyPlayed) continue;

        used[j] = true;
        result.push([firstIdx, j]);
        if (backtrack()) return true;
        result.pop();
        used[j] = false;
      }

      used[firstIdx] = false;
      return false;
    };

    return backtrack() ? result : null;
  };

  let hadForcedRematch = false;
  let pairs = solvePairs(false);

  if (!pairs) {
    hadForcedRematch = true;
    pairs = solvePairs(true);
  }

  if (!pairs) {
    // Fallback determinístico em ordem adjacente se o limite de passos for atingido
    pairs = [];
    for (let i = 0; i + 1 < ordered.length; i += 2) {
      pairs.push([i, i + 1]);
    }
  }

  const pairings: SwissPairingPlan[] = pairs.map(([i, j], idx) => ({
    player1Id: ordered[i].bladerId,
    player2Id: ordered[j].bladerId,
    isBye: false,
    matchNumber: idx + 1,
  }));

  if (byePlayer) {
    pairings.push({
      player1Id: byePlayer.bladerId,
      player2Id: null,
      isBye: true,
      matchNumber: pairings.length + 1,
    });
  }

  return { pairings, hadForcedRematch };
}

export function getTopCutSeedOrder(size: 4 | 8 | 16): Array<[number, number]> {
  switch (size) {
    case 4:
      return [
        [1, 4],
        [2, 3],
      ];
    case 8:
      return [
        [1, 8],
        [4, 5],
        [2, 7],
        [3, 6],
      ];
    case 16:
      return [
        [1, 16],
        [8, 9],
        [4, 13],
        [5, 12],
        [2, 15],
        [7, 10],
        [3, 14],
        [6, 11],
      ];
  }
}

export interface TopCutMatchPlanNode {
  key: string;
  round: number;
  matchNumber: number;
  bracketLabel: string;
  player1Id: string | null;
  player2Id: string | null;
  nextKey: string | null;
  nextSlot: 1 | 2 | null;
  loserNextKey: string | null;
  loserNextSlot: 1 | 2 | null;
}

function getEliminationRoundPrefix(matchCountInRound: number): string {
  switch (matchCountInRound) {
    case 8:
      return "Oitavas";
    case 4:
      return "Quartas";
    case 2:
      return "Semifinal";
    default:
      return "Eliminatória";
  }
}

/**
 * Constrói a árvore completa de Top Cut (Oitavas/Quartas/Semifinais,
 * Grande Final e Disputa de 3º Lugar) com seeding oficial.
 */
export function buildTopCutBracketPlan(
  seededBladerIds: string[],
  topCutSize: 4 | 8 | 16
): TopCutMatchPlanNode[] {
  const totalRounds = Math.log2(topCutSize);
  const seedPairs = getTopCutSeedOrder(topCutSize);
  const nodes: TopCutMatchPlanNode[] = [];

  // Rodada final: Grande Final + Disputa de 3º Lugar
  nodes.push({
    key: `r${totalRounds}-m1`,
    round: totalRounds,
    matchNumber: 1,
    bracketLabel: "Grande Final",
    player1Id: null,
    player2Id: null,
    nextKey: null,
    nextSlot: null,
    loserNextKey: null,
    loserNextSlot: null,
  });

  nodes.push({
    key: `r${totalRounds}-third`,
    round: totalRounds,
    matchNumber: 2,
    bracketLabel: "Disputa de 3º Lugar",
    player1Id: null,
    player2Id: null,
    nextKey: null,
    nextSlot: null,
    loserNextKey: null,
    loserNextSlot: null,
  });

  // Rodadas anteriores (de Semifinais até a Rodada 1)
  for (let round = totalRounds - 1; round >= 1; round--) {
    const matchCount = topCutSize / Math.pow(2, round);
    const prefix = getEliminationRoundPrefix(matchCount);
    const isSemifinal = round === totalRounds - 1;

    for (let m = 1; m <= matchCount; m++) {
      const nextMatchNumber = Math.ceil(m / 2);
      const nextSlot: 1 | 2 = m % 2 === 1 ? 1 : 2;
      const isFirstRound = round === 1;
      const pair = isFirstRound ? seedPairs[m - 1] : null;

      nodes.push({
        key: `r${round}-m${m}`,
        round,
        matchNumber: m,
        bracketLabel: `${prefix} ${m}`,
        player1Id: pair ? (seededBladerIds[pair[0] - 1] ?? null) : null,
        player2Id: pair ? (seededBladerIds[pair[1] - 1] ?? null) : null,
        nextKey: `r${round + 1}-m${nextMatchNumber}`,
        nextSlot,
        loserNextKey: isSemifinal ? `r${totalRounds}-third` : null,
        loserNextSlot: isSemifinal ? (m === 1 ? 1 : 2) : null,
      });
    }
  }

  return nodes;
}

/**
 * Calcula colocação final e pontuação oficial OBA de cada participante do torneio.
 */
export function computeFinalTournamentResults(
  tournament: Pick<Tournament, "category" | "format">,
  participants: TournamentParticipant[],
  matches: Match[],
  games: MatchGame[]
): FinalTournamentResultPreview[] {
  const { standings } = computeSwissStandings(participants, matches, games);
  const swissByBlader = new Map<string, SwissStandingRow>();
  for (const s of standings) {
    swissByBlader.set(s.bladerId, s);
  }

  const swissLeaderId = standings[0]?.bladerId ?? null;
  const topCutMatches = matches.filter(
    (m) => m.stage === "top_cut" && m.status !== "cancelled"
  );
  const usesTopCut =
    tournament.format === "swiss_top_cut" || topCutMatches.length > 0;

  const placedIds: string[] = [];
  const placedSet = new Set<string>();
  const pushPlaced = (id: string | null | undefined) => {
    if (!id || placedSet.has(id)) return;
    placedSet.add(id);
    placedIds.push(id);
  };

  if (usesTopCut && topCutMatches.length > 0) {
    const finalMatch =
      topCutMatches.find((m) => m.bracket_label === "Grande Final") ??
      topCutMatches
        .filter((m) => m.bracket_label !== "Disputa de 3º Lugar")
        .sort((a, b) => b.round - a.round || a.match_number - b.match_number)[0];

    const thirdMatch = topCutMatches.find(
      (m) => m.bracket_label === "Disputa de 3º Lugar"
    );

    if (finalMatch?.status === "finished" && finalMatch.winner_id) {
      pushPlaced(finalMatch.winner_id);
      const runnerUp =
        finalMatch.player1_id === finalMatch.winner_id
          ? finalMatch.player2_id
          : finalMatch.player1_id;
      pushPlaced(runnerUp);
    }

    if (thirdMatch?.status === "finished" && thirdMatch.winner_id) {
      pushPlaced(thirdMatch.winner_id);
      const fourth =
        thirdMatch.player1_id === thirdMatch.winner_id
          ? thirdMatch.player2_id
          : thirdMatch.player1_id;
      pushPlaced(fourth);
    }

    const highestRoundByPlayer = new Map<string, number>();
    for (const m of topCutMatches) {
      if (m.player1_id) {
        highestRoundByPlayer.set(
          m.player1_id,
          Math.max(highestRoundByPlayer.get(m.player1_id) ?? 0, m.round)
        );
      }
      if (m.player2_id) {
        highestRoundByPlayer.set(
          m.player2_id,
          Math.max(highestRoundByPlayer.get(m.player2_id) ?? 0, m.round)
        );
      }
    }

    const remainingTopCut = Array.from(highestRoundByPlayer.entries())
      .filter(([id]) => !placedSet.has(id))
      .sort((a, b) => {
        if (b[1] !== a[1]) return b[1] - a[1];
        const posA = swissByBlader.get(a[0])?.position ?? 999;
        const posB = swissByBlader.get(b[0])?.position ?? 999;
        return posA - posB;
      });

    for (const [id] of remainingTopCut) {
      pushPlaced(id);
    }
  }

  for (const s of standings) {
    pushPlaced(s.bladerId);
  }

  const category: ObaTournamentCategory =
    tournament.category === "oficial" ? "oficial" : "semanal";

  return placedIds.map((bladerId, idx) => {
    const finalPosition = idx + 1;
    const swissRow = swissByBlader.get(bladerId);
    const swissWins = swissRow?.wins ?? 0;
    const isSwissLeader = swissLeaderId !== null && bladerId === swissLeaderId;

    const breakdown = calculateOfficialTournamentPoints({
      category,
      format: tournament.format,
      finalPosition,
      swissWins,
      isSwissLeader,
    });

    return {
      bladerId,
      blader: swissRow?.blader ?? null,
      finalPosition,
      swissWins,
      swissPoints: breakdown.swissPoints,
      isSwissLeader,
      swissLeaderBonus: breakdown.swissLeaderBonus,
      podiumPoints: breakdown.podiumPoints,
      pointsEarned: breakdown.totalPoints,
    };
  });
}

/**
 * Ordenação oficial do Ranking Geral da Temporada OBA:
 * 1º Pontuação Total DESC
 * 2º Melhor colocação no pódio (1 > 2 > 3 > null)
 * 3º Maior quantidade de pódios DESC
 * 4º Maior número de vitórias no Suíço DESC
 * 5º Ordem do primeiro registro (created_at ASC)
 */
export function sortSeasonRankingEntries(
  entries: RankingEntry[]
): RankingEntry[] {
  const sorted = [...entries].sort((a, b) => {
    if (b.total_points !== a.total_points) {
      return b.total_points - a.total_points;
    }

    const bestA = a.best_podium ?? 999;
    const bestB = b.best_podium ?? 999;
    if (bestA !== bestB) {
      return bestA - bestB;
    }

    if (b.podiums_count !== a.podiums_count) {
      return b.podiums_count - a.podiums_count;
    }

    if (b.swiss_wins !== a.swiss_wins) {
      return b.swiss_wins - a.swiss_wins;
    }

    const createdA = a.created_at || a.blader?.created_at || "";
    const createdB = b.created_at || b.blader?.created_at || "";
    if (createdA !== createdB) {
      return createdA < createdB ? -1 : 1;
    }

    return a.blader_id.localeCompare(b.blader_id);
  });

  return sorted.map((entry, idx) => ({
    ...entry,
    position: idx + 1,
  }));
}
