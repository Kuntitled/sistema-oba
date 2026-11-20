"use client";

import * as React from "react";
import Link from "next/link";
import { Flame, ChevronRight, Radio } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { LiveArenaCard } from "@/components/tournament/LiveArenaCard";
import { createClient } from "@/lib/supabase/client";
import { fetchArenasOverview } from "@/lib/services/arena-queries";
import type { Arena, Tournament } from "@/types/domain";

interface HomeLiveTournamentBannerProps {
  tournament: Tournament;
  initialArenas: Arena[];
}

export function HomeLiveTournamentBanner({
  tournament,
  initialArenas,
}: HomeLiveTournamentBannerProps) {
  const supabase = React.useMemo(() => createClient(), []);
  const [arenas, setArenas] = React.useState<Arena[]>(initialArenas);

  React.useEffect(() => {
    if (tournament.status !== "ongoing") return;

    const refresh = async () => {
      const res = await fetchArenasOverview(supabase, tournament.id);
      if (!res.schemaMissing) {
        setArenas(res.arenas);
      }
    };

    const channel = supabase
      .channel(`home-live-tournament-${tournament.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "arenas",
          filter: `tournament_id=eq.${tournament.id}`,
        },
        () => {
          void refresh();
        }
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "matches",
          filter: `tournament_id=eq.${tournament.id}`,
        },
        () => {
          void refresh();
        }
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [supabase, tournament.id, tournament.status]);

  if (tournament.status !== "ongoing") {
    return (
      <div className="mt-8 w-full max-w-xl">
        <Link href={`/torneios/${tournament.slug}`}>
          <Card className="border-fire-orange/40 bg-fire-orange/10 hover:bg-fire-orange/15 transition-colors p-4">
            <div className="flex items-center justify-between gap-3 text-left">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-fire-orange/20 text-fire-orange flex items-center justify-center shrink-0">
                  <Flame className="h-5 w-5 animate-pulse" />
                </div>
                <div>
                  <Badge className="bg-fire-orange text-slate-950 font-bold text-[10px] mb-1">
                    Inscrições Abertas!
                  </Badge>
                  <h4 className="font-bold text-sm text-foreground">
                    {tournament.name}
                  </h4>
                </div>
              </div>
              <ChevronRight className="h-5 w-5 text-muted-foreground shrink-0" />
            </div>
          </Card>
        </Link>
      </div>
    );
  }

  const sortedArenas = [...arenas].sort((a, b) => {
    const aLive = a.status === "in_match" ? 0 : 1;
    const bLive = b.status === "in_match" ? 0 : 1;
    if (aLive !== bLive) return aLive - bLive;
    return a.display_order - b.display_order;
  });

  return (
    <div className="mt-8 w-full max-w-3xl text-left">
      <Card className="border-fire-orange/50 bg-card/85 backdrop-blur-md p-4 sm:p-5 space-y-4 border-glow-fire">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="h-10 w-10 rounded-full bg-fire-orange/20 text-fire-orange flex items-center justify-center shrink-0">
              <Radio className="h-5 w-5 animate-pulse" />
            </div>
            <div className="min-w-0">
              <Badge className="bg-fire-orange text-slate-950 font-black text-[10px] gap-1 mb-1">
                <span className="h-1.5 w-1.5 rounded-full bg-slate-950 animate-ping" />
                AO VIVO AGORA
              </Badge>
              <h4 className="font-black text-sm sm:text-base text-foreground truncate">
                {tournament.name}
              </h4>
            </div>
          </div>

          <Link href={`/torneios/${tournament.slug}`} className="shrink-0">
            <Button
              size="sm"
              className="w-full sm:w-auto bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-xs gap-1.5"
            >
              Ver Chaveamento Completo
              <ChevronRight className="h-4 w-4" />
            </Button>
          </Link>
        </div>

        {sortedArenas.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {sortedArenas.map((arena) => (
              <LiveArenaCard key={arena.id} arena={arena} compact />
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
