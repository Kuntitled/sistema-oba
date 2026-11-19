import { updateSession } from "@/lib/supabase/proxy";
import type { NextRequest } from "next/server";

export async function proxy(request: NextRequest) {
  return await updateSession(request);
}

export const config = {
  matcher: [
    /*
     * Aplica o proxy em todas as rotas exceto:
     * - _next/static (assets estáticos)
     * - _next/image (otimização de imagem)
     * - favicon.ico, sitemap.xml, robots.txt, manifest
     * - Arquivos públicos com extensão conhecida
     */
    "/((?!_next/static|_next/image|favicon.ico|manifest|icons|images|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
