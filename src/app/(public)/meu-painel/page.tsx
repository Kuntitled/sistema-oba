import { redirect } from "next/navigation";
import { AlertTriangle, Database } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/server";
import { isMissingTableError } from "@/lib/services/arena-queries";
import { getBladerCardProfile } from "@/lib/services/blader-card";
import {
  getBladerInventoryPartIds,
  getPartsCatalog,
} from "@/lib/services/parts";
import { getBladerRegistrationsOverview } from "@/lib/services/registrations";
import { BladerOnboardingClient } from "@/components/blader/BladerOnboardingClient";
import { BladerPanelClient } from "@/components/blader/BladerPanelClient";
import type {
  BladerClaimRequest,
  BladerRow,
  UnclaimedBladerOption,
} from "@/types/domain";

export default async function MeuPainelPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login?next=/meu-painel");
  }

  const { parts, schemaMissing } = await getPartsCatalog();

  if (schemaMissing) {
    return (
      <div className="container mx-auto px-4 sm:px-6 py-12 max-w-2xl">
        <Card className="border-amber-500/40 bg-amber-500/10">
          <CardContent className="p-6 flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
            <div className="space-y-1.5 text-xs">
              <div className="font-black text-sm text-foreground flex items-center gap-1.5">
                <Database className="h-4 w-4 text-amber-500" />
                Estrutura da Fase 3 aguardando aplicação no Supabase
              </div>
              <p className="text-muted-foreground">
                As migrations{" "}
                <code>005_phase3_ecosystem_schema.sql</code> e{" "}
                <code>006_seed_parts_catalog.sql</code> ainda não foram aplicadas no banco de dados. Assim que um administrador aplicá-las no Supabase SQL Editor, o Painel do Blader estará disponível.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const { data: ownBlader } = await supabase
    .from("bladers")
    .select("*")
    .eq("user_id", user.id)
    .maybeSingle();

  const meta = user.user_metadata ?? {};
  const googleAvatarUrl =
    typeof meta.avatar_url === "string" ? meta.avatar_url : null;
  const suggestedName =
    (typeof meta.full_name === "string" && meta.full_name) ||
    (typeof meta.name === "string" && meta.name) ||
    "";

  if (!ownBlader) {
    const [{ data: unclaimedRows }, { data: claimRow, error: claimErr }] =
      await Promise.all([
        supabase
          .from("bladers")
          .select("*")
          .is("user_id", null)
          .eq("is_active", true)
          .order("nickname", { ascending: true }),
        supabase
          .from("blader_claim_requests")
          .select("*")
          .eq("user_id", user.id)
          .eq("status", "pending")
          .maybeSingle(),
      ]);

    let pendingClaim: BladerClaimRequest | null = null;
    if (!claimErr || !isMissingTableError(claimErr)) {
      if (claimRow) {
        const targetBlader =
          (unclaimedRows ?? []).find((b) => b.id === claimRow.blader_id) ??
          null;
        pendingClaim = {
          ...claimRow,
          blader: targetBlader,
        };
      }
    }

    return (
      <BladerOnboardingClient
        userId={user.id}
        userEmail={user.email ?? null}
        suggestedName={suggestedName}
        suggestedAvatarUrl={googleAvatarUrl}
        unclaimedBladers={(unclaimedRows ?? []) as BladerRow[]}
        pendingClaim={pendingClaim}
      />
    );
  }

  const [
    inventoryIds,
    cardProfile,
    registrationsOverview,
    claimRequestsRes,
  ] = await Promise.all([
    getBladerInventoryPartIds(ownBlader.id),
    getBladerCardProfile(supabase, ownBlader.id),
    getBladerRegistrationsOverview(ownBlader.id),
    supabase
      .from("blader_claim_requests")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false }),
  ]);

  const userClaims = claimRequestsRes.data ?? [];
  const hasApprovedClaim = userClaims.some((c) => c.status === "approved");
  const pendingClaimRow = userClaims.find((c) => c.status === "pending") ?? null;

  let unclaimedBladers: UnclaimedBladerOption[] = [];
  let pendingClaim: BladerClaimRequest | null = null;

  if (!hasApprovedClaim) {
    const { data: unclaimedRows } = await supabase
      .from("bladers")
      .select("*")
      .is("user_id", null)
      .eq("is_active", true)
      .neq("id", ownBlader.id)
      .order("nickname", { ascending: true });

    const rows = (unclaimedRows ?? []) as BladerRow[];
    const statsByBlader = new Map<
      string,
      { tournamentsPlayed: number; totalPoints: number }
    >();

    if (rows.length > 0) {
      const { data: rankRows } = await supabase
        .from("ranking")
        .select("blader_id, tournaments_played, total_points")
        .in(
          "blader_id",
          rows.map((r) => r.id)
        );

      for (const rk of rankRows ?? []) {
        const cur = statsByBlader.get(rk.blader_id) ?? {
          tournamentsPlayed: 0,
          totalPoints: 0,
        };
        cur.tournamentsPlayed += rk.tournaments_played ?? 0;
        cur.totalPoints += rk.total_points ?? 0;
        statsByBlader.set(rk.blader_id, cur);
      }
    }

    unclaimedBladers = rows.map((b) => {
      const st = statsByBlader.get(b.id);
      return {
        ...b,
        tournamentsPlayed: st?.tournamentsPlayed ?? 0,
        totalPoints: st?.totalPoints ?? 0,
      };
    });

    if (pendingClaimRow) {
      let targetBlader: BladerRow | null =
        unclaimedBladers.find((b) => b.id === pendingClaimRow.blader_id) ??
        null;
      if (!targetBlader) {
        const { data: singleBlader } = await supabase
          .from("bladers")
          .select("*")
          .eq("id", pendingClaimRow.blader_id)
          .maybeSingle();
        targetBlader = singleBlader ?? null;
      }
      pendingClaim = {
        ...pendingClaimRow,
        blader: targetBlader,
      };
    }
  }

  const fallbackProfile = cardProfile ?? {
    blader: ownBlader,
    seasonName: null,
    position: null,
    totalPoints: 0,
    tournamentsPlayed: 0,
    swissWins: 0,
    podiumsCount: 0,
    firstPlaces: 0,
    secondPlaces: 0,
    thirdPlaces: 0,
    favoriteCombo: {
      system: null,
      blade: null,
      lockChip: null,
      overBlade: null,
      assistBlade: null,
      ratchet: null,
      bit: null,
    },
    mostUsedCombo: null,
  };

  return (
    <BladerPanelClient
      userId={user.id}
      blader={ownBlader}
      baseCardProfile={fallbackProfile}
      parts={parts}
      initialInventoryIds={inventoryIds}
      initialRegistrations={registrationsOverview.registrations}
      openTournaments={registrationsOverview.openTournaments}
      googleAvatarUrl={googleAvatarUrl}
      userEmail={user.email ?? null}
      hasApprovedClaim={hasApprovedClaim}
      unclaimedBladers={unclaimedBladers}
      pendingClaim={pendingClaim}
    />
  );
}
