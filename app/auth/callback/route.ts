import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextResponse, type NextRequest } from 'next/server';

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const type = searchParams.get('type');
  const next = searchParams.get('next') ?? '/dashboard';
  const error_description = searchParams.get('error_description');

  const cookieStore = await cookies();
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    return NextResponse.redirect(`${origin}/auth/login?error=config`);
  }

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      get(name: string) {
        return cookieStore.get(name)?.value;
      },
      set(name: string, value: string, options: CookieOptions) {
        cookieStore.set({ name, value, ...options });
      },
      remove(name: string, options: CookieOptions) {
        cookieStore.delete({ name, ...options });
      },
    },
  });

  // Handle error from Supabase (e.g., expired link)
  if (error_description) {
    // Check if user is already signed in despite the error
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      // User is confirmed and signed in - redirect to dashboard
      return NextResponse.redirect(`${origin}${next}`);
    }
    // User not signed in, show login with success message (email was confirmed)
    if (error_description.includes('expired')) {
      return NextResponse.redirect(`${origin}/auth/login?message=email_confirmed`);
    }
    return NextResponse.redirect(`${origin}/auth/login?error=callback`);
  }

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      // Handle password recovery - redirect to update password page
      if (type === 'recovery') {
        return NextResponse.redirect(`${origin}/auth/update-password`);
      }
      return NextResponse.redirect(`${origin}${next}`);
    }

    // Code exchange failed, but check if user is already authenticated
    // This handles the case where the link was clicked twice or the
    // email confirmation worked but session creation failed
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      // User is already authenticated - proceed to dashboard
      if (type === 'recovery') {
        return NextResponse.redirect(`${origin}/auth/update-password`);
      }
      return NextResponse.redirect(`${origin}${next}`);
    }

    // Email was likely confirmed but login is still needed
    // Common with email confirmation links - the user is confirmed but not signed in
    if (type === 'signup' || type === 'email_change') {
      return NextResponse.redirect(`${origin}/auth/login?message=email_confirmed`);
    }
  }

  // No code provided - check if this is a magic link or redirect
  const { data: { user } } = await supabase.auth.getUser();
  if (user) {
    return NextResponse.redirect(`${origin}${next}`);
  }

  // Fallback to login
  return NextResponse.redirect(`${origin}/auth/login`);
}
