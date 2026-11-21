import Link from "next/link";
import { Swords, Calendar, MapPin, Users, ChevronRight, Flame, Radio } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getTournaments } from "@/lib/services/league";
import {
  TOURNAMENT_CATEGORY_LABELS,
  TOURNAMENT_FORMAT_LABELS,
  TOURNAMENT_STATUS_LABELS,
} from "@/types/domain";


export default async function TorneiosPage() {
  const tournaments = await getTournaments();

  const getStatusBadge = (status: keyof typeof TOURNAMENT_STATUS_LABELS) => {
    switch (status) {
      case "finished":
        return (
          <Badge variant="secondary" className="bg-muted text-muted-foreground font-semibold text-[11px]">
            {TOURNAMENT_STATUS_LABELS[status]}
          </Badge>
        );
      case "ongoing":
        return (
          <Badge className="bg-fire-orange text-slate-950 font-bold text-[11px] animate-pulse">
            <Flame className="h-3 w-3 mr-1" />
            {TOURNAMENT_STATUS_LABELS[status]}
          </Badge>
        );
      case "open":
        return (
          <Badge className="bg-emerald-600 text-white font-bold text-[11px]">
            {TOURNAMENT_STATUS_LABELS[status]}
          </Badge>
        );
      default:
        return (
          <Badge variant="outline" className="text-muted-foreground text-[11px]">
            {TOURNAMENT_STATUS_LABELS[status]}
          </Badge>
        );
    }
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return "";
    const [year, month, day] = dateStr.split("-");
    return `${day}/${month}/${year}`;
  };

  return (
    <div className="container mx-auto px-4 sm:px-6 py-10 max-w-5xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
        <div>
          <div className="flex items-center gap-2">
            <Swords className="h-6 w-6 text-primary" />
            <h1 className="text-2xl sm:text-3xl font-black text-foreground tracking-tight">
              Torneios da Liga OBA
            </h1>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            Histórico completo de etapas, chaveamentos e resultados oficiais.
          </p>
        </div>

        <Link href="/admin/torneios">
          <Button variant="outline" size="sm" className="border-border/80 text-xs font-semibold gap-1.5">
            + Criar Novo Torneio (Admin)
          </Button>
        </Link>
      </div>

      {/* Listagem */}
      {tournaments.length === 0 ? (
        <Card className="border-dashed border-border/80 bg-card/40 p-12 text-center">
          <div className="flex flex-col items-center justify-center gap-3">
            <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center text-muted-foreground">
              <Swords className="h-6 w-6" />
            </div>
            <h3 className="font-bold text-lg text-foreground">
              Nenhum torneio cadastrado
            </h3>
            <p className="text-sm text-muted-foreground max-w-md">
              Os eventos criados pelos organizadores aparecerão aqui com chaveamento e resultados em tempo real.
            </p>
            <Link href="/admin/torneios" className="mt-2">
              <Button className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold text-xs">
                Cadastrar Primeiro Torneio
              </Button>
            </Link>
          </div>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {tournaments.map((tournament) => (
            <Link key={tournament.id} href={`/torneios/${tournament.slug}`}>
              <Card className="border-border/60 bg-card/60 hover:border-primary/50 hover:bg-card/90 transition-all duration-200 group overflow-hidden">
                <CardContent className="p-5 sm:p-6">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="space-y-2 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        {getStatusBadge(tournament.status)}
                        <Badge
                          variant="outline"
                          className={`text-xs font-bold ${
                            tournament.category === "oficial"
                              ? "border-fire-yellow/50 text-fire-yellow bg-fire-yellow/10"
                              : "border-primary/40 text-primary"
                          }`}
                        >
                          {TOURNAMENT_CATEGORY_LABELS[tournament.category ?? "semanal"]}
                        </Badge>
                        <Badge variant="outline" className="border-border/60 text-xs font-medium">
                          {TOURNAMENT_FORMAT_LABELS[tournament.format]}
                        </Badge>
                        {tournament.ruleset && (
                          <Badge
                            variant="outline"
                            className="border-primary/35 text-primary/90 bg-primary/5 text-xs font-medium"
                          >
                            Regras: {tournament.ruleset.name}
                          </Badge>
                        )}
                        {tournament.season && (
                          <Badge variant="secondary" className="text-[11px]">
                            {tournament.season.name}
                          </Badge>
                        )}
                      </div>

                      <h2 className="text-lg sm:text-xl font-bold text-foreground group-hover:text-primary transition-colors">
                        {tournament.name}
                      </h2>

                      {tournament.description && (
                        <p className="text-xs text-muted-foreground line-clamp-2 max-w-2xl">
                          {tournament.description}
                        </p>
                      )}

                      <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground pt-1">
                        <span className="flex items-center gap-1.5">
                          <Calendar className="h-3.5 w-3.5 text-primary" />
                          {formatDate(tournament.event_date)}
                        </span>
                        {tournament.location && (
                          <span className="flex items-center gap-1.5">
                            <MapPin className="h-3.5 w-3.5 text-fire-orange" />
                            {tournament.location}
                          </span>
                        )}
                        {tournament.max_players && (
                          <span className="flex items-center gap-1.5">
                            <Users className="h-3.5 w-3.5" />
                            Até {tournament.max_players} Bladers
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center justify-end shrink-0 pt-2 sm:pt-0">
                      {tournament.status === "ongoing" ? (
                        <Button
                          size="sm"
                          className="bg-fire-orange hover:bg-fire-orange/90 text-slate-950 font-black text-xs gap-1.5 shadow-sm"
                        >
                          <Radio className="h-3.5 w-3.5 animate-pulse" />
                          Acompanhar Ao Vivo
                          <ChevronRight className="h-4 w-4" />
                        </Button>
                      ) : (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="group-hover:translate-x-1 transition-transform gap-1.5 text-primary font-bold text-xs"
                        >
                          Ver Detalhes
                          <ChevronRight className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
