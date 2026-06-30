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
      // Ne pas rediriger /api/ai/* vers le backend Django
      {
        source: '/api/ai',
        destination: '/api/ai',
      },
      {
        source: '/api/ai/',
        destination: '/api/ai/',
      },
      {
        source: '/api/ai/:path*',
        destination: '/api/ai/:path*',
      },
      // Tout autre /api/* va vers le backend Django
      {
        source: '/api/:path*',
        destination: 'https://back.brine.pro/api/:path*',
      },
    ];
  },
};

module.exports = nextConfig;
