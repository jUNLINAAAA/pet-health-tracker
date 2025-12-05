/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
      },
      {
        protocol: 'https',
        hostname: '*.supabase.co',
      },
    ],
    // Enable image optimization for better performance
    unoptimized: false,
    formats: ['image/avif', 'image/webp'],
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  // Environment configuration
  env: {
    NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL,
    NEXT_PUBLIC_REDIRECT_URL: process.env.NEXT_PUBLIC_REDIRECT_URL,
  },
  // Add webpack configuration to handle optional dependencies
  webpack: (config, { isServer }) => {
    // Handle WebSocket optional dependencies
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        'bufferutil': false,
        'utf-8-validate': false,
      };
    }

    return config;
  },
  // Improve streaming stability
  experimental: {
    serverActions: true,  // Changed from object to boolean
  },
  // Increase timeout for long operations
  staticPageGenerationTimeout: 120,
};

module.exports = nextConfig;