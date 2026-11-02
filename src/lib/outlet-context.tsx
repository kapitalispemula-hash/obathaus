'use client';

import React, { createContext, useContext, useEffect, useState, useMemo } from 'react';
import { Outlet, Warehouse } from '@/types/database';
import { dbService } from '@/lib/services/database';
import { useAuth } from '@/lib/auth-context';

interface OutletContextType {
  activeOutlet: Outlet | null;
  activeWarehouse: Warehouse | null;
  availableOutlets: Outlet[];
  availableWarehouses: Warehouse[];
  isAdmin: boolean;
  isAllOutletsSelected: boolean;
  setActiveOutletId: (outletId: string | 'all') => void;
  setActiveWarehouseId: (warehouseId: string) => void;
  refreshOutlets: () => Promise<void>;
  isLoading: boolean;
}

const OutletContext = createContext<OutletContextType | undefined>(undefined);

const ACTIVE_OUTLET_STORAGE_KEY = 'obathaus_active_outlet_id';
const ACTIVE_WAREHOUSE_STORAGE_KEY = 'obathaus_active_warehouse_id';

export function OutletProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [availableOutlets, setAvailableOutlets] = useState<Outlet[]>([]);
  const [availableWarehouses, setAvailableWarehouses] = useState<Warehouse[]>([]);
  const [selectedOutletId, setSelectedOutletId] = useState<string | 'all'>('all');
  const [selectedWarehouseId, setSelectedWarehouseId] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);

  const isAdmin = user?.role === 'admin';

  const refreshOutlets = async () => {
    try {
      const [outlets, warehouses] = await Promise.all([
        dbService.getOutlets(),
        dbService.getWarehouses(),
      ]);
      setAvailableOutlets(outlets.filter((o) => o.is_active));
      setAvailableWarehouses(warehouses.filter((w) => w.is_active));
    } catch (err) {
      console.warn('Error refreshing outlets/warehouses:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    refreshOutlets();
  }, []);

  // Determine active outlet based on user role and selection
  useEffect(() => {
    if (!user) return;

    if (user.role === 'admin') {
      // Admin can select 'all' or specific outlet
      if (typeof window !== 'undefined') {
        const saved = localStorage.getItem(ACTIVE_OUTLET_STORAGE_KEY);
        if (saved) {
          setSelectedOutletId(saved);
        }
      }
    } else if (user.role === 'cashier') {
      // Cashier is strictly bound to assigned primary_outlet_id or first available outlet
      const targetId = user.primary_outlet_id || (availableOutlets[0]?.id ?? '');
      setSelectedOutletId(targetId);
    } else if (user.role === 'warehouse_operator') {
      // Warehouse operator is bound to primary_warehouse_id
      const targetWhId = user.primary_warehouse_id || (availableWarehouses[0]?.id ?? '');
      setSelectedWarehouseId(targetWhId);
    }
  }, [user, availableOutlets, availableWarehouses]);

  const setActiveOutletId = (outletId: string | 'all') => {
    if (!isAdmin && user?.role === 'cashier') return; // Cannot override if cashier
    setSelectedOutletId(outletId);
    if (typeof window !== 'undefined') {
      localStorage.setItem(ACTIVE_OUTLET_STORAGE_KEY, outletId);
    }
  };

  const setActiveWarehouseId = (warehouseId: string) => {
    setSelectedWarehouseId(warehouseId);
    if (typeof window !== 'undefined') {
      localStorage.setItem(ACTIVE_WAREHOUSE_STORAGE_KEY, warehouseId);
    }
  };

  const activeOutlet = useMemo(() => {
    if (selectedOutletId === 'all') return null;
    return availableOutlets.find((o) => o.id === selectedOutletId) || null;
  }, [selectedOutletId, availableOutlets]);

  const activeWarehouse = useMemo(() => {
    return availableWarehouses.find((w) => w.id === selectedWarehouseId) || availableWarehouses[0] || null;
  }, [selectedWarehouseId, availableWarehouses]);

  const isAllOutletsSelected = selectedOutletId === 'all';

  return (
    <OutletContext.Provider
      value={{
        activeOutlet,
        activeWarehouse,
        availableOutlets,
        availableWarehouses,
        isAdmin,
        isAllOutletsSelected,
        setActiveOutletId,
        setActiveWarehouseId,
        refreshOutlets,
        isLoading,
      }}
    >
      {children}
    </OutletContext.Provider>
  );
}

export function useOutlet() {
  const context = useContext(OutletContext);
  if (!context) {
    throw new Error('useOutlet must be used within an OutletProvider');
  }
  return context;
}
