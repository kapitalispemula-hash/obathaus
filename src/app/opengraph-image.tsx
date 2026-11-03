import { ImageResponse } from 'next/og';
import { OBATHAUS_LOGO_BASE64 } from '@/lib/logo-base64';

export const runtime = 'edge';
export const alt = 'OBATHAUS - Operational System Management';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default async function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#0F172A',
          backgroundImage: 'radial-gradient(circle at 50% 25%, #1E293B 0%, #090D16 100%)',
          fontFamily: 'sans-serif',
          padding: '40px 60px',
        }}
      >
        {/* Glowing aura background */}
        <div
          style={{
            position: 'absolute',
            width: 440,
            height: 440,
            borderRadius: '50%',
            backgroundColor: 'rgba(255, 107, 0, 0.15)',
            filter: 'blur(90px)',
            top: 50,
          }}
        />

        {/* Official OBAT HAUS Brand Logo */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 150,
            height: 150,
            borderRadius: 36,
            overflow: 'hidden',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.6), 0 0 0 1px rgba(255, 255, 255, 0.15)',
            marginBottom: 24,
            backgroundColor: '#FF6B00',
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={OBATHAUS_LOGO_BASE64}
            alt="OBAT HAUS Logo"
            width="150"
            height="150"
            style={{ objectFit: 'contain' }}
          />
        </div>

        {/* Title */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            fontSize: 54,
            fontWeight: 900,
            color: '#FFFFFF',
            letterSpacing: -1,
            textTransform: 'uppercase',
            marginBottom: 10,
          }}
        >
          <span>OBAT</span>
          <span style={{ color: '#FF6B00', marginLeft: 12 }}>HAUS</span>
        </div>

        {/* Subtitle Badge */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            backgroundColor: 'rgba(255, 107, 0, 0.15)',
            border: '1px solid rgba(255, 107, 0, 0.45)',
            borderRadius: 9999,
            padding: '8px 24px',
            marginBottom: 20,
          }}
        >
          <span
            style={{
              fontSize: 18,
              fontWeight: 700,
              color: '#FF8A3D',
              letterSpacing: 2,
              textTransform: 'uppercase',
            }}
          >
            Operational System Management
          </span>
        </div>

        {/* Tagline / Outlets note */}
        <div
          style={{
            display: 'flex',
            fontSize: 20,
            color: '#94A3B8',
            textAlign: 'center',
            maxWidth: 780,
            lineHeight: 1.5,
          }}
        >
          Sistem Terintegrasi Kasir POS, Gudang Logistik & 7 Cabang Outlet Resmi • Sulawesi Barat
        </div>
      </div>
    ),
    { ...size }
  );
}
