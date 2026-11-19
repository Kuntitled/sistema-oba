/**
 * Constantes de domínio do sistema OBA.
 * Regras de negócio, limites e labels centralizados aqui.
 */

// ─── Pontuação de Ranking (por posição final em torneio) ───────────────────────
// Ajustar conforme regulamento oficial da liga
export const RANKING_POINTS_BY_POSITION: Record<number, number> = {
  1: 100,
  2: 75,
  3: 60,
  4: 50,
  5: 40,
  6: 32,
  7: 25,
  8: 20,
} as const;

export const DEFAULT_RANKING_POINTS = 10; // Para posições além da 8ª

// ─── Pontuação de Partida (Beyblade X oficial) ─────────────────────────────────
export const MATCH_POINTS = {
  SPIN_FINISH: 1,
  OVER_FINISH: 2,
  BURST_FINISH: 2,
  XTREME_FINISH: 3,
  DRAW: 0,
} as const;

export const POINTS_TO_WIN_MATCH = 4; // Primeiro a 4 pontos vence a batalha (padrão BX)

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
