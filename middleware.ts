import { NextResponse, type NextRequest } from 'next/server';
import { refreshSession } from '@/lib/supabase/middleware';

/**
 * Middleware - Handles Supabase auth and route protection
 *
 * PRODUCTION MODE: Full authentication support for public deployment
 * - Dashboard routes are publicly accessible for demo viewing
 * - Auth routes (login, register, logout) are fully functional
 * - Authenticated users get personalized data via RLS
 *
 * Data is fetched from Supabase database with public read access.
 */
export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Check if Supabase is configured
  const supabaseConfigured = !!(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );

  // If Supabase not configured, show error page
  if (!supabaseConfigured) {
    return NextResponse.redirect(new URL('/auth/login?error=supabase_not_configured', request.url));
  }

  // Try to refresh Supabase session (for users who ARE logged in)
  let user = null;
  let response = NextResponse.next({
    request: { headers: request.headers },
  });

  try {
    const sessionResult = await refreshSession(request);
    user = sessionResult.user;
    response = sessionResult.response;
  } catch (error) {
    // Auth refresh failed - continue without auth
    console.log('Auth refresh skipped');
  }

  // Root path: redirect to dashboard
  if (pathname === '/') {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  // Auth routes: Allow full access for login/register/logout functionality
  // This enables multi-user support for public deployment
  if (pathname.startsWith('/auth')) {
    return response;
  }

  // Dashboard routes: Allow access (public read via RLS, authenticated write)
  if (pathname.startsWith('/dashboard')) {
    return response;
  }

  return response;
}

export const config = {
  matcher: ['/', '/dashboard/:path*', '/auth/:path*'],
};
