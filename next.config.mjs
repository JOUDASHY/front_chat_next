/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',  // Change from 'export' to 'standalone'
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
