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
  devIndicators: {
    // Attempt to disable all development indicators by setting the parent option to false
    // buildActivity: false, // This specific key is deprecated
    allowedDevOrigins: [
      'http://hr.talentflow.local:9002',
      'http://candidate.talentflow.local:9002',
    ],
  },
};

export default nextConfig;
