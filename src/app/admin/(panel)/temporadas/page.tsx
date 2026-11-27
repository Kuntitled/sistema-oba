import {
  getSeasonRanking,
  getSeasonsWithStats,
} from "@/lib/services/league";
import { getBladersComboSummaries } from "@/lib/services/blader-combos";
import { SeasonManagerClient } from "@/components/admin/SeasonManagerClient";
import { Phase2SchemaNotice } from "@/components/arena/Phase2SchemaNotice";
import type { RankingCardEntry } from "@/lib/ranking-card-canvas";
import type { BladerRow } from "@/types/domain";

export interface SeasonRankingCardSnapshot {
  entries: RankingCardEntry[];
  totalRankedCount: number;
  finishedTournamentsCount: number;
}

export default async function AdminTemporadasPage() {
  const { seasons, schemaMissing } = await getSeasonsWithStats();

  if (schemaMissing) {
    return <Phase2SchemaNotice backHref="/admin" />;
  }

  const rankingsBySeason = await Promise.all(
    seasons.map(async (season) => {
      const data = await getSeasonRanking(String(season.year));
      return {
        season,
        ranking: data.ranking,
      };
    })
  );

  const uniqueTop10BladersMap = new Map<string, BladerRow>();
  for (const item of rankingsBySeason) {
    for (const entry of item.ranking.slice(0, 10)) {
      if (entry.blader && !uniqueTop10BladersMap.has(entry.blader.id)) {
        uniqueTop10BladersMap.set(entry.blader.id, entry.blader);
      }
    }
  }

  const comboSummaries = await getBladersComboSummaries(
    Array.from(uniqueTop10BladersMap.values())
  );

  const rankingCardDataBySeasonId: Record<string, SeasonRankingCardSnapshot> =
    {};

  for (const { season, ranking } of rankingsBySeason) {
    const entries: RankingCardEntry[] = ranking
      .slice(0, 10)
      .map((entry, idx) => {
        const bladerId = entry.blader?.id ?? entry.blader_id;
        const combos = comboSummaries.get(bladerId);
        return {
          position: entry.position ?? idx + 1,
          bladerId,
          nickname: entry.blader?.nickname ?? "Blader",
          name: entry.blader?.name ?? entry.blader?.nickname ?? "Blader",
          avatarUrl: entry.blader?.avatar_url ?? null,
          totalPoints: entry.total_points,
          swissWins: entry.swiss_wins,
          podiumsCount: entry.podiums_count,
          bestPodium: entry.best_podium,
          favoriteComboText: combos?.favoriteCombo
            ? `${combos.favoriteCombo.system ? `[${combos.favoriteCombo.system}] ` : ""}${combos.favoriteCombo.summaryText}`
            : null,
          mostUsedComboText: combos?.mostUsedCombo
            ? `${combos.mostUsedCombo.system ? `[${combos.mostUsedCombo.system}] ` : ""}${combos.mostUsedCombo.summaryText}`
            : null,
        };
      });

    rankingCardDataBySeasonId[season.id] = {
      entries,
      totalRankedCount: ranking.length,
      finishedTournamentsCount: season.finishedTournamentsCount,
    };
  }

  return (
    <SeasonManagerClient
      initialSeasons={seasons}
      rankingCardDataBySeasonId={rankingCardDataBySeasonId}
    />
  );
}
