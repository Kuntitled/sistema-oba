import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getUserRoleFromUser } from "@/lib/auth-roles";
import { getArenaLiveState } from "@/lib/services/arenas";
import { RefereeScoreboard } from "@/components/arena/RefereeScoreboard";
import { Phase2SchemaNotice } from "@/components/arena/Phase2SchemaNotice";

export default async function AdminArenaJudgePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const [{ data: authData }, liveState] = await Promise.all([
    supabase.auth.getUser(),
    getArenaLiveState(id),
  ]);

  const {
    arena,
    games,
    pendingMatches,
    player1Combos,
    player2Combos,
    bladers,
    schemaMissing,
  } = liveState;
  const role = getUserRoleFromUser(authData.user);
  const canQuickStart = role === "admin";

  if (schemaMissing) {
    return (
      <div className="min-h-[100dvh] flex items-center justify-center p-4 bg-background">
        <div className="w-full max-w-xl">
          <Phase2SchemaNotice backHref="/admin/arenas" />
        </div>
      </div>
    );
  }

  if (!arena) {
    notFound();
  }

  return (
    <RefereeScoreboard
      initialArena={arena}
      initialMatch={arena.current_match ?? null}
      initialGames={games}
      initialPlayer1Combos={player1Combos}
      initialPlayer2Combos={player2Combos}
      pendingMatches={pendingMatches}
      bladers={bladers}
      canQuickStart={canQuickStart}
    />
  );
}
