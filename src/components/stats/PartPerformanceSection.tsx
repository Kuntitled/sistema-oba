"use client";

import * as React from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Search, Filter, Disc, Flame, Info } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  OBA_FINISH_CHART_COLORS,
  StatsChartTooltip,
  useChartMounted,
} from "@/components/stats/StatsChartTooltip";
import { partMatchesQuery } from "@/lib/parts-search";
import type { PartPerformanceStat } from "@/lib/services/stats";
import {
  PART_LINE_ORDER,
  PART_TYPE_LABELS,
  PART_TYPE_ORDER,
} from "@/types/domain";

interface PartPerformanceSectionProps {
  parts: PartPerformanceStat[];
  trackedComboRoundsCount: number;
}

type SortKey =
  | "winRate"
  | "rounds"
  | "avgPoints"
  | "xtreme"
  | "burst"
  | "over"
  | "spin"
  | "deckUsage";

export function PartPerformanceSection({
  parts,
  trackedComboRoundsCount,
}: PartPerformanceSectionProps) {
  const mounted = useChartMounted();

  const hasMin3Sample = React.useMemo(
    () => parts.some((p) => p.roundsPlayed >= 3),
    [parts]
  );

  const [partTypeFilter, setPartTypeFilter] = React.useState<string>("all");
  const [lineFilter, setLineFilter] = React.useState<string>("all");
  const [searchQuery, setSearchQuery] = React.useState("");
  const [minRounds, setMinRounds] = React.useState<number>(() =>
    hasMin3Sample ? 3 : 1
  );
  const [sortBy, setSortBy] = React.useState<SortKey>("winRate");

  const filteredParts = React.useMemo(() => {
    const list = parts.filter((part) => {
      if (partTypeFilter !== "all" && part.partType !== partTypeFilter) {
        return false;
      }
      if (lineFilter === "universal") {
        if (part.line !== null) return false;
      } else if (lineFilter !== "all" && part.line !== lineFilter) {
        return false;
      }
      if (minRounds > 0 && part.roundsPlayed < minRounds) {
        return false;
      }
      if (
        searchQuery.trim() &&
        !partMatchesQuery(
          { name: part.name, aliases: part.aliases, line: part.line },
          searchQuery
        )
      ) {
        return false;
      }
      return true;
    });

    list.sort((a, b) => {
      switch (sortBy) {
        case "winRate":
          if (b.winRate !== a.winRate) return b.winRate - a.winRate;
          return b.roundsPlayed - a.roundsPlayed;
        case "rounds":
          if (b.roundsPlayed !== a.roundsPlayed) {
            return b.roundsPlayed - a.roundsPlayed;
          }
          return b.winRate - a.winRate;
        case "avgPoints":
          if (b.avgPointsPerRound !== a.avgPointsPerRound) {
            return b.avgPointsPerRound - a.avgPointsPerRound;
          }
          return b.roundsPlayed - a.roundsPlayed;
        case "xtreme":
          return b.finishesScored.xtreme - a.finishesScored.xtreme;
        case "burst":
          return b.finishesScored.burst - a.finishesScored.burst;
        case "over":
          return b.finishesScored.over - a.finishesScored.over;
        case "spin":
          return b.finishesScored.spin - a.finishesScored.spin;
        case "deckUsage":
          return b.deckUsageCount - a.deckUsageCount;
      }
    });

    return list;
  }, [parts, partTypeFilter, lineFilter, minRounds, searchQuery, sortBy]);

  const topWinRateChart = React.useMemo(() => {
    return filteredParts
      .filter((p) => p.roundsPlayed > 0)
      .slice(0, 10)
      .map((p) => ({
        name: p.name.length > 18 ? `${p.name.slice(0, 17)}…` : p.name,
        winRate: Number(p.winRate.toFixed(1)),
        rounds: p.roundsPlayed,
      }));
  }, [filteredParts]);

  const topFinishesChart = React.useMemo(() => {
    return [...filteredParts]
      .filter((p) => p.roundsPlayed > 0)
      .sort((a, b) => b.wins - a.wins)
      .slice(0, 10)
      .map((p) => ({
        name: p.name.length > 16 ? `${p.name.slice(0, 15)}…` : p.name,
        Xtreme: p.finishesScored.xtreme,
        Burst: p.finishesScored.burst,
        Over: p.finishesScored.over,
        Spin: p.finishesScored.spin,
      }));
  }, [filteredParts]);

  return (
    <div className="space-y-5">
      {trackedComboRoundsCount === 0 && (
        <Card className="border-amber-500/40 bg-amber-500/10">
          <CardContent className="p-4 flex items-start gap-3 text-xs">
            <Info className="h-4 w-4 text-amber-400 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="font-bold text-foreground">
                Nenhum round com combo rastreado neste recorte ainda
              </p>
              <p className="text-muted-foreground">
                A partir da Fase 4, o Placar do Juiz registra qual combo cada Blader usou em cada round. Se já houver decklists aprovadas, altere o filtro de amostra mínima para{" "}
                <strong className="text-foreground">Todos (≥ 0)</strong> para consultar o uso em decklists.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Filtros locais da análise de peças */}
      <Card className="border-border/60 bg-card/70">
        <CardContent className="p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          <div className="relative">
            <Search className="h-3.5 w-3.5 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar peça (TT ou Hasbro)..."
              className="pl-8 h-9 text-xs"
            />
          </div>

          <Select value={partTypeFilter} onValueChange={(v) => setPartTypeFilter(v ?? "all")}>
            <SelectTrigger className="w-full h-9 text-xs">
              <SelectValue placeholder="Tipo de Peça">
                {partTypeFilter === "all"
                  ? "Todos os Tipos"
                  : PART_TYPE_LABELS[
                      partTypeFilter as keyof typeof PART_TYPE_LABELS
                    ]}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os Tipos</SelectItem>
              {PART_TYPE_ORDER.map((pt) => (
                <SelectItem key={pt} value={pt}>
                  {PART_TYPE_LABELS[pt]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={lineFilter} onValueChange={(v) => setLineFilter(v ?? "all")}>
            <SelectTrigger className="w-full h-9 text-xs">
              <SelectValue placeholder="Sistema / Linha">
                {lineFilter === "all"
                  ? "Todas as Linhas"
                  : lineFilter === "universal"
                    ? "Universal (Ratchet / Bit)"
                    : `Linha ${lineFilter}`}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas as Linhas</SelectItem>
              {PART_LINE_ORDER.map((line) => (
                <SelectItem key={line} value={line}>
                  Linha {line}
                </SelectItem>
              ))}
              <SelectItem value="universal">Universal (Ratchet / Bit)</SelectItem>
            </SelectContent>
          </Select>

          <Select
            value={String(minRounds)}
            onValueChange={(v) => setMinRounds(Number(v ?? 1))}
          >
            <SelectTrigger className="w-full h-9 text-xs">
              <SelectValue placeholder="Amostra Mínima">
                {minRounds === 0
                  ? "Todos (≥ 0 rounds)"
                  : minRounds === 1
                    ? "Amostra ≥ 1 round"
                    : `Amostra ≥ ${minRounds} rounds`}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="0">Todos (≥ 0 rounds)</SelectItem>
              <SelectItem value="1">Amostra ≥ 1 round</SelectItem>
              <SelectItem value="3">Amostra ≥ 3 rounds</SelectItem>
              <SelectItem value="5">Amostra ≥ 5 rounds</SelectItem>
              <SelectItem value="10">Amostra ≥ 10 rounds</SelectItem>
            </SelectContent>
          </Select>

          <Select value={sortBy} onValueChange={(v) => setSortBy((v as SortKey) ?? "winRate")}>
            <SelectTrigger className="w-full h-9 text-xs">
              <SelectValue placeholder="Ordenar por">
                {
                  (
                    {
                      winRate: "Maior Win Rate (%)",
                      rounds: "Mais Rounds Jogados",
                      avgPoints: "Maior Pts / Round",
                      xtreme: "Mais Xtreme Finishes",
                      burst: "Mais Burst Finishes",
                      over: "Mais Over Finishes",
                      spin: "Mais Spin Finishes",
                      deckUsage: "Mais Uso em Decks",
                    } satisfies Record<SortKey, string>
                  )[sortBy]
                }
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="winRate">Maior Win Rate (%)</SelectItem>
              <SelectItem value="rounds">Mais Rounds Jogados</SelectItem>
              <SelectItem value="avgPoints">Maior Pts / Round</SelectItem>
              <SelectItem value="xtreme">Mais Xtreme Finishes</SelectItem>
              <SelectItem value="burst">Mais Burst Finishes</SelectItem>
              <SelectItem value="over">Mais Over Finishes</SelectItem>
              <SelectItem value="spin">Mais Spin Finishes</SelectItem>
              <SelectItem value="deckUsage">Mais Uso em Decks</SelectItem>
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {/* Gráficos de Performance */}
      {topWinRateChart.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Card className="border-border/60 bg-card/70">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-black flex items-center gap-2">
                <Disc className="h-4 w-4 text-primary" />
                Top 10 Peças — Win Rate (%)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[290px] w-full">
                {mounted && (
                  <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                    <BarChart
                      data={topWinRateChart}
                      layout="vertical"
                      margin={{ top: 6, right: 16, left: 10, bottom: 4 }}
                    >
                      <CartesianGrid
                        strokeDasharray="3 3"
                        stroke="rgba(148,163,184,0.16)"
                      />
                      <XAxis
                        type="number"
                        domain={[0, 100]}
                        tick={{ fill: "#94a3b8", fontSize: 11 }}
                        unit="%"
                        axisLine={false}
                        tickLine={false}
                      />
                      <YAxis
                        type="category"
                        dataKey="name"
                        width={112}
                        tick={{ fill: "#e2e8f0", fontSize: 11 }}
                        axisLine={false}
                        tickLine={false}
                      />
                      <Tooltip
                        cursor={{ fill: "rgba(189, 8, 245, 0.08)" }}
                        content={<StatsChartTooltip valueSuffix="%" />}
                      />
                      <Bar
                        dataKey="winRate"
                        name="Win Rate"
                        fill="#bd08f5"
                        radius={[0, 6, 6, 0]}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/60 bg-card/70">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-black flex items-center gap-2">
                <Flame className="h-4 w-4 text-fire-orange" />
                Finishes Aplicados por Peça (Top 10)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[290px] w-full">
                {mounted && (
                  <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                    <BarChart
                      data={topFinishesChart}
                      margin={{ top: 8, right: 12, left: -12, bottom: 16 }}
                    >
                      <CartesianGrid
                        strokeDasharray="3 3"
                        stroke="rgba(148,163,184,0.16)"
                      />
                      <XAxis
                        dataKey="name"
                        tick={{ fill: "#94a3b8", fontSize: 10 }}
                        interval={0}
                        angle={-20}
                        textAnchor="end"
                        height={52}
                        axisLine={false}
                        tickLine={false}
                      />
                      <YAxis
                        allowDecimals={false}
                        tick={{ fill: "#94a3b8", fontSize: 11 }}
                        axisLine={false}
                        tickLine={false}
                      />
                      <Tooltip
                        cursor={{ fill: "rgba(233, 107, 0, 0.08)" }}
                        content={<StatsChartTooltip />}
                      />
                      <Bar
                        dataKey="Xtreme"
                        stackId="finishes"
                        fill={OBA_FINISH_CHART_COLORS.xtreme}
                      />
                      <Bar
                        dataKey="Burst"
                        stackId="finishes"
                        fill={OBA_FINISH_CHART_COLORS.burst}
                      />
                      <Bar
                        dataKey="Over"
                        stackId="finishes"
                        fill={OBA_FINISH_CHART_COLORS.over}
                      />
                      <Bar
                        dataKey="Spin"
                        stackId="finishes"
                        fill={OBA_FINISH_CHART_COLORS.spin}
                        radius={[4, 4, 0, 0]}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Tabela Analítica Completa */}
      <Card className="border-border/60 bg-card/70 overflow-hidden">
        <CardHeader className="pb-2 flex flex-row items-center justify-between gap-2">
          <CardTitle className="text-sm font-black flex items-center gap-2">
            <Filter className="h-4 w-4 text-primary" />
            Tabela Analítica de Peças ({filteredParts.length})
          </CardTitle>
          <span className="text-[11px] text-muted-foreground">
            Aplicados / Sofridos: Xtreme • Burst • Over • Spin
          </span>
        </CardHeader>
        <CardContent className="p-0">
          {filteredParts.length === 0 ? (
            <div className="p-8 text-center text-xs text-muted-foreground">
              Nenhuma peça encontrada com os filtros atuais (tente reduzir a amostra mínima para 0 ou 1 round).
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-y border-border/50 bg-muted/30 text-[10px] uppercase tracking-wider text-muted-foreground">
                    <th className="text-left font-bold px-3.5 py-2.5">Peça</th>
                    <th className="text-right font-bold px-2.5 py-2.5">Rounds</th>
                    <th className="text-right font-bold px-2.5 py-2.5">V–D</th>
                    <th className="text-right font-bold px-2.5 py-2.5">Win Rate</th>
                    <th className="text-right font-bold px-2.5 py-2.5">Pts/R</th>
                    <th className="text-center font-bold px-2.5 py-2.5">
                      Finishes Aplicados (X/B/O/S)
                    </th>
                    <th className="text-center font-bold px-2.5 py-2.5">
                      Finishes Sofridos (X/B/O/S)
                    </th>
                    <th className="text-right font-bold px-3.5 py-2.5">Decks</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/40">
                  {filteredParts.map((part) => (
                    <tr
                      key={part.partId}
                      className="hover:bg-muted/25 transition-colors"
                    >
                      <td className="px-3.5 py-2.5 min-w-[180px]">
                        <div className="font-bold text-foreground">
                          {part.name}
                        </div>
                        <div className="flex flex-wrap items-center gap-1 mt-0.5">
                          <Badge
                            variant="outline"
                            className="text-[9px] px-1.5 py-0 border-border/60"
                          >
                            {PART_TYPE_LABELS[part.partType]}
                          </Badge>
                          {part.line && (
                            <Badge
                              variant="outline"
                              className="text-[9px] px-1.5 py-0 border-primary/35 text-primary"
                            >
                              {part.line}
                            </Badge>
                          )}
                          {part.aliases.length > 0 && (
                            <span className="text-[10px] text-muted-foreground truncate max-w-[140px]">
                              ({part.aliases.slice(0, 2).join(", ")})
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-2.5 py-2.5 text-right font-bold tabular-nums">
                        {part.roundsPlayed}
                      </td>
                      <td className="px-2.5 py-2.5 text-right tabular-nums text-muted-foreground">
                        <span className="text-emerald-400 font-semibold">
                          {part.wins}
                        </span>
                        –
                        <span className="text-rose-400 font-semibold">
                          {part.losses}
                        </span>
                      </td>
                      <td className="px-2.5 py-2.5 text-right font-black tabular-nums">
                        {part.roundsPlayed > 0 ? (
                          <span
                            className={
                              part.winRate >= 60
                                ? "text-emerald-400"
                                : part.winRate >= 45
                                  ? "text-foreground"
                                  : "text-muted-foreground"
                            }
                          >
                            {part.winRate.toFixed(1)}%
                          </span>
                        ) : (
                          "—"
                        )}
                      </td>
                      <td className="px-2.5 py-2.5 text-right tabular-nums">
                        {part.roundsPlayed > 0
                          ? part.avgPointsPerRound.toFixed(2)
                          : "—"}
                      </td>
                      <td className="px-2.5 py-2.5 text-center tabular-nums">
                        <span className="inline-flex items-center gap-1 font-mono text-[11px]">
                          <span className="text-fire-orange font-bold">
                            {part.finishesScored.xtreme}
                          </span>
                          /
                          <span className="text-fire-yellow font-bold">
                            {part.finishesScored.burst}
                          </span>
                          /
                          <span className="text-primary font-bold">
                            {part.finishesScored.over}
                          </span>
                          /
                          <span className="text-sky-400 font-bold">
                            {part.finishesScored.spin}
                          </span>
                        </span>
                      </td>
                      <td className="px-2.5 py-2.5 text-center tabular-nums text-muted-foreground">
                        <span className="inline-flex items-center gap-1 font-mono text-[11px]">
                          <span>{part.finishesConceded.xtreme}</span>/
                          <span>{part.finishesConceded.burst}</span>/
                          <span>{part.finishesConceded.over}</span>/
                          <span>{part.finishesConceded.spin}</span>
                        </span>
                      </td>
                      <td className="px-3.5 py-2.5 text-right font-bold tabular-nums text-primary">
                        {part.deckUsageCount}x
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
