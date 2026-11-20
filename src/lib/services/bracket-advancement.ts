import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import type { MatchRow } from "@/types/domain";

async function setNextMatchSlot(
  supabase: SupabaseClient<Database>,
  targetMatchId: string | null,
  slot: number | null,
  bladerId: string | null,
  requirePendingForClear: boolean
) {
  if (!targetMatchId || (slot !== 1 && slot !== 2)) return;

  const { data: targetMatch } = await supabase
    .from("matches")
    .select("id, status")
    .eq("id", targetMatchId)
    .maybeSingle();

  if (!targetMatch) return;

  if (bladerId === null && requirePendingForClear && targetMatch.status !== "pending") {
    return;
  }

  if (bladerId !== null && targetMatch.status === "finished") {
    return;
  }

  const patch =
    slot === 1 ? { player1_id: bladerId } : { player2_id: bladerId };

  await supabase.from("matches").update(patch).eq("id", targetMatchId);
}

/**
 * Propaga automaticamente vencedor e perdedor na chave do Top Cut
 * quando uma partida mata-mata é encerrada ou reaberta via Desfazer.
 */
export async function syncTopCutAdvancement(
  supabase: SupabaseClient<Database>,
  match: MatchRow
): Promise<void> {
  if (match.stage !== "top_cut") return;

  if (match.status === "finished" && match.winner_id) {
    await setNextMatchSlot(
      supabase,
      match.next_match_id,
      match.next_match_slot,
      match.winner_id,
      false
    );

    const loserId =
      match.winner_id === match.player1_id
        ? match.player2_id
        : match.player1_id;

    if (loserId) {
      await setNextMatchSlot(
        supabase,
        match.loser_next_match_id,
        match.loser_next_match_slot,
        loserId,
        false
      );
    }
    return;
  }

  await setNextMatchSlot(
    supabase,
    match.next_match_id,
    match.next_match_slot,
    null,
    true
  );

  await setNextMatchSlot(
    supabase,
    match.loser_next_match_id,
    match.loser_next_match_slot,
    null,
    true
  );
}
