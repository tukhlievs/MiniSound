import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Позволяет открывать приложение внутри Telegram WebView
  headers: async () => [
    {
      source: '/(.*)',
      headers: [
        { key: 'X-Frame-Options', value: 'ALLOWALL' },
        { key: 'Content-Security-Policy', value: "frame-ancestors *" },
      ],
    },
  ],
  images: {
    // Обложки приходят через CF Worker — домен задаётся в env
    remotePatterns: [
      { protocol: 'https', hostname: '**' },
    ],
    unoptimized: true,  // В Mini App не нужна оптимизация Vercel
  },
};

export default nextConfig;
