import { notFound } from "next/navigation";
import { AlertTriangle, Database } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { getAdminTournamentRegistrations } from "@/lib/services/registrations";
import { TournamentRegistrationsClient } from "@/components/admin/TournamentRegistrationsClient";

export default async function AdminTournamentRegistrationsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const {
    tournament,
    registrations,
    participantsCount,
    bannedParts,
    schemaMissing,
  } = await getAdminTournamentRegistrations(id);

  if (schemaMissing) {
    return (
      <Card className="border-amber-500/40 bg-amber-500/10">
        <CardContent className="p-6 flex items-start gap-3 text-xs">
          <AlertTriangle className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <div className="font-bold text-sm text-foreground flex items-center gap-1.5">
              <Database className="h-4 w-4 text-amber-500" />
              Estrutura de inscrições aguardando migration no Supabase
            </div>
            <p className="text-muted-foreground">
              Aplique as migrations{" "}
              <code>005_phase3_ecosystem_schema.sql</code> e{" "}
              <code>009_phase3b_registrations_and_receipts.sql</code> no Supabase SQL Editor para gerenciar inscrições e comprovantes.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!tournament) {
    notFound();
  }

  return (
    <TournamentRegistrationsClient
      tournament={tournament}
      initialRegistrations={registrations}
      participantsCount={participantsCount}
      bannedParts={bannedParts}
    />
  );
}
