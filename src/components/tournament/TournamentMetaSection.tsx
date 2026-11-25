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
import {
  Crown,
  Disc,
  Flame,
  Layers,
  Target,
  Trophy,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { BladerAvatar } from "@/components/shared/BladerAvatar";
import {
  OBA_FINISH_CHART_COLORS,
  OBA_SYSTEM_CHART_COLORS,
  StatsChartTooltip,
  useChartMounted,
} from "@/components/stats/StatsChartTooltip";
import type {
  TournamentMetaBreakdown,
  TournamentPartUsageItem,
} from "@/lib/services/stats";
import { PART_TYPE_LABELS } from "@/types/domain";

interface TournamentMetaSectionProps {
  data: TournamentMetaBreakdown;
}

type PartGroupTab = "blades" | "ratchets" | "bits" | "cxParts";

export function TournamentMetaSection({ data }: TournamentMetaSectionProps) {
  const mounted = useChartMounted();
  const [partGroup, setPartGroup] = React.useState<PartGroupTab>("blades");

  const totalFinishes =
    data.finishes.xtreme +
    data.finishes.burst +
    data.finishes.over +
    data.finishes.spin;

  const finishChartData = [
    {
      name: "Xtreme",
      count: data.finishes.xtreme,
      color: OBA_FINISH_CHART_COLORS.xtreme,
    },
    {
      name: "Burst",
      count: data.finishes.burst,
      color: OBA_FINISH_CHART_COLORS.burst,
    },
    {
      name: "Over",
      count: data.finishes.over,
      color: OBA_FINISH_CHART_COLORS.over,
    },
    {
      name: "Spin",
      count: data.finishes.spin,
      color: OBA_FINISH_CHART_COLORS.spin,
    },
  ];

  const systemsChartData = data.systemsUsage
    .filter((s) => s.combosCount > 0)
    .map((s) => ({
      system: s.system,
      combos: s.combosCount,
      color: OBA_SYSTEM_CHART_COLORS[s.system] ?? "#bd08f5",
    }));

  const partGroups: Array<{
    id: PartGroupTab;
    label: string;
    items: TournamentPartUsageItem[];
  }> = [
    { id: "blades", label: "Blades", items: data.topPartsByGroup.blades },
    { id: "ratchets", label: "Ratchets", items: data.topPartsByGroup.ratchets },
    { id: "bits", label: "Bits", items: data.topPartsByGroup.bits },
    { id: "cxParts", label: "Assist / Lock", items: data.topPartsByGroup.cxParts },
  ];

  const activePartsList =
    partGroups.find((g) => g.id === partGroup)?.items ?? [];

  const trackedParts = React.useMemo(
    () => data.partPerformance.filter((p) => p.roundsPlayed > 0),
    [data.partPerformance]
  );

  return (
    <div className="space-y-6">
      {/* KPIs da Etapa */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card className="border-border/60 bg-card/70">
          <CardContent className="p-3.5">
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              Decklists Aprovadas
            </span>
            <div className="text-2xl font-black text-foreground mt-0.5 tabular-nums">
              {data.approvedDecklistsCount}
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/60 bg-card/70">
          <CardContent className="p-3.5">
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              Combos Registrados
            </span>
            <div className="text-2xl font-black text-primary mt-0.5 tabular-nums">
              {data.registeredCombosCount}
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/60 bg-card/70">
          <CardContent className="p-3.5">
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              Rounds Disputados
            </span>
            <div className="text-2xl font-black text-fire-orange mt-0.5 tabular-nums">
              {data.roundsCount}
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/60 bg-card/70">
          <CardContent className="p-3.5">
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              Rounds c/ Combo
            </span>
            <div className="text-2xl font-black text-fire-yellow mt-0.5 tabular-nums">
              {data.trackedComboRoundsCount}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Gráficos: Finishes da Etapa + Sistemas */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="border-border/60 bg-card/70">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-black flex items-center gap-2">
              <Target className="h-4 w-4 text-fire-orange" />
              Distribuição de Finishes na Etapa
            </CardTitle>
          </CardHeader>
          <CardContent>
            {totalFinishes === 0 ? (
              <div className="h-[220px] flex items-center justify-center text-xs text-muted-foreground">
                Nenhum round registrado nesta etapa ainda.
              </div>
            ) : (
              <div className="h-[220px] w-full">
                {mounted && (
                  <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                    <BarChart
                      data={finishChartData}
                      margin={{ top: 8, right: 12, left: -12, bottom: 4 }}
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
                      <Bar dataKey="count" name="Rounds" radius={[6, 6, 0, 0]}>
                        {finishChartData.map((entry) => (
                          <Cell key={entry.name} fill={entry.color} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border-border/60 bg-card/70">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-black flex items-center gap-2">
              <Layers className="h-4 w-4 text-primary" />
              Sistemas Registrados na Etapa
            </CardTitle>
          </CardHeader>
          <CardContent>
            {systemsChartData.length === 0 ? (
              <div className="h-[220px] flex items-center justify-center text-xs text-muted-foreground">
                Nenhuma decklist aprovada cadastrada nesta etapa.
              </div>
            ) : (
              <div className="h-[220px] w-full">
                {mounted && (
                  <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                    <BarChart
                      data={systemsChartData}
                      margin={{ top: 8, right: 12, left: -12, bottom: 4 }}
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
                      <Bar dataKey="combos" name="Combos" radius={[6, 6, 0, 0]}>
                        {systemsChartData.map((entry) => (
                          <Cell key={entry.system} fill={entry.color} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Decklists do Pódio e Top Cut */}
      {data.topCutDecks.length > 0 && (
        <Card className="border-border/60 bg-card/70">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-black flex items-center gap-2">
              <Trophy className="h-4 w-4 text-fire-yellow" />
              Decklists em Destaque (Pódio &amp; Top Cut)
            </CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {data.topCutDecks.map((deck) => (
              <div
                key={deck.bladerId}
                className="rounded-xl border border-border/55 bg-background/55 p-3.5 space-y-2.5"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <BladerAvatar
                      avatarUrl={deck.avatarUrl}
                      nickname={deck.nickname}
                      sizeClass="h-9 w-9"
                      borderClass="border border-primary/50"
                    />
                    <div className="min-w-0">
                      <div className="font-bold text-xs text-foreground truncate">
                        {deck.nickname}
                      </div>
                      <div className="text-[10px] text-muted-foreground truncate">
                        {deck.name}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    {deck.finalPosition !== null && deck.finalPosition <= 3 && (
                      <Badge className="bg-fire-yellow text-slate-950 font-black text-[10px]">
                        {deck.finalPosition}º Lugar
                      </Badge>
                    )}
                    {deck.inTopCut &&
                      (deck.finalPosition === null || deck.finalPosition > 3) && (
                        <Badge
                          variant="outline"
                          className="text-[10px] border-primary/40 text-primary"
                        >
                          Top Cut
                        </Badge>
                      )}
                  </div>
                </div>

                <div className="space-y-1">
                  {deck.combos.map((combo) => (
                    <div
                      key={combo.id}
                      className="text-[11px] rounded-lg bg-muted/40 px-2.5 py-1.5 flex items-center gap-2"
                    >
                      <span className="font-black text-primary shrink-0">
                        #{combo.slotNumber}
                      </span>
                      {combo.system && (
                        <Badge
                          variant="outline"
                          className="text-[9px] px-1 py-0 border-border/60 shrink-0"
                        >
                          {combo.system}
                        </Badge>
                      )}
                      <span className="text-foreground truncate">
                        {combo.summaryText}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Combos Mais Usados e Peças Mais Usadas */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="border-border/60 bg-card/70">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-black flex items-center gap-2">
              <Crown className="h-4 w-4 text-fire-yellow" />
              Combos Mais Usados na Etapa ({data.comboRanking.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {data.comboRanking.length === 0 ? (
              <p className="text-xs text-muted-foreground py-6 text-center">
                Nenhum combo registrado em decklists aprovadas nesta etapa.
              </p>
            ) : (
              <div className="space-y-2 max-h-[380px] overflow-y-auto pr-1">
                {data.comboRanking.slice(0, 20).map((combo, idx) => (
                  <div
                    key={combo.signature}
                    className="rounded-xl border border-border/50 bg-background/55 px-3 py-2.5 flex items-center justify-between gap-2"
                  >
                    <div className="min-w-0 space-y-1">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] font-black text-muted-foreground tabular-nums">
                          #{idx + 1}
                        </span>
                        {combo.system && (
                          <Badge
                            variant="outline"
                            className="text-[9px] px-1.5 py-0 border-primary/35 text-primary shrink-0"
                          >
                            {combo.system}
                          </Badge>
                        )}
                        <span className="text-xs font-bold text-foreground truncate">
                          {combo.summaryText}
                        </span>
                      </div>
                      <div className="flex flex-wrap items-center gap-1.5 text-[10px] text-muted-foreground">
                        <span>{combo.sharePct.toFixed(1)}% dos combos</span>
                        {combo.topCutCount > 0 && (
                          <span className="text-primary font-semibold">
                            • {combo.topCutCount}x Top Cut
                          </span>
                        )}
                        {combo.podiumCount > 0 && (
                          <span className="text-fire-yellow font-semibold">
                            • {combo.podiumCount}x Pódio
                          </span>
                        )}
                      </div>
                    </div>

                    <Badge
                      variant="outline"
                      className="text-xs font-black border-primary/40 text-primary shrink-0 tabular-nums"
                    >
                      {combo.count}x
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border-border/60 bg-card/70">
          <CardHeader className="pb-2 space-y-2.5">
            <CardTitle className="text-sm font-black flex items-center gap-2">
              <Disc className="h-4 w-4 text-primary" />
              Peças Mais Utilizadas na Etapa
            </CardTitle>

            <div className="flex flex-wrap gap-1.5">
              {partGroups.map((g) => (
                <Button
                  key={g.id}
                  type="button"
                  size="sm"
                  variant={partGroup === g.id ? "default" : "outline"}
                  onClick={() => setPartGroup(g.id)}
                  className="h-7 px-2.5 text-[11px] font-bold"
                >
                  {g.label} ({g.items.length})
                </Button>
              ))}
            </div>
          </CardHeader>
          <CardContent>
            {activePartsList.length === 0 ? (
              <p className="text-xs text-muted-foreground py-6 text-center">
                Nenhuma peça desta categoria registrada nesta etapa.
              </p>
            ) : (
              <div className="space-y-2 max-h-[340px] overflow-y-auto pr-1">
                {activePartsList.slice(0, 20).map((item, idx) => (
                  <div
                    key={item.partId}
                    className="rounded-xl border border-border/50 bg-background/55 px-3 py-2 flex items-center justify-between gap-2"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] font-black text-muted-foreground tabular-nums">
                          #{idx + 1}
                        </span>
                        <span className="text-xs font-bold text-foreground truncate">
                          {item.name}
                        </span>
                      </div>
                      <div className="text-[10px] text-muted-foreground">
                        {PART_TYPE_LABELS[item.partType]}
                        {item.line ? ` • ${item.line}` : ""} •{" "}
                        {item.sharePct.toFixed(1)}% dos combos
                      </div>
                    </div>
                    <Badge
                      variant="outline"
                      className="text-[11px] font-black border-border/60 shrink-0 tabular-nums"
                    >
                      {item.count}x
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Performance de Peças nos Rounds Rastreados da Etapa */}
      {trackedParts.length > 0 && (
        <Card className="border-border/60 bg-card/70 overflow-hidden">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-black flex items-center gap-2">
              <Flame className="h-4 w-4 text-fire-orange" />
              Performance de Peças na Etapa ({trackedParts.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-y border-border/50 bg-muted/30 text-[10px] uppercase tracking-wider text-muted-foreground">
                    <th className="text-left font-bold px-3.5 py-2">Peça</th>
                    <th className="text-right font-bold px-2.5 py-2">Rounds</th>
                    <th className="text-right font-bold px-2.5 py-2">V–D</th>
                    <th className="text-right font-bold px-2.5 py-2">Win Rate</th>
                    <th className="text-center font-bold px-3.5 py-2">
                      Finishes (X/B/O/S)
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/40">
                  {trackedParts.slice(0, 25).map((part) => (
                    <tr key={part.partId} className="hover:bg-muted/20">
                      <td className="px-3.5 py-2 font-bold text-foreground">
                        {part.name}{" "}
                        <span className="text-[10px] font-normal text-muted-foreground">
                          ({PART_TYPE_LABELS[part.partType]})
                        </span>
                      </td>
                      <td className="px-2.5 py-2 text-right font-bold tabular-nums">
                        {part.roundsPlayed}
                      </td>
                      <td className="px-2.5 py-2 text-right tabular-nums text-muted-foreground">
                        {part.wins}–{part.losses}
                      </td>
                      <td className="px-2.5 py-2 text-right font-black tabular-nums text-primary">
                        {part.winRate.toFixed(1)}%
                      </td>
                      <td className="px-3.5 py-2 text-center font-mono text-[11px] tabular-nums">
                        {part.finishesScored.xtreme}/{part.finishesScored.burst}/
                        {part.finishesScored.over}/{part.finishesScored.spin}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
