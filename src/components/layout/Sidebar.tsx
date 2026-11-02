'use client';

import React from 'react';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { AdminSidebar } from './AdminSidebar';
import { CashierSidebar } from './CashierSidebar';

export function Sidebar() {
  const pathname = usePathname();
  const { role } = useAuth();

  // If on admin routes, render the Administrator Sidebar
  if (pathname.startsWith('/admin')) {
    return <AdminSidebar />;
  }

  // If in cashier role or on POS routes, render the Cashier Sidebar
  if (role === 'cashier' || pathname.startsWith('/pos')) {
    return <CashierSidebar />;
  }

  return <AdminSidebar />;
}
