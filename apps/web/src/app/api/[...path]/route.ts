const BACKEND_URL =
  process.env.API_BACKEND_URL || 'http://localhost:4000';

async function proxy(
  request: Request,
  pathSegments: string[],
): Promise<Response> {
  const path = pathSegments.join('/');
  const url = `${BACKEND_URL}/api/${path}${request.url.includes('?') ? '?' + new URL(request.url).searchParams.toString() : ''}`;

  const headers = new Headers();
  request.headers.forEach((value, key) => {
    const lower = key.toLowerCase();
    if (lower !== 'host' && lower !== 'connection') {
      headers.set(key, value);
    }
  });

  let body: string | undefined;
  const method = request.method;
  if (['POST', 'PUT', 'PATCH'].includes(method)) {
    try {
      body = await request.text();
    } catch {
      body = undefined;
    }
  }

  const res = await fetch(url, {
    method,
    headers,
    body: body || undefined,
  });

  const resHeaders = new Headers();
  res.headers.forEach((value, key) => {
    const lower = key.toLowerCase();
    if (lower !== 'transfer-encoding' && lower !== 'connection') {
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

export async function GET(request: Request, context: RouteContext) {
  return proxy(request, await getPath(context));
}

export async function POST(request: Request, context: RouteContext) {
  return proxy(request, await getPath(context));
}

export async function PUT(request: Request, context: RouteContext) {
  return proxy(request, await getPath(context));
}

export async function PATCH(request: Request, context: RouteContext) {
  return proxy(request, await getPath(context));
}

export async function DELETE(request: Request, context: RouteContext) {
  return proxy(request, await getPath(context));
}
