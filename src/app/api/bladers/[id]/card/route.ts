import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isValidUuid } from "@/lib/services/arena-queries";
import { getBladerCardProfile } from "@/lib/services/blader-card";

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  if (!isValidUuid(id)) {
    return NextResponse.json({ error: "ID de Blader inválido." }, { status: 400 });
  }

  const supabase = await createClient();
  const profile = await getBladerCardProfile(supabase, id);

  if (!profile) {
    return NextResponse.json(
      { error: "Blader não encontrado." },
      { status: 404 }
    );
  }

  return NextResponse.json({ profile });
}
