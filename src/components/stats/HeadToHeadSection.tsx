"use client";

import * as React from "react";
import Link from "next/link";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  ArrowLeftRight,
  Swords,
  Loader2,
  ExternalLink,
  Trophy,
  AlertCircle,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { BladerAvatar } from "@/components/shared/BladerAvatar";
import {
  StatsChartTooltip,
  useChartMounted,
} from "@/components/stats/StatsChartTooltip";
import type {
  BladerSimpleOption,
  HeadToHeadStatsData,
  StatsCategoryFilter,
} from "@/lib/services/stats";
import {
  MATCH_STAGE_LABELS,
  TOURNAMENT_CATEGORY_LABELS,
} from "@/types/domain";

interface HeadToHeadSectionProps {
  bladers: BladerSimpleOption[];
  seasonId: string;
  category: StatsCategoryFilter;
  rulesetId: string;
  initialData: HeadToHeadStatsData | null;
  initialBladerAId?: string;
  initialBladerBId?: string;
}

function formatDate(dateStr: string) {
  if (!dateStr) return "";
  const [year, month, day] = dateStr.split("-");
  return `${day}/${month}/${year}`;
}

export function HeadToHeadSection({
  bladers,
  seasonId,
  category,
  rulesetId,
  initialData,
  initialBladerAId,
  initialBladerBId,
}: HeadToHeadSectionProps) {
  const mounted = useChartMounted();

  const defaultA =
    initialBladerAId && bladers.some((b) => b.id === initialBladerAId)
      ? initialBladerAId
      : (bladers[0]?.id ?? "");
  const defaultB =
    initialBladerBId &&
    initialBladerBId !== defaultA &&
    bladers.some((b) => b.id === initialBladerBId)
      ? initialBladerBId
      : (bladers.find((b) => b.id !== defaultA)?.id ?? "");

  const [bladerAId, setBladerAId] = React.useState(defaultA);
  const [bladerBId, setBladerBId] = React.useState(defaultB);
  const [data, setData] = React.useState<HeadToHeadStatsData | null>(initialData);
  const [loading, setLoading] = React.useState(false);
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null);

  const fetchH2H = React.useCallback(
    async (aId: string, bId: string) => {
      if (!aId || !bId || aId === bId) {
        setData(null);
        return;
      }

      setLoading(true);
      setErrorMsg(null);
      try {
        const params = new URLSearchParams({
          bladerA: aId,
          bladerB: bId,
          season: seasonId,
          category,
          ruleset: rulesetId,
        });
        const res = await fetch(`/api/stats/head-to-head?${params.toString()}`);
        const json = (await res.json()) as {
          data?: HeadToHeadStatsData;
          error?: string;
        };
        if (!res.ok || !json.data) {
          setErrorMsg(json.error ?? "Erro ao carregar confronto direto.");
          setData(null);
        } else {
          setData(json.data);
        }
      } catch {
        setErrorMsg("Falha de comunicação ao consultar o confronto direto.");
      } finally {
        setLoading(false);
      }
    },
    [seasonId, category, rulesetId]
  );

  // Recarrega quando filtros globais mudam ou quando ainda não veio do SSR
  const lastFetchedKeyRef = React.useRef<string>(
    initialData
      ? `${initialData.bladerA.id}|${initialData.bladerB.id}|${seasonId}|${category}|${rulesetId}`
      : ""
  );

  React.useEffect(() => {
    if (!bladerAId || !bladerBId || bladerAId === bladerBId) return;
    const key = `${bladerAId}|${bladerBId}|${seasonId}|${category}|${rulesetId}`;
    if (lastFetchedKeyRef.current === key) return;
    lastFetchedKeyRef.current = key;
    void fetchH2H(bladerAId, bladerBId);
  }, [bladerAId, bladerBId, seasonId, category, rulesetId, fetchH2H]);

  const handleSwap = () => {
    const nextA = bladerBId;
    const nextB = bladerAId;
    setBladerAId(nextA);
    setBladerBId(nextB);
  };

  const finishesComparisonData = React.useMemo(() => {
    if (!data) return [];
    return [
      {
        finish: "Xtreme (3 pts)",
        [data.bladerA.nickname]: data.finishesA.xtreme,
        [data.bladerB.nickname]: data.finishesB.xtreme,
      },
      {
        finish: "Burst (2 pts)",
        [data.bladerA.nickname]: data.finishesA.burst,
        [data.bladerB.nickname]: data.finishesB.burst,
      },
      {
        finish: "Over (2 pts)",
        [data.bladerA.nickname]: data.finishesA.over,
        [data.bladerB.nickname]: data.finishesB.over,
      },
      {
        finish: "Spin (1 pt)",
        [data.bladerA.nickname]: data.finishesA.spin,
        [data.bladerB.nickname]: data.finishesB.spin,
      },
    ];
  }, [data]);

  const selectedBladerA = React.useMemo(
    () => bladers.find((b) => b.id === bladerAId) ?? null,
    [bladers, bladerAId]
  );
  const selectedBladerB = React.useMemo(
    () => bladers.find((b) => b.id === bladerBId) ?? null,
    [bladers, bladerBId]
  );

  return (
    <div className="space-y-6">
      {/* Seletor Blader A x Blader B */}
      <Card className="border-border/60 bg-card/70">
        <CardContent className="p-4 flex flex-col sm:flex-row items-stretch sm:items-end gap-3">
          <div className="flex-1 space-y-1.5">
            <label className="text-[11px] font-bold uppercase tracking-wider text-primary block">
              Blader A
            </label>
            <Select
              value={bladerAId}
              onValueChange={(v) => {
                if (v) setBladerAId(v);
              }}
            >
              <SelectTrigger className="w-full h-10 text-xs font-semibold">
                <SelectValue placeholder="Selecione o Blader A">
                  {selectedBladerA ? selectedBladerA.nickname : "Selecione o Blader A"}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {bladers.map((b) => (
                  <SelectItem
                    key={b.id}
                    value={b.id}
                    disabled={b.id === bladerBId}
                  >
                    {b.nickname === b.name ? b.nickname : `${b.nickname} (${b.name})`}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={handleSwap}
            title="Inverter Bladers"
            className="h-10 w-full sm:w-10 shrink-0 border-border/80"
          >
            <ArrowLeftRight className="h-4 w-4 text-primary" />
          </Button>

          <div className="flex-1 space-y-1.5">
            <label className="text-[11px] font-bold uppercase tracking-wider text-fire-orange block">
              Blader B
            </label>
            <Select
              value={bladerBId}
              onValueChange={(v) => {
                if (v) setBladerBId(v);
              }}
            >
              <SelectTrigger className="w-full h-10 text-xs font-semibold">
                <SelectValue placeholder="Selecione o Blader B">
                  {selectedBladerB ? selectedBladerB.nickname : "Selecione o Blader B"}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {bladers.map((b) => (
                  <SelectItem
                    key={b.id}
                    value={b.id}
                    disabled={b.id === bladerAId}
                  >
                    {b.nickname === b.name ? b.nickname : `${b.nickname} (${b.name})`}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {errorMsg && (
        <div className="rounded-xl border border-destructive/40 bg-destructive/15 p-3 text-xs text-destructive flex items-center gap-2">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {loading && (
        <Card className="border-border/60 bg-card/70">
          <CardContent className="p-10 flex items-center justify-center gap-2 text-xs text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin text-primary" />
            Carregando histórico de confrontos...
          </CardContent>
        </Card>
      )}

      {!loading && data && (
        <>
          {/* Placar Frente a Frente */}
          <Card className="border-border/60 bg-card/75 overflow-hidden">
            <div className="h-1.5 bg-gradient-to-r from-primary via-fire-orange to-fire-yellow" />
            <CardContent className="p-5 space-y-4">
              <div className="grid grid-cols-3 items-center gap-3">
                {/* Blader A */}
                <div className="flex flex-col items-center text-center gap-2 min-w-0">
                  <BladerAvatar
                    avatarUrl={data.bladerA.avatar_url}
                    nickname={data.bladerA.nickname}
                    sizeClass="h-14 w-14 sm:h-16 sm:w-16"
                    borderClass="border-2 border-primary/60"
                  />
                  <div className="min-w-0 w-full">
                    <div className="font-black text-sm sm:text-base text-foreground truncate">
                      {data.bladerA.nickname}
                    </div>
                    <div className="text-[11px] text-muted-foreground truncate">
                      {data.bladerA.name}
                    </div>
                  </div>
                </div>

                {/* Placar Central */}
                <div className="text-center space-y-1">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    {data.totalMatches}{" "}
                    {data.totalMatches === 1 ? "Partida" : "Partidas"}
                  </div>
                  <div className="flex items-center justify-center gap-2 sm:gap-3 text-3xl sm:text-5xl font-black tabular-nums">
                    <span className="text-primary">{data.aWins}</span>
                    <span className="text-lg sm:text-2xl text-muted-foreground">
                      ×
                    </span>
                    <span className="text-fire-orange">{data.bWins}</span>
                  </div>
                  <div className="text-[11px] text-muted-foreground tabular-nums">
                    Pontos totais: {data.totalPointsA} × {data.totalPointsB}
                  </div>
                </div>

                {/* Blader B */}
                <div className="flex flex-col items-center text-center gap-2 min-w-0">
                  <BladerAvatar
                    avatarUrl={data.bladerB.avatar_url}
                    nickname={data.bladerB.nickname}
                    sizeClass="h-14 w-14 sm:h-16 sm:w-16"
                    borderClass="border-2 border-fire-orange/60"
                  />
                  <div className="min-w-0 w-full">
                    <div className="font-black text-sm sm:text-base text-foreground truncate">
                      {data.bladerB.nickname}
                    </div>
                    <div className="text-[11px] text-muted-foreground truncate">
                      {data.bladerB.name}
                    </div>
                  </div>
                </div>
              </div>

              {/* Barra proporcional de vitórias */}
              {data.totalMatches > 0 && (
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-[11px] font-bold tabular-nums">
                    <span className="text-primary">
                      {data.aWinRate.toFixed(1)}% de aproveitamento
                    </span>
                    <span className="text-fire-orange">
                      {data.bWinRate.toFixed(1)}% de aproveitamento
                    </span>
                  </div>
                  <div className="h-2.5 w-full rounded-full overflow-hidden bg-muted flex">
                    <div
                      className="h-full bg-primary transition-all"
                      style={{ width: `${data.aWinRate}%` }}
                    />
                    <div
                      className="h-full bg-fire-orange transition-all"
                      style={{ width: `${data.bWinRate}%` }}
                    />
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {data.totalMatches === 0 ? (
            <Card className="border-border/60 bg-card/70">
              <CardContent className="p-8 text-center space-y-2">
                <Swords className="h-7 w-7 text-muted-foreground mx-auto" />
                <p className="text-sm font-bold text-foreground">
                  Nenhum confronto direto finalizado neste recorte
                </p>
                <p className="text-xs text-muted-foreground">
                  Estes dois Bladers ainda não se enfrentaram em partidas oficiais com os filtros selecionados. Tente selecionar{" "}
                  <strong className="text-foreground">Todas as Temporadas</strong>{" "}
                  ou <strong className="text-foreground">Todas as Modalidades</strong>.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Gráfico Comparativo de Finishes */}
              <Card className="border-border/60 bg-card/70">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-black">
                    Finishes no Duelo Direto
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-[260px] w-full">
                    {mounted && (
                      <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                        <BarChart
                          data={finishesComparisonData}
                          margin={{ top: 10, right: 12, left: -12, bottom: 4 }}
                        >
                          <CartesianGrid
                            strokeDasharray="3 3"
                            stroke="rgba(148,163,184,0.16)"
                          />
                          <XAxis
                            dataKey="finish"
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
                            dataKey={data.bladerA.nickname}
                            fill="#bd08f5"
                            radius={[4, 4, 0, 0]}
                          />
                          <Bar
                            dataKey={data.bladerB.nickname}
                            fill="#e96b00"
                            radius={[4, 4, 0, 0]}
                          />
                        </BarChart>
                      </ResponsiveContainer>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Histórico de Partidas */}
              <Card className="border-border/60 bg-card/70">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-black flex items-center gap-2">
                    <Trophy className="h-4 w-4 text-fire-yellow" />
                    Histórico de Confrontos ({data.matches.length})
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 max-h-[290px] overflow-y-auto pr-1">
                  {data.matches.map((m) => {
                    const aWon = m.winnerId === data.bladerA.id;
                    return (
                      <div
                        key={m.matchId}
                        className="rounded-xl border border-border/50 bg-background/55 p-3 space-y-1.5"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <Link
                            href={`/torneios/${m.tournamentSlug}`}
                            className="text-xs font-bold text-foreground hover:text-primary inline-flex items-center gap-1 truncate"
                          >
                            <span className="truncate">{m.tournamentName}</span>
                            <ExternalLink className="h-3 w-3 shrink-0" />
                          </Link>
                          <span className="text-[10px] text-muted-foreground shrink-0">
                            {formatDate(m.tournamentDate)}
                          </span>
                        </div>

                        <div className="flex items-center justify-between gap-2">
                          <div className="flex flex-wrap items-center gap-1.5">
                            <Badge
                              variant="outline"
                              className="text-[10px] border-border/60"
                            >
                              {TOURNAMENT_CATEGORY_LABELS[m.tournamentCategory]}
                            </Badge>
                            <Badge
                              variant="outline"
                              className="text-[10px] border-border/60"
                            >
                              {MATCH_STAGE_LABELS[m.stage]} • R{m.round}
                              {m.bracketLabel ? ` • ${m.bracketLabel}` : ""}
                            </Badge>
                          </div>

                          <div className="text-sm font-black tabular-nums shrink-0">
                            <span
                              className={
                                aWon ? "text-primary" : "text-muted-foreground"
                              }
                            >
                              {m.scoreA}
                            </span>
                            <span className="text-muted-foreground mx-1">×</span>
                            <span
                              className={
                                !aWon ? "text-fire-orange" : "text-muted-foreground"
                              }
                            >
                              {m.scoreB}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </CardContent>
              </Card>
            </div>
          )}
        </>
      )}
    </div>
  );
}
