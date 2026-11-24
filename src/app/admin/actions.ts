"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import {
  calculateOfficialTournamentPoints,
  DEFAULT_SWISS_ROUNDS,
  normalizeTournamentCategory,
  type ObaTournamentCategory,
} from "@/lib/constants";
import { isValidUuid } from "@/lib/services/arena-queries";
import {
  ensureSeasonForDate,
  recalculateAllSeasonsRanking,
  recalculateSeasonRanking,
} from "@/lib/services/ranking-recalc";
import type {
  TournamentCategory,
  TournamentFormat,
  TournamentRegistrationStatus,
  TournamentStatus,
} from "@/types/domain";

async function requireAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user || user.user_metadata?.role !== "admin") {
    return {
      supabase,
      user: null,
      error: "Acesso negado. Faça login como administrador.",
    } as const;
  }

  return { supabase, user, error: null } as const;
}

function parseOptionalUuidField(raw: FormDataEntryValue | null): {
  value: string | null;
  invalid: boolean;
} {
  if (typeof raw !== "string") return { value: null, invalid: false };
  const trimmed = raw.trim();
  if (!trimmed) return { value: null, invalid: false };
  if (!isValidUuid(trimmed)) return { value: null, invalid: true };
  return { value: trimmed, invalid: false };
}

function parseRegistrationStatus(
  raw: FormDataEntryValue | null,
  fallback: TournamentRegistrationStatus = "closed"
): TournamentRegistrationStatus {
  if (raw === "open" || raw === "closed" || raw === "finished") {
    return raw;
  }
  return fallback;
}

function parseEntryFee(raw: FormDataEntryValue | null): {
  value: number;
  error: string | null;
} {
  if (typeof raw !== "string") return { value: 0, error: null };
  const trimmed = raw.trim().replace(",", ".");
  if (!trimmed) return { value: 0, error: null };
  const num = Number(trimmed);
  if (!Number.isFinite(num) || num < 0) {
    return {
      value: 0,
      error: "A taxa de inscrição deve ser um valor numérico maior ou igual a 0.",
    };
  }
  return { value: Math.round(num * 100) / 100, error: null };
}

function parseSafeHttpUrl(raw: FormDataEntryValue | null): {
  value: string | null;
  error: string | null;
} {
  if (typeof raw !== "string") return { value: null, error: null };
  const trimmed = raw.trim();
  if (!trimmed) return { value: null, error: null };

  const withProtocol = /^https?:\/\//i.test(trimmed)
    ? trimmed
    : /^[a-z0-9.-]+\.[a-z]{2,}(\/|$)/i.test(trimmed)
      ? `https://${trimmed}`
      : trimmed;

  try {
    const parsed = new URL(withProtocol);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      return {
        value: null,
        error: "O link do Google Maps deve usar http:// ou https://.",
      };
    }
    return { value: parsed.toString(), error: null };
  } catch {
    return {
      value: null,
      error: "O link do Google Maps informado não é uma URL válida.",
    };
  }
}

function isMissingColumnError(
  error: { code?: string | null; message?: string | null } | null | undefined
): boolean {
  if (!error) return false;
  return error.code === "42703" || error.code === "PGRST204";
}

/**
 * Cadastra um novo Blader e inicializa sua entrada na temporada ativa.
 */
export async function createBladerAction(formData: FormData) {
  const auth = await requireAdmin();
  if (auth.error) return { error: auth.error };

  const name = (formData.get("name") as string)?.trim();
  const nickname = (formData.get("nickname") as string)?.trim();
  const city = (formData.get("city") as string)?.trim() || null;
  const bio = (formData.get("bio") as string)?.trim() || null;
  const avatar_url = (formData.get("avatar_url") as string)?.trim() || null;

  if (!name || !nickname) {
    return { error: "Nome e Apelido são obrigatórios." };
  }

  const { data: blader, error } = await auth.supabase
    .from("bladers")
    .insert({
      name,
      nickname,
      city,
      bio,
      avatar_url,
      is_active: true,
    })
    .select()
    .single();

  if (error) {
    if (error.code === "23505") {
      return {
        error: `O apelido "${nickname}" já está em uso por outro Blader.`,
      };
    }
    return { error: `Erro ao cadastrar Blader: ${error.message}` };
  }

  const { data: activeSeason } = await auth.supabase
    .from("seasons")
    .select("id")
    .eq("is_active", true)
    .maybeSingle();

  const seasonId =
    activeSeason?.id ??
    (await ensureSeasonForDate(
      auth.supabase,
      new Date().toISOString().slice(0, 10)
    ));

  if (seasonId) {
    await auth.supabase.from("ranking").upsert(
      {
        season_id: seasonId,
        blader_id: blader.id,
        total_points: 0,
        tournaments_played: 0,
        swiss_wins: 0,
        podiums_count: 0,
        first_places: 0,
        second_places: 0,
        third_places: 0,
        best_podium: null,
        best_position: null,
      },
      { onConflict: "season_id,blader_id" }
    );
  }

  revalidatePath("/", "layout");
  return { success: true, blader };
}

/**
 * Atualiza os dados de um Blader e recalcula rankings caso o status ativo mude.
 */
export async function updateBladerAction(bladerId: string, formData: FormData) {
  const auth = await requireAdmin();
  if (auth.error) return { error: auth.error };

  if (!isValidUuid(bladerId)) {
    return { error: "Blader inválido." };
  }

  const name = (formData.get("name") as string)?.trim();
  const nickname = (formData.get("nickname") as string)?.trim();
  const hasCityField = formData.has("city");
  const city = (formData.get("city") as string)?.trim() || null;
  const bio = (formData.get("bio") as string)?.trim() || null;
  const avatar_url = (formData.get("avatar_url") as string)?.trim() || null;

  if (!name || !nickname) {
    return { error: "Nome e Apelido são obrigatórios." };
  }

  const { data: existing, error: fetchError } = await auth.supabase
    .from("bladers")
    .select("id, is_active, user_id")
    .eq("id", bladerId)
    .maybeSingle();

  if (fetchError || !existing) {
    return { error: "Blader não encontrado." };
  }

  const isActiveRaw = formData.get("is_active");
  const is_active =
    isActiveRaw === null
      ? existing.is_active
      : isActiveRaw === "true" || isActiveRaw === "on";

  const hasUserIdField = formData.has("user_id");
  const parsedUserId = parseOptionalUuidField(formData.get("user_id"));
  if (hasUserIdField && parsedUserId.invalid) {
    return { error: "O ID de conta (UUID) informado para vínculo é inválido." };
  }

  const updatePayload: {
    name: string;
    nickname: string;
    city?: string | null;
    bio: string | null;
    avatar_url: string | null;
    is_active: boolean;
    user_id?: string | null;
  } = {
    name,
    nickname,
    bio,
    avatar_url,
    is_active,
  };

  if (hasCityField) {
    updatePayload.city = city;
  }

  if (hasUserIdField) {
    updatePayload.user_id = parsedUserId.value;
  }

  const { data: blader, error } = await auth.supabase
    .from("bladers")
    .update(updatePayload)
    .eq("id", bladerId)
    .select()
    .single();

  if (error) {
    if (error.code === "23505") {
      if (error.message.includes("user_id")) {
        return {
          error:
            "Este ID de conta (Auth User) já está vinculado a outro Blader.",
        };
      }
      return {
        error: `O apelido "${nickname}" já está em uso por outro Blader.`,
      };
    }
    return { error: `Erro ao atualizar Blader: ${error.message}` };
  }

  if (existing.is_active !== is_active) {
    await recalculateAllSeasonsRanking(auth.supabase);
  }

  revalidatePath("/", "layout");
  return { success: true, blader };
}

/**
 * Exclui um Blader e recalcula os rankings de todas as temporadas.
 */
export async function deleteBladerAction(bladerId: string) {
  const auth = await requireAdmin();
  if (auth.error) return { error: auth.error };

  const { error } = await auth.supabase
    .from("bladers")
    .delete()
    .eq("id", bladerId);
  if (error) {
    return { error: `Erro ao excluir Blader: ${error.message}` };
  }

  await recalculateAllSeasonsRanking(auth.supabase);
  revalidatePath("/", "layout");
  return { success: true };
}

/**
 * Cria um Torneio (futuro ou retroativo) alinhado ao regulamento OBA.
 */
export async function createTournamentAction(formData: FormData) {
  const auth = await requireAdmin();
  if (auth.error) return { error: auth.error };

  const name = (formData.get("name") as string)?.trim();
  const location = (formData.get("location") as string)?.trim() || null;
  const event_time =
    (formData.get("event_time") as string)?.trim().slice(0, 120) || null;
  const parsedLocationUrl = parseSafeHttpUrl(formData.get("location_url"));
  if (parsedLocationUrl.error) {
    return { error: parsedLocationUrl.error };
  }
  const prize_info =
    (formData.get("prize_info") as string)?.trim().slice(0, 600) || null;
  const event_date = formData.get("event_date") as string;
  const categoryRaw = (formData.get("category") as string) || "semanal";
  const formatRaw =
    (formData.get("format") as string) ||
    (categoryRaw === "oficial" ? "swiss_top_cut" : "swiss_only");
  const statusRaw = (formData.get("status") as string) || "finished";
  const description = (formData.get("description") as string)?.trim() || null;
  const max_players_str = formData.get("max_players") as string;
  const max_players = max_players_str ? parseInt(max_players_str, 10) : null;
  const swissRoundsStr = formData.get("swiss_rounds") as string;
  const swissRoundsParsed = swissRoundsStr
    ? parseInt(swissRoundsStr, 10)
    : DEFAULT_SWISS_ROUNDS;
  const swiss_rounds =
    !isNaN(swissRoundsParsed) && swissRoundsParsed >= 1 && swissRoundsParsed <= 10
      ? swissRoundsParsed
      : DEFAULT_SWISS_ROUNDS;
  const topCutStr = formData.get("top_cut_size") as string;
  const topCutParsed = topCutStr ? parseInt(topCutStr, 10) : null;
  const top_cut_size =
    topCutParsed === 4 || topCutParsed === 8 || topCutParsed === 16
      ? topCutParsed
      : null;

  if (!name || !event_date) {
    return { error: "Nome e Data do Torneio são obrigatórios." };
  }

  const hasRulesetField = formData.has("ruleset_id");
  const parsedRuleset = parseOptionalUuidField(formData.get("ruleset_id"));
  if (hasRulesetField && parsedRuleset.invalid) {
    return { error: "Formato / Ban-list selecionado é inválido." };
  }

  const category: TournamentCategory = normalizeTournamentCategory(categoryRaw);
  const format = formatRaw as TournamentFormat;
  const status = statusRaw as TournamentStatus;
  const registration_status = parseRegistrationStatus(
    formData.get("registration_status"),
    "closed"
  );
  const parsedFee = parseEntryFee(formData.get("entry_fee"));
  if (parsedFee.error) {
    return { error: parsedFee.error };
  }

  const baseSlug = name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "");
  const slug = `${baseSlug}-${event_date}`;

  const seasonId = await ensureSeasonForDate(auth.supabase, event_date);

  const insertPayload: {
    season_id: string | null;
    name: string;
    slug: string;
    description: string | null;
    location: string | null;
    location_url?: string | null;
    event_date: string;
    event_time?: string | null;
    prize_info?: string | null;
    category: TournamentCategory;
    format: TournamentFormat;
    swiss_rounds: number;
    top_cut_size: number | null;
    status: TournamentStatus;
    registration_status: TournamentRegistrationStatus;
    entry_fee: number;
    max_players: number | null;
    ruleset_id?: string | null;
  } = {
    season_id: seasonId,
    name,
    slug,
    description,
    location,
    event_date,
    category,
    format,
    swiss_rounds,
    top_cut_size: format === "swiss_only" ? null : top_cut_size,
    status,
    registration_status,
    entry_fee: parsedFee.value,
    max_players,
  };

  if (parsedLocationUrl.value) {
    insertPayload.location_url = parsedLocationUrl.value;
  }
  if (event_time) {
    insertPayload.event_time = event_time;
  }
  if (prize_info) {
    insertPayload.prize_info = prize_info;
  }

  if (hasRulesetField && parsedRuleset.value) {
    insertPayload.ruleset_id = parsedRuleset.value;
  }

  const { data, error } = await auth.supabase
    .from("tournaments")
    .insert(insertPayload)
    .select()
    .single();

  if (error) {
    if (isMissingColumnError(error)) {
      return {
        error:
          "Os campos Horário, Link Google Maps e Premiação exigem a execução da migration supabase/migrations/010_tournament_promo_fields.sql no Supabase SQL Editor.",
      };
    }
    if (error.code === "23514" && category === "amistoso") {
      return {
        error:
          "A modalidade Amistoso exige a execução da migration supabase/migrations/011_tournament_friendly_category.sql no Supabase SQL Editor.",
      };
    }
    if (error.code === "23505") {
      return { error: "Já existe um torneio com esse nome na mesma data." };
    }
    return { error: `Erro ao criar torneio: ${error.message}` };
  }

  revalidatePath("/", "layout");
  return { success: true, tournament: data };
}

/**
 * Atualiza um Torneio mantendo o slug e recalculando pontos/ranking se categoria, formato ou temporada mudarem.
 */
export async function updateTournamentAction(
  tournamentId: string,
  formData: FormData
) {
  const auth = await requireAdmin();
  if (auth.error) return { error: auth.error };

  if (!isValidUuid(tournamentId)) {
    return { error: "Torneio inválido." };
  }

  const { data: existing, error: fetchError } = await auth.supabase
    .from("tournaments")
    .select("*")
    .eq("id", tournamentId)
    .single();

  if (fetchError || !existing) {
    return { error: "Torneio não encontrado." };
  }

  const name = (formData.get("name") as string)?.trim();
  const location = (formData.get("location") as string)?.trim() || null;
  const hasEventTimeField = formData.has("event_time");
  const event_time =
    (formData.get("event_time") as string)?.trim().slice(0, 120) || null;
  const hasLocationUrlField = formData.has("location_url");
  const parsedLocationUrl = hasLocationUrlField
    ? parseSafeHttpUrl(formData.get("location_url"))
    : { value: existing.location_url ?? null, error: null };
  if (parsedLocationUrl.error) {
    return { error: parsedLocationUrl.error };
  }
  const hasPrizeInfoField = formData.has("prize_info");
  const prize_info =
    (formData.get("prize_info") as string)?.trim().slice(0, 600) || null;
  const event_date = (formData.get("event_date") as string)?.trim();
  const categoryRaw = (formData.get("category") as string) || existing.category;
  const formatRaw = (formData.get("format") as string) || existing.format;
  const statusRaw = (formData.get("status") as string) || existing.status;
  const description = (formData.get("description") as string)?.trim() || null;
  const max_players_str = (formData.get("max_players") as string)?.trim();
  const maxPlayersParsed = max_players_str ? parseInt(max_players_str, 10) : null;
  const max_players =
    maxPlayersParsed !== null && !isNaN(maxPlayersParsed) && maxPlayersParsed > 0
      ? maxPlayersParsed
      : null;

  const swissRoundsStr = formData.get("swiss_rounds") as string;
  const swissRoundsParsed = swissRoundsStr
    ? parseInt(swissRoundsStr, 10)
    : existing.swiss_rounds;
  const swiss_rounds =
    !isNaN(swissRoundsParsed) && swissRoundsParsed >= 1 && swissRoundsParsed <= 10
      ? swissRoundsParsed
      : existing.swiss_rounds;

  if (!name || !event_date) {
    return { error: "Nome e Data do Torneio são obrigatórios." };
  }

  const category: TournamentCategory = normalizeTournamentCategory(categoryRaw);
  const format = formatRaw as TournamentFormat;
  const status = statusRaw as TournamentStatus;
  const registration_status = parseRegistrationStatus(
    formData.get("registration_status"),
    existing.registration_status
  );
  const parsedFee = formData.has("entry_fee")
    ? parseEntryFee(formData.get("entry_fee"))
    : { value: Number(existing.entry_fee ?? 0), error: null };
  if (parsedFee.error) {
    return { error: parsedFee.error };
  }

  if (max_players !== null) {
    const { count: currentParticipantsCount } = await auth.supabase
      .from("tournament_participants")
      .select("id", { count: "exact", head: true })
      .eq("tournament_id", tournamentId);

    if (
      typeof currentParticipantsCount === "number" &&
      max_players < currentParticipantsCount
    ) {
      return {
        error: `O limite de vagas (${max_players}) não pode ser menor que os ${currentParticipantsCount} participantes já confirmados no torneio.`,
      };
    }
  }

  const hasRulesetField = formData.has("ruleset_id");
  const parsedRuleset = parseOptionalUuidField(formData.get("ruleset_id"));
  if (hasRulesetField && parsedRuleset.invalid) {
    return { error: "Formato / Ban-list selecionado é inválido." };
  }

  const yearChanged =
    event_date.slice(0, 4) !== (existing.event_date ?? "").slice(0, 4);
  const newSeasonId =
    yearChanged || !existing.season_id
      ? await ensureSeasonForDate(auth.supabase, event_date)
      : existing.season_id;

  const updatePayload: {
    season_id: string | null;
    name: string;
    description: string | null;
    location: string | null;
    location_url?: string | null;
    event_date: string;
    event_time?: string | null;
    prize_info?: string | null;
    category: TournamentCategory;
    format: TournamentFormat;
    swiss_rounds: number;
    top_cut_size: number | null;
    status: TournamentStatus;
    registration_status: TournamentRegistrationStatus;
    entry_fee: number;
    max_players: number | null;
    ruleset_id?: string | null;
  } = {
    season_id: newSeasonId,
    name,
    description,
    location,
    event_date,
    category,
    format,
    swiss_rounds,
    top_cut_size: format === "swiss_only" ? null : existing.top_cut_size,
    status,
    registration_status,
    entry_fee: parsedFee.value,
    max_players,
  };

  if (hasEventTimeField && event_time !== (existing.event_time ?? null)) {
    updatePayload.event_time = event_time;
  }

  if (
    hasLocationUrlField &&
    parsedLocationUrl.value !== (existing.location_url ?? null)
  ) {
    updatePayload.location_url = parsedLocationUrl.value;
  }

  if (hasPrizeInfoField && prize_info !== (existing.prize_info ?? null)) {
    updatePayload.prize_info = prize_info;
  }

  if (
    hasRulesetField &&
    (parsedRuleset.value !== null || existing.ruleset_id !== null)
  ) {
    updatePayload.ruleset_id = parsedRuleset.value;
  }

  const { data: tournament, error: updateError } = await auth.supabase
    .from("tournaments")
    .update(updatePayload)
    .eq("id", tournamentId)
    .select()
    .single();

  if (updateError || !tournament) {
    if (isMissingColumnError(updateError)) {
      return {
        error:
          "Os campos Horário, Link Google Maps e Premiação exigem a execução da migration supabase/migrations/010_tournament_promo_fields.sql no Supabase SQL Editor.",
      };
    }
    if (updateError?.code === "23514" && category === "amistoso") {
      return {
        error:
          "A modalidade Amistoso exige a execução da migration supabase/migrations/011_tournament_friendly_category.sql no Supabase SQL Editor.",
      };
    }
    return {
      error: `Erro ao atualizar torneio: ${updateError?.message ?? "falha desconhecida"}`,
    };
  }

  const scoringChanged =
    category !== existing.category || format !== existing.format;
  const seasonChanged = newSeasonId !== existing.season_id;

  if (scoringChanged) {
    const { data: resultRows } = await auth.supabase
      .from("tournament_results")
      .select("*")
      .eq("tournament_id", tournamentId);

    for (const row of resultRows ?? []) {
      const isSwissLeader =
        format === "swiss_only" || category === "amistoso"
          ? false
          : Boolean(row.is_swiss_leader);
      const calc = calculateOfficialTournamentPoints({
        category,
        format,
        finalPosition: row.final_position,
        swissWins: row.swiss_wins ?? 0,
        isSwissLeader,
      });

      await auth.supabase
        .from("tournament_results")
        .update({
          swiss_points: calc.swissPoints,
          is_swiss_leader: isSwissLeader,
          swiss_leader_bonus: calc.swissLeaderBonus,
          podium_points: calc.podiumPoints,
          points_earned: calc.totalPoints,
        })
        .eq("id", row.id);
    }
  }

  if (scoringChanged || seasonChanged) {
    if (existing.season_id) {
      await recalculateSeasonRanking(auth.supabase, existing.season_id);
    }
    if (newSeasonId && newSeasonId !== existing.season_id) {
      await recalculateSeasonRanking(auth.supabase, newSeasonId);
    }
  }

  revalidatePath("/", "layout");
  revalidatePath(`/admin/torneios/${tournamentId}/inscricoes`);
  revalidatePath(`/torneios/${tournament.slug}`);
  revalidatePath("/meu-painel");
  return { success: true, tournament };
}

/**
 * Atualiza rapidamente o status das inscrições online (closed | open | finished).
 */
export async function updateTournamentRegistrationStatusAction(
  tournamentId: string,
  registrationStatus: TournamentRegistrationStatus
) {
  const auth = await requireAdmin();
  if (auth.error) return { error: auth.error };

  if (!isValidUuid(tournamentId)) {
    return { error: "Torneio inválido." };
  }

  if (
    registrationStatus !== "closed" &&
    registrationStatus !== "open" &&
    registrationStatus !== "finished"
  ) {
    return { error: "Status de inscrição inválido." };
  }

  const { data: updated, error } = await auth.supabase
    .from("tournaments")
    .update({ registration_status: registrationStatus })
    .eq("id", tournamentId)
    .select("slug")
    .maybeSingle();

  if (error) {
    return {
      error: `Erro ao atualizar inscrições do torneio: ${error.message}`,
    };
  }

  revalidatePath("/admin/torneios");
  revalidatePath(`/admin/torneios/${tournamentId}/inscricoes`);
  revalidatePath("/torneios");
  if (updated?.slug) {
    revalidatePath(`/torneios/${updated.slug}`);
  }
  revalidatePath("/meu-painel");
  return { success: true };
}

/**
 * Altera o status de um Torneio.
 */
export async function updateTournamentStatusAction(
  tournamentId: string,
  newStatus: TournamentStatus
) {
  const auth = await requireAdmin();
  if (auth.error) return { error: auth.error };

  const { error } = await auth.supabase
    .from("tournaments")
    .update({ status: newStatus })
    .eq("id", tournamentId);

  if (error) {
    return { error: `Erro ao atualizar status: ${error.message}` };
  }

  revalidatePath("/", "layout");
  return { success: true };
}

/**
 * Exclui um Torneio e recalcula o ranking das temporadas.
 */
export async function deleteTournamentAction(tournamentId: string) {
  const auth = await requireAdmin();
  if (auth.error) return { error: auth.error };

  const { error } = await auth.supabase
    .from("tournaments")
    .delete()
    .eq("id", tournamentId);

  if (error) {
    return { error: `Erro ao excluir torneio: ${error.message}` };
  }

  await recalculateAllSeasonsRanking(auth.supabase);
  revalidatePath("/", "layout");
  return { success: true };
}

/**
 * Salva os resultados manuais/retroativos de um torneio e recalcula o ranking da temporada.
 */
export async function saveTournamentResultsAction(
  tournamentId: string,
  results: Array<{
    blader_id: string;
    final_position: number;
    swiss_wins?: number;
    is_swiss_leader?: boolean;
    points_earned?: number;
  }>
) {
  const auth = await requireAdmin();
  if (auth.error) return { error: auth.error };

  if (!tournamentId || results.length === 0) {
    return { error: "Dados de resultado inválidos." };
  }

  const { data: tournament, error: tourError } = await auth.supabase
    .from("tournaments")
    .select("*")
    .eq("id", tournamentId)
    .single();

  if (tourError || !tournament) {
    return { error: "Torneio não encontrado." };
  }

  const category: ObaTournamentCategory = normalizeTournamentCategory(
    tournament.category
  );

  const formattedResults = results.map((r) => {
    const swissWins = Math.max(0, Math.floor(r.swiss_wins ?? 0));
    const isSwissLeader =
      category === "amistoso" ? false : Boolean(r.is_swiss_leader);
    const calc = calculateOfficialTournamentPoints({
      category,
      format: tournament.format,
      finalPosition: r.final_position,
      swissWins,
      isSwissLeader,
    });

    const pointsEarned =
      category === "amistoso"
        ? 0
        : r.points_earned !== undefined && r.points_earned !== null
          ? r.points_earned
          : calc.totalPoints;

    return {
      tournament_id: tournamentId,
      blader_id: r.blader_id,
      final_position: r.final_position,
      swiss_wins: swissWins,
      swiss_points: calc.swissPoints,
      is_swiss_leader:
        tournament.format === "swiss_only" ? false : isSwissLeader,
      swiss_leader_bonus: calc.swissLeaderBonus,
      podium_points: calc.podiumPoints,
      points_earned: pointsEarned,
    };
  });

  await auth.supabase
    .from("tournament_results")
    .delete()
    .eq("tournament_id", tournamentId);

  const { error: insertError } = await auth.supabase
    .from("tournament_results")
    .insert(formattedResults);

  if (insertError) {
    return { error: `Erro ao salvar resultados: ${insertError.message}` };
  }

  const seasonId =
    tournament.season_id ??
    (await ensureSeasonForDate(auth.supabase, tournament.event_date));

  await auth.supabase
    .from("tournaments")
    .update({ status: "finished", season_id: seasonId })
    .eq("id", tournamentId);

  if (seasonId) {
    await recalculateSeasonRanking(auth.supabase, seasonId);
  } else {
    await recalculateAllSeasonsRanking(auth.supabase);
  }

  revalidatePath("/", "layout");
  return { success: true };
}

/**
 * Aprova uma solicitação de vínculo entre conta autenticada e Blader existente.
 */
export async function approveBladerClaimAction(claimId: string) {
  const auth = await requireAdmin();
  if (auth.error || !auth.user) {
    return { error: auth.error ?? "Acesso negado." };
  }

  if (!isValidUuid(claimId)) {
    return { error: "Solicitação de vínculo inválida." };
  }

  const { data: claim, error: claimError } = await auth.supabase
    .from("blader_claim_requests")
    .select("*")
    .eq("id", claimId)
    .maybeSingle();

  if (claimError || !claim) {
    return { error: "Solicitação não encontrada." };
  }

  if (claim.status !== "pending") {
    return { error: "Esta solicitação já foi processada." };
  }

  const [{ data: targetBlader }, { data: alreadyLinkedBlader }] =
    await Promise.all([
      auth.supabase
        .from("bladers")
        .select("id, nickname, user_id, avatar_url")
        .eq("id", claim.blader_id)
        .maybeSingle(),
      auth.supabase
        .from("bladers")
        .select("id, nickname")
        .eq("user_id", claim.user_id)
        .neq("id", claim.blader_id)
        .maybeSingle(),
    ]);

  if (!targetBlader) {
    return { error: "O perfil de Blader solicitado não existe mais." };
  }

  if (targetBlader.user_id && targetBlader.user_id !== claim.user_id) {
    return {
      error: `O Blader "${targetBlader.nickname}" já foi vinculado a outra conta.`,
    };
  }

  if (alreadyLinkedBlader) {
    return {
      error: `Esta conta já está vinculada ao Blader "${alreadyLinkedBlader.nickname}".`,
    };
  }

  const bladerUpdate: { user_id: string; avatar_url?: string } = {
    user_id: claim.user_id,
  };
  if (!targetBlader.avatar_url && claim.user_avatar_url) {
    bladerUpdate.avatar_url = claim.user_avatar_url;
  }

  const { error: updateBladerError } = await auth.supabase
    .from("bladers")
    .update(bladerUpdate)
    .eq("id", claim.blader_id);

  if (updateBladerError) {
    return {
      error: `Erro ao vincular perfil: ${updateBladerError.message}`,
    };
  }

  const nowIso = new Date().toISOString();

  await auth.supabase
    .from("blader_claim_requests")
    .update({
      status: "approved",
      reviewed_by: auth.user.id,
      reviewed_at: nowIso,
    })
    .eq("id", claimId);

  // Rejeita outras solicitações pendentes concorrentes para o mesmo blader ou usuário
  await auth.supabase
    .from("blader_claim_requests")
    .update({
      status: "rejected",
      reviewed_by: auth.user.id,
      reviewed_at: nowIso,
    })
    .neq("id", claimId)
    .eq("status", "pending")
    .or(`blader_id.eq.${claim.blader_id},user_id.eq.${claim.user_id}`);

  revalidatePath("/", "layout");
  return { success: true };
}

/**
 * Recusa uma solicitação de vínculo pendente.
 */
export async function rejectBladerClaimAction(claimId: string) {
  const auth = await requireAdmin();
  if (auth.error || !auth.user) {
    return { error: auth.error ?? "Acesso negado." };
  }

  if (!isValidUuid(claimId)) {
    return { error: "Solicitação de vínculo inválida." };
  }

  const { error } = await auth.supabase
    .from("blader_claim_requests")
    .update({
      status: "rejected",
      reviewed_by: auth.user.id,
      reviewed_at: new Date().toISOString(),
    })
    .eq("id", claimId)
    .eq("status", "pending");

  if (error) {
    return { error: `Erro ao recusar solicitação: ${error.message}` };
  }

  revalidatePath("/admin/bladers");
  revalidatePath("/meu-painel");
  return { success: true };
}
