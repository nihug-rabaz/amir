import './globals.css';
import type { Metadata } from 'next';
import { AuthProvider } from '@/lib/auth-context';
import { ToastProvider } from '@/lib/toast';
import { AppShell } from '@/components/AppShell';

export const metadata: Metadata = {
  title: 'אמי״ר 2.0 — ארגון מרחב ייעודי רבנותי',
  description: 'מערכת לניהול ומעקב אחר מלאי ציוד רבנותי בכל מתקן צבאי',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="he" dir="rtl">
      <body>
        <AuthProvider>
          <ToastProvider>
            <AppShell>{children}</AppShell>
          </ToastProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
