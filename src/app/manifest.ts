import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'אמי״ר 2.0 — ארגון מרחב ייעודי רבנותי',
    short_name: 'אמי״ר',
    description: 'מערכת לניהול ומעקב אחר מלאי ציוד רבנותי בכל מתקן צבאי',
    start_url: '/dashboard',
    scope: '/',
    display: 'standalone',
    orientation: 'any',
    background_color: '#0f2a44',
    theme_color: '#173a5e',
    dir: 'rtl',
    lang: 'he',
    icons: [
      {
        src: '/icons/icon-192.png',
        sizes: '192x192',
        type: 'image/png',
      },
      {
        src: '/icons/icon-512.png',
        sizes: '512x512',
        type: 'image/png',
      },
      {
        src: '/icons/icon-512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
    ],
  };
}
