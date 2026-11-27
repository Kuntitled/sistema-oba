import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isValidUuid } from "@/lib/services/arena-queries";
import { getTournamentPodiumCardData } from "@/lib/services/podium-card";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  if (!isValidUuid(id)) {
    return NextResponse.json({ error: "Torneio inválido." }, { status: 400 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const isAdmin = user?.app_metadata?.role === "admin";

  const data = await getTournamentPodiumCardData(id, {
    allowUnfinishedForAdmin: isAdmin,
  });

  if (!data) {
    return NextResponse.json(
      { error: "Pódio ainda não disponível para este torneio." },
      { status: 404 }
    );
  }

  return NextResponse.json(data, {
    headers: { "Cache-Control": "no-store" },
  });
}
