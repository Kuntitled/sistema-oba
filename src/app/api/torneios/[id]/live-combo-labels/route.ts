import { NextResponse } from "next/server";
import { isValidUuid } from "@/lib/services/arena-queries";
import { getTournamentLiveComboLabels } from "@/lib/services/tournament-live";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  if (!isValidUuid(id)) {
    return NextResponse.json(
      { comboLabels: {} },
      { status: 400, headers: { "Cache-Control": "no-store" } }
    );
  }

  const comboLabels = await getTournamentLiveComboLabels(id);
  return NextResponse.json(
    { comboLabels },
    { headers: { "Cache-Control": "no-store" } }
  );
}
