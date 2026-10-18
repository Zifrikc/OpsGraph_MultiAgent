import { NextRequest } from "next/server";

export const dynamic = "force-dynamic";
const routes =
  /^(topology|metrics|model\/status|chat|chat\/history\/[0-9a-f-]{36}|state\/[0-9a-f-]{36}|mock-payments|mock-payments\/batch|incidents\/[0-9a-f-]{36}\/actions)$/;
async function proxy(
  request: NextRequest,
  context: { params: Promise<{ path: string[] }> },
) {
  const path = (await context.params).path.join("/");
  if (!routes.test(path))
    return Response.json({ detail: "Not found" }, { status: 404 });
  if (request.method === "POST") {
    const origin = request.headers.get("origin");
    if (
      origin &&
      origin !== request.nextUrl.origin &&
      origin !== process.env.APP_ORIGIN
    )
      return Response.json({ detail: "Origin rejected" }, { status: 403 });
  }
  if (!process.env.API_TOKEN || !process.env.API_BASE_URL)
    return Response.json(
      { detail: "Backend sin configurar. Inicia Docker Compose." },
      { status: 503 },
    );
  const session = request.cookies.get("opsgraph_session")?.value;
  if (!session)
    return Response.json(
      { detail: "Inicia sesión para continuar" },
      { status: 401 },
    );
  const body = request.method === "POST" ? await request.text() : undefined;
  if (body && body.length > 4096)
    return Response.json({ detail: "Request too large" }, { status: 413 });
  try {
    const result = await fetch(`${process.env.API_BASE_URL}/api/v1/${path}`, {
      method: request.method,
      headers: {
        "Content-Type": "application/json",
        "X-Opsgraph-Token": process.env.API_TOKEN,
        Authorization: `Bearer ${session}`,
      },
      body,
      cache: "no-store",
      signal: AbortSignal.timeout(580000),
    });
    return new Response(await result.text(), {
      status: result.status,
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "no-store",
      },
    });
  } catch {
    return Response.json(
      { detail: "No se pudo contactar el backend. Revisa Docker Compose." },
      { status: 503 },
    );
  }
}
export const GET = proxy;
export const POST = proxy;
