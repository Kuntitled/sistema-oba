import Image from "next/image";
import Link from "next/link";
import { Users, MapPin, Trophy, Swords, ShieldCheck, Flame } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getBladers } from "@/lib/services/league";


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
            Jogadores registrados na comunidade amazonense de Beyblade X.
          </p>
        </div>

        <Link href="/admin/bladers">
          <Button variant="outline" size="sm" className="border-border/80 text-xs font-semibold gap-1.5">
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
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          {bladers.map((blader) => {
            const ranking = blader.ranking;
            return (
              <Card
                key={blader.id}
                className="border-border/60 bg-card/60 hover:border-primary/40 hover:bg-card/90 transition-all duration-200 overflow-hidden flex flex-col justify-between"
              >
                <CardContent className="p-5 space-y-4">
                  <div className="flex items-center gap-3.5">
                    <div className="relative h-14 w-14 rounded-full overflow-hidden border-2 border-primary/30 bg-muted shrink-0 shadow-sm">
                      {blader.avatar_url ? (
                        <Image
                          src={blader.avatar_url}
                          alt={blader.nickname}
                          fill
                          className="object-cover"
                        />
                      ) : (
                        <div className="h-full w-full flex items-center justify-center font-black text-base text-primary bg-primary/10">
                          {blader.nickname?.slice(0, 2).toUpperCase()}
                        </div>
                      )}
                    </div>

                    <div className="min-w-0">
                      <h3 className="font-bold text-base text-foreground truncate">
                        {blader.nickname}
                      </h3>
                      <p className="text-xs text-muted-foreground truncate">
                        {blader.name}
                      </p>
                      {blader.city && (
                        <span className="flex items-center gap-1 text-[11px] text-muted-foreground mt-0.5">
                          <MapPin className="h-3 w-3 text-fire-orange" />
                          {blader.city}
                        </span>
                      )}
                    </div>
                  </div>

                  {blader.bio && (
                    <p className="text-xs text-muted-foreground/90 line-clamp-2 italic bg-muted/20 p-2 rounded-lg border border-border/30">
                      &ldquo;{blader.bio}&rdquo;
                    </p>
                  )}

                  <div className="pt-3 border-t border-border/40 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-1.5 text-muted-foreground">
                      <Swords className="h-3.5 w-3.5" />
                      <span>{ranking?.tournaments_played ?? 0} torneios</span>
                    </div>

                    <div className="flex items-center gap-1 font-black text-primary bg-primary/10 px-2.5 py-1 rounded-md border border-primary/20">
                      <Trophy className="h-3.5 w-3.5 text-amber-500" />
                      <span>{ranking?.total_points ?? 0}</span>
                      <span className="text-[10px] font-semibold text-muted-foreground">pts</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
