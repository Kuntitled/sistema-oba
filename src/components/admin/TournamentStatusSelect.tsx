"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { useToast } from "@/components/ui/toast-provider";
import { updateTournamentStatusAction } from "@/app/admin/actions";
import { TOURNAMENT_STATUS_LABELS, TournamentStatus } from "@/types/domain";

interface TournamentStatusSelectProps {
  tournamentId: string;
  currentStatus: TournamentStatus;
}

export function TournamentStatusSelect({
  tournamentId,
  currentStatus,
}: TournamentStatusSelectProps) {
  const router = useRouter();
  const toast = useToast();
  const [status, setStatus] = React.useState<TournamentStatus>(currentStatus);
  const [loading, setLoading] = React.useState(false);

  const handleChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const previous = status;
    const newStatus = e.target.value as TournamentStatus;
    setStatus(newStatus);
    setLoading(true);

    const res = await updateTournamentStatusAction(tournamentId, newStatus);
    setLoading(false);
    if (res?.error) {
      setStatus(previous);
      toast.error(res.error);
      return;
    }

    toast.success(
      `Status do torneio alterado para "${TOURNAMENT_STATUS_LABELS[newStatus]}".`
    );
    router.refresh();
  };

  return (
    <div className="flex items-center gap-1.5">
      {loading && <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />}
      <select
        value={status}
        onChange={handleChange}
        disabled={loading}
        className="h-7 text-[11px] font-semibold rounded border border-border/80 bg-background px-2 py-0.5 shadow-sm focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer"
      >
        <option value="draft">Rascunho</option>
        <option value="open">Inscrições Abertas</option>
        <option value="ongoing">Em Andamento</option>
        <option value="finished">Encerrado</option>
      </select>
    </div>
  );
}
