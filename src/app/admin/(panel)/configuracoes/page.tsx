import { AlertTriangle, Database, Settings } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { getLeagueSettings } from "@/lib/services/registrations";
import { LeagueSettingsClient } from "@/components/admin/LeagueSettingsClient";

export default async function AdminConfiguracoesPage() {
  const { settings, schemaMissing } = await getLeagueSettings();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black text-foreground tracking-tight flex items-center gap-2">
          <Settings className="h-6 w-6 text-primary" />
          Configurações da Liga (PIX Global)
        </h1>
        <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
          Defina a chave PIX oficial da Organização de Beyblade do Amazonas (OBA) utilizada nas inscrições online dos torneios pagos.
        </p>
      </div>

      {schemaMissing ? (
        <Card className="border-amber-500/40 bg-amber-500/10">
          <CardContent className="p-5 flex items-start gap-3 text-xs">
            <AlertTriangle className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <div className="font-bold text-foreground flex items-center gap-1.5">
                <Database className="h-4 w-4 text-amber-500" />
                Tabela league_settings ausente no Supabase
              </div>
              <p className="text-muted-foreground">
                Aplique a migration{" "}
                <code>supabase/migrations/005_phase3_ecosystem_schema.sql</code>{" "}
                no Supabase SQL Editor para habilitar as configurações da liga.
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <LeagueSettingsClient initialSettings={settings} />
      )}
    </div>
  );
}
