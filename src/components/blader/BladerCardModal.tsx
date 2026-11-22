"use client";

import * as React from "react";
import {
  Trophy,
  Swords,
  Sparkles,
  Tv,
  Flame,
  Loader2,
  AlertCircle,
  Layers,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { BladerAvatar } from "@/components/shared/BladerAvatar";
import { formatComboDisplay, type ComboBadgeChip } from "@/lib/combo-rules";
import type { BladerCardProfile } from "@/types/domain";

const CHIP_TONE_CLASSES: Record<ComboBadgeChip["tone"], string> = {
  primary: "border-primary/40 text-primary",
  orange: "border-fire-orange/40 text-fire-orange",
  yellow: "border-fire-yellow/40 text-fire-yellow",
  muted: "border-border/70 text-muted-foreground",
};

interface BladerCardModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  bladerId?: string | null;
  previewProfile?: BladerCardProfile | null;
}

export function BladerCardModal({
  open,
  onOpenChange,
  bladerId,
  previewProfile = null,
}: BladerCardModalProps) {
  const [profilesById, setProfilesById] = React.useState<
    Record<string, BladerCardProfile>
  >({});
  const [errorsById, setErrorsById] = React.useState<Record<string, string>>(
    {}
  );

  const fetchedProfile = bladerId ? (profilesById[bladerId] ?? null) : null;
  const error = bladerId ? (errorsById[bladerId] ?? null) : null;

  React.useEffect(() => {
    if (!open || previewProfile || !bladerId || profilesById[bladerId]) {
      return;
    }

    let cancelled = false;

    fetch(`/api/bladers/${encodeURIComponent(bladerId)}/card`)
      .then(async (res) => {
        const data = (await res.json().catch(() => ({}))) as {
          profile?: BladerCardProfile;
          error?: string;
        };
        if (!res.ok || !data.profile) {
          throw new Error(
            data.error || "Não foi possível carregar o Card do Blader."
          );
        }
        const loadedProfile = data.profile;
        if (!cancelled) {
          setProfilesById((prev) => ({
            ...prev,
            [bladerId]: loadedProfile,
          }));
          setErrorsById((prev) => {
            if (!prev[bladerId]) return prev;
            const next = { ...prev };
            delete next[bladerId];
            return next;
          });
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          const message =
            err instanceof Error
              ? err.message
              : "Erro ao carregar Card do Blader.";
          setErrorsById((prev) => ({
            ...prev,
            [bladerId]: message,
          }));
        }
      });

    return () => {
      cancelled = true;
    };
  }, [open, bladerId, previewProfile, profilesById]);

  const profile = previewProfile ?? fetchedProfile;
  const loading = Boolean(open && !previewProfile && bladerId && !profile && !error);
  const comboDisplay = profile
    ? formatComboDisplay(profile.favoriteCombo)
    : null;
  const hasFavoriteCombo = Boolean(
    comboDisplay && comboDisplay.chips.length > 0
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md bg-card border-border/80 p-0 overflow-hidden shadow-2xl">
        <div className="h-2 bg-gradient-to-r from-fire-orange via-primary to-fire-yellow" />

        <div className="p-5 sm:p-6 space-y-5">
          <DialogHeader className="sr-only">
            <DialogTitle>
              {profile
                ? `Card do Blader — ${profile.blader.nickname}`
                : "Card do Blader"}
            </DialogTitle>
          </DialogHeader>

          {loading && !profile ? (
            <div className="py-12 flex flex-col items-center justify-center gap-3 text-muted-foreground">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
              <span className="text-xs font-medium">
                Carregando ficha do Blader...
              </span>
            </div>
          ) : error && !profile ? (
            <div className="p-4 rounded-xl bg-destructive/15 border border-destructive/30 text-destructive text-xs flex items-center gap-2">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          ) : profile ? (
            <>
              {/* Identidade Principal */}
              <div className="flex items-start gap-4">
                <BladerAvatar
                  avatarUrl={profile.blader.avatar_url}
                  nickname={profile.blader.nickname}
                  sizeClass="h-16 w-16"
                  textClass="text-xl font-black text-primary"
                  borderClass="border-2 border-primary/60 shadow-lg"
                />

                <div className="min-w-0 flex-1 space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-xl font-black text-foreground truncate">
                      {profile.blader.nickname}
                    </h2>
                    {previewProfile && (
                      <Badge
                        variant="outline"
                        className="text-[10px] border-primary/40 text-primary"
                      >
                        Prévia
                      </Badge>
                    )}
                  </div>

                  <p className="text-xs text-muted-foreground truncate">
                    {profile.blader.name}
                  </p>

                  <div className="flex flex-wrap items-center gap-2 pt-0.5">
                    {profile.position ? (
                      <Badge className="bg-primary/20 text-primary border border-primary/40 text-[11px] font-black gap-1">
                        <Trophy className="h-3 w-3 text-fire-yellow" />#
                        {profile.position}º
                        {profile.seasonName ? ` • ${profile.seasonName}` : ""}
                      </Badge>
                    ) : (
                      <Badge
                        variant="outline"
                        className="text-[11px] text-muted-foreground"
                      >
                        {profile.seasonName
                          ? `Sem ranking • ${profile.seasonName}`
                          : "Sem ranking na temporada"}
                      </Badge>
                    )}
                  </div>
                </div>
              </div>

              {/* Métricas da Temporada */}
              <div className="grid grid-cols-3 gap-2.5">
                <div className="rounded-xl border border-border/60 bg-background/60 p-3 text-center">
                  <div className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground">
                    Pontos
                  </div>
                  <div className="text-lg font-black text-primary mt-0.5 tabular-nums">
                    {profile.totalPoints}
                  </div>
                </div>

                <div className="rounded-xl border border-border/60 bg-background/60 p-3 text-center">
                  <div className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground flex items-center justify-center gap-1">
                    <Swords className="h-3 w-3 text-fire-orange" />
                    Vit. Suíço
                  </div>
                  <div className="text-lg font-black text-foreground mt-0.5 tabular-nums">
                    {profile.swissWins}
                  </div>
                </div>

                <div className="rounded-xl border border-border/60 bg-background/60 p-3 text-center">
                  <div className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground">
                    Pódios
                  </div>
                  <div className="text-xs font-black text-foreground mt-1.5 flex items-center justify-center gap-1.5 tabular-nums">
                    <span>🥇{profile.firstPlaces}</span>
                    <span>🥈{profile.secondPlaces}</span>
                    <span>🥉{profile.thirdPlaces}</span>
                  </div>
                </div>
              </div>

              {/* Bio */}
              {profile.blader.bio && (
                <div className="rounded-xl border border-border/50 bg-muted/25 p-3 text-xs text-muted-foreground italic leading-relaxed">
                  &ldquo;{profile.blader.bio}&rdquo;
                </div>
              )}

              {/* Detalhes do Blader */}
              <div className="space-y-2.5 text-xs">
                {profile.blader.favorite_anime && (
                  <div className="flex items-center justify-between gap-2 rounded-lg border border-border/50 bg-background/40 px-3 py-2">
                    <span className="text-muted-foreground font-semibold flex items-center gap-1.5">
                      <Tv className="h-3.5 w-3.5 text-primary" />
                      Anime Favorito
                    </span>
                    <span className="font-bold text-foreground truncate">
                      {profile.blader.favorite_anime}
                    </span>
                  </div>
                )}

                <div className="rounded-lg border border-border/50 bg-background/40 p-3 space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <div className="text-muted-foreground font-semibold flex items-center gap-1.5">
                      <Sparkles className="h-3.5 w-3.5 text-fire-yellow" />
                      Combo Favorito
                    </div>
                    {hasFavoriteCombo && comboDisplay?.system && (
                      <Badge
                        variant="outline"
                        className="text-[10px] px-1.5 py-0 border-primary/40 text-primary font-black"
                      >
                        {comboDisplay.system}
                      </Badge>
                    )}
                  </div>
                  {hasFavoriteCombo && comboDisplay ? (
                    <div className="space-y-2">
                      {comboDisplay.summaryText && (
                        <div className="font-black text-xs text-foreground">
                          {comboDisplay.summaryText}
                        </div>
                      )}
                      <div className="flex flex-wrap items-center gap-1.5">
                        {comboDisplay.chips.map((chip) => (
                          <Badge
                            key={`${chip.slot}:${chip.name}`}
                            variant="outline"
                            className={`font-bold text-[10px] ${CHIP_TONE_CLASSES[chip.tone]}`}
                          >
                            {chip.slot}: {chip.name}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <p className="text-[11px] text-muted-foreground italic">
                      Não definido ainda
                    </p>
                  )}
                </div>

                <div className="rounded-lg border border-border/50 bg-background/40 p-3 space-y-1">
                  <div className="text-muted-foreground font-semibold flex items-center gap-1.5">
                    <Flame className="h-3.5 w-3.5 text-fire-orange" />
                    Combo Mais Usado
                  </div>
                  {profile.mostUsedCombo ? (
                    <div className="flex items-center gap-1.5 font-bold text-foreground">
                      <Layers className="h-3.5 w-3.5 text-primary" />
                      <span>{profile.mostUsedCombo}</span>
                    </div>
                  ) : (
                    <p className="text-[11px] text-muted-foreground italic">
                      Sem histórico de combos ainda
                    </p>
                  )}
                </div>
              </div>
            </>
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  );
}
