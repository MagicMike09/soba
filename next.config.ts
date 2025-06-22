import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'wdgypadoxenvdrgvhrbs.supabase.co',
        port: '',
        pathname: '/storage/v1/object/public/**',
      },
    ],
    domains: ['wdgypadoxenvdrgvhrbs.supabase.co'],
    dangerouslyAllowSVG: true,
    contentDispositionType: 'attachment',
  },
  // Ensure fresh builds
  generateEtags: false,
};

export default nextConfig;
