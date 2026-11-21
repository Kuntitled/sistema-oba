"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isValidUuid } from "@/lib/services/arena-queries";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

async function requireAdminWithServiceRole() {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user || user.user_metadata?.role !== "admin") {
    return {
      user: null,
      adminClient: null,
      error: "Acesso negado. Faça login como administrador.",
    } as const;
  }

  const adminClient = createAdminClient();
  if (!adminClient) {
    return {
      user,
      adminClient: null,
      error:
        "SUPABASE_SERVICE_ROLE_KEY não configurada no servidor. Cadastre a chave nas variáveis de ambiente para gerenciar administradores.",
    } as const;
  }

  return { user, adminClient, error: null } as const;
}

async function countActiveAdmins(
  adminClient: NonNullable<ReturnType<typeof createAdminClient>>
): Promise<number> {
  let count = 0;
  const perPage = 200;

  for (let page = 1; page <= 5; page += 1) {
    const { data, error } = await adminClient.auth.admin.listUsers({
      page,
      perPage,
    });
    if (error) break;
    const users = data?.users ?? [];
    for (const u of users) {
      if (u.user_metadata?.role === "admin") {
        count += 1;
      }
    }
    if (users.length < perPage) break;
  }

  return count;
}

async function resolveActionOrigin(): Promise<string> {
  const h = await headers();
  const forwardedProto = h.get("x-forwarded-proto")?.split(",")[0]?.trim();
  const forwardedHost = h.get("x-forwarded-host")?.split(",")[0]?.trim();
  const host = forwardedHost || h.get("host")?.trim();

  if (host) {
    const safeHost = host.startsWith("0.0.0.0")
      ? host.replace(/^0\.0\.0\.0/, "localhost")
      : host;
    const proto =
      forwardedProto || (safeHost.startsWith("localhost") ? "http" : "https");
    return `${proto}://${safeHost}`;
  }

  return process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
}

/**
 * Promove ou remove a permissão de administrador (user_metadata.role = "admin" | "blader").
 */
export async function setUserAdminRoleAction(
  targetUserId: string,
  makeAdmin: boolean
) {
  const auth = await requireAdminWithServiceRole();
  if (auth.error || !auth.user || !auth.adminClient) {
    return { error: auth.error ?? "Acesso negado." };
  }

  if (!isValidUuid(targetUserId)) {
    return { error: "ID de usuário inválido." };
  }

  if (!makeAdmin && targetUserId === auth.user.id) {
    return {
      error: "Você não pode remover a própria permissão de administrador.",
    };
  }

  const { data: userRes, error: fetchError } =
    await auth.adminClient.auth.admin.getUserById(targetUserId);

  if (fetchError || !userRes?.user) {
    return {
      error: fetchError?.message ?? "Usuário não encontrado no Supabase Auth.",
    };
  }

  const targetUser = userRes.user;
  const currentlyAdmin = targetUser.user_metadata?.role === "admin";

  if (!makeAdmin && currentlyAdmin) {
    const adminCount = await countActiveAdmins(auth.adminClient);
    if (adminCount <= 1) {
      return {
        error: "Deve existir pelo menos 1 administrador ativo no sistema.",
      };
    }
  }

  const nextMetadata = {
    ...(targetUser.user_metadata ?? {}),
    role: makeAdmin ? "admin" : "blader",
  };

  const { error: updateError } =
    await auth.adminClient.auth.admin.updateUserById(targetUserId, {
      user_metadata: nextMetadata,
    });

  if (updateError) {
    return {
      error: `Erro ao atualizar papel do usuário: ${updateError.message}`,
    };
  }

  revalidatePath("/admin/configuracoes");
  revalidatePath("/admin");
  return { success: true };
}

/**
 * Envia convite por e-mail já atribuindo user_metadata.role = "admin".
 */
export async function inviteAdminUserAction(formData: FormData) {
  const auth = await requireAdminWithServiceRole();
  if (auth.error || !auth.adminClient) {
    return { error: auth.error ?? "Acesso negado." };
  }

  const rawEmail = (formData.get("email") as string)?.trim().toLowerCase() ?? "";
  if (!rawEmail || !EMAIL_REGEX.test(rawEmail)) {
    return { error: "Informe um e-mail válido para enviar o convite." };
  }

  const origin = await resolveActionOrigin();
  const redirectTo = `${origin}/auth/callback?next=/auth/definir-senha`;

  const { error: inviteError } =
    await auth.adminClient.auth.admin.inviteUserByEmail(rawEmail, {
      data: { role: "admin" },
      redirectTo,
    });

  if (inviteError) {
    const msg = inviteError.message.toLowerCase();
    if (msg.includes("already been registered") || msg.includes("already exists")) {
      return {
        error:
          "Este e-mail já possui uma conta cadastrada. Use a busca na lista abaixo e clique em \"Tornar Admin\".",
      };
    }
    return { error: `Erro ao enviar convite: ${inviteError.message}` };
  }

  revalidatePath("/admin/configuracoes");
  return {
    success: true,
    message: `Convite enviado para ${rawEmail}. Ao aceitar e definir senha, a conta já entrará como Admin.`,
  };
}
