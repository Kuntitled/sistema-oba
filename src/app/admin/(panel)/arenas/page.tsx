import { Radio } from "lucide-react";
import { getArenasOverview } from "@/lib/services/arenas";
import { getBladers, getTournaments } from "@/lib/services/league";
import { ArenaManagerClient } from "@/components/admin/ArenaManagerClient";
import { Phase2SchemaNotice } from "@/components/arena/Phase2SchemaNotice";

export default async function AdminArenasPage() {
  const [{ arenas, schemaMissing }, tournaments, bladers] = await Promise.all([
    getArenasOverview(),
    getTournaments(),
    getBladers(),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black text-foreground tracking-tight flex items-center gap-2">
          <Radio className="h-6 w-6 text-emerald-500" />
          Gestão de Arenas ao Vivo
        </h1>
        <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
          Gerencie os Beystadiums físicos do torneio, atribua partidas e abra o placar touch dos juízes em tempo real.
        </p>
      </div>

      {schemaMissing ? (
        <Phase2SchemaNotice backHref="/admin" />
      ) : (
        <ArenaManagerClient
          initialArenas={arenas}
          tournaments={tournaments}
          bladers={bladers}
        />
      )}
    </div>
  );
}
