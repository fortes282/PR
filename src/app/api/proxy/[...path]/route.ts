/**
 * API proxy - forwards requests to backend. Use when CORS or 502 from direct API calls.
 * Set NEXT_PUBLIC_USE_API_PROXY=true and API_BACKEND_URL (or NEXT_PUBLIC_API_BASE_URL).
 */
const BACKEND_URL =
  process.env.API_BACKEND_URL ?? process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:3001";

async function proxy(request: Request, pathSegments: string[]): Promise<Response> {
  const path = pathSegments.join("/");
  const url = `${BACKEND_URL.replace(/\/$/, "")}/${path}${request.url.includes("?") ? "?" + new URL(request.url).searchParams.toString() : ""}`;

  const headers = new Headers();
  request.headers.forEach((value, key) => {
    const lower = key.toLowerCase();
    if (lower !== "host" && lower !== "connection" && lower !== "origin" && lower !== "referer") {
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

  const res = await fetch(url, {
    method,
    headers,
    body: body ?? undefined,
  });

  const resHeaders = new Headers();
  res.headers.forEach((value, key) => {
    const lower = key.toLowerCase();
    if (lower !== "transfer-encoding" && lower !== "connection") {
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

export async function GET(request: Request, context: RouteContext): Promise<Response> {
  return proxy(request, await getPath(context));
}

export async function POST(request: Request, context: RouteContext): Promise<Response> {
  return proxy(request, await getPath(context));
}

export async function PUT(request: Request, context: RouteContext): Promise<Response> {
  return proxy(request, await getPath(context));
}

export async function PATCH(request: Request, context: RouteContext): Promise<Response> {
  return proxy(request, await getPath(context));
}

export async function DELETE(request: Request, context: RouteContext): Promise<Response> {
  return proxy(request, await getPath(context));
}

export async function OPTIONS(request: Request, context: RouteContext): Promise<Response> {
  return proxy(request, await getPath(context));
}
