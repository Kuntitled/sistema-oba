import Image from "next/image";
import { Users, MapPin, Trophy, Swords, ShieldCheck } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { getBladers } from "@/lib/services/league";
import { BladerForm } from "@/components/admin/BladerForm";
import { DeleteBladerButton } from "@/components/admin/DeleteBladerButton";


export default async function AdminBladersPage() {
  const bladers = await getBladers();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-foreground tracking-tight flex items-center gap-2">
            <Users className="h-6 w-6 text-fire-orange" />
            Gestão de Bladers
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
            Cadastre os competidores que participam das etapas e acumulam pontos no ranking.
          </p>
        </div>

        <BladerForm />
      </div>

      {/* Lista de Bladers */}
      {bladers.length === 0 ? (
        <Card className="border-dashed border-border/80 bg-card/40 p-12 text-center">
          <div className="flex flex-col items-center justify-center gap-3">
            <Users className="h-10 w-10 text-muted-foreground" />
            <h3 className="font-bold text-base text-foreground">
              Nenhum Blader registrado
            </h3>
            <p className="text-xs text-muted-foreground max-w-sm">
              Clique no botão acima para cadastrar o primeiro jogador da liga.
            </p>
          </div>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
          {bladers.map((blader) => (
            <Card key={blader.id} className="border-border/60 bg-card/60 p-4 space-y-3">
              <div className="flex items-center gap-3">
                <div className="relative h-11 w-11 rounded-full overflow-hidden border border-primary/40 bg-muted shrink-0">
                  {blader.avatar_url ? (
                    <Image
                      src={blader.avatar_url}
                      alt={blader.nickname}
                      fill
                      className="object-cover"
                    />
                  ) : (
                    <div className="h-full w-full flex items-center justify-center font-bold text-xs text-primary">
                      {blader.nickname?.slice(0, 2).toUpperCase()}
                    </div>
                  )}
                </div>

                <div className="min-w-0">
                  <div className="font-bold text-sm text-foreground truncate">
                    {blader.nickname}
                  </div>
                  <div className="text-xs text-muted-foreground truncate">
                    {blader.name}
                  </div>
                  {blader.city && (
                    <div className="text-[10px] text-muted-foreground flex items-center gap-0.5 mt-0.5">
                      <MapPin className="h-2.5 w-2.5 text-fire-orange" />
                      {blader.city}
                    </div>
                  )}
                </div>
              </div>

              {blader.bio && (
                <p className="text-[11px] text-muted-foreground/80 italic line-clamp-1">
                  &ldquo;{blader.bio}&rdquo;
                </p>
              )}

              <div className="pt-2 border-t border-border/40 flex items-center justify-between text-xs">
                <span className="text-muted-foreground text-[11px]">
                  {blader.ranking?.tournaments_played ?? 0} torneios
                </span>
                <div className="flex items-center gap-1.5">
                  <span className="font-bold text-primary text-[11px]">
                    {blader.ranking?.total_points ?? 0} pts
                  </span>
                  <DeleteBladerButton
                    bladerId={blader.id}
                    bladerNickname={blader.nickname}
                  />
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
