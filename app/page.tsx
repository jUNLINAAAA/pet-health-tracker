"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function HomePage() {
  const router = useRouter();

  useEffect(() => {
    // Immediately redirect to dashboard
    router.replace('/dashboard');
  }, [router]);

  // Minimal loading state
  return null;
}
