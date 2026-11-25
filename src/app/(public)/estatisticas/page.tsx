import { BarChart3 } from "lucide-react";
import { isValidUuid } from "@/lib/services/arena-queries";
import {
  getHeadToHeadStats,
  getRegionalStatsData,
} from "@/lib/services/stats";
import {
  StatsDashboardClient,
  type StatsTabId,
} from "@/components/stats/StatsDashboardClient";

export const dynamic = "force-dynamic";

function resolveTab(raw?: string): StatsTabId {
  if (raw === "parts" || raw === "census" || raw === "h2h") {
    return raw;
  }
  return "overview";
}

export default async function EstatisticasPage({
  searchParams,
}: {
  searchParams: Promise<{
    season?: string;
    category?: string;
    ruleset?: string;
    tab?: string;
    bladerA?: string;
    bladerB?: string;
  }>;
}) {
  const resolvedParams = await searchParams;
  const initialTab = resolveTab(resolvedParams.tab);

  const hasInitialPair =
    isValidUuid(resolvedParams.bladerA) &&
    isValidUuid(resolvedParams.bladerB) &&
    resolvedParams.bladerA !== resolvedParams.bladerB;

  const [statsData, initialHeadToHead] = await Promise.all([
    getRegionalStatsData({
      season: resolvedParams.season,
      category: resolvedParams.category,
      ruleset: resolvedParams.ruleset,
    }),
    hasInitialPair
      ? getHeadToHeadStats({
          bladerAId: resolvedParams.bladerA!,
          bladerBId: resolvedParams.bladerB!,
          season: resolvedParams.season,
          category: resolvedParams.category,
          ruleset: resolvedParams.ruleset,
        })
      : Promise.resolve(null),
  ]);

  return (
    <div className="container mx-auto px-4 sm:px-6 py-10 max-w-6xl space-y-8">
      <div className="space-y-2">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/15 border border-primary/30 text-primary text-xs font-bold uppercase tracking-wider">
          <BarChart3 className="h-3.5 w-3.5 text-fire-orange" />
          <span>Meta Regional &amp; Estatísticas Oficiais</span>
        </div>
        <h1 className="text-2xl sm:text-4xl font-black text-foreground tracking-tight">
          Estatísticas &amp; Meta da{" "}
          <span className="text-fire-gradient">OBA</span>
        </h1>
        <p className="text-xs sm:text-sm text-muted-foreground max-w-3xl">
          Análise de finishes, performance por peça, censo anônimo de coleções e histórico de confrontos diretos (Head-to-Head) da Organização de Beyblade do Amazonas (OBA).
        </p>
      </div>

      <StatsDashboardClient
        data={statsData}
        initialTab={initialTab}
        initialHeadToHead={initialHeadToHead}
        initialBladerAId={resolvedParams.bladerA}
        initialBladerBId={resolvedParams.bladerB}
      />
    </div>
  );
}
