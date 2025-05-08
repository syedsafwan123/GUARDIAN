/** @type {import('next').NextConfig} */
const nextConfig = {
    reactStrictMode: true,
    swcMinify: true,
    // Set output to standalone to ensure proper bundling
    output: 'standalone',
  };
  
  export default nextConfig;