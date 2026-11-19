"use client";

import * as React from "react";
import Image from "next/image";
import Link from "next/link";
import { Trophy, Medal, Search, Flame, MapPin, Swords, Sparkles } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import type { RankingEntry } from "@/types/domain";

interface RankingTableProps {
  initialRanking: RankingEntry[];
}

export function RankingTable({ initialRanking }: RankingTableProps) {
  const [search, setSearch] = React.useState("");

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

  const getPositionBadge = (pos: number) => {
    switch (pos) {
      case 1:
        return (
          <div className="flex items-center justify-center h-8 w-8 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/40 font-black text-sm shadow-[0_0_10px_rgba(245,158,11,0.3)]">
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
          <div className="flex items-center justify-center h-8 w-8 rounded-full bg-muted/60 text-muted-foreground font-bold text-xs border border-border/40">
            {pos}º
          </div>
        );
    }
  };

  return (
    <div className="space-y-8">
      {/* Search Bar */}
      <div className="relative max-w-md mx-auto">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          type="text"
          placeholder="Buscar por nome, apelido ou cidade..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10 bg-card/60 border-border/60 focus-visible:ring-primary h-11 text-sm rounded-xl"
        />
      </div>

      {/* Top 3 Podium (Apenas quando não estiver filtrando e houver pelo menos 2 registros) */}
      {!search && top3.length >= 2 && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4 pb-2 items-end">
          {/* 2º Lugar */}
          {top3[1] && (
            <div className="order-2 sm:order-1">
              <Card className="relative overflow-hidden border-border/60 bg-gradient-to-b from-card to-card/60 shadow-md">
                <div className="absolute top-0 left-0 right-0 h-1 bg-slate-400/80" />
                <CardContent className="p-5 flex flex-col items-center text-center">
                  <div className="relative mb-3">
                    <div className="h-16 w-16 rounded-full overflow-hidden border-2 border-slate-400/60 shadow-inner bg-muted">
                      {top3[1].blader?.avatar_url ? (
                        <Image
                          src={top3[1].blader.avatar_url}
                          alt={top3[1].blader.nickname}
                          width={64}
                          height={64}
                          className="object-cover"
                        />
                      ) : (
                        <div className="h-full w-full flex items-center justify-center font-black text-xl text-slate-300">
                          {top3[1].blader?.nickname?.slice(0, 2).toUpperCase()}
                        </div>
                      )}
                    </div>
                    <span className="absolute -bottom-2 -right-1 bg-slate-700 text-slate-200 text-[10px] font-black px-2 py-0.5 rounded-full border border-slate-400">
                      2º
                    </span>
                  </div>
                  <h3 className="font-bold text-base text-foreground">
                    {top3[1].blader?.nickname}
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    {top3[1].blader?.name}
                  </p>
                  <div className="mt-3 flex items-center gap-1.5 text-lg font-black text-slate-300">
                    <span>{top3[1].total_points}</span>
                    <span className="text-xs font-semibold text-muted-foreground">pts</span>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* 1º Lugar (Destaque Central OBA) */}
          {top3[0] && (
            <div className="order-1 sm:order-2 sm:-translate-y-2">
              <Card className="relative overflow-hidden border-primary/50 bg-gradient-to-b from-card via-card to-primary/10 shadow-xl border-glow-purple">
                <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-fire-orange via-fire-yellow to-primary" />
                <CardContent className="p-6 flex flex-col items-center text-center">
                  <div className="relative mb-3">
                    <div className="h-20 w-20 rounded-full overflow-hidden border-2 border-fire-yellow shadow-lg bg-muted">
                      {top3[0].blader?.avatar_url ? (
                        <Image
                          src={top3[0].blader.avatar_url}
                          alt={top3[0].blader.nickname}
                          width={80}
                          height={80}
                          className="object-cover"
                        />
                      ) : (
                        <div className="h-full w-full flex items-center justify-center font-black text-2xl text-fire-yellow">
                          {top3[0].blader?.nickname?.slice(0, 2).toUpperCase()}
                        </div>
                      )}
                    </div>
                    <span className="absolute -bottom-2.5 -right-1.5 bg-amber-500 text-slate-950 text-xs font-black px-2.5 py-0.5 rounded-full border border-amber-300 flex items-center gap-1 shadow-md">
                      <Trophy className="h-3 w-3" />
                      1º
                    </span>
                  </div>
                  <div className="flex items-center gap-1 text-fire-yellow text-[11px] font-bold uppercase tracking-wider mb-0.5">
                    <Sparkles className="h-3 w-3" />
                    Líder da Liga
                  </div>
                  <h3 className="font-black text-lg text-foreground">
                    {top3[0].blader?.nickname}
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    {top3[0].blader?.name}
                  </p>
                  <div className="mt-4 flex items-center gap-1.5 text-2xl font-black text-fire-gradient">
                    <span>{top3[0].total_points}</span>
                    <span className="text-sm font-semibold text-foreground/80">pts</span>
                  </div>
                  <div className="mt-2 text-[11px] text-muted-foreground flex items-center gap-1.5">
                    <span>{top3[0].tournaments_played} torneios disputados</span>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* 3º Lugar */}
          {top3[2] && (
            <div className="order-3">
              <Card className="relative overflow-hidden border-border/60 bg-gradient-to-b from-card to-card/60 shadow-md">
                <div className="absolute top-0 left-0 right-0 h-1 bg-amber-700/80" />
                <CardContent className="p-5 flex flex-col items-center text-center">
                  <div className="relative mb-3">
                    <div className="h-16 w-16 rounded-full overflow-hidden border-2 border-amber-700/60 shadow-inner bg-muted">
                      {top3[2].blader?.avatar_url ? (
                        <Image
                          src={top3[2].blader.avatar_url}
                          alt={top3[2].blader.nickname}
                          width={64}
                          height={64}
                          className="object-cover"
                        />
                      ) : (
                        <div className="h-full w-full flex items-center justify-center font-black text-xl text-amber-600">
                          {top3[2].blader?.nickname?.slice(0, 2).toUpperCase()}
                        </div>
                      )}
                    </div>
                    <span className="absolute -bottom-2 -right-1 bg-amber-900 text-amber-200 text-[10px] font-black px-2 py-0.5 rounded-full border border-amber-700">
                      3º
                    </span>
                  </div>
                  <h3 className="font-bold text-base text-foreground">
                    {top3[2].blader?.nickname}
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    {top3[2].blader?.name}
                  </p>
                  <div className="mt-3 flex items-center gap-1.5 text-lg font-black text-amber-600">
                    <span>{top3[2].total_points}</span>
                    <span className="text-xs font-semibold text-muted-foreground">pts</span>
                  </div>
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
              {search ? "Nenhum Blader encontrado" : "Nenhum dado de ranking registrado"}
            </h3>
            <p className="text-sm text-muted-foreground max-w-sm">
              {search
                ? `Nenhum jogador corresponde ao termo "${search}".`
                : "Cadastre os Bladers e lance os resultados do primeiro torneio no Painel Admin para alimentar a tabela."}
            </p>
            {!search && (
              <Link href="/admin/torneios" className="mt-2">
                <Badge variant="outline" className="cursor-pointer border-primary text-primary hover:bg-primary/10 py-1.5 px-3">
                  Ir para o Painel Admin
                </Badge>
              </Link>
            )}
          </div>
        </Card>
      ) : (
        <div className="space-y-3">
          {filteredRanking.map((item) => {
            const blader = item.blader;
            const pos = item.position || 0;

            return (
              <Card
                key={item.id}
                className="overflow-hidden border-border/50 hover:border-primary/40 transition-colors bg-card/60 backdrop-blur-sm"
              >
                <div className="p-4 sm:p-5 flex items-center justify-between gap-4">
                  {/* Posição + Avatar + Informações */}
                  <div className="flex items-center gap-3 sm:gap-4 min-w-0">
                    <div className="shrink-0">{getPositionBadge(pos)}</div>

                    <div className="relative h-11 w-11 rounded-full overflow-hidden border border-border/60 bg-muted shrink-0">
                      {blader?.avatar_url ? (
                        <Image
                          src={blader.avatar_url}
                          alt={blader.nickname}
                          fill
                          className="object-cover"
                        />
                      ) : (
                        <div className="h-full w-full flex items-center justify-center font-bold text-sm text-muted-foreground">
                          {blader?.nickname?.slice(0, 2).toUpperCase() ?? "BX"}
                        </div>
                      )}
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-base text-foreground truncate">
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
                  </div>

                  {/* Estatísticas (Torneios e Pontos) */}
                  <div className="flex items-center gap-4 sm:gap-8 shrink-0 text-right">
                    <div className="hidden sm:block">
                      <span className="text-xs text-muted-foreground block">
                        Torneios
                      </span>
                      <span className="text-sm font-semibold text-foreground">
                        {item.tournaments_played}
                      </span>
                    </div>

                    <div className="bg-primary/10 border border-primary/20 rounded-xl px-3 sm:px-4 py-1.5">
                      <span className="text-[10px] font-medium text-muted-foreground block sm:hidden">
                        Pontos
                      </span>
                      <div className="flex items-baseline justify-end gap-1">
                        <span className="text-lg sm:text-xl font-black text-primary">
                          {item.total_points}
                        </span>
                        <span className="text-xs font-semibold text-muted-foreground">
                          pts
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
