import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
    const token = request.cookies.get('token')?.value;
    const { pathname } = request.nextUrl;

    // Paths that don't require authentication
    const publicPaths = ['/login', '/favicon.ico'];

    // Check if the current path is public
    const isPublicPath = publicPaths.some((path) => pathname.startsWith(path));

    // If user is already logged in and tries to access login page, redirect to dashboard
    if (isPublicPath && token) {
        return NextResponse.redirect(new URL('/', request.url));
    }

    // If user is not logged in and tries to access protected routes, redirect to login
    if (!isPublicPath && !token) {
        // Exclude Next.js internal paths and static files
        if (
            !pathname.startsWith('/_next') &&
            !pathname.startsWith('/static') &&
            !pathname.match(/\.(png|jpg|jpeg|gif|svg|ico)$/)
        ) {
            return NextResponse.redirect(new URL('/login', request.url));
        }
    }

    return NextResponse.next();
}

export const config = {
    matcher: [
        /*
         * Match all request paths except for the ones starting with:
         * - api (API routes)
         * - _next/static (static files)
         * - _next/image (image optimization files)
         * - favicon.ico (favicon file)
         */
        '/((?!api|_next/static|_next/image|favicon.ico).*)',
    ],
};
