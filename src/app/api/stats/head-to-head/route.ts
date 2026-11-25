import { NextResponse } from "next/server";
import { isValidUuid } from "@/lib/services/arena-queries";
import { getHeadToHeadStats } from "@/lib/services/stats";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const bladerA = searchParams.get("bladerA");
  const bladerB = searchParams.get("bladerB");
  const season = searchParams.get("season");
  const category = searchParams.get("category");
  const ruleset = searchParams.get("ruleset");

  if (!isValidUuid(bladerA) || !isValidUuid(bladerB) || bladerA === bladerB) {
    return NextResponse.json(
      { error: "Selecione dois Bladers válidos e distintos." },
      { status: 400 }
    );
  }

  const data = await getHeadToHeadStats({
    bladerAId: bladerA,
    bladerBId: bladerB,
    season,
    category,
    ruleset,
  });

  if (!data) {
    return NextResponse.json(
      { error: "Não foi possível localizar os Bladers informados." },
      { status: 404 }
    );
  }

  return NextResponse.json({ data });
}
