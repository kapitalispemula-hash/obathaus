'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { CashierShift } from '@/types/database';
import { dbService } from '@/lib/services/database';
import { useAuth } from '@/lib/auth-context';
import { useOutlet } from '@/lib/outlet-context';
import { ShiftControlModal } from '@/components/pos/ShiftControlModal';

interface ShiftContextType {
  activeShift: CashierShift | null;
  isLoadingShift: boolean;
  isShiftModalOpen: boolean;
  shiftModalInitialTab: 'open' | 'movement' | 'close';
  openShiftModal: (tab?: 'open' | 'movement' | 'close') => void;
  closeShiftModal: () => void;
  refreshActiveShift: () => Promise<void>;
}

const ShiftContext = createContext<ShiftContextType | undefined>(undefined);

export function ShiftProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const { activeOutlet } = useOutlet();

  const [activeShift, setActiveShift] = useState<CashierShift | null>(null);
  const [isLoadingShift, setIsLoadingShift] = useState<boolean>(true);
  const [isShiftModalOpen, setIsShiftModalOpen] = useState<boolean>(false);
  const [shiftModalInitialTab, setShiftModalInitialTab] = useState<'open' | 'movement' | 'close'>('movement');

  const refreshActiveShift = useCallback(async () => {
    if (!user) {
      setActiveShift(null);
      setIsLoadingShift(false);
      return;
    }
    try {
      setIsLoadingShift(true);
      const shift = await dbService.getActiveShift(user.id, activeOutlet?.id);
      setActiveShift(shift);
    } catch (err) {
      console.error('Failed to load active cashier shift:', err);
      setActiveShift(null);
    } finally {
      setIsLoadingShift(false);
    }
  }, [user, activeOutlet?.id]);

  useEffect(() => {
    refreshActiveShift();
  }, [refreshActiveShift]);

  const openShiftModal = useCallback((tab: 'open' | 'movement' | 'close' = 'movement') => {
    setShiftModalInitialTab(tab);
    setIsShiftModalOpen(true);
  }, []);

  const closeShiftModal = useCallback(() => {
    setIsShiftModalOpen(false);
  }, []);

  return (
    <ShiftContext.Provider
      value={{
        activeShift,
        isLoadingShift,
        isShiftModalOpen,
        shiftModalInitialTab,
        openShiftModal,
        closeShiftModal,
        refreshActiveShift,
      }}
    >
      {children}

      {/* Global Cashier Shift Modal */}
      {isShiftModalOpen && (
        <ShiftControlModal
          isOpen={isShiftModalOpen}
          onClose={closeShiftModal}
          activeShift={activeShift}
          onShiftUpdated={async () => {
            await refreshActiveShift();
          }}
          initialTab={shiftModalInitialTab}
        />
      )}
    </ShiftContext.Provider>
  );
}

export function useShift() {
  const context = useContext(ShiftContext);
  if (!context) {
    throw new Error('useShift must be used within a ShiftProvider');
  }
  return context;
}
