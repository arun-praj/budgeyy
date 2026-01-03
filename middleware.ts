import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Public routes that don't require authentication
const publicRoutes = ['/', '/login', '/register', '/api/unsubscribe', '/share'];
const authRoutes = ['/login', '/register', '/verify-email'];

export async function middleware(request: NextRequest) {
    const { pathname } = request.nextUrl;

    // Skip middleware for API routes and static files
    if (pathname.startsWith('/api/auth') || pathname.startsWith('/_next') || pathname.includes('.')) {
        return NextResponse.next();
    }

    // Check if route is public
    const isPublicRoute = publicRoutes.some(route => pathname === route || pathname.startsWith('/share/'));
    const isAuthRoute = authRoutes.some(route => pathname === route);

    // Get session from server
    const response = await fetch(new URL('/api/auth/get-session', request.url), {
        headers: {
            cookie: request.headers.get('cookie') || '',
        },
    });
    const session = await response.json();
    const hasSession = !!session?.user;

    // Redirect unauthenticated users to login (if not a public route)
    if (!hasSession) {
        if (!isPublicRoute && pathname !== '/verify-email') {
            const loginUrl = new URL('/login', request.url);
            loginUrl.searchParams.set('callbackUrl', pathname);
            return NextResponse.redirect(loginUrl);
        }
        return NextResponse.next();
    }

    const { emailVerified, onboardingCompleted } = session.user;

    // 1. Force Email Verification
    if (!emailVerified) {
        if (pathname !== '/verify-email' && !pathname.startsWith('/api')) {
            const verifyUrl = new URL('/verify-email', request.url);
            verifyUrl.searchParams.set('email', session.user.email);
            return NextResponse.redirect(verifyUrl);
        }
        return NextResponse.next();
    }

    // 2. Force Onboarding
    if (!onboardingCompleted) {
        if (pathname !== '/onboarding' && !isAuthRoute && !pathname.startsWith('/api')) {
            return NextResponse.redirect(new URL('/onboarding', request.url));
        }
        // If they are on an auth route but verified, they should go to onboarding
        if (isAuthRoute && pathname !== '/verify-email') {
            return NextResponse.redirect(new URL('/onboarding', request.url));
        }
        return NextResponse.next();
    }

    // 3. Redirect away from auth/onboarding if fully verified and onboarded
    if (isAuthRoute || pathname === '/onboarding') {
        return NextResponse.redirect(new URL('/dashboard', request.url));
    }

    if (pathname === '/') {
        return NextResponse.redirect(new URL('/dashboard', request.url));
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
