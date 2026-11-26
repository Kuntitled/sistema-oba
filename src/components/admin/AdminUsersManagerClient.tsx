"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  ShieldCheck,
  Radio,
  User,
  UserPlus,
  Search,
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  Loader2,
  Mail,
  Users,
  KeyRound,
  Info,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { BladerAvatar } from "@/components/shared/BladerAvatar";
import { useToast } from "@/components/ui/toast-provider";
import {
  inviteAdminUserAction,
  setUserRoleAction,
} from "@/app/admin/users-actions";
import {
  MANAGED_ROLE_LABELS,
  type ManagedUserRole,
} from "@/lib/auth-roles";
import type { AdminManagedUser } from "@/lib/services/admin-users";

interface AdminUsersManagerClientProps {
  users: AdminManagedUser[];
  currentUserId: string;
  serviceRoleMissing: boolean;
  loadError: string | null;
}

const ROLE_OPTIONS: Array<{ value: ManagedUserRole; shortLabel: string }> = [
  { value: "blader", shortLabel: "Blader" },
  { value: "judge", shortLabel: "Juiz" },
  { value: "admin", shortLabel: "Admin" },
];

export function AdminUsersManagerClient({
  users,
  currentUserId,
  serviceRoleMissing,
  loadError,
}: AdminUsersManagerClientProps) {
  const router = useRouter();
  const toast = useToast();
  const [roleFilter, setRoleFilter] = React.useState<"all" | ManagedUserRole>(
    "all"
  );
  const [search, setSearch] = React.useState("");

  const [inviteEmail, setInviteEmail] = React.useState("");
  const [inviteRole, setInviteRole] = React.useState<"admin" | "judge">(
    "judge"
  );
  const [inviting, setInviting] = React.useState(false);

  const [busyUserId, setBusyUserId] = React.useState<string | null>(null);
  const [errorMsg, setErrorMsg] = React.useState<string | null>(loadError);
  const [successMsg, setSuccessMsg] = React.useState<string | null>(null);

  const adminCount = users.filter((u) => u.role === "admin").length;
  const judgeCount = users.filter((u) => u.role === "judge").length;
  const bladerCount = users.filter((u) => u.role === "blader").length;

  const filteredUsers = React.useMemo(() => {
    const q = search.trim().toLowerCase();
    return users.filter((u) => {
      if (roleFilter !== "all" && u.role !== roleFilter) return false;
      if (!q) return true;
      return (
        u.email.toLowerCase().includes(q) ||
        (u.fullName?.toLowerCase().includes(q) ?? false) ||
        (u.blader?.nickname.toLowerCase().includes(q) ?? false) ||
        (u.blader?.name.toLowerCase().includes(q) ?? false)
      );
    });
  }, [users, roleFilter, search]);

  const handleSetRole = async (
    targetUser: AdminManagedUser,
    nextRole: ManagedUserRole
  ) => {
    if (targetUser.role === nextRole) return;
    setBusyUserId(targetUser.id);
    setErrorMsg(null);
    setSuccessMsg(null);

    const res = await setUserRoleAction(targetUser.id, nextRole);
    setBusyUserId(null);

    if (res.error) {
      setErrorMsg(res.error);
      toast.error(res.error);
      return;
    }

    const msg = `${targetUser.email} atualizado para ${MANAGED_ROLE_LABELS[nextRole]}. Caso já esteja logado, peça para sair e entrar novamente para atualizar a sessão.`;
    setSuccessMsg(msg);
    toast.success(msg);
    router.refresh();
  };

  const handleInviteSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setInviting(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    const fd = new FormData();
    fd.set("email", inviteEmail.trim());
    fd.set("role", inviteRole);

    const res = await inviteAdminUserAction(fd);
    setInviting(false);

    if (res.error) {
      setErrorMsg(res.error);
      toast.error(res.error);
      return;
    }

    setInviteEmail("");
    const msg = res.message ?? "Convite enviado!";
    setSuccessMsg(msg);
    toast.success(msg);
    router.refresh();
  };

  const formatDate = (iso: string | null) => {
    if (!iso) return "Nunca";
    try {
      return new Intl.DateTimeFormat("pt-BR", {
        day: "2-digit",
        month: "2-digit",
        year: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
      }).format(new Date(iso));
    } catch {
      return iso;
    }
  };

  const formatProviderLabel = (provider: string) => {
    if (provider === "google") return "Google";
    if (provider === "email") return "E-mail";
    return provider;
  };

  if (serviceRoleMissing) {
    return (
      <section id="admins">
        <Card className="border-amber-500/40 bg-amber-500/10">
          <CardContent className="p-5 flex items-start gap-3 text-xs">
            <KeyRound className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
            <div className="space-y-1.5">
              <div className="font-black text-sm text-foreground">
                Configuração necessária: <code>SUPABASE_SERVICE_ROLE_KEY</code>
              </div>
              <p className="text-muted-foreground leading-relaxed">
                Para listar contas do Supabase Auth (incluindo usuários criados manualmente) e gerenciar papéis de Administrador/Juiz pela interface, adicione a variável{" "}
                <code>SUPABASE_SERVICE_ROLE_KEY</code> no arquivo{" "}
                <code>.env.local</code> e nas <strong>Environment Variables</strong> da Vercel (e faça um novo deploy).
              </p>
            </div>
          </CardContent>
        </Card>
      </section>
    );
  }

  return (
    <section id="admins" className="space-y-4">
      <Card className="border-border/60 bg-card/60">
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <CardTitle className="text-base font-black text-foreground flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-primary" />
                Equipe, Juízes &amp; Usuários do Sistema
              </CardTitle>
              <CardDescription className="text-xs">
                Defina quem é <strong>Administrador</strong> (acesso completo),{" "}
                <strong>Juiz</strong> (acesso restrito às Arenas e Placar Touch) ou{" "}
                <strong>Blader</strong> (Painel Pessoal e Inscrições).
              </CardDescription>
            </div>

            <div className="flex flex-wrap items-center gap-1.5 shrink-0">
              <Badge variant="outline" className="text-[11px]">
                Total: <strong className="ml-1">{users.length}</strong>
              </Badge>
              <Badge className="bg-primary/20 text-primary border border-primary/40 text-[11px] font-bold">
                Admins: <strong className="ml-1">{adminCount}</strong>
              </Badge>
              <Badge className="bg-emerald-600/20 text-emerald-500 border border-emerald-500/40 text-[11px] font-bold">
                Juízes: <strong className="ml-1">{judgeCount}</strong>
              </Badge>
              <Badge variant="secondary" className="text-[11px]">
                Bladers: <strong className="ml-1">{bladerCount}</strong>
              </Badge>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-5">
          {errorMsg && (
            <div className="p-3 rounded-lg bg-destructive/15 border border-destructive/30 text-destructive text-xs flex items-center gap-2">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="p-3 rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-emerald-500 text-xs flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* Convite rápido de Admin ou Juiz */}
          <form
            onSubmit={handleInviteSubmit}
            className="rounded-xl border border-border/60 bg-background/40 p-4 flex flex-col md:flex-row md:items-end gap-3"
          >
            <div className="flex-1 space-y-1.5">
              <Label
                htmlFor="invite-admin-email"
                className="text-xs font-semibold flex items-center gap-1.5"
              >
                <UserPlus className="h-3.5 w-3.5 text-primary" />
                Convidar por e-mail
              </Label>
              <Input
                id="invite-admin-email"
                type="email"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                placeholder="juiz-ou-organizador@exemplo.com"
                required
                className="h-9 text-xs"
              />
            </div>

            <div className="w-full md:w-48 space-y-1.5">
              <Label htmlFor="invite-role" className="text-xs font-semibold">
                Papel inicial
              </Label>
              <select
                id="invite-role"
                value={inviteRole}
                onChange={(e) =>
                  setInviteRole(e.target.value as "admin" | "judge")
                }
                className="w-full h-9 rounded-md border border-input bg-background px-2.5 py-1 text-xs font-semibold shadow-sm focus:outline-none focus:ring-1 focus:ring-primary"
              >
                <option value="judge">Juiz (Arenas e Placar)</option>
                <option value="admin">Administrador (Total)</option>
              </select>
            </div>

            <Button
              type="submit"
              size="sm"
              disabled={inviting || !inviteEmail.trim()}
              className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-xs gap-1.5 shrink-0 h-9"
            >
              {inviting ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Mail className="h-3.5 w-3.5" />
              )}
              {inviting ? "Enviando..." : "Enviar Convite"}
            </Button>
          </form>

          {/* Nota JWT / RLS */}
          <div className="rounded-lg border border-border/50 bg-background/50 p-3 text-[11px] text-muted-foreground flex items-start gap-2">
            <Info className="h-4 w-4 text-primary shrink-0 mt-0.5" />
            <span>
              Juízes têm acesso apenas a <strong>Arenas ao Vivo</strong> e ao{" "}
              <strong>Placar Touch</strong>, sem acesso a PIX, Bladers, formatos ou criação/exclusão de torneios. Se o usuário já estiver logado quando você mudar o papel para{" "}
              <code>judge</code> ou <code>admin</code>, ele deve sair e entrar novamente para atualizar a sessão/JWT.
            </span>
          </div>

          {/* Filtros e Busca */}
          <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
            <div className="flex flex-wrap items-center gap-1.5">
              {(
                [
                  ["all", `Todos (${users.length})`],
                  ["admin", `Admins (${adminCount})`],
                  ["judge", `Juízes (${judgeCount})`],
                  ["blader", `Bladers (${bladerCount})`],
                ] as const
              ).map(([key, label]) => (
                <Button
                  key={key}
                  type="button"
                  size="xs"
                  variant={roleFilter === key ? "default" : "outline"}
                  onClick={() => setRoleFilter(key)}
                  className="font-bold"
                >
                  {label}
                </Button>
              ))}
            </div>

            <div className="relative w-full sm:w-72">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar por e-mail, nome ou Blader..."
                className="pl-8 h-8 text-xs"
              />
            </div>
          </div>

          {/* Lista de Usuários */}
          {filteredUsers.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border/70 bg-background/30 p-8 text-center text-xs text-muted-foreground flex flex-col items-center gap-2">
              <Users className="h-8 w-8" />
              <span>Nenhum usuário encontrado com esse filtro.</span>
            </div>
          ) : (
            <div className="space-y-2.5">
              {filteredUsers.map((user) => {
                const isSelf = user.id === currentUserId;
                const isBusy = busyUserId === user.id;
                const isLastAdmin = user.isAdmin && adminCount <= 1;
                const displayName =
                  user.blader?.nickname || user.fullName || user.email;

                return (
                  <div
                    key={user.id}
                    className={`rounded-xl border p-3.5 sm:p-4 flex flex-col md:flex-row md:items-center justify-between gap-3 ${
                      user.isAdmin
                        ? "border-primary/40 bg-primary/5"
                        : user.isJudge
                          ? "border-emerald-500/40 bg-emerald-500/5"
                          : "border-border/60 bg-background/40"
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <BladerAvatar
                        avatarUrl={user.avatarUrl}
                        nickname={displayName}
                        sizeClass="h-10 w-10"
                        textClass="text-xs font-black text-primary"
                      />

                      <div className="min-w-0 space-y-1">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className="font-bold text-sm text-foreground truncate">
                            {user.fullName || user.email}
                          </span>

                          {user.isAdmin ? (
                            <Badge className="bg-primary text-primary-foreground text-[10px] font-black gap-1">
                              <ShieldCheck className="h-3 w-3" />
                              Admin
                            </Badge>
                          ) : user.isJudge ? (
                            <Badge className="bg-emerald-600 text-white text-[10px] font-black gap-1">
                              <Radio className="h-3 w-3" />
                              Juiz
                            </Badge>
                          ) : (
                            <Badge
                              variant="outline"
                              className="text-[10px] text-muted-foreground gap-1"
                            >
                              <User className="h-3 w-3" />
                              Blader
                            </Badge>
                          )}

                          {isSelf && (
                            <Badge
                              variant="secondary"
                              className="text-[10px] font-bold"
                            >
                              Você
                            </Badge>
                          )}

                          {user.blader && (
                            <Badge
                              variant="outline"
                              className="text-[10px] border-fire-orange/40 text-fire-orange font-semibold"
                            >
                              Blader: {user.blader.nickname}
                            </Badge>
                          )}

                          {user.providers.map((prov) => (
                            <Badge
                              key={prov}
                              variant="outline"
                              className="text-[10px] border-border/70 text-muted-foreground"
                            >
                              {formatProviderLabel(prov)}
                            </Badge>
                          ))}

                          {!user.emailConfirmed && (
                            <Badge
                              variant="outline"
                              className="text-[10px] border-amber-500/40 text-amber-500 gap-0.5"
                            >
                              <AlertTriangle className="h-2.5 w-2.5" />
                              Pendente
                            </Badge>
                          )}
                        </div>

                        <div className="text-[11px] text-muted-foreground flex flex-wrap items-center gap-2">
                          <span className="font-mono">{user.email}</span>
                          <span>•</span>
                          <span>Último acesso: {formatDate(user.lastSignInAt)}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-end gap-1.5 shrink-0">
                      {isSelf ? (
                        <span className="text-[11px] text-muted-foreground font-medium px-2">
                          Sessão atual
                        </span>
                      ) : (
                        <div className="inline-flex items-center rounded-lg border border-border/70 bg-background/70 p-0.5 gap-0.5">
                          {ROLE_OPTIONS.map((opt) => {
                            const active = user.role === opt.value;
                            const blockedDemotion =
                              isLastAdmin && opt.value !== "admin";

                            return (
                              <Button
                                key={opt.value}
                                type="button"
                                size="xs"
                                variant={active ? "default" : "ghost"}
                                disabled={
                                  isBusy ||
                                  busyUserId !== null ||
                                  blockedDemotion
                                }
                                onClick={() => handleSetRole(user, opt.value)}
                                title={
                                  blockedDemotion
                                    ? "Mantenha pelo menos 1 administrador ativo"
                                    : `Definir papel como ${MANAGED_ROLE_LABELS[opt.value]}`
                                }
                                className={`h-7 px-2.5 text-[11px] font-bold ${
                                  active && opt.value === "judge"
                                    ? "bg-emerald-600 hover:bg-emerald-600 text-white"
                                    : active && opt.value === "admin"
                                      ? "bg-primary hover:bg-primary text-primary-foreground"
                                      : active
                                        ? "bg-muted text-foreground hover:bg-muted"
                                        : "text-muted-foreground hover:text-foreground"
                                }`}
                              >
                                {isBusy && active ? (
                                  <Loader2 className="h-3 w-3 animate-spin mr-1" />
                                ) : null}
                                {opt.shortLabel}
                              </Button>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </section>
  );
}
