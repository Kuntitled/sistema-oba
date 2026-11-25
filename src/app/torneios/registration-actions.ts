"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isValidUuid } from "@/lib/services/arena-queries";
import { validateTournamentDeckCombo } from "@/lib/combo-rules";
import {
  computeBladerReassemblyState,
  extractMultisetPartIdsFromCombos,
  validateReassemblyAgainstOriginalPool,
} from "@/lib/deck-reassembly";
import { RECEIPTS_BUCKET } from "@/lib/receipt-upload";
import type { ComboSelection, PartRow } from "@/types/domain";

const MAX_REGISTRATION_COMBOS = 4;

async function requireAuthenticatedUser() {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    return {
      supabase,
      user: null,
      error: "Faça login para enviar ou editar sua inscrição.",
    } as const;
  }

  return { supabase, user, error: null } as const;
}

function isValidReceiptPath(
  path: string,
  tournamentId: string,
  userId: string
): boolean {
  const expectedPrefix = `${tournamentId}/${userId}/receipt.`;
  if (!path.startsWith(expectedPrefix)) return false;
  if (path.includes("..") || path.includes("\\")) return false;
  const ext = path.slice(expectedPrefix.length);
  return ext === "webp" || ext === "jpg" || ext === "jpeg" || ext === "png" || ext === "pdf";
}

export async function submitTournamentRegistrationAction(payload: {
  tournamentId: string;
  combos: ComboSelection[];
  receiptPath: string | null;
}) {
  const auth = await requireAuthenticatedUser();
  if (auth.error || !auth.user) {
    return { error: auth.error ?? "Não autenticado." };
  }

  if (!isValidUuid(payload.tournamentId)) {
    return { error: "Torneio inválido." };
  }

  if (
    !Array.isArray(payload.combos) ||
    payload.combos.length < 1 ||
    payload.combos.length > MAX_REGISTRATION_COMBOS
  ) {
    return {
      error: `Monte entre 1 e ${MAX_REGISTRATION_COMBOS} combos na sua decklist.`,
    };
  }

  const { data: blader, error: bladerError } = await auth.supabase
    .from("bladers")
    .select("id, nickname, is_active")
    .eq("user_id", auth.user.id)
    .maybeSingle();

  if (bladerError || !blader || !blader.is_active) {
    return {
      error:
        "Sua conta ainda não está vinculada a um perfil de Blader ativo. Acesse Meu Painel primeiro.",
    };
  }

  const { data: tournament, error: tourError } = await auth.supabase
    .from("tournaments")
    .select(
      "id, slug, name, ruleset_id, registration_status, entry_fee, max_players, status"
    )
    .eq("id", payload.tournamentId)
    .maybeSingle();

  if (tourError || !tournament) {
    return { error: "Torneio não encontrado." };
  }

  if (tournament.registration_status !== "open") {
    return {
      error: "As inscrições online para este torneio não estão abertas no momento.",
    };
  }

  const { data: existingReg } = await auth.supabase
    .from("tournament_registrations")
    .select("*")
    .eq("tournament_id", tournament.id)
    .eq("blader_id", blader.id)
    .maybeSingle();

  if (existingReg?.status === "approved") {
    return {
      error:
        "Sua inscrição já foi aprovada pela organização e não pode mais ser alterada.",
    };
  }

  if (!existingReg && tournament.max_players !== null) {
    const { count: participantsCount } = await auth.supabase
      .from("tournament_participants")
      .select("id", { count: "exact", head: true })
      .eq("tournament_id", tournament.id);

    if (
      typeof participantsCount === "number" &&
      participantsCount >= tournament.max_players
    ) {
      return {
        error: `Todas as ${tournament.max_players} vagas confirmadas para este torneio já foram preenchidas.`,
      };
    }
  }

  // Validação das peças e compatibilidade + ban-list do formato
  const allPartIds = new Set<string>();
  for (const c of payload.combos) {
    const candidateIds = [
      c.bladeId,
      c.lockChipId,
      c.overBladeId,
      c.assistBladeId,
      c.ratchetId,
      c.bitId,
    ].filter(Boolean);
    for (const partId of candidateIds) {
      if (!isValidUuid(partId)) {
        return { error: "Uma das peças enviadas na decklist é inválida." };
      }
      allPartIds.add(partId);
    }
  }

  const [{ data: partRows, error: partsError }, banRes] = await Promise.all([
    allPartIds.size > 0
      ? auth.supabase
          .from("parts_catalog")
          .select("*")
          .in("id", Array.from(allPartIds))
      : Promise.resolve({ data: [] as PartRow[], error: null }),
    tournament.ruleset_id
      ? auth.supabase
          .from("ruleset_banned_parts")
          .select("part_id")
          .eq("ruleset_id", tournament.ruleset_id)
      : Promise.resolve({
          data: [] as Array<{ part_id: string }>,
          error: null,
        }),
  ]);

  if (partsError) {
    return {
      error: `Erro ao consultar catálogo de peças: ${partsError.message}`,
    };
  }

  const partsById = new Map<string, PartRow>();
  for (const part of partRows ?? []) {
    partsById.set(part.id, part);
  }

  const bannedPartIds = new Set((banRes.data ?? []).map((b) => b.part_id));
  const sanitizedCombos: ComboSelection[] = [];

  for (let idx = 0; idx < payload.combos.length; idx += 1) {
    const check = validateTournamentDeckCombo(
      payload.combos[idx],
      partsById,
      bannedPartIds,
      idx + 1
    );
    if (!check.valid) {
      return { error: check.error };
    }
    sanitizedCombos.push(check.sanitized);
  }

  const normalizedReceiptPath = payload.receiptPath?.trim() || null;
  if (
    normalizedReceiptPath &&
    !isValidReceiptPath(normalizedReceiptPath, tournament.id, auth.user.id)
  ) {
    return { error: "Caminho do comprovante PIX inválido." };
  }

  const entryFee = Number(tournament.entry_fee ?? 0);
  if (
    entryFee > 0 &&
    !normalizedReceiptPath &&
    !existingReg?.payment_verified
  ) {
    return {
      error: "Envie o comprovante do pagamento PIX antes de concluir sua inscrição.",
    };
  }

  let registrationId: string;

  if (!existingReg) {
    const { data: inserted, error: insertError } = await auth.supabase
      .from("tournament_registrations")
      .insert({
        tournament_id: tournament.id,
        blader_id: blader.id,
        status: "pending",
        payment_verified: false,
        decks_verified: false,
        receipt_path: normalizedReceiptPath,
        rejection_reason: null,
      })
      .select("id")
      .single();

    if (insertError || !inserted) {
      return {
        error: `Não foi possível registrar sua inscrição: ${insertError?.message ?? "falha desconhecida"}`,
      };
    }

    registrationId = inserted.id;
  } else {
    const receiptChanged =
      normalizedReceiptPath !== (existingReg.receipt_path ?? null);
    const keepPaymentVerified =
      !receiptChanged && existingReg.payment_verified;

    const { data: updated, error: updateError } = await auth.supabase
      .from("tournament_registrations")
      .update({
        status: "pending",
        rejection_reason: null,
        decks_verified: false,
        receipt_path: normalizedReceiptPath,
        payment_verified: keepPaymentVerified,
        ...(keepPaymentVerified
          ? {}
          : { payment_verified_at: null, payment_verified_by: null }),
      })
      .eq("id", existingReg.id)
      .select("id")
      .single();

    if (updateError || !updated) {
      return {
        error: `Não foi possível atualizar sua inscrição: ${updateError?.message ?? "falha desconhecida"}`,
      };
    }

    registrationId = updated.id;
  }

  // Substitui os combos da inscrição
  const { error: deleteCombosError } = await auth.supabase
    .from("registration_combos")
    .delete()
    .eq("registration_id", registrationId);

  if (deleteCombosError) {
    return {
      error: `Erro ao atualizar combos da decklist: ${deleteCombosError.message}`,
    };
  }

  const combosPayload = sanitizedCombos.map((combo, index) => ({
    registration_id: registrationId,
    slot_number: index + 1,
    system: combo.system,
    blade_id: combo.bladeId || null,
    lock_chip_id: combo.lockChipId || null,
    over_blade_id: combo.overBladeId || null,
    assist_blade_id: combo.assistBladeId || null,
    ratchet_id: combo.ratchetId || null,
    bit_id: combo.bitId || null,
  }));

  const { error: insertCombosError } = await auth.supabase
    .from("registration_combos")
    .insert(combosPayload);

  if (insertCombosError) {
    return {
      error: `Erro ao salvar combos da decklist: ${insertCombosError.message}`,
    };
  }

  revalidatePath(`/torneios/${tournament.slug}`);
  revalidatePath("/torneios");
  revalidatePath("/meu-painel");
  revalidatePath("/admin/torneios");
  revalidatePath(`/admin/torneios/${tournament.id}/inscricoes`);

  return { success: true, registrationId };
}

export async function cancelOwnRegistrationAction(tournamentId: string) {
  const auth = await requireAuthenticatedUser();
  if (auth.error || !auth.user) {
    return { error: auth.error ?? "Não autenticado." };
  }

  if (!isValidUuid(tournamentId)) {
    return { error: "Torneio inválido." };
  }

  const { data: blader } = await auth.supabase
    .from("bladers")
    .select("id")
    .eq("user_id", auth.user.id)
    .maybeSingle();

  if (!blader) {
    return { error: "Perfil de Blader não encontrado." };
  }

  const { data: existingReg } = await auth.supabase
    .from("tournament_registrations")
    .select("id, status, payment_verified, receipt_path")
    .eq("tournament_id", tournamentId)
    .eq("blader_id", blader.id)
    .maybeSingle();

  if (!existingReg) {
    return { error: "Inscrição não encontrada." };
  }

  if (existingReg.status === "approved") {
    return {
      error:
        "Inscrições já aprovadas não podem ser canceladas por aqui. Procure a organização.",
    };
  }

  if (existingReg.payment_verified) {
    return {
      error:
        "O pagamento desta inscrição já foi confirmado pela organização. Procure um administrador para cancelar.",
    };
  }

  const { data: tour } = await auth.supabase
    .from("tournaments")
    .select("slug")
    .eq("id", tournamentId)
    .maybeSingle();

  const { error: deleteError } = await auth.supabase
    .from("tournament_registrations")
    .delete()
    .eq("id", existingReg.id);

  if (deleteError) {
    return { error: `Erro ao cancelar inscrição: ${deleteError.message}` };
  }

  if (existingReg.receipt_path) {
    try {
      await auth.supabase.storage
        .from(RECEIPTS_BUCKET)
        .remove([existingReg.receipt_path]);
    } catch {
      // Remoção do arquivo antigo é melhor esforço
    }
  }

  if (tour?.slug) {
    revalidatePath(`/torneios/${tour.slug}`);
  }
  revalidatePath("/torneios");
  revalidatePath("/meu-painel");
  revalidatePath("/admin/torneios");
  revalidatePath(`/admin/torneios/${tournamentId}/inscricoes`);

  return { success: true };
}

/**
 * Permite que o Blader autenticado com inscrição aprovada remonte seus combos
 * entre rodadas (quando o torneio está em andamento e o Blader não tem partida
 * pendente/em andamento na rodada atual), usando EXCLUSIVAMENTE o pool de peças
 * originalmente cadastrado neste torneio e respeitando a quantidade de cópias.
 */
export async function reassembleTournamentCombosAction(payload: {
  tournamentId: string;
  combos: ComboSelection[];
}) {
  const auth = await requireAuthenticatedUser();
  if (auth.error || !auth.user) {
    return { error: auth.error ?? "Faça login para remontar seus combos." };
  }

  if (!isValidUuid(payload.tournamentId)) {
    return { error: "Torneio inválido." };
  }

  if (
    !Array.isArray(payload.combos) ||
    payload.combos.length < 1 ||
    payload.combos.length > MAX_REGISTRATION_COMBOS
  ) {
    return {
      error: `Monte entre 1 e ${MAX_REGISTRATION_COMBOS} combos na sua decklist.`,
    };
  }

  const { data: blader, error: bladerError } = await auth.supabase
    .from("bladers")
    .select("id, nickname, is_active")
    .eq("user_id", auth.user.id)
    .maybeSingle();

  if (bladerError || !blader || !blader.is_active) {
    return { error: "Perfil de Blader ativo não encontrado para esta conta." };
  }

  const adminClient = createAdminClient();
  if (!adminClient) {
    return {
      error:
        "Serviço administrativo indisponível no servidor para validar a remontagem.",
    };
  }

  const [{ data: tournament }, { data: reg }, { data: matchRows }] =
    await Promise.all([
      adminClient
        .from("tournaments")
        .select("id, slug, status, ruleset_id")
        .eq("id", payload.tournamentId)
        .maybeSingle(),
      adminClient
        .from("tournament_registrations")
        .select("*")
        .eq("tournament_id", payload.tournamentId)
        .eq("blader_id", blader.id)
        .eq("status", "approved")
        .maybeSingle(),
      adminClient
        .from("matches")
        .select("player1_id, player2_id, status, is_bye, round, stage")
        .eq("tournament_id", payload.tournamentId)
        .or(`player1_id.eq.${blader.id},player2_id.eq.${blader.id}`),
    ]);

  if (!tournament) {
    return { error: "Torneio não encontrado." };
  }

  if (tournament.status !== "ongoing") {
    return {
      error: "A remontagem entre rodadas só é permitida com o torneio em andamento.",
    };
  }

  if (!reg) {
    return {
      error: "Apenas Bladers com inscrição aprovada neste torneio podem remontar combos.",
    };
  }

  const reassemblyState = computeBladerReassemblyState({
    tournamentStatus: tournament.status,
    bladerId: blader.id,
    matches: matchRows ?? [],
  });

  if (reassemblyState.status !== "open") {
    if (reassemblyState.status === "waiting_match") {
      return {
        error:
          "Você ainda possui uma partida pendente ou em andamento na rodada atual. Conclua sua batalha para liberar a remontagem.",
      };
    }
    return {
      error:
        "A remontagem entre rodadas só libera após você concluir sua primeira partida no torneio.",
    };
  }

  const { data: currentActiveCombos, error: activeCombosErr } = await adminClient
    .from("registration_combos")
    .select("*")
    .eq("registration_id", reg.id)
    .eq("is_active", true)
    .order("slot_number", { ascending: true });

  if (activeCombosErr) {
    return { error: `Erro ao consultar combos atuais: ${activeCombosErr.message}` };
  }

  const originalPartIds =
    reg.original_part_ids && reg.original_part_ids.length > 0
      ? reg.original_part_ids
      : extractMultisetPartIdsFromCombos(currentActiveCombos ?? []);

  if (originalPartIds.length === 0) {
    return {
      error: "Nenhuma peça original foi encontrada na sua inscrição neste torneio.",
    };
  }

  const uniquePoolIds = Array.from(new Set(originalPartIds));
  const [{ data: poolPartRows, error: partsErr }, banRes] = await Promise.all([
    adminClient.from("parts_catalog").select("*").in("id", uniquePoolIds),
    tournament.ruleset_id
      ? adminClient
          .from("ruleset_banned_parts")
          .select("part_id")
          .eq("ruleset_id", tournament.ruleset_id)
      : Promise.resolve({ data: [] as Array<{ part_id: string }> }),
  ]);

  if (partsErr) {
    return { error: `Erro ao consultar catálogo de peças: ${partsErr.message}` };
  }

  const partsById = new Map<string, PartRow>();
  for (const part of poolPartRows ?? []) {
    partsById.set(part.id, part);
  }
  const bannedPartIds = new Set((banRes.data ?? []).map((b) => b.part_id));

  // Valida integridade de cada combo (sistemas, flags, ban-list) e pool original
  const sanitizedCombos: ComboSelection[] = [];
  for (let i = 0; i < payload.combos.length; i += 1) {
    const check = validateTournamentDeckCombo(
      payload.combos[i],
      partsById,
      bannedPartIds,
      i + 1
    );
    if (!check.valid) {
      return { error: check.error };
    }
    sanitizedCombos.push(check.sanitized);
  }

  const poolValidation = validateReassemblyAgainstOriginalPool(
    sanitizedCombos,
    originalPartIds,
    partsById
  );
  if (!poolValidation.valid) {
    return { error: poolValidation.error };
  }

  // Garante original_part_ids persistido antes de versionar os combos
  if (!reg.original_part_ids || reg.original_part_ids.length === 0) {
    await adminClient
      .from("tournament_registrations")
      .update({ original_part_ids: originalPartIds })
      .eq("id", reg.id);
  }

  // Preserva histórico dos rounds anteriores desativando os combos atuais
  const { error: deactivateErr } = await adminClient
    .from("registration_combos")
    .update({ is_active: false })
    .eq("registration_id", reg.id)
    .eq("is_active", true);

  if (deactivateErr) {
    return {
      error: `Erro ao versionar combos anteriores: ${deactivateErr.message}`,
    };
  }

  const newRowsPayload = sanitizedCombos.map((combo, index) => ({
    registration_id: reg.id,
    slot_number: index + 1,
    system: combo.system,
    blade_id: combo.bladeId || null,
    lock_chip_id: combo.lockChipId || null,
    over_blade_id: combo.overBladeId || null,
    assist_blade_id: combo.assistBladeId || null,
    ratchet_id: combo.ratchetId || null,
    bit_id: combo.bitId || null,
    is_active: true,
  }));

  const { data: insertedCombos, error: insertErr } = await adminClient
    .from("registration_combos")
    .insert(newRowsPayload)
    .select("*")
    .order("slot_number", { ascending: true });

  if (insertErr || !insertedCombos) {
    // Rollback defensivo reativando os combos anteriores caso o insert falhe
    if ((currentActiveCombos ?? []).length > 0) {
      await adminClient
        .from("registration_combos")
        .update({ is_active: true })
        .in(
          "id",
          (currentActiveCombos ?? []).map((c) => c.id)
        );
    }
    return {
      error: `Erro ao salvar remontagem de combos: ${insertErr?.message ?? "tente novamente"}`,
    };
  }

  revalidatePath(`/torneios/${tournament.slug}`);
  revalidatePath("/meu-painel");
  revalidatePath("/admin/arenas");
  revalidatePath("/admin/arena/[id]", "page");
  revalidatePath(`/admin/torneios/${tournament.id}/inscricoes`);
  revalidatePath(`/admin/torneios/${tournament.id}/chaveamento`);
  revalidatePath("/estatisticas");

  return { success: true, combos: insertedCombos };
}
