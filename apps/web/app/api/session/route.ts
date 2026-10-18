import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";
const cookieName = "opsgraph_session";

function sameOrigin(request: NextRequest) {
  const origin = request.headers.get("origin");
  return (
    !origin ||
    origin === request.nextUrl.origin ||
    origin === process.env.APP_ORIGIN
  );
}

function backend(path: string, token?: string, body?: string) {
  return fetch(`${process.env.API_BASE_URL}${path}`, {
    method: body ? "POST" : "GET",
    headers: {
      "Content-Type": "application/json",
      "X-Opsgraph-Token": process.env.API_TOKEN || "",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body,
    cache: "no-store",
    signal: AbortSignal.timeout(10000),
  });
}

export async function GET(request: NextRequest) {
  const token = request.cookies.get(cookieName)?.value;
  if (!token)
    return NextResponse.json({ detail: "Login required" }, { status: 401 });
  try {
    const result = await backend("/auth/me", token);
    return NextResponse.json(await result.json(), { status: result.status });
  } catch {
    return NextResponse.json({ detail: "API no disponible" }, { status: 503 });
  }
}

export async function POST(request: NextRequest) {
  if (!sameOrigin(request))
    return NextResponse.json({ detail: "Origin rejected" }, { status: 403 });
  const raw = await request.text();
  if (raw.length > 1024)
    return NextResponse.json({ detail: "Request too large" }, { status: 413 });
  let credentials: { username?: string; password?: string };
  try {
    credentials = JSON.parse(raw);
  } catch {
    return NextResponse.json({ detail: "JSON inválido" }, { status: 400 });
  }
  if (!credentials.username || !credentials.password)
    return NextResponse.json(
      { detail: "Ingresa usuario y contraseña" },
      { status: 400 },
    );
  try {
    const result = await backend(
      "/auth/login",
      undefined,
      JSON.stringify(credentials),
    );
    const data = await result.json();
    if (!result.ok) return NextResponse.json(data, { status: result.status });
    const response = NextResponse.json({ user: data.user });
    response.cookies.set(cookieName, data.token, {
      httpOnly: true,
      secure:
        request.nextUrl.protocol === "https:" ||
        process.env.APP_ORIGIN?.startsWith("https://"),
      sameSite: "strict",
      path: "/",
      maxAge: 8 * 60 * 60,
    });
    return response;
  } catch {
    return NextResponse.json({ detail: "API no disponible" }, { status: 503 });
  }
}

export async function DELETE(request: NextRequest) {
  if (!sameOrigin(request))
    return NextResponse.json({ detail: "Origin rejected" }, { status: 403 });
  const response = NextResponse.json({ ok: true });
  response.cookies.delete(cookieName);
  return response;
}
