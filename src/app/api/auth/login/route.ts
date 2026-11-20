import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import type { Database } from "@/types/database";

interface PendingCookie {
  name: string;
  value: string;
  options: CookieOptions;
}

function getIsHttps(request: NextRequest): boolean {
  return (
    request.nextUrl.protocol === "https:" ||
    request.headers.get("x-forwarded-proto") === "https"
  );
}

function attachCookies(
  response: NextResponse,
  cookiesToApply: PendingCookie[],
  isHttps: boolean
) {
  for (const { name, value, options } of cookiesToApply) {
    response.cookies.set(name, value, {
      ...options,
      path: options?.path ?? "/",
      sameSite: options?.sameSite ?? "lax",
      secure: isHttps,
    });
  }
}

export async function POST(request: NextRequest) {
  let body: { email?: unknown; password?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Requisição inválida. Envie e-mail e senha." },
      { status: 400 }
    );
  }

  const email =
    typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  const password = typeof body.password === "string" ? body.password : "";

  if (!email || !password) {
    return NextResponse.json(
      { error: "Preencha o e-mail e a senha para entrar." },
      { status: 400 }
    );
  }

  const pendingCookies: PendingCookie[] = [];
  const isHttps = getIsHttps(request);

  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          for (const cookie of cookiesToSet) {
            pendingCookies.push(cookie);
          }
        },
      },
    }
  );

  const { data, error: authError } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (authError) {
    const message =
      authError.message === "Invalid login credentials"
        ? "E-mail ou senha incorretos."
        : authError.message;
    return NextResponse.json({ error: message }, { status: 401 });
  }

  if (!data.user) {
    return NextResponse.json(
      { error: "Usuário não encontrado." },
      { status: 401 }
    );
  }

  const role = data.user.user_metadata?.role;
  if (role !== "admin") {
    await supabase.auth.signOut();
    const deniedResponse = NextResponse.json(
      {
        error:
          "Acesso restrito. Este usuário não possui a permissão 'admin'.",
      },
      { status: 403 }
    );
    attachCookies(deniedResponse, pendingCookies, isHttps);
    return deniedResponse;
  }

  const okResponse = NextResponse.json({ ok: true });
  attachCookies(okResponse, pendingCookies, isHttps);
  return okResponse;
}
