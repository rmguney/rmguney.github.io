/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: 'export',
  trailingSlash: true,
  images: {
    unoptimized: true,
  },
  env: {
    HUB_TOKEN: process.env.HUB_TOKEN,
  },
};

export default nextConfig;
