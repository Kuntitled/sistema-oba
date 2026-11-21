import { AlertTriangle, Database, ShieldBan } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { getPartsCatalog, getRulesetsWithBans } from "@/lib/services/parts";
import { RulesetsManagerClient } from "@/components/admin/RulesetsManagerClient";

export default async function AdminFormatosPage() {
  const [{ rulesets, schemaMissing }, { parts }] = await Promise.all([
    getRulesetsWithBans(),
    getPartsCatalog({ includeInactive: false }),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black text-foreground tracking-tight flex items-center gap-2">
          <ShieldBan className="h-6 w-6 text-fire-orange" />
          Formatos &amp; Ban-lists
        </h1>
        <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
          Crie múltiplos formatos competitivos da OBA e controle a ban-list independente de cada um para vincular aos torneios.
        </p>
      </div>

      {schemaMissing ? (
        <Card className="border-amber-500/40 bg-amber-500/10">
          <CardContent className="p-5 flex items-start gap-3 text-xs">
            <AlertTriangle className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <div className="font-bold text-foreground flex items-center gap-1.5">
                <Database className="h-4 w-4 text-amber-500" />
                Migration 005 pendente no Supabase
              </div>
              <p className="text-muted-foreground">
                Execute <code>supabase/migrations/005_phase3_ecosystem_schema.sql</code> e{" "}
                <code>supabase/migrations/006_seed_parts_catalog.sql</code> no Supabase SQL Editor para gerenciar formatos e ban-lists.
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <RulesetsManagerClient initialRulesets={rulesets} parts={parts} />
      )}
    </div>
  );
}
