import { Users, MapPin, Link2, Unlink } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { getBladers } from "@/lib/services/league";
import { getPendingBladerClaimRequests } from "@/lib/services/parts";
import { BladerAvatar } from "@/components/shared/BladerAvatar";
import { BladerForm } from "@/components/admin/BladerForm";
import { BladerClaimsBanner } from "@/components/admin/BladerClaimsBanner";
import { EditBladerButton } from "@/components/admin/EditBladerButton";
import { DeleteBladerButton } from "@/components/admin/DeleteBladerButton";

export default async function AdminBladersPage() {
  const [bladers, { claims }] = await Promise.all([
    getBladers({ includeInactive: true }),
    getPendingBladerClaimRequests(),
  ]);

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
            Cadastre competidores, aprove vínculos de contas Google e gerencie perfis ativos da liga.
          </p>
        </div>

        <BladerForm />
      </div>

      {/* Solicitações de Vínculo Pendentes */}
      <BladerClaimsBanner claims={claims} />

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
            <Card
              key={blader.id}
              className={`border-border/60 bg-card/60 p-4 space-y-3 ${
                !blader.is_active ? "opacity-65" : ""
              }`}
            >
              <div className="flex items-center gap-3">
                <BladerAvatar
                  avatarUrl={blader.avatar_url}
                  nickname={blader.nickname}
                  sizeClass="h-11 w-11"
                  textClass="font-bold text-xs text-primary"
                  borderClass="border border-primary/40"
                />

                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5 min-w-0 flex-wrap">
                    <span className="font-bold text-sm text-foreground truncate">
                      {blader.nickname}
                    </span>
                    {!blader.is_active && (
                      <Badge
                        variant="outline"
                        className="text-[9px] px-1.5 py-0 border-destructive/40 text-destructive shrink-0"
                      >
                        Inativo
                      </Badge>
                    )}
                    {blader.user_id ? (
                      <Badge
                        variant="outline"
                        className="text-[9px] px-1.5 py-0 border-emerald-500/40 text-emerald-500 bg-emerald-500/10 gap-0.5 shrink-0"
                        title={`Vinculado à conta ${blader.user_id}`}
                      >
                        <Link2 className="h-2.5 w-2.5" />
                        Vinculado
                      </Badge>
                    ) : (
                      <Badge
                        variant="outline"
                        className="text-[9px] px-1.5 py-0 border-border/60 text-muted-foreground gap-0.5 shrink-0"
                      >
                        <Unlink className="h-2.5 w-2.5" />
                        Sem conta
                      </Badge>
                    )}
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
                <div className="flex items-center gap-1">
                  <span className="font-bold text-primary text-[11px] mr-1">
                    {blader.ranking?.total_points ?? 0} pts
                  </span>
                  <EditBladerButton blader={blader} />
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
