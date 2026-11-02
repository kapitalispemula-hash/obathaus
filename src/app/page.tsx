'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';

export default function RootPage() {
  const router = useRouter();
  const { user, role, isLoading } = useAuth();

  useEffect(() => {
    if (!isLoading) {
      if (!user) {
        router.push('/login');
      } else if (role === 'admin') {
        router.push('/admin/dashboard');
      } else if (role === 'warehouse_operator') {
        router.push('/warehouse/dashboard');
      } else {
        router.push('/pos');
      }
    }
  }, [user, role, isLoading, router]);

  return (
    <div className="min-h-screen bg-canvas flex items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <div className="w-10 h-10 border-3 border-[#FF6B00] border-t-transparent rounded-full animate-spin" />
        <p className="text-xs font-bold text-mutedtext">Memuat Cafe POS...</p>
      </div>
    </div>
  );
}
