import { ImageResponse } from 'next/og';

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
            width: 400,
            height: 400,
            borderRadius: '50%',
            backgroundColor: 'rgba(255, 107, 0, 0.12)',
            filter: 'blur(80px)',
            top: 60,
          }}
        />

        {/* Bullseye Target Logo Card */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 140,
            height: 140,
            borderRadius: 36,
            backgroundColor: '#FFFFFF',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(255, 255, 255, 0.1)',
            marginBottom: 28,
          }}
        >
          <svg width="84" height="84" viewBox="0 0 44 44" fill="none">
            <circle cx="22" cy="22" r="18" stroke="#FF6B00" strokeWidth="3.5" strokeLinecap="round" />
            <circle cx="22" cy="22" r="10" stroke="#FF6B00" strokeWidth="3.5" strokeLinecap="round" />
            <circle cx="22" cy="22" r="3" fill="#FF6B00" />
          </svg>
        </div>

        {/* Title */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            fontSize: 56,
            fontWeight: 900,
            color: '#FFFFFF',
            letterSpacing: -1,
            textTransform: 'uppercase',
            marginBottom: 8,
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
            border: '1px solid rgba(255, 107, 0, 0.4)',
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
