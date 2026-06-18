/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  trailingSlash: true,
  images: {
    domains: [
      '192.168.1.187',
      'localhost',
      'chat-beast.vercel.app',
      'ui-avatars.com',
      // Ajoutez ici d'autres domaines si nécessaire
    ],
    deviceSizes: [320, 420, 768, 1024, 1200],
    imageSizes: [16, 32, 48, 64, 96, 128, 256],
    formats: ['image/webp'],
    remotePatterns: [
      {
        protocol: 'http',
        hostname: '**',
      },
      {
        protocol: 'https',
        hostname: '**',
      },
    ],
  },
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
