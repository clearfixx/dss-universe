/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Web Ban
 * 📄 File: apps/web/src/app/banned/files/route.ts
 *
 * 🎯 Purpose:
 * Forwards one appeal screenshot to the API with the ticket from the cookie.
 *
 * ⚠️ Important:
 * A route handler instead of a server action: screenshots exceed the action
 * body limit. The cookie is SameSite=Lax, so other sites cannot post here.
 * The proxy matcher skips this path so the body is not buffered or cut.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
import { cookies } from "next/headers";

import { siteConfig } from "@/config/site.config";
import { APPEAL_MAX_BYTES, BAN_COOKIE } from "@/features/ban/ban-contract";

/** Room for the multipart envelope around the largest screenshot. */
const MAX_BODY_BYTES = APPEAL_MAX_BYTES + 64 * 1024;

export async function POST(request: Request): Promise<Response> {
  const ticket = (await cookies()).get(BAN_COOKIE)?.value;
  if (!ticket) return Response.json({ ok: false }, { status: 403 });
  const length = Number(request.headers.get("content-length"));
  if (!length || length > MAX_BODY_BYTES)
    return Response.json({ ok: false }, { status: 413 });
  const file = (await request.formData()).get("file");
  if (!(file instanceof File))
    return Response.json({ ok: false }, { status: 400 });
  const body = new FormData();
  body.set("file", file, file.name);
  try {
    const response = await fetch(
      `${siteConfig.apiUrl}/moderation/ban-appeal/files`,
      {
        method: "POST",
        headers: { "x-ban-ticket": ticket },
        body,
        cache: "no-store",
        signal: AbortSignal.timeout(60_000),
      },
    );
    return Response.json({ ok: response.ok }, { status: response.status });
  } catch {
    return Response.json({ ok: false }, { status: 502 });
  }
}
