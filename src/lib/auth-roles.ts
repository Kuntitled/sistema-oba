export type ManagedUserRole = "admin" | "judge" | "blader";

export const MANAGED_ROLE_LABELS: Record<ManagedUserRole, string> = {
  admin: "Administrador",
  judge: "Juiz",
  blader: "Blader",
} as const;

export function normalizeUserRole(raw: unknown): ManagedUserRole {
  if (raw === "admin" || raw === "judge") {
    return raw;
  }
  return "blader";
}

export function isJudgeAllowedAdminPath(pathname: string): boolean {
  return (
    pathname === "/admin/arenas" ||
    pathname.startsWith("/admin/arenas/") ||
    pathname.startsWith("/admin/arena/")
  );
}

export function canRoleAccessPath(
  role: ManagedUserRole,
  pathname: string
): boolean {
  if (!pathname.startsWith("/admin")) {
    return true;
  }
  if (role === "admin") {
    return true;
  }
  if (role === "judge") {
    return isJudgeAllowedAdminPath(pathname);
  }
  return false;
}

export function getDefaultHomeForRole(role: ManagedUserRole): string {
  switch (role) {
    case "admin":
      return "/admin";
    case "judge":
      return "/admin/arenas";
    default:
      return "/meu-painel";
  }
}

export function resolvePostLoginRedirect(
  role: ManagedUserRole,
  nextPath: string | null | undefined
): string {
  if (
    nextPath &&
    nextPath.startsWith("/") &&
    !nextPath.startsWith("//")
  ) {
    return canRoleAccessPath(role, nextPath)
      ? nextPath
      : getDefaultHomeForRole(role);
  }

  return getDefaultHomeForRole(role);
}
