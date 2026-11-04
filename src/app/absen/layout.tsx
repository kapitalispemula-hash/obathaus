import type { Metadata, Viewport } from 'next';

export const metadata: Metadata = {
  title: 'Absensi Karyawan - OBAT HAUS',
  description: 'Aplikasi Absensi Digital Mandiri Staf & Barista OBAT HAUS Sulawesi Barat berbasis GPS Geofencing.',
  applicationName: 'Absen Haus',
  appleWebApp: {
    capable: true,
    title: 'Absen Haus',
    statusBarStyle: 'black-translucent',
  },
  manifest: '/manifest-absen.json',
  icons: {
    icon: [
      { url: '/iconappabsen.png', sizes: '192x192', type: 'image/png' },
      { url: '/iconappabsen.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: [
      { url: '/iconappabsen.png', sizes: '180x180', type: 'image/png' },
    ],
  },
};

export const viewport: Viewport = {
  themeColor: '#FF6600',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function AbsenLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <link rel="manifest" href="/manifest-absen.json" />
      <link rel="apple-touch-icon" href="/iconappabsen.png" />
      {children}
    </>
  );
}
