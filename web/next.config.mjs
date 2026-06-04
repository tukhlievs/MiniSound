/** @type {import('next').NextConfig} */
const nextConfig = {
  // Статический экспорт для Cloudflare Workers + Assets
  output: 'export',

  // Trailing slash нужен чтобы CF корректно резолвил пути
  trailingSlash: true,

  images: {
    // next/image оптимизация недоступна при static export
    unoptimized: true,
  },
};

export default nextConfig;
