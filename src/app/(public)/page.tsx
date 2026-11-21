import Image from "next/image";
import Link from "next/link";
import { Flame, Trophy, Swords, Shield, Zap, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { RankingTable } from "@/components/ranking/RankingTable";
import { HomeLiveTournamentBanner } from "@/components/tournament/HomeLiveTournamentBanner";
import { getSeasonRanking, getTournaments } from "@/lib/services/league";
import { getArenasOverview } from "@/lib/services/arenas";
import {
  OBA_PODIUM_POINTS,
  OBA_SWISS_LEADER_BONUS,
  OBA_SWISS_WIN_POINTS,
} from "@/lib/constants";

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ season?: string }>;
}) {
  const { season: seasonParam } = await searchParams;
  const [{ ranking, seasons, activeSeason, selectedSeason }, tournaments] =
    await Promise.all([getSeasonRanking(seasonParam), getTournaments()]);

  const ongoingTournament =
    tournaments.find((t) => t.status === "ongoing") ??
    tournaments.find((t) => t.status === "open");
  const liveArenas =
    ongoingTournament?.status === "ongoing"
      ? (await getArenasOverview(ongoingTournament.id)).arenas
      : [];
  const finishedCount = tournaments.filter((t) =>
    selectedSeason?.id
      ? t.status === "finished" && t.season_id === selectedSeason.id
      : t.status === "finished"
  ).length;

  return (
    <div className="flex flex-col gap-10 pb-16">
      {/* ─── Hero Section ────────────────────────────────────────── */}
      <section className="relative overflow-hidden border-b border-border/40 bg-gradient-to-b from-card/80 via-background to-background pt-10 pb-12 sm:pt-16 sm:pb-20">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-primary/20 blur-[120px] rounded-full pointer-events-none" />

        <div className="container mx-auto px-4 sm:px-6 relative">
          <div className="flex flex-col items-center text-center max-w-3xl mx-auto">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/15 border border-primary/30 text-primary text-xs font-bold uppercase tracking-wider mb-6 animate-in fade-in slide-in-from-top-4 duration-500">
              <Flame className="h-3.5 w-3.5 text-fire-orange" />
              <span>
                {activeSeason
                  ? `${activeSeason.name} — Organização de Beyblade do Amazonas`
                  : "Temporada Oficial — Organização de Beyblade do Amazonas"}
              </span>
            </div>

            <div className="relative mb-6 group">
              <div className="absolute -inset-1 rounded-full bg-gradient-to-r from-fire-orange via-primary to-fire-yellow opacity-75 blur-md group-hover:opacity-100 transition duration-300" />
              <div className="relative h-24 w-24 sm:h-28 sm:w-28 rounded-full overflow-hidden border-2 border-background shadow-2xl">
                <Image
                  src="/images/logo.jpg"
                  alt="Logo OBA"
                  fill
                  className="object-cover"
                  priority
                />
              </div>
            </div>

            <h1 className="text-3xl sm:text-5xl md:text-6xl font-black tracking-tight leading-tight text-foreground">
              ORGANIZAÇÃO DE <br />
              <span className="text-fire-gradient">BEYBLADE DO AMAZONAS</span>
            </h1>

            <p className="mt-4 text-sm sm:text-base text-muted-foreground max-w-2xl">
              Sistema oficial de ranking estadual, gestão de torneios e histórico de batalhas de Beyblade X. Acompanhe a elite dos Bladers rumo ao topo!
            </p>

            <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
              <Link href="/torneios">
                <Button className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold shadow-lg shadow-primary/25 gap-2 px-6 h-11">
                  <Swords className="h-4 w-4" />
                  Ver Torneios
                </Button>
              </Link>
              <Link href="/bladers">
                <Button
                  variant="outline"
                  className="border-border/80 hover:bg-muted font-semibold gap-2 px-6 h-11"
                >
                  Lista de Bladers
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </Link>
            </div>

            {ongoingTournament && (
              <HomeLiveTournamentBanner
                tournament={ongoingTournament}
                initialArenas={liveArenas}
              />
            )}
          </div>
        </div>
      </section>

      {/* ─── Regras de Pontuação Beyblade X + Ranking OBA ─────────── */}
      <section className="container mx-auto px-4 sm:px-6 space-y-4">
        <div className="text-center">
          <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center justify-center gap-1.5">
            <Zap className="h-3.5 w-3.5 text-fire-yellow" />
            Sistema de Pontuação Oficial (Takara Tomy &amp; Regulamento OBA)
          </h2>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Card className="border-border/60 bg-card/60 backdrop-blur-sm">
            <CardContent className="p-4 text-center">
              <span className="text-[11px] font-semibold text-muted-foreground uppercase">
                Spin Finish
              </span>
              <div className="text-2xl font-black text-foreground mt-1">1 pt</div>
              <p className="text-[10px] text-muted-foreground mt-1">
                Girar por mais tempo
              </p>
            </CardContent>
          </Card>

          <Card className="border-border/60 bg-card/60 backdrop-blur-sm">
            <CardContent className="p-4 text-center">
              <span className="text-[11px] font-semibold text-muted-foreground uppercase">
                Over Finish
              </span>
              <div className="text-2xl font-black text-fire-orange mt-1">
                2 pts
              </div>
              <p className="text-[10px] text-muted-foreground mt-1">
                Lançar no bolsão lateral
              </p>
            </CardContent>
          </Card>

          <Card className="border-border/60 bg-card/60 backdrop-blur-sm">
            <CardContent className="p-4 text-center">
              <span className="text-[11px] font-semibold text-muted-foreground uppercase">
                Burst Finish
              </span>
              <div className="text-2xl font-black text-fire-orange mt-1">
                2 pts
              </div>
              <p className="text-[10px] text-muted-foreground mt-1">
                Desmontar o Beyblade rival
              </p>
            </CardContent>
          </Card>

          <Card className="border-primary/50 bg-primary/10 backdrop-blur-sm">
            <CardContent className="p-4 text-center">
              <span className="text-[11px] font-bold text-primary uppercase flex items-center justify-center gap-1">
                <Flame className="h-3 w-3 text-fire-yellow" />
                Xtreme Finish
              </span>
              <div className="text-2xl font-black text-fire-gradient mt-1">
                3 pts
              </div>
              <p className="text-[10px] text-muted-foreground mt-1">
                Lançar no Xtreme Pocket
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Resumo de Pontos de Ranking OBA */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
          <Card className="border-border/50 bg-card/40">
            <CardContent className="p-3.5 flex items-center justify-between">
              <span className="text-muted-foreground font-medium">
                Etapa Semanal (1º / 2º / 3º)
              </span>
              <span className="font-black text-primary">
                {OBA_PODIUM_POINTS.semanal[1]} / {OBA_PODIUM_POINTS.semanal[2]} /{" "}
                {OBA_PODIUM_POINTS.semanal[3]} pts
              </span>
            </CardContent>
          </Card>

          <Card className="border-border/50 bg-card/40">
            <CardContent className="p-3.5 flex items-center justify-between">
              <span className="text-muted-foreground font-medium">
                Etapa Oficial (1º / 2º / 3º)
              </span>
              <span className="font-black text-fire-yellow">
                {OBA_PODIUM_POINTS.oficial[1]} / {OBA_PODIUM_POINTS.oficial[2]} /{" "}
                {OBA_PODIUM_POINTS.oficial[3]} pts
              </span>
            </CardContent>
          </Card>

          <Card className="border-border/50 bg-card/40">
            <CardContent className="p-3.5 flex items-center justify-between">
              <span className="text-muted-foreground font-medium">
                Fase Suíça + Bônus Top Cut
              </span>
              <span className="font-black text-foreground">
                +{OBA_SWISS_WIN_POINTS}/vit • +{OBA_SWISS_LEADER_BONUS} Líder
              </span>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* ─── Tabela de Classificação Geral ─────────────────────── */}
      <section className="container mx-auto px-4 sm:px-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
          <div>
            <div className="flex items-center gap-2">
              <Trophy className="h-5 w-5 text-amber-500" />
              <h2 className="text-xl sm:text-2xl font-black text-foreground tracking-tight">
                Ranking Geral{" "}
                {selectedSeason ? `— ${selectedSeason.name}` : "da Liga"}
              </h2>
            </div>
            <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
              Pontuação oficial acumulada em etapas Semanais, Oficiais e Fase Suíça.
            </p>
          </div>

          <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted/40 px-3 py-1.5 rounded-lg border border-border/40">
            <Shield className="h-3.5 w-3.5 text-primary" />
            <span>{ranking.length} Bladers ranqueados</span>
            <span>•</span>
            <span>{finishedCount} torneios realizados</span>
          </div>
        </div>

        <RankingTable
          initialRanking={ranking}
          seasons={seasons}
          selectedSeason={selectedSeason}
          activeSeason={activeSeason}
        />
      </section>
    </div>
  );
}
