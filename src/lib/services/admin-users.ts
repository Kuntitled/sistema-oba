import type { User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { normalizeUserRole, type ManagedUserRole } from "@/lib/auth-roles";

export interface AdminManagedUser {
  id: string;
  email: string;
  fullName: string | null;
  avatarUrl: string | null;
  role: ManagedUserRole;
  isAdmin: boolean;
  isJudge: boolean;
  providers: string[];
  emailConfirmed: boolean;
  invitedAt: string | null;
  lastSignInAt: string | null;
  createdAt: string;
  blader: {
    id: string;
    nickname: string;
    name: string;
  } | null;
}

function extractProviders(user: User): string[] {
  const appMeta = (user.app_metadata ?? {}) as Record<string, unknown>;
  if (Array.isArray(appMeta.providers)) {
    const valid = appMeta.providers.filter(
      (p): p is string => typeof p === "string" && p.trim().length > 0
    );
    if (valid.length > 0) return valid;
  }
  if (typeof appMeta.provider === "string" && appMeta.provider.trim()) {
    return [appMeta.provider.trim()];
  }
  return [];
}

export async function getAdminManagedUsers(): Promise<{
  users: AdminManagedUser[];
  currentUserId: string;
  serviceRoleMissing: boolean;
  error: string | null;
}> {
  const supabase = await createClient();
  const {
    data: { user: currentUser },
    error: authError,
  } = await supabase.auth.getUser();

  if (
    authError ||
    !currentUser ||
    currentUser.user_metadata?.role !== "admin"
  ) {
    return {
      users: [],
      currentUserId: currentUser?.id ?? "",
      serviceRoleMissing: false,
      error: "Acesso negado.",
    };
  }

  const adminClient = createAdminClient();
  if (!adminClient) {
    return {
      users: [],
      currentUserId: currentUser.id,
      serviceRoleMissing: true,
      error: null,
    };
  }

  try {
    const authUsers: User[] = [];
    const perPage = 200;
    const maxPages = 5;

    for (let page = 1; page <= maxPages; page += 1) {
      const { data, error } = await adminClient.auth.admin.listUsers({
        page,
        perPage,
      });

      if (error) {
        return {
          users: [],
          currentUserId: currentUser.id,
          serviceRoleMissing: false,
          error: `Erro ao listar usuários do Supabase Auth: ${error.message}`,
        };
      }

      const batch = data?.users ?? [];
      authUsers.push(...batch);
      if (batch.length < perPage) break;
    }

    const { data: bladerRows } = await adminClient
      .from("bladers")
      .select("id, user_id, nickname, name")
      .not("user_id", "is", null);

    const bladerByUserId = new Map<
      string,
      { id: string; nickname: string; name: string }
    >();
    for (const row of bladerRows ?? []) {
      if (row.user_id) {
        bladerByUserId.set(row.user_id, {
          id: row.id,
          nickname: row.nickname,
          name: row.name,
        });
      }
    }

    const mapped: AdminManagedUser[] = authUsers.map((u) => {
      const meta = (u.user_metadata ?? {}) as Record<string, unknown>;
      const fullName =
        (typeof meta.full_name === "string" && meta.full_name.trim()) ||
        (typeof meta.name === "string" && meta.name.trim()) ||
        null;
      const avatarUrl =
        (typeof meta.avatar_url === "string" && meta.avatar_url.trim()) ||
        (typeof meta.picture === "string" && meta.picture.trim()) ||
        null;
      const role = normalizeUserRole(meta.role);
      const isAdmin = role === "admin";
      const isJudge = role === "judge";
      const userWithLegacyConfirmed = u as User & { confirmed_at?: string };

      return {
        id: u.id,
        email: u.email ?? "(sem e-mail)",
        fullName,
        avatarUrl,
        role,
        isAdmin,
        isJudge,
        providers: extractProviders(u),
        emailConfirmed: Boolean(
          u.email_confirmed_at || userWithLegacyConfirmed.confirmed_at
        ),
        invitedAt: u.invited_at ?? null,
        lastSignInAt: u.last_sign_in_at ?? null,
        createdAt: u.created_at,
        blader: bladerByUserId.get(u.id) ?? null,
      };
    });

    const rolePriority: Record<ManagedUserRole, number> = {
      admin: 0,
      judge: 1,
      blader: 2,
    };

    mapped.sort((a, b) => {
      const diff = rolePriority[a.role] - rolePriority[b.role];
      if (diff !== 0) return diff;
      return b.createdAt.localeCompare(a.createdAt);
    });

    return {
      users: mapped,
      currentUserId: currentUser.id,
      serviceRoleMissing: false,
      error: null,
    };
  } catch (err) {
    return {
      users: [],
      currentUserId: currentUser.id,
      serviceRoleMissing: false,
      error:
        err instanceof Error
          ? err.message
          : "Erro inesperado ao carregar usuários.",
    };
  }
}
