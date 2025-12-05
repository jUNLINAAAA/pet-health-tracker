// Type declarations for Supabase-related modules
declare module '@supabase/ssr' {
  import { SupabaseClient } from '@supabase/supabase-js';
  
  export interface CookieOptions {
    name?: string;
    value?: string;
    domain?: string;
    path?: string;
    expires?: Date;
    httpOnly?: boolean;
    secure?: boolean;
    sameSite?: 'strict' | 'lax' | 'none';
  }
  
  export function createBrowserClient(
    supabaseUrl: string,
    supabaseKey: string,
    options?: any
  ): SupabaseClient;
  
  export function createServerClient(
    supabaseUrl: string,
    supabaseKey: string,
    options?: {
      cookies?: {
        get?: (name: string) => string | undefined;
        set?: (name: string, value: string, options: CookieOptions) => void;
        remove?: (name: string, options: CookieOptions) => void;
      }
    }
  ): SupabaseClient;
} 