import type { Metadata, Viewport } from 'next';
import './globals.css';
import { AuthProvider } from '@/lib/auth-context';
import { OutletProvider } from '@/lib/outlet-context';
import { ShiftProvider } from '@/lib/shift-context';
import { CartProvider } from '@/lib/cart-context';
import { PwaSupport } from '@/components/common/PwaSupport';

export const metadata: Metadata = {
  title: 'Cafe POS — Point of Sale & Financial Analytics',
  description: 'Aplikasi Kasir Modern & Analisis Finansial Cafe: HPP Snapshot, Gross Profit & Net Operating Profit.',
  manifest: '/manifest.json',
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
