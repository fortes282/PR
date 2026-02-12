/**
 * API proxy - forwards requests to backend. Use when CORS or 502 from direct API calls.
 * Set NEXT_PUBLIC_USE_API_PROXY=true and API_BACKEND_URL to your API server URL.
 * Do not set API_BACKEND_URL to the frontend URL (e.g. Vercel app URL) – that causes 404.
 */
const BACKEND_URL =
  process.env.API_BACKEND_URL ?? process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:3001";

const isProduction = process.env.VERCEL === "1" || process.env.NODE_ENV === "production";
const isLocalhostBackend =
  BACKEND_URL.startsWith("http://localhost") || BACKEND_URL.startsWith("http://127.0.0.1");

function errorResponse(status: number, message: string, detail?: string): Response {
  return Response.json(
    { code: "PROXY_ERROR", message, detail },
    { status }
  );
}

async function proxy(request: Request, pathSegments: string[]): Promise<Response> {
  const path = pathSegments.join("/");
  const url = `${BACKEND_URL.replace(/\/$/, "")}/${path}${request.url.includes("?") ? "?" + new URL(request.url).searchParams.toString() : ""}`;

  const headers = new Headers();
  request.headers.forEach((value, key) => {
    const lower = key.toLowerCase();
    if (
      lower !== "host" &&
      lower !== "connection" &&
      lower !== "origin" &&
      lower !== "referer" &&
      lower !== "accept-encoding"
    ) {
      headers.set(key, value);
    }
  });

  let body: string | ArrayBuffer | undefined;
  const method = request.method;
  const contentType = request.headers.get("content-type") ?? "";
  if (["POST", "PUT", "PATCH"].includes(method)) {
    try {
      body = contentType.includes("multipart/form-data") ? await request.arrayBuffer() : await request.text();
    } catch {
      body = undefined;
    }
  }

  let res: Response;
  try {
    res = await fetch(url, {
      method,
      headers,
      body: body ?? undefined,
      signal: AbortSignal.timeout(15000),
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return errorResponse(503, "Backend unreachable", msg);
  }

  const resHeaders = new Headers();
  res.headers.forEach((value, key) => {
    const lower = key.toLowerCase();
    if (
      lower !== "transfer-encoding" &&
      lower !== "connection" &&
      lower !== "content-encoding" &&
      lower !== "content-length"
    ) {
      resHeaders.set(key, value);
    }
  });

  return new Response(res.body, {
    status: res.status,
    statusText: res.statusText,
    headers: resHeaders,
  });
}

type RouteContext = { params: Promise<{ path: string[] }> | { path: string[] } };

async function getPath(context: RouteContext): Promise<string[]> {
  const params = await Promise.resolve(context.params);
  return params.path;
}

function getRequestHost(request: Request): string | null {
  try {
    const url = new URL(request.url);
    return url.host;
  } catch {
    return null;
  }
}

async function handle(request: Request, context: RouteContext): Promise<Response> {
  if (isProduction && isLocalhostBackend) {
    return errorResponse(
      503,
      "Backend URL not configured for production",
      "Set API_BACKEND_URL (server env) to your API server URL, e.g. https://your-api.up.railway.app. Do not use the frontend URL."
    );
  }
  try {
    const backendHost = new URL(BACKEND_URL).host;
    const requestHost = getRequestHost(request);
    if (requestHost && backendHost === requestHost) {
      return errorResponse(
        502,
        "API_BACKEND_URL must be the API server, not the frontend",
        `Backend is set to the same host as this app (${requestHost}). Set API_BACKEND_URL to your API deployment URL (e.g. Railway API), not the frontend URL.`
      );
    }
  } catch {
    // ignore URL parse errors
  }
  const path = await getPath(context);
  if (path[0] === "__debug") {
    try {
      const res = await fetch(`${BACKEND_URL.replace(/\/$/, "")}/ping`, { signal: AbortSignal.timeout(5000) });
      return Response.json({
        ok: true,
        backend: BACKEND_URL.replace(/\/\/[^/]+@/, "//***@").replace(/:[^/:]+\./, ":***."),
        ping: res.ok ? "ok" : `status ${res.status}`,
      });
    } catch (err) {
      return Response.json({
        ok: false,
        backend: BACKEND_URL.replace(/\/\/[^/]+@/, "//***@").replace(/:[^/:]+\./, ":***."),
        error: err instanceof Error ? err.message : String(err),
      }, { status: 503 });
    }
  }
  try {
    return await proxy(request, path);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return errorResponse(500, "Proxy error", msg);
  }
}

export async function GET(request: Request, context: RouteContext): Promise<Response> {
  return handle(request, context);
}

export async function POST(request: Request, context: RouteContext): Promise<Response> {
  return handle(request, context);
}

export async function PUT(request: Request, context: RouteContext): Promise<Response> {
  return handle(request, context);
}

export async function PATCH(request: Request, context: RouteContext): Promise<Response> {
  return handle(request, context);
}

export async function DELETE(request: Request, context: RouteContext): Promise<Response> {
  return handle(request, context);
}

export async function OPTIONS(request: Request, context: RouteContext): Promise<Response> {
  return handle(request, context);
}
