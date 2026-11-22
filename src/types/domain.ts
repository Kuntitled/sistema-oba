/**
 * Tipos de domínio do negócio — Organização de Beyblade do Amazonas (OBA).
 * Abstraem os tipos brutos do banco com semântica de negócio.
 */

import { MATCH_POINTS } from "@/lib/constants";
import type { Database } from "./database";

// ─── Temporadas ───────────────────────────────────────────────────────────────

export type SeasonRow = Database["public"]["Tables"]["seasons"]["Row"];
export type Season = SeasonRow;

// ─── Blader ───────────────────────────────────────────────────────────────────

export type BladerRow = Database["public"]["Tables"]["bladers"]["Row"];

export interface Blader extends BladerRow {
  ranking?: RankingEntry;
}

// ─── Torneio ──────────────────────────────────────────────────────────────────

export type TournamentRow = Database["public"]["Tables"]["tournaments"]["Row"];

export type TournamentCategory =
  Database["public"]["Enums"]["tournament_category"];
export type TournamentFormat = Database["public"]["Enums"]["tournament_format"];
export type TournamentStatus = Database["public"]["Enums"]["tournament_status"];

export interface Tournament extends TournamentRow {
  season?: SeasonRow | null;
  ruleset?: RulesetRow | null;
  results?: TournamentResult[];
  player_count?: number;
}

export type TournamentParticipantRow =
  Database["public"]["Tables"]["tournament_participants"]["Row"];

export interface TournamentParticipant extends TournamentParticipantRow {
  blader?: BladerRow | null;
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

export interface BladerComboSummary {
  system: BeySystem | null;
  summaryText: string;
}

export interface RankingEntry extends RankingRow {
  blader?: BladerRow;
  season?: SeasonRow;
  position?: number; // Posição calculada (1º, 2º, etc.)
  favoriteCombo?: BladerComboSummary | null;
  mostUsedCombo?: (BladerComboSummary & { count: number }) | null;
}

// ─── Arenas & Partidas (Fase 2) ───────────────────────────────────────────────

export type ArenaRow = Database["public"]["Tables"]["arenas"]["Row"];
export type ArenaStatus = Database["public"]["Enums"]["arena_status"];

export interface Arena extends ArenaRow {
  tournament?: TournamentRow | null;
  current_match?: Match | null;
}

export type MatchRow = Database["public"]["Tables"]["matches"]["Row"];
export type MatchStage = Database["public"]["Enums"]["match_stage"];
export type MatchStatus = Database["public"]["Enums"]["match_status"];

export interface Match extends MatchRow {
  player1?: BladerRow | null;
  player2?: BladerRow | null;
  winner?: BladerRow | null;
  arena?: ArenaRow | null;
  tournament?: TournamentRow | null;
  games?: MatchGame[];
}

export type MatchGameRow = Database["public"]["Tables"]["match_games"]["Row"];

export interface MatchGame extends MatchGameRow {
  scoring_player?: BladerRow | null;
}

// ─── Motor de Chaveamento OBA ─────────────────────────────────────────────────

export interface SwissStandingRow {
  position: number;
  bladerId: string;
  blader: BladerRow | null;
  isDropped: boolean;
  wins: number;
  losses: number;
  matchesPlayed: number;
  swissPoints: number;
  xtremeFinishes: number;
  burstFinishes: number;
  overFinishes: number;
  spinFinishes: number;
  tiebreakerWins: number;
  hadBye: boolean;
  opponents: string[];
}

export interface FinalTournamentResultPreview {
  bladerId: string;
  blader: BladerRow | null;
  finalPosition: number;
  swissWins: number;
  swissPoints: number;
  isSwissLeader: boolean;
  swissLeaderBonus: number;
  podiumPoints: number;
  pointsEarned: number;
}

// ─── Pontuação Beyblade X ─────────────────────────────────────────────────────

export type FinishType = Database["public"]["Enums"]["finish_type"];

export const FINISH_POINTS: Record<FinishType, number> = {
  spin: MATCH_POINTS.SPIN_FINISH,
  over: MATCH_POINTS.OVER_FINISH,
  burst: MATCH_POINTS.BURST_FINISH,
  xtreme: MATCH_POINTS.XTREME_FINISH,
  draw: MATCH_POINTS.DRAW,
} as const;

// ─── Labels de Domínio ────────────────────────────────────────────────────────

export const TOURNAMENT_CATEGORY_LABELS: Record<TournamentCategory, string> = {
  semanal: "Semanal",
  oficial: "Oficial",
} as const;

export const TOURNAMENT_FORMAT_LABELS: Record<TournamentFormat, string> = {
  swiss_top_cut: "Suíço + Top Cut",
  swiss_only: "Exclusivamente Suíço",
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

export const ARENA_STATUS_LABELS: Record<ArenaStatus, string> = {
  available: "Livre",
  in_match: "Em Partida",
  maintenance: "Manutenção",
} as const;

export const MATCH_STAGE_LABELS: Record<MatchStage, string> = {
  swiss: "Fase Suíça",
  top_cut: "Top Cut",
} as const;

export const MATCH_STATUS_LABELS: Record<MatchStatus, string> = {
  pending: "Na Fila",
  in_progress: "Ao Vivo",
  finished: "Finalizada",
  cancelled: "Cancelada",
} as const;

export const FINISH_TYPE_LABELS: Record<FinishType, string> = {
  spin: "Spin Finish",
  over: "Over Finish",
  burst: "Burst Finish",
  xtreme: "Xtreme Finish",
  draw: "Empate",
} as const;

// ─── Auth ─────────────────────────────────────────────────────────────────────

export type UserRole = "admin" | "judge" | "blader" | "public";

export interface UserProfile {
  id: string;
  email: string;
  role: UserRole;
  blader_id?: string;
}

// ─── Catálogo de Peças, Formatos & Ecossistema do Blader (Fase 3) ────────────

export type PartRow = Database["public"]["Tables"]["parts_catalog"]["Row"];
export type PartType = Database["public"]["Enums"]["part_type"];
export type PartLine = Database["public"]["Enums"]["part_line"];
export type BeySystem = Database["public"]["Enums"]["bey_system"];

export interface ComboSelection {
  system: BeySystem | null;
  bladeId: string;
  lockChipId: string;
  overBladeId: string;
  assistBladeId: string;
  ratchetId: string;
  bitId: string;
}

export type RulesetRow = Database["public"]["Tables"]["rulesets"]["Row"];
export type RulesetBannedPartRow =
  Database["public"]["Tables"]["ruleset_banned_parts"]["Row"];

export interface RulesetWithBans extends RulesetRow {
  bannedPartIds: string[];
}

export type LeagueSettingsRow =
  Database["public"]["Tables"]["league_settings"]["Row"];
export type BladerInventoryRow =
  Database["public"]["Tables"]["blader_inventory"]["Row"];
export type BladerClaimRequestRow =
  Database["public"]["Tables"]["blader_claim_requests"]["Row"];

export interface BladerClaimRequest extends BladerClaimRequestRow {
  blader?: BladerRow | null;
}

// ─── Inscrições Online, Decklists & PIX (Etapa 3B) ────────────────────────────

export type TournamentRegistrationStatus =
  Database["public"]["Enums"]["tournament_registration_status"];
export type RegistrationStatus =
  Database["public"]["Enums"]["registration_status"];

export type TournamentRegistrationRow =
  Database["public"]["Tables"]["tournament_registrations"]["Row"];
export type RegistrationComboRow =
  Database["public"]["Tables"]["registration_combos"]["Row"];

export const TOURNAMENT_REGISTRATION_STATUS_LABELS: Record<
  TournamentRegistrationStatus,
  string
> = {
  closed: "Inscrições Fechadas",
  open: "Inscrições Abertas",
  finished: "Inscrições Encerradas",
} as const;

export const REGISTRATION_STATUS_LABELS: Record<RegistrationStatus, string> = {
  pending: "Em Análise",
  approved: "Aprovada",
  rejected: "Rejeitada",
} as const;

export interface HydratedRegistrationCombo {
  id?: string;
  slotNumber: number;
  system: BeySystem | null;
  blade: PartRow | null;
  lockChip: PartRow | null;
  overBlade: PartRow | null;
  assistBlade: PartRow | null;
  ratchet: PartRow | null;
  bit: PartRow | null;
  hasBannedPart?: boolean;
  bannedPartNames?: string[];
}

export interface TournamentRegistrationAdminItem
  extends TournamentRegistrationRow {
  blader: BladerRow | null;
  combos: HydratedRegistrationCombo[];
  receiptSignedUrl: string | null;
  isParticipant: boolean;
  hasBannedParts: boolean;
}

export interface BladerRegistrationSummary extends TournamentRegistrationRow {
  tournament: Pick<
    TournamentRow,
    | "id"
    | "name"
    | "slug"
    | "event_date"
    | "location"
    | "entry_fee"
    | "registration_status"
    | "status"
    | "max_players"
  >;
  combos: HydratedRegistrationCombo[];
  receiptSignedUrl: string | null;
}

export interface BladerCardProfile {
  blader: BladerRow;
  seasonName: string | null;
  position: number | null;
  totalPoints: number;
  tournamentsPlayed: number;
  swissWins: number;
  podiumsCount: number;
  firstPlaces: number;
  secondPlaces: number;
  thirdPlaces: number;
  favoriteCombo: {
    system: BeySystem | null;
    blade: PartRow | null;
    lockChip: PartRow | null;
    overBlade: PartRow | null;
    assistBlade: PartRow | null;
    ratchet: PartRow | null;
    bit: PartRow | null;
  };
  mostUsedCombo: string | null;
}

export const PART_TYPE_ORDER: PartType[] = [
  "blade",
  "main_blade",
  "metal_blade",
  "over_blade",
  "lock_chip",
  "assist_blade",
  "ratchet",
  "bit",
];

export const PART_TYPE_LABELS: Record<PartType, string> = {
  blade: "Blade",
  main_blade: "Main Blade",
  metal_blade: "Metal Blade",
  over_blade: "Over Blade",
  lock_chip: "Lock Chip",
  assist_blade: "Assist Blade",
  ratchet: "Ratchet",
  bit: "Bit",
} as const;

export const PART_LINE_ORDER: PartLine[] = [
  "BX",
  "BXE",
  "UX",
  "UXE",
  "CX",
  "CXE",
];

export const PART_LINE_LABELS: Record<PartLine, string> = {
  BX: "Basic Line (BX)",
  BXE: "Basic Expand (BXE)",
  UX: "Unique Line (UX)",
  UXE: "Unique Expand (UXE)",
  CX: "Custom Line (CX)",
  CXE: "Custom Expand (CXE)",
} as const;

export const BEY_SYSTEM_ORDER: BeySystem[] = [
  "BX",
  "BXE",
  "UX",
  "UXE",
  "CX",
  "CXE",
];

export const BEY_SYSTEM_LABELS: Record<BeySystem, string> = {
  BX: "Basic Line (BX)",
  BXE: "Basic Expand (BXE)",
  UX: "Unique Line (UX)",
  UXE: "Unique Expand (UXE)",
  CX: "Custom Line (CX)",
  CXE: "Custom Expand (CXE)",
} as const;
