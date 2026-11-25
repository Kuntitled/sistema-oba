"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  BarChart3,
  Disc,
  Package,
  Swords,
  SlidersHorizontal,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { OverviewSection } from "@/components/stats/OverviewSection";
import { PartPerformanceSection } from "@/components/stats/PartPerformanceSection";
import { CollectionCensusSection } from "@/components/stats/CollectionCensusSection";
import { HeadToHeadSection } from "@/components/stats/HeadToHeadSection";
import type {
  HeadToHeadStatsData,
  RegionalStatsData,
  StatsCategoryFilter,
} from "@/lib/services/stats";

export type StatsTabId = "overview" | "parts" | "census" | "h2h";

interface StatsDashboardClientProps {
  data: RegionalStatsData;
  initialTab: StatsTabId;
  initialHeadToHead: HeadToHeadStatsData | null;
  initialBladerAId?: string;
  initialBladerBId?: string;
}

const CATEGORY_OPTIONS: Array<{ value: StatsCategoryFilter; label: string }> = [
  { value: "ranked", label: "Ranqueados (Oficial + Semanal)" },
  { value: "all", label: "Todas as Modalidades" },
  { value: "oficial", label: "Somente Oficial" },
  { value: "semanal", label: "Somente Semanal" },
  { value: "amistoso", label: "Somente Amistoso" },
];

export function StatsDashboardClient({
  data,
  initialTab,
  initialHeadToHead,
  initialBladerAId,
  initialBladerBId,
}: StatsDashboardClientProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = React.useState<StatsTabId>(initialTab);

  const updateUrlFilters = (next: {
    season?: string;
    category?: string;
    ruleset?: string;
    tab?: StatsTabId;
  }) => {
    const params = new URLSearchParams();
    params.set("season", next.season ?? data.selectedSeasonId);
    params.set("category", next.category ?? data.selectedCategory);
    params.set("ruleset", next.ruleset ?? data.selectedRulesetId);
    params.set("tab", next.tab ?? activeTab);
    if (initialBladerAId) params.set("bladerA", initialBladerAId);
    if (initialBladerBId) params.set("bladerB", initialBladerBId);
    router.push(`/estatisticas?${params.toString()}`, { scroll: false });
  };

  const tabs: Array<{
    id: StatsTabId;
    label: string;
    icon: React.ElementType;
  }> = [
    { id: "overview", label: "Panorama Geral", icon: BarChart3 },
    { id: "parts", label: "Performance por Peça", icon: Disc },
    { id: "census", label: "Censo da Coleção", icon: Package },
    { id: "h2h", label: "Confrontos Diretos", icon: Swords },
  ];

  const selectedSeasonLabel = React.useMemo(() => {
    if (data.selectedSeasonId === "all") return "Todas as Temporadas";
    const found = data.seasons.find((s) => s.id === data.selectedSeasonId);
    if (!found) return "Temporada";
    return `${found.name}${found.is_active ? " (Atual)" : ""}`;
  }, [data.selectedSeasonId, data.seasons]);

  const selectedCategoryLabel = React.useMemo(() => {
    return (
      CATEGORY_OPTIONS.find((opt) => opt.value === data.selectedCategory)
        ?.label ?? "Modalidade"
    );
  }, [data.selectedCategory]);

  const selectedRulesetLabel = React.useMemo(() => {
    if (data.selectedRulesetId === "all") return "Todos os Formatos";
    return (
      data.rulesets.find((r) => r.id === data.selectedRulesetId)?.name ??
      "Formato"
    );
  }, [data.selectedRulesetId, data.rulesets]);

  return (
    <div className="space-y-6">
      {/* Barra de Filtros Globais */}
      <Card className="border-border/60 bg-card/75">
        <CardContent className="p-4 space-y-3">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
            <SlidersHorizontal className="h-3.5 w-3.5 text-primary" />
            <span>Filtros Globais do Meta OBA</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="space-y-1">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                Temporada
              </span>
              <Select
                value={data.selectedSeasonId}
                onValueChange={(value) => {
                  if (value) updateUrlFilters({ season: value });
                }}
              >
                <SelectTrigger className="w-full h-9 text-xs font-semibold">
                  <SelectValue placeholder="Temporada">
                    {selectedSeasonLabel}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas as Temporadas</SelectItem>
                  {data.seasons.map((season) => (
                    <SelectItem key={season.id} value={season.id}>
                      {season.name} {season.is_active ? "(Atual)" : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                Modalidade
              </span>
              <Select
                value={data.selectedCategory}
                onValueChange={(value) => {
                  if (value) updateUrlFilters({ category: value });
                }}
              >
                <SelectTrigger className="w-full h-9 text-xs font-semibold">
                  <SelectValue placeholder="Modalidade">
                    {selectedCategoryLabel}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {CATEGORY_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                Formato / Ruleset
              </span>
              <Select
                value={data.selectedRulesetId}
                onValueChange={(value) => {
                  if (value) updateUrlFilters({ ruleset: value });
                }}
              >
                <SelectTrigger className="w-full h-9 text-xs font-semibold">
                  <SelectValue placeholder="Formato">
                    {selectedRulesetLabel}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os Formatos</SelectItem>
                  {data.rulesets.map((ruleset) => (
                    <SelectItem key={ruleset.id} value={ruleset.id}>
                      {ruleset.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Navegação por Abas */}
      <div className="flex flex-wrap items-center gap-2 border-b border-border/60 pb-3">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const active = activeTab === tab.id;
          return (
            <Button
              key={tab.id}
              type="button"
              size="sm"
              variant={active ? "default" : "outline"}
              onClick={() => setActiveTab(tab.id)}
              className="text-xs font-bold gap-1.5"
            >
              <Icon className="h-3.5 w-3.5" />
              {tab.label}
            </Button>
          );
        })}
      </div>

      {/* Conteúdo da Aba Selecionada */}
      {activeTab === "overview" && (
        <OverviewSection
          overview={data.overview}
          partPerformance={data.partPerformance}
        />
      )}

      {activeTab === "parts" && (
        <PartPerformanceSection
          parts={data.partPerformance}
          trackedComboRoundsCount={data.overview.trackedComboRoundsCount}
        />
      )}

      {activeTab === "census" && (
        <CollectionCensusSection census={data.collectionCensus} />
      )}

      {activeTab === "h2h" && (
        <HeadToHeadSection
          bladers={data.bladers}
          seasonId={data.selectedSeasonId}
          category={data.selectedCategory}
          rulesetId={data.selectedRulesetId}
          initialData={initialHeadToHead}
          initialBladerAId={initialBladerAId}
          initialBladerBId={initialBladerBId}
        />
      )}
    </div>
  );
}
