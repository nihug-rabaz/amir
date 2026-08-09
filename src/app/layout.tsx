import './globals.css';
import type { Metadata, Viewport } from 'next';
import { AuthProvider } from '@/lib/auth-context';
import { ToastProvider } from '@/lib/toast';
import { PwaInstallProvider } from '@/lib/pwa-install';
import { AppShell } from '@/components/AppShell';
import { PwaInstallPrompt } from '@/components/PwaInstallPrompt';

export const metadata: Metadata = {
  title: 'אמי״ר 2.0 — ארגון מרחב ייעודי רבנותי',
  description: 'מערכת לניהול ומעקב אחר מלאי ציוד רבנותי בכל מתקן צבאי',
  applicationName: 'אמי״ר',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'אמי״ר',
  },
  icons: {
    icon: [
      { url: '/favicon.jpg' },
      { url: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: [{ url: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' }],
  },
  formatDetection: {
    telephone: false,
  },
};

export const viewport: Viewport = {
  themeColor: '#173a5e',
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="he" dir="rtl">
      <body>
        <AuthProvider>
          <ToastProvider>
            <PwaInstallProvider>
              <AppShell>{children}</AppShell>
              <PwaInstallPrompt />
            </PwaInstallProvider>
          </ToastProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
