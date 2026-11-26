"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Trash2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast-provider";
import { deleteTournamentAction } from "@/app/admin/actions";

export function DeleteTournamentButton({
  tournamentId,
  tournamentName,
}: {
  tournamentId: string;
  tournamentName: string;
}) {
  const router = useRouter();
  const toast = useToast();
  const [loading, setLoading] = React.useState(false);

  const handleDelete = async () => {
    if (
      !confirm(
        `Tem certeza que deseja excluir o torneio "${tournamentName}"? Os resultados associados serão removidos e o ranking será recalculado.`
      )
    ) {
      return;
    }

    setLoading(true);
    const res = await deleteTournamentAction(tournamentId);
    setLoading(false);
    if (res?.error) {
      toast.error(res.error);
      return;
    }
    toast.success(`Torneio "${tournamentName}" excluído.`);
    router.refresh();
  };

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={handleDelete}
      disabled={loading}
      className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
      title="Excluir torneio"
    >
      {loading ? (
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
      ) : (
        <Trash2 className="h-3.5 w-3.5" />
      )}
    </Button>
  );
}
