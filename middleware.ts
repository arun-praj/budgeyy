import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Public routes that don't require authentication
const publicRoutes = ['/', '/login', '/register'];

// Routes that require completed onboarding
const protectedRoutes = ['/dashboard', '/transactions', '/budgets'];

export async function middleware(request: NextRequest) {
    const { pathname } = request.nextUrl;

    // Skip middleware for API routes and static files
    if (pathname.startsWith('/api/auth')) {
        return NextResponse.next();
    }

    // Check if route is public
    const isPublicRoute = publicRoutes.some(route => pathname === route);

    // Get session token from cookie
    const sessionToken = request.cookies.get('better-auth.session_token')?.value;
    const hasSession = !!sessionToken;

    // Redirect unauthenticated users to login
    if (!hasSession && !isPublicRoute) {
        const loginUrl = new URL('/login', request.url);
        loginUrl.searchParams.set('callbackUrl', pathname);
        return NextResponse.redirect(loginUrl);
    }

    // Redirect authenticated users away from auth pages to onboarding or dashboard
    if (hasSession) {
        if (pathname === '/login' || pathname === '/register') {
            return NextResponse.redirect(new URL('/onboarding', request.url));
        }
        if (pathname === '/') {
            return NextResponse.redirect(new URL('/dashboard', request.url));
        }
    }

    return NextResponse.next();
}

export const config = {
    matcher: [
        /*
         * Match all request paths except for the ones starting with:
         * - _next/static (static files)
         * - _next/image (image optimization files)
         * - favicon.ico (favicon file)
         * - public files (public folder)
         * - api routes
         */
        '/((?!_next/static|_next/image|favicon.ico|.*\\..*|api).*)',
    ],
};
