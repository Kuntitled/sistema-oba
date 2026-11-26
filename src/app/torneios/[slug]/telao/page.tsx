import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTournamentBySlug } from "@/lib/services/league";
import {
  getPublicTournamentLiveData,
  getTournamentLiveComboLabels,
} from "@/lib/services/tournament-live";
import { BroadcastBoardClient } from "@/components/tournament/BroadcastBoardClient";

export const dynamic = "force-dynamic";

interface TelaoPageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({
  params,
}: TelaoPageProps): Promise<Metadata> {
  const { slug } = await params;
  const data = await getTournamentBySlug(slug);

  if (!data) {
    return {
      title: "Telão não encontrado | OBA",
    };
  }

  return {
    title: `Telão ao Vivo — ${data.tournament.name} | OBA`,
    description: `Painel de transmissão em tempo real de arenas, placares e chaveamento de ${data.tournament.name}.`,
  };
}

export default async function TorneioTelaoPage({ params }: TelaoPageProps) {
  const { slug } = await params;
  const data = await getTournamentBySlug(slug);

  if (!data) {
    notFound();
  }

  const { tournament, results } = data;
  const [liveData, initialComboLabels] = await Promise.all([
    getPublicTournamentLiveData(tournament.id),
    getTournamentLiveComboLabels(tournament.id),
  ]);

  return (
    <BroadcastBoardClient
      initialTournament={liveData.tournament ?? tournament}
      initialParticipants={liveData.participants}
      initialMatches={liveData.matches}
      initialGames={liveData.games}
      initialArenas={liveData.arenas}
      initialComboLabels={initialComboLabels}
      results={results}
    />
  );
}
