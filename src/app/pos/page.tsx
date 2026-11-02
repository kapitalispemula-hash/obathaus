'use client';

import React, { useState, useEffect } from 'react';
import { CashierLayout } from '@/components/layout/CashierLayout';
import { ProductCard } from '@/components/pos/ProductCard';
import { CartPanel } from '@/components/pos/CartPanel';
import { CheckoutModal } from '@/components/pos/CheckoutModal';
import { TransactionSuccessModal } from '@/components/pos/TransactionSuccessModal';
import { ReceiptModal } from '@/components/receipt/ReceiptModal';
import { useCart } from '@/lib/cart-context';
import { useShift } from '@/lib/shift-context';
import { dbService } from '@/lib/services/database';
import { Category, Product, Transaction, PaymentMethod } from '@/types/database';
import {
  ShoppingBag,
  X,
  Coffee,
  ChevronRight,
  LayoutGrid,
} from 'lucide-react';
import { formatRupiah } from '@/lib/format';
import { CategoryIcon } from '@/components/common/CategoryIcon';
import { INITIAL_CATEGORIES, INITIAL_PRODUCTS } from '@/lib/mock-data';

export default function PosPage() {
  const { addItem, items, itemCount, grandTotal, settings, orderNotes, setOrderNotes } = useCart();
  const { activeShift, openShiftModal, refreshActiveShift } = useShift();
  const [categories, setCategories] = useState<Category[]>(INITIAL_CATEGORIES);
  const [products, setProducts] = useState<Product[]>(INITIAL_PRODUCTS);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);

  // Notes Modal state
  const [isNotesModalOpen, setIsNotesModalOpen] = useState(false);
  const [tempNotes, setTempNotes] = useState('');

  // Modals state
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [checkoutInitialMethod, setCheckoutInitialMethod] = useState<PaymentMethod>('debit');
  const [isMobileCartOpen, setIsMobileCartOpen] = useState(false);
  const [recentTransaction, setRecentTransaction] = useState<Transaction | null>(null);
  const [isSuccessOpen, setIsSuccessOpen] = useState(false);
  const [isReceiptOpen, setIsReceiptOpen] = useState(false);

  useEffect(() => {
    async function loadCatalog() {
      try {
        const [cats, prods] = await Promise.all([
          dbService.getCategories(true),
          dbService.getProducts({ onlyActive: true }),
        ]);
        if (cats && cats.length > 0) setCategories(cats);
        if (prods && prods.length > 0) setProducts(prods);
      } catch (err) {
        console.error('Failed to load POS catalog:', err);
      }
    }
    loadCatalog();
  }, []);

  const currentCategoryName =
    selectedCategory === 'all'
      ? 'All'
      : categories.find((c) => c.id === selectedCategory)?.name || 'Menu';

  // Filter products by category & search
  const filteredProducts = (products || [])
    .filter((p) => Boolean(p && p.id && p.name))
    .filter((p) => {
      const name = (p.name || '').toLowerCase();
      const sku = (p.sku || '').toLowerCase();
      const q = (searchQuery || '').toLowerCase();
      const matchesCat = selectedCategory === 'all' || p.category_id === selectedCategory;
      const matchesSearch = !q || name.includes(q) || sku.includes(q);
      return matchesCat && matchesSearch;
    });

  // Featured Popular Items (first 4 items)
  const popularItems = filteredProducts.slice(0, 4);
  const remainingItems = filteredProducts.length > 4 ? filteredProducts.slice(4) : filteredProducts;

  const handleAddToCart = (product: Product) => {
    addItem(product, 1);
  };

  const handleOpenCheckoutWithMethod = (method?: 'cash' | 'debit' | 'qris') => {
    if (!activeShift) {
      openShiftModal('open');
      return;
    }
    setCheckoutInitialMethod(method || 'debit');
    setIsCheckoutOpen(true);
  };

  const handleCheckoutSuccess = (trx: Transaction) => {
    setIsCheckoutOpen(false);
    setIsMobileCartOpen(false);
    setRecentTransaction(trx);
    setIsSuccessOpen(true);
    refreshActiveShift();
  };

  return (
    <CashierLayout
      searchQuery={searchQuery}
      onSearchChange={setSearchQuery}
      onOpenNotes={() => {
        setTempNotes(orderNotes);
        setIsNotesModalOpen(true);
      }}
    >
      <div className="flex h-full overflow-hidden p-4 sm:p-6 lg:p-7 gap-6 bg-white">
        {/* ========================================================
            Catalog Main Column (Matching Fast Food Reference Design)
        ======================================================== */}
        <div className="flex-1 flex flex-col min-w-0 overflow-y-auto pr-1">
          {/* 1. Menu Category Section */}
          <div className="mb-7">
            <div className="flex items-center justify-between mb-3.5">
              <h2 className="text-base sm:text-lg font-black text-[#1E2022] tracking-tight">
                Menu Category
              </h2>
            </div>

            {/* Category Cards (Horizontal scrolling row of rounded square cards) */}
            <div className="flex items-center gap-3.5 overflow-x-auto pb-3 scrollbar-none shrink-0 pt-1">
              {/* All / Popular */}
              <button
                type="button"
                onClick={() => setSelectedCategory('all')}
                className={`min-w-[80px] w-[80px] h-[92px] sm:min-w-[88px] sm:w-[88px] sm:h-[100px] rounded-2xl flex flex-col items-center justify-center gap-2 transition-all cursor-pointer shrink-0 ${
                  selectedCategory === 'all'
                    ? 'bg-[#FF6B00] text-white shadow-lg shadow-orange-500/25 ring-2 ring-[#FF6B00]/20 scale-102'
                    : 'bg-white border border-[#F0F0F0] text-[#71717A] hover:text-[#18181B] hover:border-[#E4E4E7] shadow-xs hover:shadow-md'
                }`}
              >
                <div
                  className={`w-9 h-9 rounded-xl flex items-center justify-center ${
                    selectedCategory === 'all' ? 'bg-white/20 text-white' : 'bg-[#FAFAFA] text-[#71717A]'
                  }`}
                >
                  <LayoutGrid className="w-4 h-4" />
                </div>
                <span className="text-[11px] font-bold text-center leading-tight">
                  All
                </span>
              </button>

              {/* Dynamic Categories */}
              {categories.map((cat) => {
                const isSelected = selectedCategory === cat.id;
                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setSelectedCategory(cat.id)}
                    className={`min-w-[80px] w-[80px] h-[92px] sm:min-w-[88px] sm:w-[88px] sm:h-[100px] rounded-2xl flex flex-col items-center justify-center gap-2 transition-all cursor-pointer shrink-0 px-1 ${
                      isSelected
                        ? 'bg-[#FF6B00] text-white shadow-lg shadow-orange-500/25 ring-2 ring-[#FF6B00]/20 scale-102'
                        : 'bg-white border border-[#F0F0F0] text-[#71717A] hover:text-[#18181B] hover:border-[#E4E4E7] shadow-xs hover:shadow-md'
                    }`}
                  >
                    <div
                      className={`w-9 h-9 rounded-xl flex items-center justify-center ${
                        isSelected ? 'bg-white/20 text-white' : 'bg-[#FAFAFA] text-[#71717A]'
                      }`}
                    >
                      <CategoryIcon
                        iconName={cat.icon_name}
                        categoryName={cat.name}
                        className="w-4 h-4"
                      />
                    </div>
                    <span className="text-[11px] font-bold text-center leading-tight line-clamp-1">
                      {cat.name}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 2. Most Popular Section (4 Columns Grid) */}
          {selectedCategory === 'all' && popularItems.length > 0 && !searchQuery && (
            <div className="mb-7">
              <div className="flex items-center justify-between mb-3.5">
                <h3 className="text-base font-black text-[#1E2022] tracking-tight">
                  Most Popular
                </h3>
                <span className="text-xs font-bold text-[#9CA3AF] hover:text-[#FF6B00] cursor-pointer flex items-center gap-0.5">
                  See All <ChevronRight className="w-3.5 h-3.5" />
                </span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-4">
                {popularItems.map((product) => {
                  const cartItem = items.find((i) => i.product.id === product.id);
                  return (
                    <ProductCard
                      key={`pop-${product.id}`}
                      product={product}
                      cartQuantity={cartItem?.quantity || 0}
                      onAddToCart={handleAddToCart}
                    />
                  );
                })}
              </div>
            </div>
          )}

          {/* 3. Main Catalog Section ("Semua Menu / {Category} Menu") */}
          <div className="flex-1 pb-16 md:pb-4">
            <div className="flex items-center justify-between mb-3.5">
              <h3 className="text-base font-black text-[#1E2022] tracking-tight">
                {selectedCategory === 'all' ? 'All Menu' : `${currentCategoryName} Menu`}
              </h3>
              <span className="text-xs font-bold text-[#9CA3AF] hover:text-[#FF6B00] cursor-pointer flex items-center gap-0.5">
                {filteredProducts.length} items
              </span>
            </div>

            {filteredProducts.length === 0 ? (
              <div className="py-20 text-center bg-[#FBFBFC] rounded-3xl border border-[#ECEEF1] p-8">
                <Coffee className="w-10 h-10 text-[#9CA3AF] mx-auto mb-2" />
                <h4 className="font-bold text-[#1E2022] text-sm">Menu tidak ditemukan</h4>
                <p className="text-xs text-[#9CA3AF] mt-1">
                  Coba cari dengan kata kunci lain atau pilih kategori berbeda.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-4">
                {(selectedCategory === 'all' && !searchQuery ? remainingItems : filteredProducts).map(
                  (product) => {
                    const cartItem = items.find((i) => i.product.id === product.id);
                    return (
                      <ProductCard
                        key={product.id}
                        product={product}
                        cartQuantity={cartItem?.quantity || 0}
                        onAddToCart={handleAddToCart}
                      />
                    );
                  }
                )}
              </div>
            )}
          </div>
        </div>

        {/* ========================================================
            Right Column: "My Order" (Cart & Checkout Panel)
        ======================================================== */}
        <div className="hidden lg:block w-80 xl:w-96 shrink-0 h-full">
          <CartPanel
            onOpenCheckout={(method) => handleOpenCheckoutWithMethod(method)}
          />
        </div>
      </div>

      {/* Mobile Floating Cart Summary Button */}
      {items.length > 0 && (
        <div className="lg:hidden fixed bottom-4 right-4 z-40">
          <button
            type="button"
            onClick={() => setIsMobileCartOpen(true)}
            className="px-5 py-3 bg-[#FF6B00] hover:bg-[#EA580C] text-white text-xs font-bold rounded-2xl shadow-xl shadow-orange-500/30 flex items-center gap-2.5 cursor-pointer active:scale-95 transition-all"
          >
            <ShoppingBag className="w-4 h-4" />
            <span>
              My Order ({itemCount}) &bull; {formatRupiah(grandTotal)}
            </span>
          </button>
        </div>
      )}

      {/* Mobile Cart Bottom Sheet */}
      {isMobileCartOpen && (
        <div className="lg:hidden fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex flex-col justify-end">
          <div className="bg-white rounded-t-[32px] max-h-[90vh] flex flex-col overflow-hidden animate-slideUp">
            <CartPanel
              isMobileModal={true}
              onCloseMobileModal={() => setIsMobileCartOpen(false)}
              onOpenCheckout={(method) => {
                setIsMobileCartOpen(false);
                handleOpenCheckoutWithMethod(method);
              }}
            />
          </div>
        </div>
      )}

      {/* Order Notes Modal */}
      {isNotesModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl border border-[#ECEEF1] overflow-hidden p-6 space-y-4">
            <h3 className="font-extrabold text-[#1E2022] text-base">Catatan Pesanan Meja</h3>
            <textarea
              value={tempNotes}
              onChange={(e) => setTempNotes(e.target.value)}
              rows={3}
              placeholder="Contoh: Meja 04, Less Ice, Extra Shot..."
              className="w-full text-xs sm:text-sm p-3 bg-[#F8F9FA] border border-[#ECEEF1] rounded-2xl text-[#1E2022] focus:outline-none focus:ring-2 focus:ring-[#FF6B00]/20 focus:border-[#FF6B00]"
            />
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsNotesModalOpen(false)}
                className="px-4 py-2 text-xs font-bold text-[#8F95B2] hover:text-[#1E2022]"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={() => {
                  setOrderNotes(tempNotes);
                  setIsNotesModalOpen(false);
                }}
                className="px-5 py-2 bg-[#FF6B00] hover:bg-[#EA580C] text-white text-xs font-bold rounded-xl shadow-xs"
              >
                Simpan Catatan
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Checkout Modal */}
      <CheckoutModal
        isOpen={isCheckoutOpen}
        initialPaymentMethod={checkoutInitialMethod}
        onClose={() => setIsCheckoutOpen(false)}
        onSuccess={handleCheckoutSuccess}
      />

      {/* Transaction Success Modal */}
      <TransactionSuccessModal
        isOpen={isSuccessOpen}
        transaction={recentTransaction}
        onPrintReceipt={() => {
          setIsSuccessOpen(false);
          setIsReceiptOpen(true);
        }}
        onNewOrder={() => {
          setIsSuccessOpen(false);
          setRecentTransaction(null);
        }}
        settings={settings}
      />

      {/* Thermal Receipt Print Modal */}
      {recentTransaction && (
        <ReceiptModal
          isOpen={isReceiptOpen}
          onClose={() => setIsReceiptOpen(false)}
          transaction={recentTransaction}
          settings={settings}
        />
      )}
    </CashierLayout>
  );
}
