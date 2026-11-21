"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { isValidUuid } from "@/lib/services/arena-queries";
import {
  isValidBeySystem,
  validateComboCompatibility,
} from "@/lib/combo-rules";
import type { ComboSelection, PartRow } from "@/types/domain";

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
      error: "Sessão expirada. Faça login novamente.",
    } as const;
  }

  return { supabase, user, error: null } as const;
}

function parseOptionalUuid(raw: FormDataEntryValue | null): {
  value: string | null;
  invalid: boolean;
} {
  if (typeof raw !== "string") return { value: null, invalid: false };
  const trimmed = raw.trim();
  if (!trimmed) return { value: null, invalid: false };
  if (!isValidUuid(trimmed)) return { value: null, invalid: true };
  return { value: trimmed, invalid: false };
}

export async function createOwnBladerProfileAction(formData: FormData) {
  const auth = await requireAuthenticatedUser();
  if (auth.error || !auth.user) {
    return { error: auth.error ?? "Não autenticado." };
  }

  const nickname = (formData.get("nickname") as string)?.trim();
  const name = (formData.get("name") as string)?.trim();
  const city = (formData.get("city") as string)?.trim() || null;
  const avatar_url = (formData.get("avatar_url") as string)?.trim() || null;

  if (!nickname || !name) {
    return { error: "Apelido (Nickname) e Nome Completo são obrigatórios." };
  }

  const { data: existingOwn } = await auth.supabase
    .from("bladers")
    .select("id")
    .eq("user_id", auth.user.id)
    .maybeSingle();

  if (existingOwn) {
    return { error: "Sua conta já está vinculada a um perfil de Blader." };
  }

  const { data: blader, error } = await auth.supabase
    .from("bladers")
    .insert({
      user_id: auth.user.id,
      nickname,
      name,
      city,
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
    return { error: `Não foi possível criar seu perfil: ${error.message}` };
  }

  await auth.supabase
    .from("blader_claim_requests")
    .delete()
    .eq("user_id", auth.user.id)
    .eq("status", "pending");

  revalidatePath("/", "layout");
  return { success: true, blader };
}

export async function requestBladerClaimAction(
  bladerId: string,
  note?: string
) {
  const auth = await requireAuthenticatedUser();
  if (auth.error || !auth.user) {
    return { error: auth.error ?? "Não autenticado." };
  }

  if (!isValidUuid(bladerId)) {
    return { error: "Blader selecionado é inválido." };
  }

  const { data: existingOwn } = await auth.supabase
    .from("bladers")
    .select("id")
    .eq("user_id", auth.user.id)
    .maybeSingle();

  if (existingOwn) {
    return { error: "Sua conta já possui um perfil de Blader vinculado." };
  }

  const { data: existingPending } = await auth.supabase
    .from("blader_claim_requests")
    .select("id")
    .eq("user_id", auth.user.id)
    .eq("status", "pending")
    .maybeSingle();

  if (existingPending) {
    return {
      error: "Você já possui uma solicitação de vínculo aguardando aprovação.",
    };
  }

  const { data: targetBlader, error: targetError } = await auth.supabase
    .from("bladers")
    .select("id, nickname, user_id, is_active")
    .eq("id", bladerId)
    .maybeSingle();

  if (targetError || !targetBlader || !targetBlader.is_active) {
    return { error: "Perfil de Blader não encontrado ou inativo." };
  }

  if (targetBlader.user_id) {
    return {
      error: `O perfil "${targetBlader.nickname}" já está vinculado a outra conta.`,
    };
  }

  const meta = auth.user.user_metadata ?? {};
  const userName =
    (typeof meta.full_name === "string" && meta.full_name) ||
    (typeof meta.name === "string" && meta.name) ||
    null;
  const userAvatar =
    typeof meta.avatar_url === "string" ? meta.avatar_url : null;

  const { error } = await auth.supabase.from("blader_claim_requests").insert({
    blader_id: bladerId,
    user_id: auth.user.id,
    user_email: auth.user.email ?? null,
    user_name: userName,
    user_avatar_url: userAvatar,
    note: note?.trim() ? note.trim().slice(0, 200) : null,
    status: "pending",
  });

  if (error) {
    if (error.code === "23505") {
      return {
        error: "Você já possui uma solicitação pendente. Aguarde ou cancele-a antes.",
      };
    }
    return { error: `Erro ao enviar solicitação: ${error.message}` };
  }

  revalidatePath("/meu-painel");
  revalidatePath("/admin/bladers");
  return { success: true };
}

export async function cancelBladerClaimAction(claimId: string) {
  const auth = await requireAuthenticatedUser();
  if (auth.error || !auth.user) {
    return { error: auth.error ?? "Não autenticado." };
  }

  if (!isValidUuid(claimId)) {
    return { error: "Solicitação inválida." };
  }

  const { error } = await auth.supabase
    .from("blader_claim_requests")
    .delete()
    .eq("id", claimId)
    .eq("user_id", auth.user.id)
    .eq("status", "pending");

  if (error) {
    return { error: `Erro ao cancelar solicitação: ${error.message}` };
  }

  revalidatePath("/meu-painel");
  revalidatePath("/admin/bladers");
  return { success: true };
}

export async function updateOwnAvatarUrlAction(avatarUrl: string | null) {
  const auth = await requireAuthenticatedUser();
  if (auth.error || !auth.user) {
    return { error: auth.error ?? "Não autenticado." };
  }

  const normalized = avatarUrl?.trim() || null;

  const { data: updated, error } = await auth.supabase
    .from("bladers")
    .update({ avatar_url: normalized })
    .eq("user_id", auth.user.id)
    .select()
    .maybeSingle();

  if (error || !updated) {
    return {
      error: error
        ? `Erro ao salvar avatar: ${error.message}`
        : "Perfil de Blader não encontrado para esta conta.",
    };
  }

  revalidatePath("/", "layout");
  return { success: true, blader: updated };
}

export async function updateOwnBladerProfileAction(formData: FormData) {
  const auth = await requireAuthenticatedUser();
  if (auth.error || !auth.user) {
    return { error: auth.error ?? "Não autenticado." };
  }

  const { data: ownBlader, error: findError } = await auth.supabase
    .from("bladers")
    .select("id")
    .eq("user_id", auth.user.id)
    .maybeSingle();

  if (findError || !ownBlader) {
    return { error: "Perfil de Blader não encontrado para esta conta." };
  }

  const nickname = (formData.get("nickname") as string)?.trim();
  const name = (formData.get("name") as string)?.trim();
  const city = (formData.get("city") as string)?.trim() || null;
  const avatar_url = (formData.get("avatar_url") as string)?.trim() || null;
  const rawBio = (formData.get("bio") as string)?.trim() || null;
  const favorite_anime =
    (formData.get("favorite_anime") as string)?.trim() || null;

  if (!nickname || !name) {
    return { error: "Apelido (Nickname) e Nome Completo são obrigatórios." };
  }

  if (rawBio && rawBio.length > 160) {
    return { error: "A bio deve ter no máximo 160 caracteres." };
  }

  const systemRaw = (formData.get("favorite_system") as string)?.trim() || "";
  if (systemRaw && !isValidBeySystem(systemRaw)) {
    return { error: "Sistema do combo favorito inválido." };
  }

  const bladeParsed = parseOptionalUuid(formData.get("favorite_blade_id"));
  const lockChipParsed = parseOptionalUuid(
    formData.get("favorite_lock_chip_id")
  );
  const overBladeParsed = parseOptionalUuid(
    formData.get("favorite_over_blade_id")
  );
  const assistBladeParsed = parseOptionalUuid(
    formData.get("favorite_assist_blade_id")
  );
  const ratchetParsed = parseOptionalUuid(formData.get("favorite_ratchet_id"));
  const bitParsed = parseOptionalUuid(formData.get("favorite_bit_id"));

  if (
    bladeParsed.invalid ||
    lockChipParsed.invalid ||
    overBladeParsed.invalid ||
    assistBladeParsed.invalid ||
    ratchetParsed.invalid ||
    bitParsed.invalid
  ) {
    return {
      error: "Uma das peças selecionadas para o combo favorito é inválida.",
    };
  }

  const candidateIds = [
    bladeParsed.value,
    lockChipParsed.value,
    overBladeParsed.value,
    assistBladeParsed.value,
    ratchetParsed.value,
    bitParsed.value,
  ].filter((id): id is string => Boolean(id));

  const partsById = new Map<string, PartRow>();
  if (candidateIds.length > 0) {
    const { data: partRows, error: partsError } = await auth.supabase
      .from("parts_catalog")
      .select("*")
      .in("id", candidateIds);

    if (partsError) {
      return {
        error: `Erro ao validar peças do combo favorito: ${partsError.message}`,
      };
    }

    for (const part of partRows ?? []) {
      partsById.set(part.id, part);
    }
  }

  const rawCombo: ComboSelection = {
    system: isValidBeySystem(systemRaw) ? systemRaw : null,
    bladeId: bladeParsed.value ?? "",
    lockChipId: lockChipParsed.value ?? "",
    overBladeId: overBladeParsed.value ?? "",
    assistBladeId: assistBladeParsed.value ?? "",
    ratchetId: ratchetParsed.value ?? "",
    bitId: bitParsed.value ?? "",
  };

  const validation = validateComboCompatibility(rawCombo, partsById);
  if (!validation.valid) {
    return { error: validation.error };
  }

  const combo = validation.sanitized;

  const { data: updated, error } = await auth.supabase
    .from("bladers")
    .update({
      nickname,
      name,
      city,
      avatar_url,
      bio: rawBio,
      favorite_anime,
      favorite_system: combo.system,
      favorite_blade_id: combo.bladeId || null,
      favorite_lock_chip_id: combo.lockChipId || null,
      favorite_over_blade_id: combo.overBladeId || null,
      favorite_assist_blade_id: combo.assistBladeId || null,
      favorite_ratchet_id: combo.ratchetId || null,
      favorite_bit_id: combo.bitId || null,
    })
    .eq("id", ownBlader.id)
    .eq("user_id", auth.user.id)
    .select()
    .single();

  if (error) {
    if (error.code === "23505") {
      return {
        error: `O apelido "${nickname}" já está em uso por outro Blader.`,
      };
    }
    return { error: `Erro ao atualizar perfil: ${error.message}` };
  }

  revalidatePath("/", "layout");
  return { success: true, blader: updated };
}

export async function toggleInventoryPartAction(
  partId: string,
  owned: boolean
) {
  const auth = await requireAuthenticatedUser();
  if (auth.error || !auth.user) {
    return { error: auth.error ?? "Não autenticado." };
  }

  if (!isValidUuid(partId)) {
    return { error: "Peça inválida." };
  }

  const { data: ownBlader, error: findError } = await auth.supabase
    .from("bladers")
    .select("id")
    .eq("user_id", auth.user.id)
    .maybeSingle();

  if (findError || !ownBlader) {
    return { error: "Crie ou vincule seu perfil de Blader primeiro." };
  }

  if (owned) {
    const { error } = await auth.supabase.from("blader_inventory").upsert(
      {
        blader_id: ownBlader.id,
        part_id: partId,
      },
      { onConflict: "blader_id,part_id" }
    );

    if (error) {
      return { error: `Erro ao adicionar peça à coleção: ${error.message}` };
    }
  } else {
    const { error } = await auth.supabase
      .from("blader_inventory")
      .delete()
      .eq("blader_id", ownBlader.id)
      .eq("part_id", partId);

    if (error) {
      return { error: `Erro ao remover peça da coleção: ${error.message}` };
    }
  }

  revalidatePath("/meu-painel");
  return { success: true };
}
