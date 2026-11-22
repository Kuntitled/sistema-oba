"use client";

import * as React from "react";
import { ImageDown, Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  TournamentCardModal,
  type TournamentCardSummaryData,
} from "@/components/shared/TournamentCardModal";

interface TournamentPromoCardButtonProps {
  tournament: TournamentCardSummaryData;
  variant?: "admin" | "public";
}

export function TournamentPromoCardButton({
  tournament,
  variant = "public",
}: TournamentPromoCardButtonProps) {
  const [open, setOpen] = React.useState(false);

  return (
    <>
      <Button
        type="button"
        size="sm"
        variant="outline"
        onClick={() => setOpen(true)}
        className={
          variant === "admin"
            ? "h-8 text-xs font-semibold gap-1.5 border-fire-orange/40 text-fire-orange hover:bg-fire-orange/10 hover:text-fire-orange"
            : "h-8 text-xs font-semibold gap-1.5 border-primary/40 text-primary hover:bg-primary/10 hover:text-primary"
        }
        title="Gerar card PNG de divulgação do torneio"
      >
        {variant === "admin" ? (
          <ImageDown className="h-3.5 w-3.5" />
        ) : (
          <Share2 className="h-3.5 w-3.5" />
        )}
        {variant === "admin" ? "Card (PNG)" : "Divulgar Torneio"}
      </Button>

      <TournamentCardModal
        open={open}
        onOpenChange={setOpen}
        tournament={tournament}
      />
    </>
  );
}
