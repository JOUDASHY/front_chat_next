/** @type {import('next').NextConfig} */
const nextConfig = {
  trailingSlash: true,
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: 'https://back.brine.pro/api/:path*',
      },
    ];
  },
};

module.exports = nextConfig;
