import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { getRequestIsHttps } from "@/lib/supabase/route-cookies";

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

  // Protege todas as rotas /admin — redireciona para login se não autenticado
  if (
    !user &&
    request.nextUrl.pathname.startsWith("/admin")
  ) {
    const url = request.nextUrl.clone();
    url.pathname = "/auth/login";
    return NextResponse.redirect(url);
  }

  // Verifica role admin para acesso ao painel
  if (
    user &&
    request.nextUrl.pathname.startsWith("/admin")
  ) {
    const role = user.user_metadata?.role;
    if (role !== "admin") {
      const url = request.nextUrl.clone();
      url.pathname = "/";
      return NextResponse.redirect(url);
    }
  }

  return supabaseResponse;
}
