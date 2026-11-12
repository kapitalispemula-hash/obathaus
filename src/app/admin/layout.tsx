import type { Metadata, Viewport } from 'next';

export const metadata: Metadata = {
  title: 'Admin Panel - OBAT HAUS',
  description:
    'Panel Administrator Terpusat OBAT HAUS: Dashboard Keuangan, Transaksi Multi-Outlet, Shift Kasir, Persediaan & Absensi.',
  applicationName: 'Admin OBATHAUS',
  appleWebApp: {
    capable: true,
    title: 'Admin OBATHAUS',
    statusBarStyle: 'default',
  },
  manifest: '/manifest-admin.json',
  icons: {
    icon: [
      { url: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: [
      { url: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' },
    ],
  },
};

export const viewport: Viewport = {
  themeColor: '#FF6B00',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function AdminRootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <link rel="manifest" href="/manifest-admin.json" />
      {children}
    </>
  );
}
