import type {NextConfig} from 'next';

// Explicitly load environment variables from .env
require('dotenv').config();

const nextConfig: NextConfig = {
  /* config options here */
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'placehold.co',
        port: '',
        pathname: '/**',
      },
    ],
  },
  devIndicators: false, // To disable dev tools UI
  allowedDevOrigins: [
    'http://hr.talentflow.local',
    'http://candidate.talentflow.local',
  ],
};

export default nextConfig;
