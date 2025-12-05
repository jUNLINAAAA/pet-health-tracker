import 'react';

declare global {
  namespace JSX {
    interface IntrinsicElements {
      [elemName: string]: any;
    }
  }

  namespace NodeJS {
    interface ProcessEnv {
      NEXT_PUBLIC_SUPABASE_URL: string;
      NEXT_PUBLIC_SUPABASE_ANON_KEY: string;
      AUTH_SECRET: string;
      [key: string]: string | undefined;
    }
  }
}

// Add missing type declarations for packages
declare module '@supabase/ssr';
declare module '@supabase/supabase-js';
declare module 'next/navigation';
declare module 'next/headers';
declare module 'next/server';
declare module 'next/script';
declare module 'next/dynamic';
declare module 'next/image';
declare module 'next/link';
declare module 'framer-motion';
declare module 'lucide-react';
declare module 'sonner'; 