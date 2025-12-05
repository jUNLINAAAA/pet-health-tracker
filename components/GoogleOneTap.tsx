'use client'

import Script from 'next/script'
// TODO: Remove Supabase - rebuild backend
// import { createClient } from '@/utils/supabase/client'
import { useRouter, usePathname } from 'next/navigation'
import { useEffect } from 'react'

interface CredentialResponse {
  credential: string;
  select_by?: string;
  clientId?: string;
}

const GoogleOneTap = () => {
  // TODO: Remove Supabase - rebuild backend
  // const supabase = createClient()
  const router = useRouter()
  const pathname = usePathname()

  // Generate nonce to use for Google ID token sign-in
  const generateNonce = async (): Promise<string[]> => {
    const nonce = btoa(String.fromCharCode(...crypto.getRandomValues(new Uint8Array(32))))
    const encoder = new TextEncoder()
    const encodedNonce = encoder.encode(nonce)
    const hashBuffer = await crypto.subtle.digest('SHA-256', encodedNonce)
    const hashArray = Array.from(new Uint8Array(hashBuffer))
    const hashedNonce = hashArray.map((b) => b.toString(16).padStart(2, '0')).join('')

    return [nonce, hashedNonce]
  }

  useEffect(() => {
    const initializeGoogleOneTap = async () => {
      // Check if Google's library is loaded
      if (typeof window !== 'undefined' && (window as any).google) {
        const [nonce, hashedNonce] = await generateNonce()

        // TODO: Remove Supabase - rebuild backend
        // Check if there's already an existing session before initializing the one-tap UI
        // const { data, error } = await supabase.auth.getSession()
        // if (error) {
        //   console.error('Error getting session', error)
        // }
        // if (data.session) {
        //   return
        // }
        return; // Disable Google One Tap until backend is rebuilt

        // Initialize Google One Tap
        ; (window as any).google.accounts.id.initialize({
          client_id: "1044438800553-9gnq02l0cp40h30jnip9i1jhhjarabtf.apps.googleusercontent.com",
          callback: async (response: CredentialResponse) => {
            try {
              // Send ID token to Supabase
              const { data, error } = await supabase.auth.signInWithIdToken({
                provider: 'google',
                token: response.credential,
                nonce,
              })

              if (error) throw error

              // If we're on a page that indicates a specific redirect, use it
              // Otherwise go to dashboard
              if (pathname && (pathname.includes('/auth/login') || pathname.includes('/auth/register'))) {
                // Check if there's a returnTo parameter in the URL
                const urlParams = new URLSearchParams(window.location.search)
                const returnTo = urlParams.get('returnTo')

                if (returnTo) {
                  router.push(decodeURIComponent(returnTo))
                } else {
                  router.push('/dashboard')
                }
              } else {
                router.push('/dashboard')
              }
            } catch (error) {
              console.error('Error logging in with Google One Tap', error)
            }
          },
          nonce: hashedNonce,
          use_fedcm_for_prompt: true,
        })

          // Display the One Tap UI
          ; (window as any).google.accounts.id.prompt()
      }
    }

    // Wait for the script to load before initializing
    const timeoutId = setTimeout(() => {
      initializeGoogleOneTap()
    }, 1000)

    return () => clearTimeout(timeoutId)
  }, [router, pathname])

  return (
    <>
      <Script
        src="https://accounts.google.com/gsi/client"
        strategy="afterInteractive"
        onLoad={() => console.log('Google Identity Services script loaded')}
      />
      <div id="oneTap" className="fixed top-4 right-4 z-[100]" />
    </>
  )
}

export default GoogleOneTap 
