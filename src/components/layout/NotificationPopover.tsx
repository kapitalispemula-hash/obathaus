'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import {
  Bell,
  Check,
  CheckCheck,
  X,
  AlertTriangle,
  ReceiptText,
  Package,
  Truck,
  Clock,
  ExternalLink,
  Inbox,
  AlertCircle,
  ShieldAlert,
} from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { useOutlet } from '@/lib/outlet-context';
import { dbService } from '@/lib/services/database';
import { AppNotification, NotificationCategory, NotificationType } from '@/types/database';

export function NotificationPopover() {
  const router = useRouter();
  const { user, role } = useAuth();
  const { activeOutlet } = useOutlet();

  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [filterTab, setFilterTab] = useState<'all' | 'unread'>('all');
  const [loading, setLoading] = useState(false);

  const popoverRef = useRef<HTMLDivElement>(null);

  const loadNotifications = async () => {
    if (!role) return;
    try {
      const data = await dbService.getNotifications(role, activeOutlet?.id);
      setNotifications(data);
    } catch (err) {
      console.error('Failed to load notifications:', err);
    }
  };

  useEffect(() => {
    loadNotifications();
    const handleUpdate = () => loadNotifications();
    if (typeof window !== 'undefined') {
      window.addEventListener('obathaus_notifications_updated', handleUpdate);
    }
    // Poll every 15s for demo responsiveness
    const interval = setInterval(loadNotifications, 15000);
    return () => {
      clearInterval(interval);
      if (typeof window !== 'undefined') {
        window.removeEventListener('obathaus_notifications_updated', handleUpdate);
      }
    };
  }, [role, activeOutlet?.id]);

  // Click outside to close
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (popoverRef.current && !popoverRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  const handleMarkAsRead = async (id: string, actionUrl?: string | null) => {
    await dbService.markNotificationAsRead(id);
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))
    );
    if (actionUrl) {
      setIsOpen(false);
      router.push(actionUrl);
    }
  };

  const handleMarkAllAsRead = async () => {
    if (!role) return;
    await dbService.markAllNotificationsAsRead(role, activeOutlet?.id);
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
  };

  const formatTimeAgo = (dateStr: string) => {
    try {
      const diffMs = Date.now() - new Date(dateStr).getTime();
      const diffSecs = Math.floor(diffMs / 1000);
      const diffMins = Math.floor(diffSecs / 60);
      const diffHours = Math.floor(diffMins / 60);
      const diffDays = Math.floor(diffHours / 24);

      if (diffSecs < 60) return 'Baru saja';
      if (diffMins < 60) return `${diffMins} mnt lalu`;
      if (diffHours < 24) return `${diffHours} jam lalu`;
      if (diffDays === 1) return 'Kemarin';
      return `${diffDays} hari lalu`;
    } catch (e) {
      return '';
    }
  };

  const getCategoryIcon = (category: NotificationCategory, type: NotificationType) => {
    switch (category) {
      case 'shift':
        return type === 'warning' || type === 'alert' ? (
          <AlertTriangle className="w-4 h-4 text-amber-600" />
        ) : (
          <Clock className="w-4 h-4 text-blue-600" />
        );
      case 'expense':
        return <ReceiptText className="w-4 h-4 text-[#FF6B00]" />;
      case 'inventory':
        return type === 'alert' ? (
          <AlertCircle className="w-4 h-4 text-red-600" />
        ) : (
          <Package className="w-4 h-4 text-amber-600" />
        );
      case 'dispatch':
        return <Truck className="w-4 h-4 text-emerald-600" />;
      case 'order':
        return <Inbox className="w-4 h-4 text-blue-600" />;
      case 'finance':
        return <ShieldAlert className="w-4 h-4 text-red-600" />;
      default:
        return <Bell className="w-4 h-4 text-[#FF6B00]" />;
    }
  };

  const getCategoryBg = (type: NotificationType) => {
    switch (type) {
      case 'alert':
        return 'bg-red-50 border-red-200';
      case 'warning':
        return 'bg-amber-50 border-amber-200';
      case 'success':
        return 'bg-emerald-50 border-emerald-200';
      case 'info':
      default:
        return 'bg-blue-50 border-blue-200';
    }
  };

  const displayedList = notifications.filter((n) =>
    filterTab === 'unread' ? !n.is_read : true
  );

  return (
    <div className="relative" ref={popoverRef}>
      {/* 1. Notification Trigger Button */}
      <button
        type="button"
        onClick={() => {
          setIsOpen((prev) => !prev);
          loadNotifications();
        }}
        className={`relative p-2.5 rounded-xl transition-all cursor-pointer flex items-center justify-center ${
          isOpen
            ? 'bg-[#FFF7ED] text-[#FF6B00] shadow-xs'
            : 'text-[#71717A] hover:text-[#18181B] hover:bg-[#F4F4F5]'
        }`}
        title={`Notifikasi & Peringatan Sistem (${unreadCount} baru)`}
      >
        <Bell className="w-5 h-5" />

        {/* Dynamic Badge Count */}
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 bg-[#FF6B00] text-white text-[10px] font-black rounded-full flex items-center justify-center shadow-xs animate-pulse ring-2 ring-white">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* 2. Floating Popover Panel */}
      {isOpen && (
        <div className="absolute right-0 mt-3 w-80 sm:w-96 bg-white rounded-3xl shadow-2xl border border-borderline overflow-hidden z-50 flex flex-col max-h-[85vh] animate-in fade-in zoom-in-95 duration-150">
          {/* Header */}
          <div className="p-4 bg-white border-b border-borderline flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-black text-heading tracking-tight">
                Pemberitahuan Sistem
              </h3>
              {unreadCount > 0 ? (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#FFF7ED] text-[#FF6B00] border border-[#FED7AA]">
                  {unreadCount} baru
                </span>
              ) : (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                  Semua terbaca
                </span>
              )}
            </div>

            {unreadCount > 0 && (
              <button
                type="button"
                onClick={handleMarkAllAsRead}
                className="text-[11px] font-bold text-[#FF6B00] hover:text-[#EA580C] transition-colors flex items-center gap-1 cursor-pointer"
                title="Tandai semua notifikasi sudah dibaca"
              >
                <CheckCheck className="w-3.5 h-3.5" />
                <span>Baca Semua</span>
              </button>
            )}
          </div>

          {/* Filter Tabs */}
          <div className="flex items-center border-b border-borderline bg-canvas/40 px-3 pt-2">
            <button
              type="button"
              onClick={() => setFilterTab('all')}
              className={`pb-2 px-3 text-xs font-bold border-b-2 transition-all cursor-pointer ${
                filterTab === 'all'
                  ? 'border-[#FF6B00] text-[#FF6B00]'
                  : 'border-transparent text-mutedtext hover:text-heading'
              }`}
            >
              Semua ({notifications.length})
            </button>
            <button
              type="button"
              onClick={() => setFilterTab('unread')}
              className={`pb-2 px-3 text-xs font-bold border-b-2 transition-all cursor-pointer flex items-center gap-1.5 ${
                filterTab === 'unread'
                  ? 'border-[#FF6B00] text-[#FF6B00]'
                  : 'border-transparent text-mutedtext hover:text-heading'
              }`}
            >
              <span>Belum Dibaca</span>
              {unreadCount > 0 && (
                <span className="w-4 h-4 rounded-full bg-[#FF6B00] text-white text-[10px] font-black flex items-center justify-center">
                  {unreadCount}
                </span>
              )}
            </button>
          </div>

          {/* Notifications List */}
          <div className="overflow-y-auto divide-y divide-borderline max-h-[380px] bg-white">
            {displayedList.length === 0 ? (
              <div className="py-12 px-6 text-center">
                <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto mb-2.5">
                  <Check className="w-6 h-6" />
                </div>
                <h4 className="text-xs font-bold text-heading">Tidak ada pemberitahuan</h4>
                <p className="text-[11px] text-mutedtext mt-1 max-w-xs mx-auto">
                  {filterTab === 'unread'
                    ? 'Seluruh pemberitahuan sudah Anda baca. Semua operasional cabang terpantau lancar!'
                    : 'Belum ada notifikasi baru untuk sesi peran Anda.'}
                </p>
              </div>
            ) : (
              displayedList.map((notif) => (
                <div
                  key={notif.id}
                  onClick={() => handleMarkAsRead(notif.id, notif.action_url)}
                  className={`p-3.5 transition-colors cursor-pointer flex items-start gap-3 relative group ${
                    !notif.is_read ? 'bg-[#FFFBF7] hover:bg-[#FFF5ED]' : 'hover:bg-canvas/60'
                  }`}
                >
                  {/* Category Icon Badge */}
                  <div
                    className={`w-9 h-9 rounded-xl border flex items-center justify-center shrink-0 shadow-2xs ${getCategoryBg(
                      notif.type
                    )}`}
                  >
                    {getCategoryIcon(notif.category, notif.type)}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0 pr-2">
                    <div className="flex items-center justify-between gap-1">
                      <h4
                        className={`text-xs truncate tracking-tight ${
                          !notif.is_read ? 'font-black text-heading' : 'font-bold text-heading/80'
                        }`}
                      >
                        {notif.title}
                      </h4>
                      <span className="text-[10px] text-mutedtext shrink-0 whitespace-nowrap font-medium">
                        {formatTimeAgo(notif.created_at)}
                      </span>
                    </div>

                    <p className="text-[11px] text-mutedtext leading-relaxed line-clamp-2 mt-0.5">
                      {notif.message}
                    </p>

                    {notif.action_url && (
                      <div className="mt-2 flex items-center gap-1 text-[11px] font-bold text-[#FF6B00] group-hover:underline">
                        <span>Buka Halaman</span>
                        <ExternalLink className="w-3 h-3" />
                      </div>
                    )}
                  </div>

                  {/* Unread Orange Dot */}
                  {!notif.is_read && (
                    <span className="w-2 h-2 rounded-full bg-[#FF6B00] shrink-0 self-center" />
                  )}
                </div>
              ))
            )}
          </div>

          {/* Footer */}
          <div className="p-3 bg-canvas/40 border-t border-borderline text-center text-[10px] text-mutedtext font-medium">
            Notifikasi real-time terhubung ke database Obat Haus
          </div>
        </div>
      )}
    </div>
  );
}
