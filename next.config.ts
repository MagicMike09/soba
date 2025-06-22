import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Force rebuild - timestamp: 2025-06-22 17:20
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*.supabase.co',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'wdgypadoxenvdrgvhrbs.supabase.co',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: '**',
        port: '',
        pathname: '/**',
      },
    ],
  },
  // Ensure fresh builds
  generateEtags: false,
};

export default nextConfig;
