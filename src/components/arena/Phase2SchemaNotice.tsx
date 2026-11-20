import Link from "next/link";
import { AlertTriangle, ChevronLeft, Database } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export function Phase2SchemaNotice({ backHref = "/admin" }: { backHref?: string }) {
  return (
    <Card className="border-amber-500/40 bg-amber-500/10">
      <CardContent className="p-6 space-y-4">
        <div className="flex items-start gap-3">
          <div className="h-10 w-10 rounded-full bg-amber-500/20 text-amber-500 flex items-center justify-center shrink-0">
            <AlertTriangle className="h-5 w-5" />
          </div>
          <div className="space-y-1.5">
            <h2 className="text-base font-black text-foreground flex items-center gap-2">
              <Database className="h-4 w-4 text-amber-500" />
              Banco de Dados da Fase 2 ainda não aplicado
            </h2>
            <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
              As tabelas e colunas da Fase 2 (<code className="px-1.5 py-0.5 rounded bg-muted font-mono text-[11px]">arenas</code>,{" "}
              <code className="px-1.5 py-0.5 rounded bg-muted font-mono text-[11px]">matches</code>,{" "}
              <code className="px-1.5 py-0.5 rounded bg-muted font-mono text-[11px]">match_games</code>,{" "}
              <code className="px-1.5 py-0.5 rounded bg-muted font-mono text-[11px]">seasons</code> e{" "}
              <code className="px-1.5 py-0.5 rounded bg-muted font-mono text-[11px]">tournament_participants</code>)
              ainda não estão aplicadas neste projeto Supabase.
            </p>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Execute em ordem no <strong>SQL Editor</strong> do Supabase os arquivos{" "}
              <code className="px-1.5 py-0.5 rounded bg-muted font-mono text-[11px] text-foreground">
                supabase/migrations/003_phase2_live_tournaments.sql
              </code>{" "}
              e{" "}
              <code className="px-1.5 py-0.5 rounded bg-muted font-mono text-[11px] text-foreground">
                supabase/migrations/004_oba_official_rules_and_engine.sql
              </code>{" "}
              e recarregue esta página.
            </p>
          </div>
        </div>

        <div>
          <Link href={backHref}>
            <Button variant="outline" size="sm" className="text-xs gap-1.5">
              <ChevronLeft className="h-3.5 w-3.5" />
              Voltar
            </Button>
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}
