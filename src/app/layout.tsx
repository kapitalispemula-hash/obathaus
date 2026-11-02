import type { Metadata, Viewport } from 'next';
import './globals.css';
import { AuthProvider } from '@/lib/auth-context';
import { OutletProvider } from '@/lib/outlet-context';
import { ShiftProvider } from '@/lib/shift-context';
import { CartProvider } from '@/lib/cart-context';
import { PwaSupport } from '@/components/common/PwaSupport';

export const metadata: Metadata = {
  metadataBase: new URL('https://obathaus.vercel.app'),
  title: {
    default: 'OBATHAUS - Operational System Management',
    template: '%s | OBATHAUS',
  },
  description:
    'Sistem Manajemen Operasional Terpadu, Gudang Logistik & Kasir POS Multi-Cabang Obat Haus (Sulawesi Barat).',
  applicationName: 'OBATHAUS',
  appleWebApp: {
    capable: true,
    title: 'OBATHAUS',
    statusBarStyle: 'default',
  },
  formatDetection: {
    telephone: false,
  },
  manifest: '/manifest.json',
  openGraph: {
    type: 'website',
    locale: 'id_ID',
    url: 'https://obathaus.vercel.app',
    siteName: 'OBATHAUS',
    title: 'OBATHAUS - Operational System Management',
    description:
      'Sistem Manajemen Operasional Terpadu, Gudang Logistik & Kasir POS Multi-Cabang Obat Haus (Sulawesi Barat).',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'OBATHAUS - Operational System Management',
    description:
      'Sistem Manajemen Operasional Terpadu, Gudang Logistik & Kasir POS Multi-Cabang Obat Haus (Sulawesi Barat).',
  },
  icons: {
    icon: [
      { url: '/favicon.ico' },
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

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="id" className="h-full">
      <body className="h-full bg-canvas text-heading antialiased selection:bg-[#FF6B00] selection:text-white">
        <AuthProvider>
          <OutletProvider>
            <ShiftProvider>
              <CartProvider>
                <PwaSupport />
                {children}
              </CartProvider>
            </ShiftProvider>
          </OutletProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
