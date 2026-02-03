/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@pristav-radosti/shared'],
  // API proxy is in src/app/api/[...path]/route.ts (forwards body correctly in dev)
  // PWA configuration
  // Note: For full PWA support, you'll need next-pwa package
};

module.exports = nextConfig;
