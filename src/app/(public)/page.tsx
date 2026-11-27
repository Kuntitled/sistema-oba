import Image from "next/image";
import Link from "next/link";
import {
  Flame,
  Trophy,
  Swords,
  Shield,
  Zap,
  ChevronRight,
  ExternalLink,
  BarChart3,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { RankingTable } from "@/components/ranking/RankingTable";
import { HomeLiveTournamentBanner } from "@/components/tournament/HomeLiveTournamentBanner";
import {
  DiscordIcon,
  InstagramIcon,
  WhatsAppIcon,
} from "@/components/shared/SocialIcons";
import { getSeasonRanking, getTournaments } from "@/lib/services/league";
import { getArenasOverview } from "@/lib/services/arenas";
import { getBladersComboSummaries } from "@/lib/services/blader-combos";
import {
  OBA_PODIUM_POINTS,
  OBA_SOCIAL_LINKS,
  OBA_SWISS_LEADER_BONUS,
  OBA_SWISS_WIN_POINTS,
} from "@/lib/constants";
import type { BladerRow } from "@/types/domain";

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ season?: string }>;
}) {
  const { season: seasonParam } = await searchParams;
  const [{ ranking, seasons, activeSeason, selectedSeason }, tournaments] =
    await Promise.all([getSeasonRanking(seasonParam), getTournaments()]);

  const top10Ranking = ranking.slice(0, 10);
  const top10Bladers = top10Ranking
    .map((entry) => entry.blader)
    .filter((b): b is BladerRow => Boolean(b));
  const comboSummaries = await getBladersComboSummaries(top10Bladers);

  const hydratedTop10 = top10Ranking.map((entry) => {
    const combos = entry.blader ? comboSummaries.get(entry.blader.id) : null;
    return {
      ...entry,
      favoriteCombo: combos?.favoriteCombo ?? null,
      mostUsedCombo: combos?.mostUsedCombo ?? null,
    };
  });

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
              <Link href="/estatisticas">
                <Button
                  variant="outline"
                  className="border-primary/45 hover:border-primary hover:bg-primary/10 font-bold gap-2 px-6 h-11"
                >
                  <BarChart3 className="h-4 w-4 text-fire-orange" />
                  Estatísticas &amp; Meta
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

            {/* Links rápidos das redes sociais oficiais */}
            <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
              <a
                href={OBA_SOCIAL_LINKS.instagram.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-pink-500/35 bg-pink-500/10 text-xs font-semibold text-foreground hover:border-pink-500/70 hover:bg-pink-500/20 transition-colors"
              >
                <InstagramIcon className="h-3.5 w-3.5 text-pink-500" />
                <span>{OBA_SOCIAL_LINKS.instagram.handle}</span>
              </a>

              <a
                href={OBA_SOCIAL_LINKS.whatsapp.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-emerald-500/35 bg-emerald-500/10 text-xs font-semibold text-foreground hover:border-emerald-500/70 hover:bg-emerald-500/20 transition-colors"
              >
                <WhatsAppIcon className="h-3.5 w-3.5 text-emerald-500" />
                <span>{OBA_SOCIAL_LINKS.whatsapp.label}</span>
              </a>

              <a
                href={OBA_SOCIAL_LINKS.discord.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-indigo-500/35 bg-indigo-500/10 text-xs font-semibold text-foreground hover:border-indigo-500/70 hover:bg-indigo-500/20 transition-colors"
              >
                <DiscordIcon className="h-3.5 w-3.5 text-indigo-400" />
                <span>{OBA_SOCIAL_LINKS.discord.label}</span>
              </a>
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

      {/* ─── Tabela de Classificação Geral (Top 10) ─────────────────────── */}
      <section className="container mx-auto px-4 sm:px-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
          <div>
            <div className="flex items-center gap-2">
              <Trophy className="h-5 w-5 text-amber-500" />
              <h2 className="text-xl sm:text-2xl font-black text-foreground tracking-tight">
                Top 10 Ranking Geral{" "}
                {selectedSeason ? `— ${selectedSeason.name}` : "da Liga"}
              </h2>
            </div>
            <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
              Elite da temporada com combos favoritos e mais usados em etapas Semanais, Oficiais e Fase Suíça.
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
          initialRanking={hydratedTop10}
          seasons={seasons}
          selectedSeason={selectedSeason}
          activeSeason={activeSeason}
          totalRankedCount={ranking.length}
        />
      </section>

      {/* ─── Comunidade Oficial OBA (Redes Sociais) ────────────────────── */}
      <section className="container mx-auto px-4 sm:px-6">
        <Card className="border-border/60 bg-card/60 overflow-hidden">
          <div className="h-1 bg-gradient-to-r from-pink-500 via-emerald-500 to-indigo-500" />
          <CardContent className="p-5 sm:p-6 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h2 className="text-base sm:text-lg font-black text-foreground">
                  Comunidade Oficial OBA
                </h2>
                <p className="text-xs text-muted-foreground">
                  Acompanhe novidades dos eventos, combine treinos e tire dúvidas com os Bladers do Amazonas.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <a
                href={OBA_SOCIAL_LINKS.instagram.url}
                target="_blank"
                rel="noopener noreferrer"
                className="group rounded-xl border border-border/60 bg-background/50 hover:border-pink-500/50 hover:bg-pink-500/5 p-4 flex items-center justify-between gap-3 transition-colors"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="h-10 w-10 rounded-lg bg-pink-500/15 border border-pink-500/30 flex items-center justify-center shrink-0">
                    <InstagramIcon className="h-5 w-5 text-pink-500" />
                  </div>
                  <div className="min-w-0">
                    <div className="font-bold text-sm text-foreground group-hover:text-pink-400 transition-colors">
                      {OBA_SOCIAL_LINKS.instagram.label}
                    </div>
                    <div className="text-xs text-muted-foreground truncate">
                      {OBA_SOCIAL_LINKS.instagram.handle}
                    </div>
                  </div>
                </div>
                <ExternalLink className="h-4 w-4 text-muted-foreground group-hover:text-pink-400 shrink-0" />
              </a>

              <a
                href={OBA_SOCIAL_LINKS.whatsapp.url}
                target="_blank"
                rel="noopener noreferrer"
                className="group rounded-xl border border-border/60 bg-background/50 hover:border-emerald-500/50 hover:bg-emerald-500/5 p-4 flex items-center justify-between gap-3 transition-colors"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="h-10 w-10 rounded-lg bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center shrink-0">
                    <WhatsAppIcon className="h-5 w-5 text-emerald-500" />
                  </div>
                  <div className="min-w-0">
                    <div className="font-bold text-sm text-foreground group-hover:text-emerald-400 transition-colors">
                      {OBA_SOCIAL_LINKS.whatsapp.label}
                    </div>
                    <div className="text-xs text-muted-foreground truncate">
                      Entrar no grupo oficial
                    </div>
                  </div>
                </div>
                <ExternalLink className="h-4 w-4 text-muted-foreground group-hover:text-emerald-400 shrink-0" />
              </a>

              <a
                href={OBA_SOCIAL_LINKS.discord.url}
                target="_blank"
                rel="noopener noreferrer"
                className="group rounded-xl border border-border/60 bg-background/50 hover:border-indigo-500/50 hover:bg-indigo-500/5 p-4 flex items-center justify-between gap-3 transition-colors"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="h-10 w-10 rounded-lg bg-indigo-500/15 border border-indigo-500/30 flex items-center justify-center shrink-0">
                    <DiscordIcon className="h-5 w-5 text-indigo-400" />
                  </div>
                  <div className="min-w-0">
                    <div className="font-bold text-sm text-foreground group-hover:text-indigo-400 transition-colors">
                      {OBA_SOCIAL_LINKS.discord.label}
                    </div>
                    <div className="text-xs text-muted-foreground truncate">
                      {OBA_SOCIAL_LINKS.discord.handle}
                    </div>
                  </div>
                </div>
                <ExternalLink className="h-4 w-4 text-muted-foreground group-hover:text-indigo-400 shrink-0" />
              </a>
            </div>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
