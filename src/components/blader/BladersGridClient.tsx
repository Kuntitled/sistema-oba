"use client";

import * as React from "react";
import { MapPin, Trophy, Swords } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { BladerAvatar } from "@/components/shared/BladerAvatar";
import { BladerCardModal } from "@/components/blader/BladerCardModal";
import type { Blader } from "@/types/domain";

interface BladersGridClientProps {
  bladers: Blader[];
}

export function BladersGridClient({ bladers }: BladersGridClientProps) {
  const [selectedBladerId, setSelectedBladerId] = React.useState<string | null>(
    null
  );

  return (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
        {bladers.map((blader) => {
          const ranking = blader.ranking;
          return (
            <Card
              key={blader.id}
              className="border-border/60 bg-card/60 hover:border-primary/40 hover:bg-card/90 transition-all duration-200 overflow-hidden"
            >
              <button
                type="button"
                onClick={() => setSelectedBladerId(blader.id)}
                className="w-full h-full text-left cursor-pointer group flex flex-col justify-between"
              >
                <CardContent className="p-5 space-y-4 w-full flex-1 flex flex-col justify-between">
                  <div className="space-y-4">
                    <div className="flex items-center gap-3.5">
                      <BladerAvatar
                        avatarUrl={blader.avatar_url}
                        nickname={blader.nickname}
                        sizeClass="h-14 w-14"
                        textClass="font-black text-base text-primary"
                        borderClass="border-2 border-primary/30 shadow-sm"
                      />

                      <div className="min-w-0">
                        <h3 className="font-bold text-base text-foreground truncate group-hover:text-primary transition-colors">
                          {blader.nickname}
                        </h3>
                        <p className="text-xs text-muted-foreground truncate">
                          {blader.name}
                        </p>
                        {blader.city && (
                          <span className="flex items-center gap-1 text-[11px] text-muted-foreground mt-0.5">
                            <MapPin className="h-3 w-3 text-fire-orange" />
                            {blader.city}
                          </span>
                        )}
                      </div>
                    </div>

                    {blader.bio && (
                      <p className="text-xs text-muted-foreground/90 line-clamp-2 italic bg-muted/20 p-2 rounded-lg border border-border/30">
                        &ldquo;{blader.bio}&rdquo;
                      </p>
                    )}
                  </div>

                  <div className="pt-3 border-t border-border/40 flex items-center justify-between text-xs w-full">
                    <div className="flex items-center gap-1.5 text-muted-foreground">
                      <Swords className="h-3.5 w-3.5" />
                      <span>{ranking?.tournaments_played ?? 0} torneios</span>
                    </div>

                    <div className="flex items-center gap-1 font-black text-primary bg-primary/10 px-2.5 py-1 rounded-md border border-primary/20">
                      <Trophy className="h-3.5 w-3.5 text-amber-500" />
                      <span>{ranking?.total_points ?? 0}</span>
                      <span className="text-[10px] font-semibold text-muted-foreground">
                        pts
                      </span>
                    </div>
                  </div>
                </CardContent>
              </button>
            </Card>
          );
        })}
      </div>

      <BladerCardModal
        open={Boolean(selectedBladerId)}
        onOpenChange={(isOpen) => {
          if (!isOpen) setSelectedBladerId(null);
        }}
        bladerId={selectedBladerId}
      />
    </>
  );
}
