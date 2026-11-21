"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Trophy, Search, MapPin, Sparkles, Calendar, Info } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BladerAvatar } from "@/components/shared/BladerAvatar";
import { BladerCardModal } from "@/components/blader/BladerCardModal";
import type { RankingEntry, Season } from "@/types/domain";

interface RankingTableProps {
  initialRanking: RankingEntry[];
  seasons?: Season[];
  selectedSeason?: Season | null;
  activeSeason?: Season | null;
}

const MEDAL_BY_POSITION: Record<number, string> = {
  1: "🥇",
  2: "🥈",
  3: "🥉",
};

function formatBestPodium(bestPodium: number | null | undefined): string {
  if (!bestPodium || bestPodium < 1 || bestPodium > 3) return "—";
  return `${MEDAL_BY_POSITION[bestPodium]} ${bestPodium}º`;
}

export function RankingTable({
  initialRanking,
  seasons = [],
  selectedSeason = null,
  activeSeason = null,
}: RankingTableProps) {
  const router = useRouter();
  const [search, setSearch] = React.useState("");
  const [selectedBladerId, setSelectedBladerId] = React.useState<string | null>(
    null
  );

  const filteredRanking = React.useMemo(() => {
    if (!search.trim()) return initialRanking;
    const term = search.toLowerCase();
    return initialRanking.filter((item) => {
      const blader = item.blader;
      return (
        blader?.name.toLowerCase().includes(term) ||
        blader?.nickname.toLowerCase().includes(term) ||
        blader?.city?.toLowerCase().includes(term)
      );
    });
  }, [initialRanking, search]);

  const top3 = initialRanking.slice(0, 3);

  const handleSelectSeason = (season: Season) => {
    if (activeSeason && season.id === activeSeason.id) {
      router.push("/", { scroll: false });
    } else {
      router.push(`/?season=${season.year}`, { scroll: false });
    }
  };

  const getPositionBadge = (pos: number) => {
    const medal = MEDAL_BY_POSITION[pos];
    if (medal) {
      const ringClass =
        pos === 1
          ? "bg-amber-500/20 border-amber-500/50 shadow-[0_0_10px_rgba(245,158,11,0.3)]"
          : pos === 2
            ? "bg-slate-400/20 border-slate-400/40"
            : "bg-amber-700/20 border-amber-700/40";
      return (
        <div
          className={`flex items-center justify-center h-9 w-9 rounded-full border text-lg ${ringClass}`}
          title={`${pos}º Lugar`}
        >
          <span role="img" aria-label={`${pos}º lugar`}>
            {medal}
          </span>
        </div>
      );
    }

    return (
      <div className="flex items-center justify-center h-9 w-9 rounded-full bg-muted/60 text-muted-foreground font-bold text-xs border border-border/40">
        {pos}º
      </div>
    );
  };

  return (
    <div className="space-y-8">
      {/* Filtro de Temporada + Busca */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        {seasons.length > 0 && (
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-xs font-semibold text-muted-foreground flex items-center gap-1 mr-1">
              <Calendar className="h-3.5 w-3.5 text-primary" />
              Temporada:
            </span>
            {seasons.map((season) => {
              const isSelected = selectedSeason?.id === season.id;
              return (
                <Button
                  key={season.id}
                  type="button"
                  size="sm"
                  variant={isSelected ? "default" : "outline"}
                  onClick={() => handleSelectSeason(season)}
                  className="h-8 text-xs font-bold gap-1.5"
                >
                  <span>{season.year}</span>
                  <span className="text-[10px] opacity-80 font-medium">
                    {season.is_active ? "(Ativa)" : "(Encerrada)"}
                  </span>
                </Button>
              );
            })}
          </div>
        )}

        <div className="relative w-full sm:max-w-xs">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Buscar por nome, apelido ou cidade..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10 bg-card/60 border-border/60 focus-visible:ring-primary h-10 text-sm rounded-xl"
          />
        </div>
      </div>

      {/* Top 3 Podium (Apenas quando não estiver filtrando e houver pelo menos 2 registros) */}
      {!search && top3.length >= 2 && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4 pb-2 items-end">
          {/* 2º Lugar */}
          {top3[1] && (
            <div className="order-2 sm:order-1">
              <Card className="relative overflow-hidden border-border/60 bg-gradient-to-b from-card to-card/60 shadow-md hover:border-primary/40 transition-colors">
                <div className="absolute top-0 left-0 right-0 h-1 bg-slate-400/80" />
                <CardContent className="p-5">
                  <button
                    type="button"
                    onClick={() =>
                      top3[1].blader && setSelectedBladerId(top3[1].blader.id)
                    }
                    className="w-full flex flex-col items-center text-center cursor-pointer group"
                  >
                    <div className="relative mb-3">
                      <BladerAvatar
                        avatarUrl={top3[1].blader?.avatar_url}
                        nickname={top3[1].blader?.nickname}
                        sizeClass="h-16 w-16"
                        textClass="font-black text-xl text-slate-300"
                        borderClass="border-2 border-slate-400/60 shadow-inner"
                      />
                      <span className="absolute -bottom-2 -right-1 bg-slate-700 text-slate-200 text-[11px] font-black px-2 py-0.5 rounded-full border border-slate-400">
                        🥈 2º
                      </span>
                    </div>
                    <h3 className="font-bold text-base text-foreground group-hover:text-primary transition-colors">
                      {top3[1].blader?.nickname}
                    </h3>
                    <p className="text-xs text-muted-foreground">
                      {top3[1].blader?.name}
                    </p>
                    <div className="mt-3 flex items-center gap-1.5 text-lg font-black text-slate-300">
                      <span>{top3[1].total_points}</span>
                      <span className="text-xs font-semibold text-muted-foreground">
                        pts
                      </span>
                    </div>
                    <div className="mt-1.5 text-[11px] text-muted-foreground">
                      {top3[1].swiss_wins} vit. Suíço • {top3[1].podiums_count}{" "}
                      pódios
                    </div>
                  </button>
                </CardContent>
              </Card>
            </div>
          )}

          {/* 1º Lugar (Destaque Central OBA) */}
          {top3[0] && (
            <div className="order-1 sm:order-2 sm:-translate-y-2">
              <Card className="relative overflow-hidden border-primary/50 bg-gradient-to-b from-card via-card to-primary/10 shadow-xl border-glow-purple hover:border-primary transition-colors">
                <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-fire-orange via-fire-yellow to-primary" />
                <CardContent className="p-6">
                  <button
                    type="button"
                    onClick={() =>
                      top3[0].blader && setSelectedBladerId(top3[0].blader.id)
                    }
                    className="w-full flex flex-col items-center text-center cursor-pointer group"
                  >
                    <div className="relative mb-3">
                      <BladerAvatar
                        avatarUrl={top3[0].blader?.avatar_url}
                        nickname={top3[0].blader?.nickname}
                        sizeClass="h-20 w-20"
                        textClass="font-black text-2xl text-fire-yellow"
                        borderClass="border-2 border-fire-yellow shadow-lg"
                      />
                      <span className="absolute -bottom-2.5 -right-1.5 bg-amber-500 text-slate-950 text-xs font-black px-2.5 py-0.5 rounded-full border border-amber-300 flex items-center gap-1 shadow-md">
                        🥇 1º
                      </span>
                    </div>
                    <div className="flex items-center gap-1 text-fire-yellow text-[11px] font-bold uppercase tracking-wider mb-0.5">
                      <Sparkles className="h-3 w-3" />
                      Líder da Temporada
                    </div>
                    <h3 className="font-black text-lg text-foreground group-hover:text-primary transition-colors">
                      {top3[0].blader?.nickname}
                    </h3>
                    <p className="text-xs text-muted-foreground">
                      {top3[0].blader?.name}
                    </p>
                    <div className="mt-4 flex items-center gap-1.5 text-2xl font-black text-fire-gradient">
                      <span>{top3[0].total_points}</span>
                      <span className="text-sm font-semibold text-foreground/80">
                        pts
                      </span>
                    </div>
                    <div className="mt-2 text-[11px] text-muted-foreground">
                      {top3[0].swiss_wins} vit. Suíço • {top3[0].podiums_count}{" "}
                      pódios
                    </div>
                  </button>
                </CardContent>
              </Card>
            </div>
          )}

          {/* 3º Lugar */}
          {top3[2] && (
            <div className="order-3">
              <Card className="relative overflow-hidden border-border/60 bg-gradient-to-b from-card to-card/60 shadow-md hover:border-primary/40 transition-colors">
                <div className="absolute top-0 left-0 right-0 h-1 bg-amber-700/80" />
                <CardContent className="p-5">
                  <button
                    type="button"
                    onClick={() =>
                      top3[2].blader && setSelectedBladerId(top3[2].blader.id)
                    }
                    className="w-full flex flex-col items-center text-center cursor-pointer group"
                  >
                    <div className="relative mb-3">
                      <BladerAvatar
                        avatarUrl={top3[2].blader?.avatar_url}
                        nickname={top3[2].blader?.nickname}
                        sizeClass="h-16 w-16"
                        textClass="font-black text-xl text-amber-600"
                        borderClass="border-2 border-amber-700/60 shadow-inner"
                      />
                      <span className="absolute -bottom-2 -right-1 bg-amber-900 text-amber-200 text-[11px] font-black px-2 py-0.5 rounded-full border border-amber-700">
                        🥉 3º
                      </span>
                    </div>
                    <h3 className="font-bold text-base text-foreground group-hover:text-primary transition-colors">
                      {top3[2].blader?.nickname}
                    </h3>
                    <p className="text-xs text-muted-foreground">
                      {top3[2].blader?.name}
                    </p>
                    <div className="mt-3 flex items-center gap-1.5 text-lg font-black text-amber-600">
                      <span>{top3[2].total_points}</span>
                      <span className="text-xs font-semibold text-muted-foreground">
                        pts
                      </span>
                    </div>
                    <div className="mt-1.5 text-[11px] text-muted-foreground">
                      {top3[2].swiss_wins} vit. Suíço • {top3[2].podiums_count}{" "}
                      pódios
                    </div>
                  </button>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      )}

      {/* Lista / Tabela Completa */}
      {filteredRanking.length === 0 ? (
        <Card className="border-dashed border-border/80 bg-card/40 p-12 text-center">
          <div className="flex flex-col items-center justify-center gap-3">
            <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center text-muted-foreground">
              <Trophy className="h-6 w-6" />
            </div>
            <h3 className="font-bold text-lg text-foreground">
              {search
                ? "Nenhum Blader encontrado"
                : "Nenhum dado de ranking registrado nesta temporada"}
            </h3>
            <p className="text-sm text-muted-foreground max-w-sm">
              {search
                ? `Nenhum jogador corresponde ao termo "${search}".`
                : "Cadastre os Bladers e publique os resultados dos torneios no Painel Admin para alimentar a tabela."}
            </p>
            {!search && (
              <Link href="/admin/torneios" className="mt-2">
                <Badge
                  variant="outline"
                  className="cursor-pointer border-primary text-primary hover:bg-primary/10 py-1.5 px-3"
                >
                  Ir para o Painel Admin
                </Badge>
              </Link>
            )}
          </div>
        </Card>
      ) : (
        <div className="space-y-3">
          {/* Cabeçalho tabular em telas médias+ */}
          <div className="hidden md:grid md:grid-cols-[52px_1fr_110px_90px_110px_110px] items-center gap-3 px-5 py-2 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
            <span>Pos</span>
            <span>Blader</span>
            <span className="text-center">Vit. Suíço</span>
            <span className="text-center">Pódios</span>
            <span className="text-center">Melhor Pódio</span>
            <span className="text-right">Pontuação</span>
          </div>

          {filteredRanking.map((item) => {
            const blader = item.blader;
            const pos = item.position || 0;

            return (
              <Card
                key={item.id}
                className="overflow-hidden border-border/50 hover:border-primary/40 transition-colors bg-card/60 backdrop-blur-sm"
              >
                <div className="p-4 sm:px-5 sm:py-4 flex flex-col md:grid md:grid-cols-[52px_1fr_110px_90px_110px_110px] md:items-center gap-3">
                  {/* Posição + Blader (agrupado no mobile) */}
                  <div className="flex items-center justify-between gap-3 md:contents">
                    <div className="flex items-center gap-3 min-w-0 md:contents">
                      <div className="shrink-0">{getPositionBadge(pos)}</div>

                      <button
                        type="button"
                        onClick={() =>
                          blader && setSelectedBladerId(blader.id)
                        }
                        className="flex items-center gap-3 min-w-0 text-left cursor-pointer group"
                      >
                        <BladerAvatar
                          avatarUrl={blader?.avatar_url}
                          nickname={blader?.nickname}
                          sizeClass="h-10 w-10"
                          textClass="font-bold text-xs text-muted-foreground"
                        />

                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-sm sm:text-base text-foreground truncate group-hover:text-primary transition-colors">
                              {blader?.nickname}
                            </span>
                            {pos === 1 && (
                              <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30 text-[10px] px-1.5 py-0 hidden sm:inline-flex">
                                Líder
                              </Badge>
                            )}
                          </div>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                            <span className="truncate">{blader?.name}</span>
                            {blader?.city && (
                              <>
                                <span>•</span>
                                <span className="flex items-center gap-0.5 shrink-0">
                                  <MapPin className="h-3 w-3" />
                                  {blader.city}
                                </span>
                              </>
                            )}
                          </div>
                        </div>
                      </button>
                    </div>

                    {/* Pontuação mobile */}
                    <div className="md:hidden bg-primary/10 border border-primary/20 rounded-xl px-3 py-1.5 text-right shrink-0">
                      <span className="text-lg font-black text-primary">
                        {item.total_points}
                      </span>
                      <span className="text-[10px] font-semibold text-muted-foreground ml-1">
                        pts
                      </span>
                    </div>
                  </div>

                  {/* Métricas OBA (mobile em grid 3 cols, desktop em colunas da tabela) */}
                  <div className="grid grid-cols-3 gap-2 pt-2 border-t border-border/40 md:contents md:pt-0 md:border-t-0 text-xs">
                    <div className="text-center">
                      <span className="text-[10px] text-muted-foreground block md:hidden">
                        Vit. Suíço
                      </span>
                      <span className="font-bold text-foreground">
                        {item.swiss_wins}
                      </span>
                    </div>

                    <div className="text-center">
                      <span className="text-[10px] text-muted-foreground block md:hidden">
                        Pódios
                      </span>
                      <span className="font-bold text-foreground">
                        {item.podiums_count}
                      </span>
                    </div>

                    <div className="text-center">
                      <span className="text-[10px] text-muted-foreground block md:hidden">
                        Melhor Pódio
                      </span>
                      <span className="font-bold text-foreground">
                        {formatBestPodium(item.best_podium)}
                      </span>
                    </div>
                  </div>

                  {/* Pontuação desktop */}
                  <div className="hidden md:flex justify-end">
                    <div className="bg-primary/10 border border-primary/20 rounded-xl px-3.5 py-1.5 text-right">
                      <span className="text-lg font-black text-primary tabular-nums">
                        {item.total_points}
                      </span>
                      <span className="text-xs font-semibold text-muted-foreground ml-1">
                        pts
                      </span>
                    </div>
                  </div>
                </div>
              </Card>
            );
          })}

          {/* Legenda oficial dos critérios de desempate */}
          <div className="pt-2 flex items-start gap-2 text-[11px] text-muted-foreground">
            <Info className="h-3.5 w-3.5 text-primary shrink-0 mt-0.5" />
            <span>
              Critérios oficiais de desempate da OBA: 1º Melhor colocação no pódio (🥇 &gt; 🥈 &gt; 🥉) • 2º Maior número de pódios • 3º Mais vitórias na fase suíça • 4º Ordem de registro na temporada.
            </span>
          </div>
        </div>
      )}

      <BladerCardModal
        open={Boolean(selectedBladerId)}
        onOpenChange={(isOpen) => {
          if (!isOpen) setSelectedBladerId(null);
        }}
        bladerId={selectedBladerId}
      />
    </div>
  );
}
