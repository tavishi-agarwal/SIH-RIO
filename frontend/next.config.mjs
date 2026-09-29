/** @type {import('next').NextConfig} */
const BACKEND_URL = process.env.BACKEND_URL || 'http://127.0.0.1:8000';

const nextConfig = {
  transpilePackages: ['maplibre-gl'],
  async rewrites() {
    return [
      // Proxy API + storage through the Next.js server so a single origin
      // (and a single tunnel link) reaches both frontend and FastAPI backend.
      {
        source: '/api/:path*',
        destination: `${BACKEND_URL}/api/:path*`,
      },
      {
        source: '/storage/:path*',
        destination: `${BACKEND_URL}/storage/:path*`,
      },
    ];
  },
};

export default nextConfig;
