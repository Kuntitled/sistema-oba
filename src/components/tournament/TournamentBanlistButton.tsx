"use client";

import * as React from "react";
import { ImageDown, ShieldBan } from "lucide-react";
import { Button } from "@/components/ui/button";
import { BanlistCardModal } from "@/components/shared/BanlistCardModal";
import type { PartRow } from "@/types/domain";

interface TournamentBanlistButtonProps {
  rulesetName: string;
  rulesetDescription?: string | null;
  bannedParts: PartRow[];
  tournamentSubtitle: string;
}

export function TournamentBanlistButton({
  rulesetName,
  rulesetDescription,
  bannedParts,
  tournamentSubtitle,
}: TournamentBanlistButtonProps) {
  const [open, setOpen] = React.useState(false);

  return (
    <>
      <Button
        type="button"
        size="sm"
        variant="outline"
        onClick={() => setOpen(true)}
        className={`h-8 text-xs font-semibold gap-1.5 ${
          bannedParts.length > 0
            ? "border-destructive/40 text-destructive hover:bg-destructive/10 hover:text-destructive"
            : "border-primary/40 hover:border-primary"
        }`}
      >
        {bannedParts.length > 0 ? (
          <ShieldBan className="h-3.5 w-3.5" />
        ) : (
          <ImageDown className="h-3.5 w-3.5 text-primary" />
        )}
        {bannedParts.length > 0
          ? `Card de Banidos (${bannedParts.length})`
          : "Card do Formato"}
      </Button>

      <BanlistCardModal
        open={open}
        onOpenChange={setOpen}
        rulesetName={rulesetName}
        rulesetDescription={rulesetDescription}
        bannedParts={bannedParts}
        defaultSubtitle={tournamentSubtitle}
      />
    </>
  );
}
