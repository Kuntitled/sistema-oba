"use client";

import { Trophy, Wrench, Radio, Flame } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MATCH_POINT_OFFSET } from "@/lib/constants";
import {
  ARENA_STATUS_LABELS,
  FINISH_TYPE_LABELS,
  MATCH_STAGE_LABELS,
  type Arena,
} from "@/types/domain";

interface LiveArenaCardProps {
  arena: Arena;
  compact?: boolean;
}

export function LiveArenaCard({ arena, compact = false }: LiveArenaCardProps) {
  const match = arena.current_match;
  const isLive = arena.status === "in_match" || match?.status === "in_progress";

  const p1MatchPoint =
    match?.status === "in_progress" &&
    match.player1_score > 0 &&
    match.player1_score >= match.target_score - MATCH_POINT_OFFSET;
  const p2MatchPoint =
    match?.status === "in_progress" &&
    match.player2_score > 0 &&
    match.player2_score >= match.target_score - MATCH_POINT_OFFSET;

  const lastGame =
    match?.games && match.games.length > 0
      ? match.games[match.games.length - 1]
      : null;

  const matchLabel = match
    ? match.is_tiebreaker
      ? "Desempate Liderança"
      : match.stage === "top_cut"
        ? `${MATCH_STAGE_LABELS.top_cut} • ${match.bracket_label || `R${match.round}`}`
        : `${MATCH_STAGE_LABELS.swiss} • Rodada ${match.round}`
    : null;

  return (
    <Card
      className={`overflow-hidden transition-all ${
        isLive
          ? "border-fire-orange/50 bg-card/90 border-glow-fire"
          : "border-border/60 bg-card/60"
      }`}
    >
      <CardContent className={compact ? "p-3.5 space-y-2.5" : "p-4 sm:p-5 space-y-3"}>
        {/* Cabeçalho da Arena */}
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0">
            <div className="font-black text-sm text-foreground truncate">
              {arena.name}
            </div>
            {matchLabel && (
              <div className="text-[11px] text-muted-foreground truncate">
                {matchLabel}
              </div>
            )}
          </div>

          {isLive ? (
            <Badge className="bg-fire-orange text-slate-950 font-black text-[10px] gap-1 shrink-0">
              <span className="h-1.5 w-1.5 rounded-full bg-slate-950 animate-ping" />
              AO VIVO
            </Badge>
          ) : arena.status === "maintenance" ? (
            <Badge
              variant="outline"
              className="text-[10px] border-amber-500/40 text-amber-500 gap-1 shrink-0"
            >
              <Wrench className="h-3 w-3" />
              {ARENA_STATUS_LABELS.maintenance}
            </Badge>
          ) : (
            <Badge
              variant="outline"
              className="text-[10px] border-emerald-500/40 text-emerald-500 bg-emerald-500/10 shrink-0"
            >
              {ARENA_STATUS_LABELS.available}
            </Badge>
          )}
        </div>

        {/* Confronto Atual */}
        {match ? (
          <div className="rounded-xl border border-border/50 bg-background/60 p-3 space-y-2">
            <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
              <div className="min-w-0 text-left space-y-1">
                <div className="font-black text-xs sm:text-sm text-primary truncate">
                  {match.player1?.nickname ?? "Blader 1"}
                </div>
                {p1MatchPoint && (
                  <Badge className="bg-primary/20 text-primary border-primary/40 text-[9px] px-1.5 py-0 animate-pulse">
                    MATCH POINT
                  </Badge>
                )}
              </div>

              <div className="px-3 py-1 rounded-lg bg-muted/70 font-black text-base sm:text-xl tabular-nums tracking-tight shrink-0">
                {match.player1_score}{" "}
                <span className="text-muted-foreground font-semibold">×</span>{" "}
                {match.player2_score}
              </div>

              <div className="min-w-0 text-right space-y-1">
                <div className="font-black text-xs sm:text-sm text-fire-orange truncate">
                  {match.player2?.nickname ?? "Blader 2"}
                </div>
                {p2MatchPoint && (
                  <Badge className="bg-fire-orange/20 text-fire-orange border-fire-orange/40 text-[9px] px-1.5 py-0 animate-pulse">
                    MATCH POINT
                  </Badge>
                )}
              </div>
            </div>

            {!compact && (
              <div className="grid grid-cols-2 gap-4 pt-0.5">
                <div className="flex items-center gap-1">
                  {Array.from({ length: match.target_score }).map((_, idx) => (
                    <span
                      key={idx}
                      className={`h-1.5 flex-1 rounded-full ${
                        idx < match.player1_score
                          ? "bg-primary"
                          : "bg-muted/70"
                      }`}
                    />
                  ))}
                </div>
                <div className="flex items-center justify-end gap-1">
                  {Array.from({ length: match.target_score }).map((_, idx) => (
                    <span
                      key={idx}
                      className={`h-1.5 flex-1 rounded-full ${
                        idx < match.player2_score
                          ? "bg-fire-orange"
                          : "bg-muted/70"
                      }`}
                    />
                  ))}
                </div>
              </div>
            )}

            {match.status === "finished" && match.winner && (
              <div className="pt-1.5 border-t border-border/40 flex items-center justify-center gap-1.5 text-[11px] font-bold text-amber-500">
                <Trophy className="h-3.5 w-3.5" />
                <span>Vitória de {match.winner.nickname}</span>
              </div>
            )}

            {!compact && lastGame && match.status === "in_progress" && (
              <div className="pt-1.5 border-t border-border/40 flex items-center justify-center gap-1.5 text-[11px] text-muted-foreground">
                <Flame className="h-3 w-3 text-fire-yellow shrink-0" />
                <span className="truncate">
                  Último lance #{lastGame.round_number}:{" "}
                  <strong className="text-foreground">
                    {lastGame.scoring_player?.nickname ?? "Blader"}
                  </strong>{" "}
                  +{lastGame.points_awarded}{" "}
                  {FINISH_TYPE_LABELS[lastGame.finish_type]}
                </span>
              </div>
            )}
          </div>
        ) : (
          <div className="rounded-xl border border-dashed border-border/50 bg-background/30 p-3 flex items-center justify-center gap-2 text-xs text-muted-foreground">
            <Radio className="h-3.5 w-3.5 shrink-0 opacity-60" />
            <span>
              {arena.status === "maintenance"
                ? "Arena em manutenção."
                : "Beystadium livre aguardando próxima chamada."}
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
