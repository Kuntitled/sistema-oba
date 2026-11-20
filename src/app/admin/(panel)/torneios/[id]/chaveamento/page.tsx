import { notFound } from "next/navigation";
import { getTournamentEngineState } from "@/lib/services/tournament-live";
import { TournamentEngineClient } from "@/components/admin/TournamentEngineClient";
import { Phase2SchemaNotice } from "@/components/arena/Phase2SchemaNotice";

export default async function AdminTournamentEnginePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const {
    tournament,
    participants,
    matches,
    games,
    arenas,
    allBladers,
    schemaMissing,
  } = await getTournamentEngineState(id);

  if (schemaMissing) {
    return <Phase2SchemaNotice backHref="/admin/torneios" />;
  }

  if (!tournament) {
    notFound();
  }

  return (
    <TournamentEngineClient
      initialTournament={tournament}
      initialParticipants={participants}
      initialMatches={matches}
      initialGames={games}
      initialArenas={arenas}
      allBladers={allBladers}
    />
  );
}
