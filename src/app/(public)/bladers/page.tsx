import Link from "next/link";
import { Users, ShieldCheck } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { getBladers } from "@/lib/services/league";
import { BladersGridClient } from "@/components/blader/BladersGridClient";

export default async function BladersPage() {
  const bladers = await getBladers();

  return (
    <div className="container mx-auto px-4 sm:px-6 py-10 max-w-5xl space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Users className="h-6 w-6 text-primary" />
            <h1 className="text-2xl sm:text-3xl font-black text-foreground tracking-tight">
              Bladers da Liga OBA
            </h1>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            Jogadores registrados na comunidade amazonense de Beyblade X. Clique em um Blader para ver seu Card.
          </p>
        </div>

        <Link href="/admin/bladers">
          <Button
            variant="outline"
            size="sm"
            className="border-border/80 text-xs font-semibold gap-1.5"
          >
            <ShieldCheck className="h-3.5 w-3.5 text-primary" />
            + Cadastrar Blader (Admin)
          </Button>
        </Link>
      </div>

      {/* Grid de Bladers */}
      {bladers.length === 0 ? (
        <Card className="border-dashed border-border/80 bg-card/40 p-12 text-center">
          <div className="flex flex-col items-center justify-center gap-3">
            <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center text-muted-foreground">
              <Users className="h-6 w-6" />
            </div>
            <h3 className="font-bold text-lg text-foreground">
              Nenhum Blader cadastrado
            </h3>
            <p className="text-sm text-muted-foreground max-w-md">
              Cadastre os jogadores da liga para que eles possam pontuar nos torneios e aparecer no ranking oficial.
            </p>
            <Link href="/admin/bladers" className="mt-2">
              <Button className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold text-xs">
                Cadastrar Primeiro Blader
              </Button>
            </Link>
          </div>
        </Card>
      ) : (
        <BladersGridClient bladers={bladers} />
      )}
    </div>
  );
}
