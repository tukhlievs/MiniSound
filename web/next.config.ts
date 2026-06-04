import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Статический экспорт для Cloudflare Pages
  // Всё равно весь фронт клиентский — SSR не нужен
  output: 'export',

  // Trailing slash нужен чтобы CF Pages корректно резолвил пути
  trailingSlash: true,

  images: {
    // next/image оптимизация недоступна при static export
    unoptimized: true,
  },

  // headers() не поддерживается в static export —
  // CSP для Telegram WebView выставляется через CF Pages HTTP Headers
  // (Settings → HTTP Headers → X-Frame-Options: ALLOWALL)
};

export default nextConfig;
