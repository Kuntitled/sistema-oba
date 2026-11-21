"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { isValidUuid } from "@/lib/services/arena-queries";
import {
  comboRowToSelection,
  validateTournamentDeckCombo,
} from "@/lib/combo-rules";
import { sanitizePixText } from "@/lib/pix";
import { createReceiptSignedUrl } from "@/lib/services/registrations";
import type { PartRow } from "@/types/domain";

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

function revalidateRegistrationViews(
  tournamentId: string,
  tournamentSlug?: string | null
) {
  revalidatePath("/admin/torneios");
  revalidatePath(`/admin/torneios/${tournamentId}/inscricoes`);
  revalidatePath(`/admin/torneios/${tournamentId}/chaveamento`);
  revalidatePath("/torneios");
  if (tournamentSlug) {
    revalidatePath(`/torneios/${tournamentSlug}`);
  }
  revalidatePath("/meu-painel");
}

/**
 * Atualiza as configurações globais de PIX da Liga OBA (league_settings singleton id = 1).
 */
export async function updateLeagueSettingsAction(formData: FormData) {
  const auth = await requireAdmin();
  if (auth.error) return { error: auth.error };

  const pixKey = (formData.get("pix_key") as string)?.trim() || "";
  const rawReceiver =
    (formData.get("pix_receiver_name") as string)?.trim() || "";
  const rawCity = (formData.get("pix_city") as string)?.trim() || "MANAUS";

  if (!pixKey) {
    return { error: "Informe a chave PIX oficial da Liga OBA." };
  }
  if (pixKey.length > 77) {
    return { error: "A chave PIX deve ter no máximo 77 caracteres." };
  }

  const receiverNormalized = sanitizePixText(rawReceiver, 25);
  if (!receiverNormalized) {
    return {
      error:
        "Informe o nome do recebedor (será normalizado para o padrão PIX até 25 caracteres).",
    };
  }

  const cityNormalized = sanitizePixText(rawCity, 15) || "MANAUS";

  const { data: settings, error } = await auth.supabase
    .from("league_settings")
    .upsert(
      {
        id: 1,
        pix_key: pixKey,
        pix_receiver_name: receiverNormalized,
        pix_city: cityNormalized,
      },
      { onConflict: "id" }
    )
    .select()
    .single();

  if (error) {
    return { error: `Erro ao salvar configurações PIX: ${error.message}` };
  }

  revalidatePath("/admin/configuracoes");
  revalidatePath("/admin/torneios");
  revalidatePath("/torneios");
  revalidatePath("/torneios/[slug]", "page");
  return { success: true, settings };
}

/**
 * Alterna os flags de conferência (payment_verified ou decks_verified).
 */
export async function toggleRegistrationVerificationAction(
  registrationId: string,
  field: "payment_verified" | "decks_verified",
  value: boolean
) {
  const auth = await requireAdmin();
  if (auth.error || !auth.user) {
    return { error: auth.error ?? "Acesso negado." };
  }

  if (!isValidUuid(registrationId)) {
    return { error: "Inscrição inválida." };
  }

  const { data: reg, error: regError } = await auth.supabase
    .from("tournament_registrations")
    .select("id, tournament_id")
    .eq("id", registrationId)
    .maybeSingle();

  if (regError || !reg) {
    return { error: "Inscrição não encontrada." };
  }

  const { data: tour } = await auth.supabase
    .from("tournaments")
    .select("slug")
    .eq("id", reg.tournament_id)
    .maybeSingle();

  const updatePayload =
    field === "payment_verified"
      ? {
          payment_verified: value,
          payment_verified_at: value ? new Date().toISOString() : null,
          payment_verified_by: value ? auth.user.id : null,
        }
      : {
          decks_verified: value,
        };

  const { error: updateError } = await auth.supabase
    .from("tournament_registrations")
    .update(updatePayload)
    .eq("id", registrationId);

  if (updateError) {
    return { error: `Erro ao atualizar conferência: ${updateError.message}` };
  }

  revalidateRegistrationViews(reg.tournament_id, tour?.slug);
  return { success: true };
}

/**
 * Aprova uma inscrição, revalida ban-list e limite de vagas, e adiciona o Blader em tournament_participants.
 */
export async function approveRegistrationAction(registrationId: string) {
  const auth = await requireAdmin();
  if (auth.error) return { error: auth.error };

  if (!isValidUuid(registrationId)) {
    return { error: "Inscrição inválida." };
  }

  const { data: reg, error: regError } = await auth.supabase
    .from("tournament_registrations")
    .select("*")
    .eq("id", registrationId)
    .maybeSingle();

  if (regError || !reg) {
    return { error: "Inscrição não encontrada." };
  }

  const { data: tournament, error: tourError } = await auth.supabase
    .from("tournaments")
    .select("id, slug, ruleset_id, max_players, status")
    .eq("id", reg.tournament_id)
    .maybeSingle();

  if (tourError || !tournament) {
    return { error: "Torneio associado não encontrado." };
  }

  // Carrega combos e valida se há peças banidas ou inválidas no formato atual
  const { data: comboRows, error: combosError } = await auth.supabase
    .from("registration_combos")
    .select("*")
    .eq("registration_id", reg.id)
    .order("slot_number", { ascending: true });

  if (combosError) {
    return { error: `Erro ao ler decklist: ${combosError.message}` };
  }

  if (!comboRows || comboRows.length === 0) {
    return {
      error: "Esta inscrição não possui nenhum combo cadastrado na decklist.",
    };
  }

  const partIds = new Set<string>();
  for (const row of comboRows) {
    if (row.blade_id) partIds.add(row.blade_id);
    if (row.lock_chip_id) partIds.add(row.lock_chip_id);
    if (row.over_blade_id) partIds.add(row.over_blade_id);
    if (row.assist_blade_id) partIds.add(row.assist_blade_id);
    if (row.ratchet_id) partIds.add(row.ratchet_id);
    if (row.bit_id) partIds.add(row.bit_id);
  }

  const [{ data: partRows }, banRes] = await Promise.all([
    partIds.size > 0
      ? auth.supabase
          .from("parts_catalog")
          .select("*")
          .in("id", Array.from(partIds))
      : Promise.resolve({ data: [] as PartRow[] }),
    tournament.ruleset_id
      ? auth.supabase
          .from("ruleset_banned_parts")
          .select("part_id")
          .eq("ruleset_id", tournament.ruleset_id)
      : Promise.resolve({ data: [] as Array<{ part_id: string }> }),
  ]);

  const partsById = new Map<string, PartRow>();
  for (const part of partRows ?? []) {
    partsById.set(part.id, part);
  }
  const bannedPartIds = new Set((banRes.data ?? []).map((b) => b.part_id));

  for (const row of comboRows) {
    const selection = comboRowToSelection(row, partsById);
    const check = validateTournamentDeckCombo(
      selection,
      partsById,
      bannedPartIds,
      row.slot_number
    );
    if (!check.valid) {
      return {
        error: `Não é possível aprovar: ${check.error} Rejeite a inscrição solicitando a troca ao Blader.`,
      };
    }
  }

  // Respeita max_players antes de confirmar participante
  const { data: existingParticipants } = await auth.supabase
    .from("tournament_participants")
    .select("blader_id")
    .eq("tournament_id", tournament.id);

  const participantSet = new Set(
    (existingParticipants ?? []).map((p) => p.blader_id)
  );
  const alreadyParticipant = participantSet.has(reg.blader_id);

  if (
    !alreadyParticipant &&
    tournament.max_players !== null &&
    participantSet.size >= tournament.max_players
  ) {
    return {
      error: `O torneio atingiu o limite máximo de ${tournament.max_players} vagas confirmadas.`,
    };
  }

  // Upsert idempotente em tournament_participants
  const { error: participantError } = await auth.supabase
    .from("tournament_participants")
    .upsert(
      {
        tournament_id: tournament.id,
        blader_id: reg.blader_id,
      },
      { onConflict: "tournament_id,blader_id", ignoreDuplicates: true }
    );

  if (participantError) {
    return {
      error: `Erro ao confirmar Blader no torneio: ${participantError.message}`,
    };
  }

  const { error: approveError } = await auth.supabase
    .from("tournament_registrations")
    .update({
      status: "approved",
      rejection_reason: null,
    })
    .eq("id", reg.id);

  if (approveError) {
    return {
      error: `Erro ao atualizar status da inscrição: ${approveError.message}`,
    };
  }

  revalidateRegistrationViews(tournament.id, tournament.slug);
  return { success: true };
}

async function safelyRemoveParticipantIfNoMatches(
  supabase: Awaited<ReturnType<typeof createClient>>,
  tournamentId: string,
  bladerId: string
): Promise<{ removed: boolean; hasMatches: boolean }> {
  const { data: participant } = await supabase
    .from("tournament_participants")
    .select("id")
    .eq("tournament_id", tournamentId)
    .eq("blader_id", bladerId)
    .maybeSingle();

  if (!participant) {
    return { removed: false, hasMatches: false };
  }

  const { data: matches } = await supabase
    .from("matches")
    .select("id")
    .eq("tournament_id", tournamentId)
    .or(`player1_id.eq.${bladerId},player2_id.eq.${bladerId}`)
    .limit(1);

  if (matches && matches.length > 0) {
    return { removed: false, hasMatches: true };
  }

  await supabase
    .from("tournament_participants")
    .delete()
    .eq("id", participant.id);

  return { removed: true, hasMatches: false };
}

/**
 * Rejeita uma inscrição com motivo obrigatório para o Blader corrigir e reenviar.
 */
export async function rejectRegistrationAction(
  registrationId: string,
  reason: string
) {
  const auth = await requireAdmin();
  if (auth.error) return { error: auth.error };

  if (!isValidUuid(registrationId)) {
    return { error: "Inscrição inválida." };
  }

  const cleanReason = reason.trim();
  if (cleanReason.length < 3) {
    return {
      error: "Informe o motivo da rejeição (mínimo 3 caracteres) para orientar o Blader.",
    };
  }

  const { data: reg, error: regError } = await auth.supabase
    .from("tournament_registrations")
    .select("id, tournament_id, blader_id")
    .eq("id", registrationId)
    .maybeSingle();

  if (regError || !reg) {
    return { error: "Inscrição não encontrada." };
  }

  const { data: tour } = await auth.supabase
    .from("tournaments")
    .select("slug")
    .eq("id", reg.tournament_id)
    .maybeSingle();

  const { error: updateError } = await auth.supabase
    .from("tournament_registrations")
    .update({
      status: "rejected",
      rejection_reason: cleanReason.slice(0, 400),
    })
    .eq("id", registrationId);

  if (updateError) {
    return { error: `Erro ao rejeitar inscrição: ${updateError.message}` };
  }

  const removal = await safelyRemoveParticipantIfNoMatches(
    auth.supabase,
    reg.tournament_id,
    reg.blader_id
  );

  revalidateRegistrationViews(reg.tournament_id, tour?.slug);
  return {
    success: true,
    warning: removal.hasMatches
      ? "A inscrição foi rejeitada, mas o Blader permaneceu no chaveamento pois já possui partidas geradas."
      : null,
  };
}

/**
 * Reabre uma inscrição aprovada ou rejeitada para análise pendente.
 */
export async function reopenRegistrationAction(registrationId: string) {
  const auth = await requireAdmin();
  if (auth.error) return { error: auth.error };

  if (!isValidUuid(registrationId)) {
    return { error: "Inscrição inválida." };
  }

  const { data: reg, error: regError } = await auth.supabase
    .from("tournament_registrations")
    .select("id, tournament_id, blader_id")
    .eq("id", registrationId)
    .maybeSingle();

  if (regError || !reg) {
    return { error: "Inscrição não encontrada." };
  }

  const { data: tour } = await auth.supabase
    .from("tournaments")
    .select("slug")
    .eq("id", reg.tournament_id)
    .maybeSingle();

  const { error: updateError } = await auth.supabase
    .from("tournament_registrations")
    .update({
      status: "pending",
      rejection_reason: null,
    })
    .eq("id", registrationId);

  if (updateError) {
    return { error: `Erro ao reabrir inscrição: ${updateError.message}` };
  }

  const removal = await safelyRemoveParticipantIfNoMatches(
    auth.supabase,
    reg.tournament_id,
    reg.blader_id
  );

  revalidateRegistrationViews(reg.tournament_id, tour?.slug);
  return {
    success: true,
    warning: removal.hasMatches
      ? "Status voltou para Em Análise, porém o Blader já possui partidas geradas no chaveamento."
      : null,
  };
}

/**
 * Renova a Signed URL temporária (15 minutos) do comprovante PIX no painel admin.
 */
export async function refreshReceiptSignedUrlAction(registrationId: string) {
  const auth = await requireAdmin();
  if (auth.error) return { error: auth.error };

  if (!isValidUuid(registrationId)) {
    return { error: "Inscrição inválida." };
  }

  const { data: reg, error } = await auth.supabase
    .from("tournament_registrations")
    .select("receipt_path")
    .eq("id", registrationId)
    .maybeSingle();

  if (error || !reg?.receipt_path) {
    return { error: "Comprovante não encontrado para esta inscrição." };
  }

  const signedUrl = await createReceiptSignedUrl(auth.supabase, reg.receipt_path);
  if (!signedUrl) {
    return {
      error:
        "Não foi possível gerar o link do comprovante. Verifique se a migration 009 foi aplicada.",
    };
  }

  return { success: true, signedUrl };
}
