import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  async rewrites() {
    // Proxy API calls in dev so the browser talks same-origin.
    return [
      {
        source: '/api/v1/:path*',
        destination: `${process.env.API_URL ?? 'http://localhost:3000'}/api/v1/:path*`,
      },
    ];
  },
};

export default nextConfig;
