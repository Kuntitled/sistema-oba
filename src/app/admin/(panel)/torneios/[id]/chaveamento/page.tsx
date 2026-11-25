import { notFound } from "next/navigation";
import { getTournamentEngineState } from "@/lib/services/tournament-live";
import { getPartsCatalog } from "@/lib/services/parts";
import {
  getRulesetBannedParts,
  getTournamentCombosByBladerId,
} from "@/lib/services/registrations";
import { TournamentEngineClient } from "@/components/admin/TournamentEngineClient";
import { Phase2SchemaNotice } from "@/components/arena/Phase2SchemaNotice";

export default async function AdminTournamentEnginePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [engineState, partsRes, combosByBlader] = await Promise.all([
    getTournamentEngineState(id),
    getPartsCatalog({ includeInactive: false }),
    getTournamentCombosByBladerId(id),
  ]);

  const {
    tournament,
    participants,
    matches,
    games,
    arenas,
    allBladers,
    schemaMissing,
  } = engineState;

  if (schemaMissing) {
    return <Phase2SchemaNotice backHref="/admin/torneios" />;
  }

  if (!tournament) {
    notFound();
  }

  const bansRes = tournament.ruleset_id
    ? await getRulesetBannedParts(tournament.ruleset_id)
    : { bannedPartIds: [], bannedParts: [] };

  return (
    <TournamentEngineClient
      initialTournament={tournament}
      initialParticipants={participants}
      initialMatches={matches}
      initialGames={games}
      initialArenas={arenas}
      allBladers={allBladers}
      parts={partsRes.parts}
      bannedParts={bansRes.bannedParts}
      initialCombosByBlader={combosByBlader}
    />
  );
}
