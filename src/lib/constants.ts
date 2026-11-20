/**
 * Constantes e regras oficiais de negócio do sistema OBA
 * (Organização de Beyblade do Amazonas).
 */

// ─── Pontuação Oficial OBA por Categoria e Formato ────────────────────────────

export const OBA_PODIUM_POINTS = {
  semanal: { 1: 100, 2: 75, 3: 50 } as Record<number, number>,
  oficial: { 1: 200, 2: 150, 3: 100 } as Record<number, number>,
} as const;

export const OBA_SWISS_WIN_POINTS = 10;
export const OBA_SWISS_LEADER_BONUS = 15; // Exclusivo de torneios swiss_top_cut (não concedido em swiss_only)
export const DEFAULT_SWISS_ROUNDS = 4;
export const ALLOWED_TOP_CUT_SIZES = [4, 8, 16] as const;

export type ObaTournamentCategory = keyof typeof OBA_PODIUM_POINTS;

export function calculateOfficialTournamentPoints(params: {
  category: ObaTournamentCategory;
  format: string;
  finalPosition: number | null;
  swissWins: number;
  isSwissLeader: boolean;
}) {
  const swissWins = Math.max(0, Math.floor(params.swissWins || 0));
  const swissPoints = swissWins * OBA_SWISS_WIN_POINTS;
  const qualifiesLeaderBonus =
    params.isSwissLeader &&
    (params.format === "swiss_top_cut" || params.format === "swiss");
  const swissLeaderBonus = qualifiesLeaderBonus ? OBA_SWISS_LEADER_BONUS : 0;
  const podiumPoints =
    params.finalPosition !== null &&
    params.finalPosition >= 1 &&
    params.finalPosition <= 3
      ? (OBA_PODIUM_POINTS[params.category]?.[params.finalPosition] ?? 0)
      : 0;

  return {
    swissPoints,
    swissLeaderBonus,
    podiumPoints,
    totalPoints: swissPoints + swissLeaderBonus + podiumPoints,
  };
}

// ─── Pontuação de Partida (Beyblade X oficial) ─────────────────────────────────
export const MATCH_POINTS = {
  SPIN_FINISH: 1,
  OVER_FINISH: 2,
  BURST_FINISH: 2,
  XTREME_FINISH: 3,
  DRAW: 0,
} as const;

export const POINTS_TO_WIN_MATCH = 4; // Primeiro a 4 pontos vence a batalha (padrão BX)
export const MATCH_POINT_OFFSET = 1; // Match Point a 1 ponto da meta (3 pts na meta de 4)

export const BX_FINISH_OPTIONS = [
  {
    type: "spin",
    points: MATCH_POINTS.SPIN_FINISH,
    label: "Spin",
    fullLabel: "Spin Finish",
    shortDesc: "Girar por mais tempo",
  },
  {
    type: "over",
    points: MATCH_POINTS.OVER_FINISH,
    label: "Over",
    fullLabel: "Over Finish",
    shortDesc: "Bolsão lateral",
  },
  {
    type: "burst",
    points: MATCH_POINTS.BURST_FINISH,
    label: "Burst",
    fullLabel: "Burst Finish",
    shortDesc: "Desmontar o rival",
  },
  {
    type: "xtreme",
    points: MATCH_POINTS.XTREME_FINISH,
    label: "Xtreme",
    fullLabel: "Xtreme Finish",
    shortDesc: "Xtreme Pocket",
  },
] as const;

// ─── Sistema Suíço ──────────────────────────────────────────────────────────────
export const SWISS_ROUNDS_BY_PLAYERS: Record<string, number> = {
  "4-7": 3,
  "8-15": 4,
  "16-31": 5,
  "32-64": 6,
} as const;

export const MAX_PLAYERS_SWISS = 64;

// ─── App ────────────────────────────────────────────────────────────────────────
export const APP_NAME = "OBA";
export const APP_FULL_NAME = "Open Beyblade Amazonas";
export const APP_DESCRIPTION =
  "Sistema oficial de gestão de torneios, chaveamentos e ranking da Liga de Beyblade X do Amazonas.";
export const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
