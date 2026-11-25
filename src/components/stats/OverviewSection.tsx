"use client";

import * as React from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Flame, Swords, Trophy, Target, Layers, Disc } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  OBA_FINISH_CHART_COLORS,
  OBA_SYSTEM_CHART_COLORS,
  StatsChartTooltip,
  useChartMounted,
} from "@/components/stats/StatsChartTooltip";
import type {
  PartPerformanceStat,
  RegionalStatsOverview,
} from "@/lib/services/stats";
import { PART_TYPE_LABELS } from "@/types/domain";

interface OverviewSectionProps {
  overview: RegionalStatsOverview;
  partPerformance: PartPerformanceStat[];
}

export function OverviewSection({
  overview,
  partPerformance,
}: OverviewSectionProps) {
  const mounted = useChartMounted();

  const totalFinishes =
    overview.finishes.xtreme +
    overview.finishes.burst +
    overview.finishes.over +
    overview.finishes.spin;

  const finishChartData = [
    {
      name: "Xtreme (3 pts)",
      key: "xtreme",
      count: overview.finishes.xtreme,
      pct:
        totalFinishes > 0
          ? Number(((overview.finishes.xtreme / totalFinishes) * 100).toFixed(1))
          : 0,
      color: OBA_FINISH_CHART_COLORS.xtreme,
    },
    {
      name: "Burst (2 pts)",
      key: "burst",
      count: overview.finishes.burst,
      pct:
        totalFinishes > 0
          ? Number(((overview.finishes.burst / totalFinishes) * 100).toFixed(1))
          : 0,
      color: OBA_FINISH_CHART_COLORS.burst,
    },
    {
      name: "Over (2 pts)",
      key: "over",
      count: overview.finishes.over,
      pct:
        totalFinishes > 0
          ? Number(((overview.finishes.over / totalFinishes) * 100).toFixed(1))
          : 0,
      color: OBA_FINISH_CHART_COLORS.over,
    },
    {
      name: "Spin (1 pt)",
      key: "spin",
      count: overview.finishes.spin,
      pct:
        totalFinishes > 0
          ? Number(((overview.finishes.spin / totalFinishes) * 100).toFixed(1))
          : 0,
      color: OBA_FINISH_CHART_COLORS.spin,
    },
  ];

  const systemsChartData = overview.systemsUsage
    .filter((s) => s.combosCount > 0 || s.roundsPlayed > 0)
    .map((s) => ({
      system: s.system,
      combos: s.combosCount,
      rounds: s.roundsPlayed,
      winRate: Number(s.winRate.toFixed(1)),
      color: OBA_SYSTEM_CHART_COLORS[s.system] ?? "#bd08f5",
    }));

  const topRegisteredParts = React.useMemo(() => {
    return [...partPerformance]
      .filter((p) => p.deckUsageCount > 0)
      .sort((a, b) => {
        if (b.deckUsageCount !== a.deckUsageCount) {
          return b.deckUsageCount - a.deckUsageCount;
        }
        return b.roundsPlayed - a.roundsPlayed;
      })
      .slice(0, 12);
  }, [partPerformance]);

  return (
    <div className="space-y-6">
      {/* KPIs Principais */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Card className="border-border/60 bg-card/70">
          <CardContent className="p-4 flex items-center justify-between gap-3">
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                Torneios
              </span>
              <div className="text-2xl sm:text-3xl font-black text-foreground mt-0.5 tabular-nums">
                {overview.tournamentsCount}
              </div>
              <p className="text-[11px] text-muted-foreground">
                Em andamento ou encerrados
              </p>
            </div>
            <div className="h-10 w-10 rounded-xl bg-primary/15 border border-primary/30 flex items-center justify-center shrink-0">
              <Trophy className="h-5 w-5 text-primary" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/60 bg-card/70">
          <CardContent className="p-4 flex items-center justify-between gap-3">
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                Partidas
              </span>
              <div className="text-2xl sm:text-3xl font-black text-foreground mt-0.5 tabular-nums">
                {overview.matchesCount}
              </div>
              <p className="text-[11px] text-muted-foreground">
                Confrontos finalizados
              </p>
            </div>
            <div className="h-10 w-10 rounded-xl bg-fire-orange/15 border border-fire-orange/30 flex items-center justify-center shrink-0">
              <Swords className="h-5 w-5 text-fire-orange" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/60 bg-card/70">
          <CardContent className="p-4 flex items-center justify-between gap-3">
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                Rounds
              </span>
              <div className="text-2xl sm:text-3xl font-black text-foreground mt-0.5 tabular-nums">
                {overview.roundsCount}
              </div>
              <p className="text-[11px] text-muted-foreground">
                {overview.trackedComboRoundsCount} com combo rastreado
              </p>
            </div>
            <div className="h-10 w-10 rounded-xl bg-fire-yellow/15 border border-fire-yellow/30 flex items-center justify-center shrink-0">
              <Flame className="h-5 w-5 text-fire-yellow" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/60 bg-card/70">
          <CardContent className="p-4 flex items-center justify-between gap-3">
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                Combos
              </span>
              <div className="text-2xl sm:text-3xl font-black text-foreground mt-0.5 tabular-nums">
                {overview.registeredCombosCount}
              </div>
              <p className="text-[11px] text-muted-foreground">
                Em {overview.approvedDecklistsCount} decklists aprovadas
              </p>
            </div>
            <div className="h-10 w-10 rounded-xl bg-sky-500/15 border border-sky-500/30 flex items-center justify-center shrink-0">
              <Layers className="h-5 w-5 text-sky-400" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Gráficos: Distribuição de Finishes e Sistemas Mais Jogados */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="border-border/60 bg-card/70">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-black flex items-center gap-2">
              <Target className="h-4 w-4 text-fire-orange" />
              Distribuição Global de Finishes
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {totalFinishes === 0 ? (
              <div className="h-[240px] flex items-center justify-center text-xs text-muted-foreground text-center px-4">
                Ainda não há rounds registrados para os filtros selecionados.
              </div>
            ) : (
              <>
                <div className="h-[240px] w-full">
                  {mounted && (
                    <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                      <BarChart
                        data={finishChartData}
                        margin={{ top: 10, right: 12, left: -12, bottom: 4 }}
                      >
                        <CartesianGrid
                          strokeDasharray="3 3"
                          stroke="rgba(148,163,184,0.16)"
                        />
                        <XAxis
                          dataKey="name"
                          tick={{ fill: "#94a3b8", fontSize: 11 }}
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
                          cursor={{ fill: "rgba(189, 8, 245, 0.08)" }}
                          content={<StatsChartTooltip />}
                        />
                        <Bar
                          dataKey="count"
                          name="Rounds"
                          radius={[6, 6, 0, 0]}
                        >
                          {finishChartData.map((entry) => (
                            <Cell key={entry.key} fill={entry.color} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
                  {finishChartData.map((f) => (
                    <div
                      key={f.key}
                      className="rounded-lg border border-border/50 bg-background/50 px-2.5 py-2 text-center"
                    >
                      <div className="text-[10px] font-bold uppercase text-muted-foreground">
                        {f.name.split(" ")[0]}
                      </div>
                      <div className="text-sm font-black text-foreground tabular-nums">
                        {f.count}{" "}
                        <span className="text-[10px] font-semibold text-muted-foreground">
                          ({f.pct}%)
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </CardContent>
        </Card>

        <Card className="border-border/60 bg-card/70">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-black flex items-center gap-2">
              <Layers className="h-4 w-4 text-primary" />
              Sistemas Mais Jogados (Decklists Aprovadas)
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {systemsChartData.length === 0 ? (
              <div className="h-[240px] flex items-center justify-center text-xs text-muted-foreground text-center px-4">
                Nenhuma decklist aprovada encontrada nos torneios deste filtro.
              </div>
            ) : (
              <>
                <div className="h-[240px] w-full">
                  {mounted && (
                    <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                      <BarChart
                        data={systemsChartData}
                        margin={{ top: 10, right: 12, left: -12, bottom: 4 }}
                      >
                        <CartesianGrid
                          strokeDasharray="3 3"
                          stroke="rgba(148,163,184,0.16)"
                        />
                        <XAxis
                          dataKey="system"
                          tick={{ fill: "#94a3b8", fontSize: 11 }}
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
                          cursor={{ fill: "rgba(189, 8, 245, 0.08)" }}
                          content={<StatsChartTooltip />}
                        />
                        <Bar
                          dataKey="combos"
                          name="Combos"
                          radius={[6, 6, 0, 0]}
                        >
                          {systemsChartData.map((entry) => (
                            <Cell key={entry.system} fill={entry.color} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </div>

                <div className="flex flex-wrap gap-2 pt-1">
                  {overview.systemsUsage
                    .filter((s) => s.combosCount > 0)
                    .map((s) => (
                      <Badge
                        key={s.system}
                        variant="outline"
                        className="text-[11px] font-semibold border-border/60 gap-1.5"
                      >
                        <span
                          className="h-2 w-2 rounded-full"
                          style={{
                            backgroundColor:
                              OBA_SYSTEM_CHART_COLORS[s.system] ?? "#bd08f5",
                          }}
                        />
                        <span>{s.system}:</span>
                        <span className="font-black text-foreground">
                          {s.combosCount} ({s.sharePct.toFixed(0)}%)
                        </span>
                      </Badge>
                    ))}
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Peças mais presentes em decklists */}
      <Card className="border-border/60 bg-card/70">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-black flex items-center gap-2">
            <Disc className="h-4 w-4 text-fire-yellow" />
            Peças Mais Registradas em Decklists no Recorte Atual
          </CardTitle>
        </CardHeader>
        <CardContent>
          {topRegisteredParts.length === 0 ? (
            <p className="text-xs text-muted-foreground py-4 text-center">
              Nenhuma decklist aprovada registrada para os filtros atuais.
            </p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
              {topRegisteredParts.map((part, idx) => (
                <div
                  key={part.partId}
                  className="rounded-xl border border-border/50 bg-background/50 px-3 py-2.5 flex items-center justify-between gap-2"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] font-black text-muted-foreground tabular-nums">
                        #{idx + 1}
                      </span>
                      <span className="font-bold text-xs text-foreground truncate">
                        {part.name}
                      </span>
                    </div>
                    <div className="text-[10px] text-muted-foreground flex items-center gap-1.5 mt-0.5">
                      <span>{PART_TYPE_LABELS[part.partType]}</span>
                      {part.line && <span>• {part.line}</span>}
                      {part.roundsPlayed > 0 && (
                        <span className="text-primary font-semibold">
                          • {part.winRate.toFixed(0)}% WR ({part.roundsPlayed}R)
                        </span>
                      )}
                    </div>
                  </div>
                  <Badge
                    variant="outline"
                    className="text-[11px] font-black border-primary/35 text-primary shrink-0 tabular-nums"
                  >
                    {part.deckUsageCount}x
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
