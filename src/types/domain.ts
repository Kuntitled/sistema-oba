/**
 * Tipos de domínio do negócio — Beyblade X Amazonas Liga (OBA).
 * Abstraem os tipos brutos do banco com semântica de negócio.
 */

import type { Database } from "./database";

// ─── Blader ───────────────────────────────────────────────────────────────────

export type BladerRow = Database["public"]["Tables"]["bladers"]["Row"];

export interface Blader extends BladerRow {
  ranking?: RankingEntry;
}

// ─── Torneio ──────────────────────────────────────────────────────────────────

export type TournamentRow = Database["public"]["Tables"]["tournaments"]["Row"];

export type TournamentFormat = "swiss" | "single_elim" | "double_elim";
export type TournamentStatus = "draft" | "open" | "ongoing" | "finished";

export interface Tournament extends TournamentRow {
  results?: TournamentResult[];
  player_count?: number;
}

// ─── Resultados ───────────────────────────────────────────────────────────────

export type TournamentResultRow =
  Database["public"]["Tables"]["tournament_results"]["Row"];

export interface TournamentResult extends TournamentResultRow {
  blader?: BladerRow;
  tournament?: TournamentRow;
}

// ─── Ranking ──────────────────────────────────────────────────────────────────

export type RankingRow = Database["public"]["Tables"]["ranking"]["Row"];

export interface RankingEntry extends RankingRow {
  blader?: BladerRow;
  position?: number; // Posição calculada (1º, 2º, etc.)
}

// ─── Pontuação Beyblade X ─────────────────────────────────────────────────────

export type FinishType = "spin" | "over" | "burst" | "xtreme" | "draw";

export const FINISH_POINTS: Record<FinishType, number> = {
  spin: 1,    // Spin Finish
  over: 2,    // Over Finish
  burst: 2,   // Burst Finish
  xtreme: 3,  // Xtreme Finish
  draw: 0,    // Empate
} as const;

// ─── Formatos de Torneio ──────────────────────────────────────────────────────

export const TOURNAMENT_FORMAT_LABELS: Record<TournamentFormat, string> = {
  swiss: "Sistema Suíço",
  single_elim: "Mata-mata Simples",
  double_elim: "Mata-mata Duplo",
} as const;

export const TOURNAMENT_STATUS_LABELS: Record<TournamentStatus, string> = {
  draft: "Rascunho",
  open: "Inscrições Abertas",
  ongoing: "Em Andamento",
  finished: "Encerrado",
} as const;

// ─── Auth ─────────────────────────────────────────────────────────────────────

export type UserRole = "admin" | "judge" | "blader" | "public";

export interface UserProfile {
  id: string;
  email: string;
  role: UserRole;
  blader_id?: string;
}
