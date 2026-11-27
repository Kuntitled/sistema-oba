"use client";

import * as React from "react";
import { Trophy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { TournamentPodiumCardModal } from "@/components/shared/TournamentPodiumCardModal";

interface TournamentPodiumCardButtonProps {
  tournamentId: string;
  tournamentName: string;
  variant?: "admin" | "public";
}

export function TournamentPodiumCardButton({
  tournamentId,
  tournamentName,
  variant = "public",
}: TournamentPodiumCardButtonProps) {
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
            ? "h-8 text-xs font-semibold gap-1.5 border-amber-500/45 text-amber-400 hover:bg-amber-500/10 hover:text-amber-300"
            : "h-8 text-xs font-semibold gap-1.5 border-amber-500/45 text-amber-400 hover:bg-amber-500/10 hover:text-amber-300"
        }
        title="Gerar card PNG do Pódio com fotos, combos iniciais e Líder do Suíço"
      >
        <Trophy className="h-3.5 w-3.5" />
        Card Pódio (PNG)
      </Button>

      <TournamentPodiumCardModal
        open={open}
        onOpenChange={setOpen}
        tournamentId={tournamentId}
        tournamentName={tournamentName}
      />
    </>
  );
}
