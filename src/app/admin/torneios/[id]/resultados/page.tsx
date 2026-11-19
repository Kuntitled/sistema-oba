import { notFound } from "next/navigation";
import Link from "next/link";
import { ChevronLeft, Trophy, Calendar } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getBladers } from "@/lib/services/league";
import { TournamentResultsEditor } from "@/components/admin/TournamentResultsEditor";
import type { Tournament } from "@/types/domain";


export default async function AdminResultadosPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  // Busca o torneio
  const { data: tournament, error: tourError } = await supabase
    .from("tournaments")
    .select("*")
    .eq("id", id)
    .single();

  if (tourError || !tournament) {
    notFound();
  }

  // Busca os bladers para o select
  const bladers = await getBladers();

  // Busca resultados já lançados (se houver)
  const { data: existingResults } = await supabase
    .from("tournament_results")
    .select("blader_id, final_position, points_earned")
    .eq("tournament_id", id)
    .order("final_position", { ascending: true });

  return (
    <div className="space-y-6">
      {/* Voltar */}
      <Link
        href="/admin/torneios"
        className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground font-semibold transition-colors"
      >
        <ChevronLeft className="h-4 w-4" />
        Voltar para a lista de torneios
      </Link>

      {/* Header */}
      <div>
        <div className="flex items-center gap-2">
          <Trophy className="h-6 w-6 text-amber-500" />
          <h1 className="text-2xl font-black text-foreground tracking-tight">
            Lançamento de Resultados
          </h1>
        </div>
        <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
          Torneio: <span className="font-bold text-foreground">{tournament.name}</span> • Data: {tournament.event_date}
        </p>
      </div>

      {/* Editor */}
      <TournamentResultsEditor
        tournament={tournament as Tournament}
        bladers={bladers}
        existingResults={existingResults ?? []}
      />
    </div>
  );
}
