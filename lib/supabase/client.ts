import { createBrowserClient } from '@supabase/ssr';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

type NullableClient = SupabaseClient | null;

let browserClient: NullableClient = null;
let serviceRoleClient: NullableClient = null;

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

/**
 * Use this in client components for authenticated user operations.
 * Uses @supabase/ssr for proper cookie handling with Next.js.
 */
export function getSupabaseBrowserClient(): NullableClient {
  if (!supabaseUrl || !supabaseAnonKey) {
    console.warn('Supabase browser client missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY');
    return null;
  }

  if (!browserClient) {
    browserClient = createBrowserClient(supabaseUrl, supabaseAnonKey);
  }

  return browserClient;
}

/**
 * Use this only on the server for background jobs / Edge Functions where RLS
 * allows it. Do not call from client components.
 *
 * DEMO MODE: Falls back to anon key if service role key not available.
 * This allows SSR to work without service role key for read-only demo access.
 */
export function getSupabaseServiceRoleClient(): NullableClient {
  if (typeof window !== 'undefined') {
    console.warn('getSupabaseServiceRoleClient is server-only');
    return null;
  }

  if (!supabaseUrl) {
    console.warn('Supabase URL not configured');
    return null;
  }

  // If service role key is available, use it
  if (supabaseServiceRoleKey) {
    if (!serviceRoleClient) {
      serviceRoleClient = createClient(supabaseUrl, supabaseServiceRoleKey);
    }
    return serviceRoleClient;
  }

  // DEMO MODE FALLBACK: Use anon key for read-only access on server
  // This allows SSR without service role key when public read RLS is enabled
  if (supabaseAnonKey) {
    console.log('Using anon key fallback for server-side read access (demo mode)');
    return createClient(supabaseUrl, supabaseAnonKey);
  }

  console.warn('No Supabase keys available for server-side client');
  return null;
}
