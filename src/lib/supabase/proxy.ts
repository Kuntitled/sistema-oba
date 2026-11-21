import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import {
  getRequestIsHttps,
  getRequestOrigin,
} from "@/lib/supabase/route-cookies";
import {
  canRoleAccessPath,
  getDefaultHomeForRole,
  normalizeUserRole,
} from "@/lib/auth-roles";

/**
 * Atualiza a sessão do Supabase em cada request.
 * Deve ser chamado no middleware.ts principal do Next.js.
 */
export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });
  const isHttps = getRequestIsHttps(request);

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, {
              ...options,
              path: options?.path ?? "/",
              sameSite: options?.sameSite ?? "lax",
              secure: isHttps,
            })
          );
        },
      },
    }
  );

  // IMPORTANTE: Não escreva lógica entre createServerClient e getUser().
  // Um bug sutil pode tornar usuários deslogados aleatoriamente.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const pathname = request.nextUrl.pathname;
  const origin = getRequestOrigin(request);

  // Protege /meu-painel — exige autenticação (qualquer Blader ou Admin)
  if (!user && pathname.startsWith("/meu-painel")) {
    const url = new URL("/auth/login", origin);
    url.searchParams.set("next", "/meu-painel");
    return NextResponse.redirect(url);
  }

  // Protege todas as rotas /admin — redireciona para login se não autenticado
  if (!user && pathname.startsWith("/admin")) {
    const url = new URL("/auth/login", origin);
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  // Verifica papel (admin ou judge apenas em arenas) para acesso às rotas /admin
  if (user && pathname.startsWith("/admin")) {
    const role = normalizeUserRole(user.user_metadata?.role);
    if (!canRoleAccessPath(role, pathname)) {
      return NextResponse.redirect(
        new URL(getDefaultHomeForRole(role), origin)
      );
    }
  }

  return supabaseResponse;
}
