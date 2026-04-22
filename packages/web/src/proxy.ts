import { NextRequest, NextResponse } from 'next/server';

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const protectedPaths = ['/dashboard', '/api/tickets', '/api/config', '/api/analytics', '/api/discord', '/api/panel'];
  const isProtected = protectedPaths.some((p) => pathname.startsWith(p));

  if (!isProtected) return NextResponse.next();

  const sessionRes = await fetch(new URL('/api/auth/get-session', request.url), {
    headers: { cookie: request.headers.get('cookie') ?? '' },
  }).catch(() => null);

  if (!sessionRes?.ok) {
    return NextResponse.redirect(new URL('/', request.url));
  }

  const session = await sessionRes.json().catch(() => null) as { user?: unknown } | null;

  if (!session?.user) {
    return NextResponse.redirect(new URL('/', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/dashboard/:path*', '/api/tickets/:path*', '/api/config/:path*', '/api/analytics/:path*', '/api/discord/:path*', '/api/panel/:path*'],
};
