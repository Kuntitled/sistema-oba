import Link from "next/link";
import {
  Swords,
  Calendar,
  MapPin,
  Users,
  Trophy,
  ExternalLink,
  GitBranch,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getTournaments } from "@/lib/services/league";
import { TournamentForm } from "@/components/admin/TournamentForm";
import { TournamentStatusSelect } from "@/components/admin/TournamentStatusSelect";
import { DeleteTournamentButton } from "@/components/admin/DeleteTournamentButton";
import {
  TOURNAMENT_CATEGORY_LABELS,
  TOURNAMENT_FORMAT_LABELS,
} from "@/types/domain";

export default async function AdminTorneiosPage() {
  const tournaments = await getTournaments();

  const formatDate = (dateStr: string) => {
    if (!dateStr) return "";
    const [year, month, day] = dateStr.split("-");
    return `${day}/${month}/${year}`;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-foreground tracking-tight flex items-center gap-2">
            <Swords className="h-6 w-6 text-primary" />
            Gestão de Torneios
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
            Crie etapas, gerencie o chaveamento híbrido ao vivo e publique resultados no ranking anual.
          </p>
        </div>

        <TournamentForm />
      </div>

      {/* Listagem */}
      {tournaments.length === 0 ? (
        <Card className="border-dashed border-border/80 bg-card/40 p-12 text-center">
          <div className="flex flex-col items-center justify-center gap-3">
            <Swords className="h-10 w-10 text-muted-foreground" />
            <h3 className="font-bold text-base text-foreground">
              Nenhum torneio criado
            </h3>
            <p className="text-xs text-muted-foreground max-w-sm">
              Clique no botão acima para criar a primeira etapa oficial da temporada.
            </p>
          </div>
        </Card>
      ) : (
        <div className="space-y-3">
          {tournaments.map((tournament) => (
            <Card
              key={tournament.id}
              className="border-border/60 bg-card/60 p-4 sm:p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4"
            >
              <div className="space-y-1.5 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <TournamentStatusSelect
                    tournamentId={tournament.id}
                    currentStatus={tournament.status}
                  />
                  <Badge
                    variant="outline"
                    className={`text-[10px] font-bold ${
                      tournament.category === "oficial"
                        ? "border-fire-yellow/50 text-fire-yellow bg-fire-yellow/10"
                        : "border-primary/40 text-primary"
                    }`}
                  >
                    {TOURNAMENT_CATEGORY_LABELS[tournament.category ?? "semanal"]}
                  </Badge>
                  <Badge variant="outline" className="text-[10px]">
                    {TOURNAMENT_FORMAT_LABELS[tournament.format]}
                  </Badge>
                  {tournament.season && (
                    <Badge variant="secondary" className="text-[10px]">
                      {tournament.season.name}
                    </Badge>
                  )}
                </div>

                <div className="font-bold text-base text-foreground">
                  {tournament.name}
                </div>

                <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Calendar className="h-3 w-3 text-primary" />
                    {formatDate(tournament.event_date)}
                  </span>
                  {tournament.location && (
                    <span className="flex items-center gap-1">
                      <MapPin className="h-3 w-3 text-fire-orange" />
                      {tournament.location}
                    </span>
                  )}
                  {tournament.max_players && (
                    <span className="flex items-center gap-1">
                      <Users className="h-3 w-3" />
                      {tournament.max_players} vagas
                    </span>
                  )}
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2 shrink-0 pt-2 lg:pt-0 border-t lg:border-t-0 border-border/40">
                <Link href={`/torneios/${tournament.slug}`} target="_blank">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 px-2.5 text-xs text-muted-foreground hover:text-foreground gap-1"
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                    Ver Público
                  </Button>
                </Link>

                <Link href={`/admin/torneios/${tournament.id}/chaveamento`}>
                  <Button
                    size="sm"
                    className="h-8 bg-emerald-600 hover:bg-emerald-600/90 text-white font-semibold text-xs gap-1.5 shadow-sm"
                  >
                    <GitBranch className="h-3.5 w-3.5" />
                    Chaveamento / Ao Vivo
                  </Button>
                </Link>

                <Link href={`/admin/torneios/${tournament.id}/resultados`}>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-8 font-semibold text-xs gap-1.5 border-border/80"
                  >
                    <Trophy className="h-3.5 w-3.5 text-amber-500" />
                    Manual
                  </Button>
                </Link>

                <DeleteTournamentButton
                  tournamentId={tournament.id}
                  tournamentName={tournament.name}
                />
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
