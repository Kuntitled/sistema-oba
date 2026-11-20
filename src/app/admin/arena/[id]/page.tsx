import { notFound } from "next/navigation";
import { getArenaLiveState } from "@/lib/services/arenas";
import { RefereeScoreboard } from "@/components/arena/RefereeScoreboard";
import { Phase2SchemaNotice } from "@/components/arena/Phase2SchemaNotice";

export default async function AdminArenaJudgePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { arena, games, pendingMatches, bladers, schemaMissing } =
    await getArenaLiveState(id);

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
      pendingMatches={pendingMatches}
      bladers={bladers}
    />
  );
}
