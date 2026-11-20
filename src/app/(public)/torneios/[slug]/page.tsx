import { notFound } from "next/navigation";
import Link from "next/link";
import {
  Calendar,
  MapPin,
  Users,
  ChevronLeft,
  ShieldCheck,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getTournamentBySlug } from "@/lib/services/league";
import { getPublicTournamentLiveData } from "@/lib/services/tournament-live";
import { PublicTournamentLive } from "@/components/tournament/PublicTournamentLive";
import {
  TOURNAMENT_CATEGORY_LABELS,
  TOURNAMENT_FORMAT_LABELS,
  TOURNAMENT_STATUS_LABELS,
} from "@/types/domain";

export default async function TorneioDetalhePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const data = await getTournamentBySlug(slug);

  if (!data) {
    notFound();
  }

  const { tournament, results } = data;
  const liveData = await getPublicTournamentLiveData(tournament.id);

  const formatDate = (dateStr: string) => {
    if (!dateStr) return "";
    const [year, month, day] = dateStr.split("-");
    return `${day}/${month}/${year}`;
  };

  return (
    <div className="container mx-auto px-4 sm:px-6 py-10 max-w-5xl space-y-8">
      {/* Voltar */}
      <Link
        href="/torneios"
        className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground font-semibold transition-colors"
      >
        <ChevronLeft className="h-4 w-4" />
        Voltar para todos os torneios
      </Link>

      {/* Header do Torneio */}
      <Card className="border-border/60 bg-gradient-to-b from-card to-card/60 overflow-hidden shadow-lg">
        <div className="h-2 bg-gradient-to-r from-primary via-fire-orange to-fire-yellow" />
        <CardContent className="p-6 sm:p-8 space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <Badge
              variant={tournament.status === "ongoing" ? "default" : "secondary"}
              className={
                tournament.status === "ongoing"
                  ? "bg-fire-orange text-slate-950 font-bold animate-pulse"
                  : ""
              }
            >
              {TOURNAMENT_STATUS_LABELS[tournament.status]}
            </Badge>
            <Badge variant="outline" className="border-border/60">
              {TOURNAMENT_CATEGORY_LABELS[tournament.category ?? "semanal"]}
            </Badge>
            <Badge variant="outline" className="border-border/60">
              {TOURNAMENT_FORMAT_LABELS[tournament.format]}
            </Badge>
            {tournament.season && (
              <Badge variant="secondary">{tournament.season.name}</Badge>
            )}
          </div>

          <h1 className="text-2xl sm:text-4xl font-black text-foreground tracking-tight">
            {tournament.name}
          </h1>

          {tournament.description && (
            <p className="text-sm text-muted-foreground leading-relaxed">
              {tournament.description}
            </p>
          )}

          <div className="flex flex-wrap items-center gap-6 text-xs text-muted-foreground pt-2 border-t border-border/40">
            <span className="flex items-center gap-1.5">
              <Calendar className="h-4 w-4 text-primary" />
              {formatDate(tournament.event_date)}
            </span>
            {tournament.location && (
              <span className="flex items-center gap-1.5">
                <MapPin className="h-4 w-4 text-fire-orange" />
                {tournament.location}
              </span>
            )}
            {tournament.max_players && (
              <span className="flex items-center gap-1.5">
                <Users className="h-4 w-4" />
                Capacidade: {tournament.max_players} Bladers
              </span>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Arenas ao Vivo, Chaveamento e Resultados */}
      <PublicTournamentLive
        initialTournament={liveData.tournament ?? tournament}
        initialParticipants={liveData.participants}
        initialMatches={liveData.matches}
        initialGames={liveData.games}
        initialArenas={liveData.arenas}
        results={results}
      />

      {/* Atalho discreto para organização */}
      <div className="pt-4 border-t border-border/40 flex flex-wrap items-center justify-end gap-2">
        <Link href={`/admin/torneios/${tournament.id}/chaveamento`}>
          <Button
            size="sm"
            variant="ghost"
            className="text-xs text-muted-foreground hover:text-foreground gap-1.5"
          >
            <ShieldCheck className="h-3.5 w-3.5 text-primary" />
            Gerenciar Chaveamento (Admin)
          </Button>
        </Link>
      </div>
    </div>
  );
}
