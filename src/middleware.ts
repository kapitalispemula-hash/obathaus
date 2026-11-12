import { NextRequest, NextResponse } from 'next/server';
import {
  STAFF_SESSION_COOKIE,
  StaffSessionPayload,
  verifyToken,
} from '@/lib/server/session-token';

function homeRouteForRole(role: StaffSessionPayload['role']): string {
  if (role === 'admin') return '/admin/dashboard';
  if (role === 'warehouse_operator') return '/warehouse/dashboard';
  return '/pos';
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const isAdminRoute = pathname.startsWith('/admin');
  const isPosRoute = pathname.startsWith('/pos');
  const isWarehouseRoute = pathname.startsWith('/warehouse');
  const isLoginRoute = pathname === '/login';

  if (!isAdminRoute && !isPosRoute && !isWarehouseRoute && !isLoginRoute) {
    return NextResponse.next();
  }

  const rawToken = request.cookies.get(STAFF_SESSION_COOKIE)?.value;
  const session = await verifyToken<StaffSessionPayload>(rawToken, 'staff');

  if (isLoginRoute) {
    if (session) {
      return NextResponse.redirect(new URL(homeRouteForRole(session.role), request.url));
    }
    return NextResponse.next();
  }

  if (!session) {
    const loginUrl = new URL('/login', request.url);
    return NextResponse.redirect(loginUrl);
  }

  if (isAdminRoute && session.role !== 'admin') {
    return NextResponse.redirect(new URL(homeRouteForRole(session.role), request.url));
  }

  if (isPosRoute && session.role !== 'cashier' && session.role !== 'admin') {
    return NextResponse.redirect(new URL(homeRouteForRole(session.role), request.url));
  }

  if (isWarehouseRoute && session.role !== 'warehouse_operator' && session.role !== 'admin') {
    return NextResponse.redirect(new URL(homeRouteForRole(session.role), request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/admin/:path*', '/pos/:path*', '/warehouse/:path*', '/login'],
};
