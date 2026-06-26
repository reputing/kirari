/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Load Google Fonts at runtime via the <link> tag in app/layout.tsx
  // instead of Next inlining them at build time.
  optimizeFonts: false,
};

module.exports = nextConfig;
