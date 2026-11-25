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
import { Package, Users, Search, Layers, ShieldCheck } from "lucide-react";
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
  OBA_SYSTEM_CHART_COLORS,
  StatsChartTooltip,
  useChartMounted,
} from "@/components/stats/StatsChartTooltip";
import { partMatchesQuery } from "@/lib/parts-search";
import type { CollectionCensusData } from "@/lib/services/stats";
import {
  PART_LINE_ORDER,
  PART_TYPE_LABELS,
  PART_TYPE_ORDER,
} from "@/types/domain";

interface CollectionCensusSectionProps {
  census: CollectionCensusData;
}

export function CollectionCensusSection({
  census,
}: CollectionCensusSectionProps) {
  const mounted = useChartMounted();
  const [searchQuery, setSearchQuery] = React.useState("");
  const [typeFilter, setTypeFilter] = React.useState("all");
  const [lineFilter, setLineFilter] = React.useState("all");
  const [onlyOwned, setOnlyOwned] = React.useState(true);

  const byTypeChartData = census.byPartType.map((item) => ({
    name: PART_TYPE_LABELS[item.partType],
    total: item.totalOwned,
    distintas: item.uniquePartsCount,
  }));

  const byLineChartData = census.byLine
    .filter((item) => item.totalOwned > 0 || item.line !== "Universal")
    .map((item) => ({
      name: item.line,
      total: item.totalOwned,
      color: OBA_SYSTEM_CHART_COLORS[item.line] ?? "#94a3b8",
    }));

  const filteredParts = React.useMemo(() => {
    const hasSearch = searchQuery.trim().length > 0;
    return census.parts.filter((part) => {
      if (onlyOwned && !hasSearch && part.ownersCount === 0) {
        return false;
      }
      if (typeFilter !== "all" && part.partType !== typeFilter) {
        return false;
      }
      if (lineFilter === "universal") {
        if (part.line !== null) return false;
      } else if (lineFilter !== "all" && part.line !== lineFilter) {
        return false;
      }
      if (
        hasSearch &&
        !partMatchesQuery(
          { name: part.name, aliases: part.aliases, line: part.line },
          searchQuery
        )
      ) {
        return false;
      }
      return true;
    });
  }, [census.parts, onlyOwned, searchQuery, typeFilter, lineFilter]);

  return (
    <div className="space-y-6">
      {/* Nota de privacidade + KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Card className="border-border/60 bg-card/70">
          <CardContent className="p-4 flex items-center justify-between gap-3">
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                Peças Catalogadas na Liga
              </span>
              <div className="text-2xl sm:text-3xl font-black text-foreground mt-0.5 tabular-nums">
                {census.totalEntries}
              </div>
              <p className="text-[11px] text-muted-foreground">
                Soma das coleções da comunidade
              </p>
            </div>
            <div className="h-10 w-10 rounded-xl bg-primary/15 border border-primary/30 flex items-center justify-center shrink-0">
              <Package className="h-5 w-5 text-primary" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/60 bg-card/70">
          <CardContent className="p-4 flex items-center justify-between gap-3">
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                Bladers Colecionadores
              </span>
              <div className="text-2xl sm:text-3xl font-black text-foreground mt-0.5 tabular-nums">
                {census.bladersWithCollectionCount}
              </div>
              <p className="text-[11px] text-muted-foreground">
                Com inventário preenchido (anônimo)
              </p>
            </div>
            <div className="h-10 w-10 rounded-xl bg-fire-orange/15 border border-fire-orange/30 flex items-center justify-center shrink-0">
              <Users className="h-5 w-5 text-fire-orange" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/60 bg-card/70">
          <CardContent className="p-4 flex items-center justify-between gap-3">
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                Modelos Distintos na Liga
              </span>
              <div className="text-2xl sm:text-3xl font-black text-foreground mt-0.5 tabular-nums">
                {census.uniquePartsOwnedCount}
              </div>
              <p className="text-[11px] text-muted-foreground">
                Peças diferentes em circulação
              </p>
            </div>
            <div className="h-10 w-10 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center shrink-0">
              <ShieldCheck className="h-5 w-5 text-emerald-400" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Gráficos de Distribuição da Coleção */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="border-border/60 bg-card/70">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-black flex items-center gap-2">
              <Package className="h-4 w-4 text-primary" />
              Distribuição da Comunidade por Tipo
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[250px] w-full">
              {mounted && (
                <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                  <BarChart
                    data={byTypeChartData}
                    margin={{ top: 8, right: 12, left: -12, bottom: 20 }}
                  >
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke="rgba(148,163,184,0.16)"
                    />
                    <XAxis
                      dataKey="name"
                      tick={{ fill: "#94a3b8", fontSize: 10 }}
                      interval={0}
                      angle={-18}
                      textAnchor="end"
                      height={50}
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
                      dataKey="total"
                      name="Bladers com a peça"
                      fill="#bd08f5"
                      radius={[6, 6, 0, 0]}
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
              <Layers className="h-4 w-4 text-fire-orange" />
              Distribuição por Linha / Sistema
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[250px] w-full">
              {mounted && (
                <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                  <BarChart
                    data={byLineChartData}
                    margin={{ top: 8, right: 12, left: -12, bottom: 8 }}
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
                      cursor={{ fill: "rgba(233, 107, 0, 0.08)" }}
                      content={<StatsChartTooltip />}
                    />
                    <Bar
                      dataKey="total"
                      name="Registros na coleção"
                      radius={[6, 6, 0, 0]}
                    >
                      {byLineChartData.map((entry) => (
                        <Cell key={entry.name} fill={entry.color} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Consulta de Popularidade das Peças */}
      <Card className="border-border/60 bg-card/70">
        <CardHeader className="pb-3 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <CardTitle className="text-sm font-black">
              Censo Anônimo de Peças ({filteredParts.length})
            </CardTitle>
            <button
              type="button"
              onClick={() => setOnlyOwned((prev) => !prev)}
              className="text-[11px] font-semibold text-primary hover:underline text-left sm:text-right"
            >
              {onlyOwned
                ? "Mostrando peças com donos (ver catálogo completo)"
                : "Mostrando catálogo completo (filtrar apenas com donos)"}
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            <div className="relative">
              <Search className="h-3.5 w-3.5 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Consultar peça (TT ou Hasbro)..."
                className="pl-8 h-9 text-xs"
              />
            </div>

            <Select value={typeFilter} onValueChange={(v) => setTypeFilter(v ?? "all")}>
              <SelectTrigger className="w-full h-9 text-xs">
                <SelectValue placeholder="Tipo de Peça">
                  {typeFilter === "all"
                    ? "Todos os Tipos"
                    : PART_TYPE_LABELS[
                        typeFilter as keyof typeof PART_TYPE_LABELS
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
                <SelectValue placeholder="Linha">
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
          </div>
        </CardHeader>
        <CardContent>
          {filteredParts.length === 0 ? (
            <p className="text-xs text-muted-foreground py-6 text-center">
              Nenhuma peça encontrada com esses critérios no censo atual.
            </p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 max-h-[520px] overflow-y-auto pr-1">
              {filteredParts.map((part) => (
                <div
                  key={part.partId}
                  className="rounded-xl border border-border/50 bg-background/50 p-3 space-y-2"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="font-bold text-xs text-foreground truncate">
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
                          <span className="text-[10px] text-muted-foreground truncate max-w-[160px]">
                            {part.aliases[0]}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <div className="text-xs font-black text-foreground tabular-nums">
                        {part.ownersCount}{" "}
                        {part.ownersCount === 1 ? "Blader" : "Bladers"}
                      </div>
                      <div className="text-[10px] text-muted-foreground tabular-nums">
                        {part.sharePct.toFixed(1)}% da liga
                      </div>
                    </div>
                  </div>

                  <div className="h-1.5 w-full rounded-full bg-muted/70 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-primary to-fire-orange transition-all"
                      style={{
                        width: `${Math.min(100, Math.max(part.ownersCount > 0 ? 4 : 0, part.sharePct))}%`,
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
