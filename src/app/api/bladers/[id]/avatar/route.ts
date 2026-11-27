import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isValidUuid } from "@/lib/services/arena-queries";

const MAX_AVATAR_BYTES = 5 * 1024 * 1024; // 5 MB

function isPrivateOrBlockedHost(hostname: string): boolean {
  const host = hostname.toLowerCase();
  if (
    host === "localhost" ||
    host === "0.0.0.0" ||
    host === "::1" ||
    host === "[::1]" ||
    host.endsWith(".local") ||
    host.endsWith(".internal")
  ) {
    return true;
  }

  // Rejeita IPs IPv4 privados / loopback / link-local
  const ipv4Match = host.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (ipv4Match) {
    const [, a, b] = ipv4Match.map(Number);
    if (
      a === 10 ||
      a === 127 ||
      a === 0 ||
      (a === 169 && b === 254) ||
      (a === 172 && b >= 16 && b <= 31) ||
      (a === 192 && b === 168)
    ) {
      return true;
    }
  }

  return false;
}

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  if (!isValidUuid(id)) {
    return NextResponse.json({ error: "Blader inválido." }, { status: 400 });
  }

  const supabase = await createClient();
  const { data: blader } = await supabase
    .from("bladers")
    .select("avatar_url")
    .eq("id", id)
    .maybeSingle();

  const rawUrl = blader?.avatar_url?.trim() ?? "";
  if (!rawUrl) {
    return new NextResponse(null, { status: 404 });
  }

  if (rawUrl.startsWith("/")) {
    return NextResponse.redirect(new URL(rawUrl, request.url));
  }

  let parsedUrl: URL;
  try {
    parsedUrl = new URL(rawUrl);
  } catch {
    return new NextResponse(null, { status: 404 });
  }

  if (
    (parsedUrl.protocol !== "https:" && parsedUrl.protocol !== "http:") ||
    isPrivateOrBlockedHost(parsedUrl.hostname)
  ) {
    return new NextResponse(null, { status: 404 });
  }

  try {
    const upstream = await fetch(parsedUrl.toString(), {
      signal: AbortSignal.timeout(5000),
      cache: "force-cache",
    });

    if (!upstream.ok) {
      return new NextResponse(null, { status: 404 });
    }

    const contentType = upstream.headers.get("content-type") ?? "";
    if (!contentType.toLowerCase().startsWith("image/")) {
      return new NextResponse(null, { status: 415 });
    }

    const arrayBuffer = await upstream.arrayBuffer();
    if (arrayBuffer.byteLength === 0 || arrayBuffer.byteLength > MAX_AVATAR_BYTES) {
      return new NextResponse(null, { status: 413 });
    }

    return new NextResponse(arrayBuffer, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=3600, s-maxage=3600",
      },
    });
  } catch {
    return new NextResponse(null, { status: 502 });
  }
}
