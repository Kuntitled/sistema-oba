import { NextResponse, type NextRequest } from "next/server";
import { createRouteSupabaseClient } from "@/lib/supabase/route-cookies";

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

  const { supabase, applyCookies } = createRouteSupabaseClient(request);

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
    return applyCookies(
      NextResponse.json(
        {
          error:
            "Acesso restrito. Este usuário não possui a permissão 'admin'.",
        },
        { status: 403 }
      )
    );
  }

  return applyCookies(NextResponse.json({ ok: true }));
}
