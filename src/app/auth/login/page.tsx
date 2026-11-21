import { LoginFormClient } from "@/components/auth/LoginFormClient";

function getSafeNextPath(rawNext: string | undefined): string | null {
  if (!rawNext || !rawNext.startsWith("/") || rawNext.startsWith("//")) {
    return null;
  }
  return rawNext;
}

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; error?: string }>;
}) {
  const { next, error } = await searchParams;
  const safeNext = getSafeNextPath(next);
  const initialError =
    error === "oauth_error"
      ? "Não foi possível concluir o login com Google. Tente novamente."
      : null;

  return <LoginFormClient nextPath={safeNext} initialError={initialError} />;
}
