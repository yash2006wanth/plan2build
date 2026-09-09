/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: process.env.BACKEND_URL || 'http://localhost:8000/api/:path*',
      },
      {
        source: '/uploads/:path*',
        destination: process.env.BACKEND_URL ? `${process.env.BACKEND_URL.replace('/api', '')}/uploads/:path*` : 'http://localhost:8000/uploads/:path*',
      }
    ];
  },
};

module.exports = nextConfig;
