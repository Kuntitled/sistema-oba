import { createClient } from "@/lib/supabase/server";
import { isMissingTableError } from "@/lib/services/arena-queries";
import type {
  BladerClaimRequest,
  BladerRow,
  PartRow,
  RulesetRow,
  RulesetWithBans,
} from "@/types/domain";

export async function getPartsCatalog(options?: {
  includeInactive?: boolean;
}): Promise<{ parts: PartRow[]; schemaMissing: boolean }> {
  try {
    const supabase = await createClient();
    let query = supabase
      .from("parts_catalog")
      .select("*")
      .order("part_type", { ascending: true })
      .order("name", { ascending: true });

    if (!options?.includeInactive) {
      query = query.eq("is_active", true);
    }

    const { data, error } = await query;

    if (error) {
      if (isMissingTableError(error)) {
        return { parts: [], schemaMissing: true };
      }
      console.error("Erro ao buscar catálogo de peças:", error);
      return { parts: [], schemaMissing: false };
    }

    return { parts: data ?? [], schemaMissing: false };
  } catch (err) {
    console.error("Exceção ao buscar catálogo de peças:", err);
    return { parts: [], schemaMissing: false };
  }
}

export async function getRulesets(options?: {
  includeInactive?: boolean;
}): Promise<{ rulesets: RulesetRow[]; schemaMissing: boolean }> {
  try {
    const supabase = await createClient();
    let query = supabase
      .from("rulesets")
      .select("*")
      .order("name", { ascending: true });

    if (!options?.includeInactive) {
      query = query.eq("is_active", true);
    }

    const { data, error } = await query;

    if (error) {
      if (isMissingTableError(error)) {
        return { rulesets: [], schemaMissing: true };
      }
      console.error("Erro ao buscar formatos (rulesets):", error);
      return { rulesets: [], schemaMissing: false };
    }

    return { rulesets: data ?? [], schemaMissing: false };
  } catch (err) {
    console.error("Exceção ao buscar formatos (rulesets):", err);
    return { rulesets: [], schemaMissing: false };
  }
}

export async function getRulesetsWithBans(): Promise<{
  rulesets: RulesetWithBans[];
  schemaMissing: boolean;
}> {
  try {
    const supabase = await createClient();
    const [rulesetsRes, bansRes] = await Promise.all([
      supabase.from("rulesets").select("*").order("name", { ascending: true }),
      supabase.from("ruleset_banned_parts").select("ruleset_id, part_id"),
    ]);

    if (rulesetsRes.error) {
      if (isMissingTableError(rulesetsRes.error)) {
        return { rulesets: [], schemaMissing: true };
      }
      console.error("Erro ao buscar rulesets:", rulesetsRes.error);
      return { rulesets: [], schemaMissing: false };
    }

    if (bansRes.error && isMissingTableError(bansRes.error)) {
      return { rulesets: [], schemaMissing: true };
    }

    const bannedByRuleset = new Map<string, string[]>();
    for (const row of bansRes.data ?? []) {
      const list = bannedByRuleset.get(row.ruleset_id) ?? [];
      list.push(row.part_id);
      bannedByRuleset.set(row.ruleset_id, list);
    }

    return {
      rulesets: (rulesetsRes.data ?? []).map((rs) => ({
        ...rs,
        bannedPartIds: bannedByRuleset.get(rs.id) ?? [],
      })),
      schemaMissing: false,
    };
  } catch (err) {
    console.error("Exceção ao buscar rulesets com banimentos:", err);
    return { rulesets: [], schemaMissing: false };
  }
}

export async function getBladerInventoryPartIds(
  bladerId: string
): Promise<string[]> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("blader_inventory")
      .select("part_id")
      .eq("blader_id", bladerId);

    if (error) {
      if (!isMissingTableError(error)) {
        console.error("Erro ao buscar inventário do Blader:", error);
      }
      return [];
    }

    return (data ?? []).map((row) => row.part_id);
  } catch (err) {
    console.error("Exceção ao buscar inventário do Blader:", err);
    return [];
  }
}

export async function getPendingBladerClaimRequests(): Promise<{
  claims: BladerClaimRequest[];
  schemaMissing: boolean;
}> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("blader_claim_requests")
      .select("*")
      .eq("status", "pending")
      .order("created_at", { ascending: true });

    if (error) {
      if (isMissingTableError(error)) {
        return { claims: [], schemaMissing: true };
      }
      console.error("Erro ao buscar solicitações de vínculo:", error);
      return { claims: [], schemaMissing: false };
    }

    const rows = data ?? [];
    if (rows.length === 0) {
      return { claims: [], schemaMissing: false };
    }

    const bladerIds = Array.from(new Set(rows.map((c) => c.blader_id)));
    const { data: bladerRows } = await supabase
      .from("bladers")
      .select("*")
      .in("id", bladerIds);

    const bladersById = new Map<string, BladerRow>();
    for (const b of bladerRows ?? []) {
      bladersById.set(b.id, b);
    }

    return {
      claims: rows.map((c) => ({
        ...c,
        blader: bladersById.get(c.blader_id) ?? null,
      })),
      schemaMissing: false,
    };
  } catch (err) {
    console.error("Exceção ao buscar solicitações de vínculo:", err);
    return { claims: [], schemaMissing: false };
  }
}
