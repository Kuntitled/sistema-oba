import { notFound } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import {
  Calendar,
  MapPin,
  Users,
  Trophy,
  Medal,
  ChevronLeft,
  Flame,
  Swords,
  ShieldCheck,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getTournamentBySlug } from "@/lib/services/league";
import {
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

  const formatDate = (dateStr: string) => {
    if (!dateStr) return "";
    const [year, month, day] = dateStr.split("-");
    return `${day}/${month}/${year}`;
  };

  const getPositionBadge = (pos: number) => {
    switch (pos) {
      case 1:
        return (
          <div className="flex items-center justify-center h-8 w-8 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/40 font-black text-sm">
            <Trophy className="h-4 w-4" />
          </div>
        );
      case 2:
        return (
          <div className="flex items-center justify-center h-8 w-8 rounded-full bg-slate-400/20 text-slate-300 border border-slate-400/40 font-black text-sm">
            <Medal className="h-4 w-4" />
          </div>
        );
      case 3:
        return (
          <div className="flex items-center justify-center h-8 w-8 rounded-full bg-amber-700/20 text-amber-600 border border-amber-700/40 font-black text-sm">
            <Medal className="h-4 w-4" />
          </div>
        );
      default:
        return (
          <div className="flex items-center justify-center h-8 w-8 rounded-full bg-muted text-muted-foreground font-bold text-xs border border-border/40">
            {pos}º
          </div>
        );
    }
  };

  return (
    <div className="container mx-auto px-4 sm:px-6 py-10 max-w-4xl space-y-8">
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
              className={tournament.status === "ongoing" ? "bg-fire-orange text-slate-950 font-bold animate-pulse" : ""}
            >
              {TOURNAMENT_STATUS_LABELS[tournament.status]}
            </Badge>
            <Badge variant="outline" className="border-border/60">
              {TOURNAMENT_FORMAT_LABELS[tournament.format]}
            </Badge>
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

      {/* Resultados do Torneio */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Trophy className="h-5 w-5 text-amber-500" />
            <h2 className="text-xl font-black text-foreground">
              Classificação Final do Torneio
            </h2>
          </div>

          <Link href={`/admin/torneios/${tournament.id}/resultados`}>
            <Button size="sm" variant="outline" className="text-xs font-semibold gap-1.5 border-border/80">
              <ShieldCheck className="h-3.5 w-3.5 text-primary" />
              Lançar / Editar Resultados
            </Button>
          </Link>
        </div>

        {results.length === 0 ? (
          <Card className="border-dashed border-border/80 bg-card/40 p-8 text-center">
            <div className="flex flex-col items-center justify-center gap-3">
              <Swords className="h-8 w-8 text-muted-foreground" />
              <h3 className="font-bold text-base text-foreground">
                Resultados ainda não lançados
              </h3>
              <p className="text-xs text-muted-foreground max-w-sm">
                Os organizadores lançarão as colocações finais e pontuações deste torneio no encerramento.
              </p>
              <Link href={`/admin/torneios/${tournament.id}/resultados`}>
                <Button size="sm" className="mt-2 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold text-xs">
                  Lançar Resultados Agora
                </Button>
              </Link>
            </div>
          </Card>
        ) : (
          <div className="space-y-2.5">
            {results.map((res) => {
              const blader = res.blader;
              return (
                <Card
                  key={res.id}
                  className="border-border/50 bg-card/60 backdrop-blur-sm overflow-hidden"
                >
                  <div className="p-4 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3 sm:gap-4 min-w-0">
                      <div className="shrink-0">{getPositionBadge(res.final_position)}</div>

                      <div className="relative h-10 w-10 rounded-full overflow-hidden border border-border/60 bg-muted shrink-0">
                        {blader?.avatar_url ? (
                          <Image
                            src={blader.avatar_url}
                            alt={blader.nickname}
                            fill
                            className="object-cover"
                          />
                        ) : (
                          <div className="h-full w-full flex items-center justify-center font-bold text-xs text-muted-foreground">
                            {blader?.nickname?.slice(0, 2).toUpperCase() ?? "BX"}
                          </div>
                        )}
                      </div>

                      <div className="min-w-0">
                        <div className="font-bold text-sm sm:text-base text-foreground truncate">
                          {blader?.nickname}
                        </div>
                        <div className="text-xs text-muted-foreground truncate">
                          {blader?.name} {blader?.city ? `• ${blader.city}` : ""}
                        </div>
                      </div>
                    </div>

                    <div className="bg-primary/10 border border-primary/20 rounded-xl px-3 py-1 text-right shrink-0">
                      <span className="text-sm sm:text-base font-black text-primary">
                        +{res.points_earned}
                      </span>
                      <span className="text-[10px] font-semibold text-muted-foreground ml-1">
                        pts
                      </span>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
