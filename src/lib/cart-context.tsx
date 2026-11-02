'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { Product, StoreSettings } from '@/types/database';
import { dbService } from '@/lib/services/database';

export interface CartItem {
  product: Product;
  quantity: number;
  notes?: string;
}

interface CartContextType {
  items: CartItem[];
  addItem: (product: Product, quantity?: number) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  removeItem: (productId: string) => void;
  updateItemNotes: (productId: string, notes: string) => void;
  clearCart: () => void;
  orderNotes: string;
  setOrderNotes: (notes: string) => void;
  discountAmount: number;
  setDiscountAmount: (discount: number) => void;
  discountPercentage: number;
  setDiscountPercentage: (pct: number) => void;
  settings: StoreSettings | null;
  refreshSettings: () => Promise<void>;
  // Calculations
  subtotal: number;
  discountTotal: number;
  taxTotal: number;
  grandTotal: number;
  itemCount: number;
}

const CartContext = createContext<CartContextType | null>(null);

const CART_STORAGE_KEY = 'cafepos_active_cart';
const CART_NOTES_KEY = 'cafepos_cart_notes';
const CART_DISCOUNT_KEY = 'cafepos_cart_discount';

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [orderNotes, setOrderNotes] = useState<string>('');
  const [discountAmount, setDiscountAmountState] = useState<number>(0);
  const [discountPercentage, setDiscountPercentageState] = useState<number>(0);
  const [settings, setSettings] = useState<StoreSettings | null>(null);

  // Load store settings
  const refreshSettings = async () => {
    try {
      const s = await dbService.getStoreSettings();
      setSettings(s);
    } catch (err) {
      console.error('Failed to load store settings:', err);
    }
  };

  useEffect(() => {
    refreshSettings();

    const handleSettingsUpdate = () => {
      refreshSettings();
    };

    window.addEventListener('cafepos_settings_updated', handleSettingsUpdate);
    window.addEventListener('storage', handleSettingsUpdate);

    // Restore cart from storage if available
    try {
      const stored = localStorage.getItem(CART_STORAGE_KEY);
      if (stored) setItems(JSON.parse(stored));
      const storedNotes = localStorage.getItem(CART_NOTES_KEY);
      if (storedNotes) setOrderNotes(storedNotes);
      const storedDiscount = localStorage.getItem(CART_DISCOUNT_KEY);
      if (storedDiscount) setDiscountAmountState(Number(storedDiscount));
    } catch (e) {
      console.warn('Could not restore cart:', e);
    }

    return () => {
      window.removeEventListener('cafepos_settings_updated', handleSettingsUpdate);
      window.removeEventListener('storage', handleSettingsUpdate);
    };
  }, []);

  // Dynamic browser tab title synced with store settings
  useEffect(() => {
    if (typeof document !== 'undefined' && settings?.store_name) {
      document.title = `${settings.store_name} — Point of Sale & Financial Analytics`;
    }
  }, [settings?.store_name]);

  // Dynamic browser tab favicon (URL bar icon) synced with store settings
  useEffect(() => {
    if (typeof document === 'undefined') return;
    const faviconUrl = settings?.logo_url;
    if (faviconUrl) {
      // Find or create favicon link
      let link: HTMLLinkElement | null = document.querySelector("link[rel*='icon']");
      if (!link) {
        link = document.createElement('link');
        link.rel = 'icon';
        document.head.appendChild(link);
      }
      link.type = 'image/png';
      link.href = faviconUrl;

      // Also update shortcut icon
      let shortcutLink: HTMLLinkElement | null = document.querySelector("link[rel='shortcut icon']");
      if (shortcutLink) {
        shortcutLink.href = faviconUrl;
      }

      // Also update apple-touch-icon
      let appleLink: HTMLLinkElement | null = document.querySelector("link[rel='apple-touch-icon']");
      if (appleLink) {
        appleLink.href = faviconUrl;
      }
    }
  }, [settings?.logo_url]);

  // Persist cart
  useEffect(() => {
    try {
      localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(items));
      localStorage.setItem(CART_NOTES_KEY, orderNotes);
      localStorage.setItem(CART_DISCOUNT_KEY, String(discountAmount));
    } catch (e) {
      console.warn('Could not persist cart:', e);
    }
  }, [items, orderNotes, discountAmount]);

  const addItem = (product: Product, quantity = 1) => {
    if (!product.is_active) return;
    setItems((prev) => {
      const existing = prev.find((i) => i.product.id === product.id);
      if (existing) {
        return prev.map((i) =>
          i.product.id === product.id ? { ...i, quantity: i.quantity + quantity } : i
        );
      }
      return [...prev, { product, quantity, notes: '' }];
    });
  };

  const updateQuantity = (productId: string, quantity: number) => {
    if (quantity <= 0) {
      removeItem(productId);
      return;
    }
    setItems((prev) =>
      prev.map((i) => (i.product.id === productId ? { ...i, quantity: Math.floor(quantity) } : i))
    );
  };

  const removeItem = (productId: string) => {
    setItems((prev) => prev.filter((i) => i.product.id !== productId));
  };

  const updateItemNotes = (productId: string, notes: string) => {
    setItems((prev) =>
      prev.map((i) => (i.product.id === productId ? { ...i, notes } : i))
    );
  };

  const clearCart = () => {
    setItems([]);
    setOrderNotes('');
    setDiscountAmountState(0);
    setDiscountPercentageState(0);
    try {
      localStorage.removeItem(CART_STORAGE_KEY);
      localStorage.removeItem(CART_NOTES_KEY);
      localStorage.removeItem(CART_DISCOUNT_KEY);
    } catch (e) {}
  };

  const setDiscountAmount = (val: number) => {
    setDiscountAmountState(Math.max(0, val));
    setDiscountPercentageState(0);
  };

  const setDiscountPercentage = (pct: number) => {
    setDiscountPercentageState(Math.max(0, Math.min(100, pct)));
    setDiscountAmountState(0);
  };

  // Calculations
  const subtotal = items.reduce((sum, item) => sum + item.product.selling_price * item.quantity, 0);
  const itemCount = items.reduce((sum, item) => sum + item.quantity, 0);

  let discountTotal = 0;
  if (settings?.discount_enabled) {
    if (discountPercentage > 0) {
      const allowedPct = Math.min(discountPercentage, settings.max_discount_percentage || 100);
      discountTotal = Math.round((subtotal * allowedPct) / 100);
    } else if (discountAmount > 0) {
      const maxAllowed = (subtotal * (settings.max_discount_percentage || 100)) / 100;
      discountTotal = Math.min(discountAmount, maxAllowed);
    }
  }

  const netAfterDiscount = Math.max(0, subtotal - discountTotal);
  let taxTotal = 0;
  let grandTotal = 0;

  if (settings && settings.tax_percentage > 0) {
    if (settings.is_tax_inclusive) {
      taxTotal = Math.round((netAfterDiscount * settings.tax_percentage) / (100 + settings.tax_percentage));
      grandTotal = netAfterDiscount;
    } else {
      taxTotal = Math.round((netAfterDiscount * settings.tax_percentage) / 100);
      grandTotal = netAfterDiscount + taxTotal;
    }
  } else {
    grandTotal = netAfterDiscount;
  }

  return (
    <CartContext.Provider
      value={{
        items,
        addItem,
        updateQuantity,
        removeItem,
        updateItemNotes,
        clearCart,
        orderNotes,
        setOrderNotes,
        discountAmount,
        setDiscountAmount,
        discountPercentage,
        setDiscountPercentage,
        settings,
        refreshSettings,
        subtotal,
        discountTotal,
        taxTotal,
        grandTotal,
        itemCount,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
}
