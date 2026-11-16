import { NextResponse, type NextRequest } from 'next/server';

/**
 * Coarse, edge-safe redirect only. It checks that a session cookie exists; it does
 * NOT validate the signature or role. Every page and action performs the real
 * guards on the Node runtime (§8.6). No pg/server-only import may appear here.
 */
const SESSION_COOKIES = ['authjs.session-token', '__Secure-authjs.session-token'];

export function middleware(request: NextRequest): NextResponse {
  const { pathname } = request.nextUrl;

  const protectedPrefix =
    pathname.startsWith('/admin') ||
    pathname.startsWith('/faculty') ||
    pathname.startsWith('/student');

  if (!protectedPrefix) return NextResponse.next();

  const hasSessionCookie = SESSION_COOKIES.some((name) => request.cookies.has(name));
  if (hasSessionCookie) return NextResponse.next();

  const loginUrl = request.nextUrl.clone();
  loginUrl.pathname = '/login';
  loginUrl.search = '';
  loginUrl.searchParams.set('callbackUrl', pathname);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: ['/admin/:path*', '/faculty/:path*', '/student/:path*'],
};
