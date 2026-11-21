"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { isValidUuid } from "@/lib/services/arena-queries";
import type { PartLine, PartType } from "@/types/domain";

const VALID_PART_TYPES = new Set<PartType>([
  "blade",
  "ratchet",
  "bit",
  "lock_chip",
  "assist_blade",
  "over_blade",
]);

const VALID_PART_LINES = new Set<PartLine>(["BX", "UX", "CX"]);

async function requireAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user || user.user_metadata?.role !== "admin") {
    return {
      supabase,
      error: "Acesso negado. Faça login como administrador.",
    } as const;
  }

  return { supabase, error: null } as const;
}

function parseAliases(raw: FormDataEntryValue | null): string[] {
  if (typeof raw !== "string") return [];
  const seen = new Set<string>();
  const result: string[] = [];

  for (const piece of raw.split(",")) {
    const trimmed = piece.trim();
    if (!trimmed) continue;
    const key = trimmed.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(trimmed);
  }

  return result;
}

export async function createPartAction(formData: FormData) {
  const auth = await requireAdmin();
  if (auth.error) return { error: auth.error };

  const name = (formData.get("name") as string)?.trim();
  const partTypeRaw = (formData.get("part_type") as string)?.trim() as PartType;
  const lineRaw = ((formData.get("line") as string)?.trim() || "BX") as PartLine;
  const aliases = parseAliases(formData.get("aliases"));
  const isActiveRaw = formData.get("is_active");
  const is_active =
    isActiveRaw === null ? true : isActiveRaw === "true" || isActiveRaw === "on";

  if (!name) {
    return { error: "Nome da peça é obrigatório." };
  }
  if (!VALID_PART_TYPES.has(partTypeRaw)) {
    return { error: "Tipo de peça inválido." };
  }
  if (!VALID_PART_LINES.has(lineRaw)) {
    return { error: "Linha da peça inválida (use BX, UX ou CX)." };
  }

  const { data: part, error } = await auth.supabase
    .from("parts_catalog")
    .insert({
      name,
      part_type: partTypeRaw,
      line: lineRaw,
      aliases,
      is_active,
    })
    .select()
    .single();

  if (error) {
    if (error.code === "23505") {
      return {
        error: `Já existe uma peça "${name}" cadastrada nesse mesmo tipo.`,
      };
    }
    return { error: `Erro ao cadastrar peça: ${error.message}` };
  }

  revalidatePath("/admin/pecas");
  revalidatePath("/admin/formatos");
  revalidatePath("/meu-painel");
  return { success: true, part };
}

export async function updatePartAction(partId: string, formData: FormData) {
  const auth = await requireAdmin();
  if (auth.error) return { error: auth.error };

  if (!isValidUuid(partId)) {
    return { error: "Peça inválida." };
  }

  const name = (formData.get("name") as string)?.trim();
  const partTypeRaw = (formData.get("part_type") as string)?.trim() as PartType;
  const lineRaw = ((formData.get("line") as string)?.trim() || "BX") as PartLine;
  const aliases = parseAliases(formData.get("aliases"));
  const isActiveRaw = formData.get("is_active");
  const is_active =
    isActiveRaw === null ? true : isActiveRaw === "true" || isActiveRaw === "on";

  if (!name) {
    return { error: "Nome da peça é obrigatório." };
  }
  if (!VALID_PART_TYPES.has(partTypeRaw)) {
    return { error: "Tipo de peça inválido." };
  }
  if (!VALID_PART_LINES.has(lineRaw)) {
    return { error: "Linha da peça inválida (use BX, UX ou CX)." };
  }

  const { data: part, error } = await auth.supabase
    .from("parts_catalog")
    .update({
      name,
      part_type: partTypeRaw,
      line: lineRaw,
      aliases,
      is_active,
    })
    .eq("id", partId)
    .select()
    .single();

  if (error) {
    if (error.code === "23505") {
      return {
        error: `Já existe outra peça "${name}" nesse mesmo tipo.`,
      };
    }
    return { error: `Erro ao atualizar peça: ${error.message}` };
  }

  revalidatePath("/admin/pecas");
  revalidatePath("/admin/formatos");
  revalidatePath("/meu-painel");
  return { success: true, part };
}

export async function deletePartAction(partId: string) {
  const auth = await requireAdmin();
  if (auth.error) return { error: auth.error };

  if (!isValidUuid(partId)) {
    return { error: "Peça inválida." };
  }

  const { error } = await auth.supabase
    .from("parts_catalog")
    .delete()
    .eq("id", partId);

  if (error) {
    return { error: `Erro ao excluir peça: ${error.message}` };
  }

  revalidatePath("/admin/pecas");
  revalidatePath("/admin/formatos");
  revalidatePath("/meu-painel");
  return { success: true };
}

export async function createRulesetAction(formData: FormData) {
  const auth = await requireAdmin();
  if (auth.error) return { error: auth.error };

  const name = (formData.get("name") as string)?.trim();
  const description = (formData.get("description") as string)?.trim() || null;
  const isActiveRaw = formData.get("is_active");
  const is_active =
    isActiveRaw === null ? true : isActiveRaw === "true" || isActiveRaw === "on";

  if (!name) {
    return { error: "Nome do formato é obrigatório." };
  }

  const { data: ruleset, error } = await auth.supabase
    .from("rulesets")
    .insert({
      name,
      description,
      is_active,
    })
    .select()
    .single();

  if (error) {
    if (error.code === "23505") {
      return { error: `Já existe um formato chamado "${name}".` };
    }
    return { error: `Erro ao criar formato: ${error.message}` };
  }

  revalidatePath("/admin/formatos");
  revalidatePath("/admin/torneios");
  revalidatePath("/torneios");
  return { success: true, ruleset };
}

export async function updateRulesetAction(
  rulesetId: string,
  formData: FormData
) {
  const auth = await requireAdmin();
  if (auth.error) return { error: auth.error };

  if (!isValidUuid(rulesetId)) {
    return { error: "Formato inválido." };
  }

  const name = (formData.get("name") as string)?.trim();
  const description = (formData.get("description") as string)?.trim() || null;
  const isActiveRaw = formData.get("is_active");
  const is_active =
    isActiveRaw === null ? true : isActiveRaw === "true" || isActiveRaw === "on";

  if (!name) {
    return { error: "Nome do formato é obrigatório." };
  }

  const { data: ruleset, error } = await auth.supabase
    .from("rulesets")
    .update({
      name,
      description,
      is_active,
    })
    .eq("id", rulesetId)
    .select()
    .single();

  if (error) {
    if (error.code === "23505") {
      return { error: `Já existe outro formato chamado "${name}".` };
    }
    return { error: `Erro ao atualizar formato: ${error.message}` };
  }

  revalidatePath("/admin/formatos");
  revalidatePath("/admin/torneios");
  revalidatePath("/torneios");
  return { success: true, ruleset };
}

export async function deleteRulesetAction(rulesetId: string) {
  const auth = await requireAdmin();
  if (auth.error) return { error: auth.error };

  if (!isValidUuid(rulesetId)) {
    return { error: "Formato inválido." };
  }

  const { error } = await auth.supabase
    .from("rulesets")
    .delete()
    .eq("id", rulesetId);

  if (error) {
    return { error: `Erro ao excluir formato: ${error.message}` };
  }

  revalidatePath("/admin/formatos");
  revalidatePath("/admin/torneios");
  revalidatePath("/torneios");
  return { success: true };
}

export async function toggleRulesetBannedPartAction(
  rulesetId: string,
  partId: string,
  shouldBan: boolean
) {
  const auth = await requireAdmin();
  if (auth.error) return { error: auth.error };

  if (!isValidUuid(rulesetId) || !isValidUuid(partId)) {
    return { error: "Parâmetros inválidos para ban-list." };
  }

  if (shouldBan) {
    const { error } = await auth.supabase.from("ruleset_banned_parts").upsert(
      {
        ruleset_id: rulesetId,
        part_id: partId,
      },
      { onConflict: "ruleset_id,part_id" }
    );

    if (error) {
      return { error: `Erro ao banir peça: ${error.message}` };
    }
  } else {
    const { error } = await auth.supabase
      .from("ruleset_banned_parts")
      .delete()
      .eq("ruleset_id", rulesetId)
      .eq("part_id", partId);

    if (error) {
      return { error: `Erro ao liberar peça: ${error.message}` };
    }
  }

  revalidatePath("/admin/formatos");
  return { success: true };
}
