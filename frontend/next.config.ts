import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  output: 'standalone',
  eslint: {
    // Disable ESLint during builds to avoid issues with test files
    ignoreDuringBuilds: true,
  },
  typescript: {
    // TypeScript will use tsconfig.json exclusions
    ignoreBuildErrors: false,
  },
};

export default nextConfig;

