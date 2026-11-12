'use client';

import React, { useState, useEffect } from 'react';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { dbService } from '@/lib/services/database';
import { Outlet, Product, OutletMenu } from '@/types/database';
import { formatRupiah } from '@/lib/format';
import {
  Tags,
  Store,
  Search,
  CheckCircle,
  XCircle,
  DollarSign,
  RotateCcw,
  Sparkles,
} from 'lucide-react';
import { INITIAL_OUTLETS, INITIAL_PRODUCTS } from '@/lib/mock-data';

export default function AdminOutletMenusPage() {
  const [outlets, setOutlets] = useState<Outlet[]>(INITIAL_OUTLETS);
  const [selectedOutletId, setSelectedOutletId] = useState<string>(INITIAL_OUTLETS[0]?.id || '');
  const [products, setProducts] = useState<Product[]>(INITIAL_PRODUCTS);
  const [outletMenus, setOutletMenus] = useState<OutletMenu[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [loading, setLoading] = useState(false);
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);

  const loadData = async () => {
    try {
      setLoading(true);
      const [outList, prodList] = await Promise.all([
        dbService.getOutlets(),
        dbService.getProducts(),
      ]);
      setOutlets(outList);
      setProducts(prodList);
      if (!selectedOutletId && outList.length > 0) {
        setSelectedOutletId(outList[0].id);
      }
    } catch (err) {
      console.error('Failed to load outlet menu data:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadMenusForOutlet = async (outletId: string) => {
    try {
      const menus = await dbService.getOutletMenus(outletId);
      setOutletMenus(menus);
    } catch (err) {
      console.error('Failed to load menus for outlet:', err);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (selectedOutletId) {
      loadMenusForOutlet(selectedOutletId);
    }
  }, [selectedOutletId]);

  const activeOutlet = outlets.find((o) => o.id === selectedOutletId) || outlets[0];

  const handlePriceChange = async (productId: string, rawVal: string) => {
    const num = rawVal.trim() === '' ? null : Number(rawVal.replace(/[^0-9]/g, ''));
    try {
      await dbService.setOutletMenuPrice(selectedOutletId, productId, num);
      await loadMenusForOutlet(selectedOutletId);
      showFeedback('Harga khusus cabang berhasil diperbarui.');
    } catch (err) {
      console.error('Failed to update price:', err);
    }
  };

  const handleToggleAvailability = async (productId: string, currentAvail: boolean) => {
    try {
      await dbService.toggleOutletMenuAvailability(selectedOutletId, productId, !currentAvail);
      await loadMenusForOutlet(selectedOutletId);
      showFeedback('Ketersediaan menu di cabang berhasil diubah.');
    } catch (err) {
      console.error('Failed to toggle availability:', err);
    }
  };

  const handleResetToStandardPrice = async (productId: string) => {
    try {
      await dbService.setOutletMenuPrice(selectedOutletId, productId, null);
      await loadMenusForOutlet(selectedOutletId);
      showFeedback('Harga kembali mengikuti harga standar pusat.');
    } catch (err) {
      console.error('Failed to reset price:', err);
    }
  };

  const showFeedback = (msg: string) => {
    setFeedbackMessage(msg);
    setTimeout(() => setFeedbackMessage(null), 3000);
  };

  // Extract unique categories
  const categories = Array.from(new Set(products.map((p) => p.category?.name || 'Lainnya')));

  const filteredProducts = products.filter((prod) => {
    const matchSearch = prod.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (prod.sku && prod.sku.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchCat = selectedCategory === 'all' || prod.category?.name === selectedCategory;
    return matchSearch && matchCat;
  });

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Top Header Card */}
        <div className="bg-white p-4 sm:p-6 rounded-2xl border border-borderline shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3 sm:gap-4">
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-2xl bg-[#FFF7ED] text-[#FF6B00] border border-[#FED7AA] flex items-center justify-center font-bold shadow-2xs shrink-0">
              <Tags className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
            <div className="min-w-0">
              <h1 className="text-lg sm:text-xl font-bold text-heading truncate">Menu & Harga Per Cabang</h1>
              <p className="text-xs text-mutedtext">
                Atur kebijakan harga khusus atau nonaktifkan menu sementara untuk cabang outlet tertentu
              </p>
            </div>
          </div>

          {/* Outlet Selector Dropdown */}
          <div className="flex items-center gap-2 bg-[#FFF7ED] border border-[#FED7AA] px-3.5 sm:px-4 py-2 rounded-xl shadow-2xs w-full sm:w-auto">
            <Store className="w-4 h-4 text-[#FF6B00] shrink-0" />
            <div className="flex flex-col min-w-0 flex-1">
              <span className="text-[10px] text-mutedtext font-bold uppercase leading-tight">Pilih Outlet Cabang</span>
              <select
                value={selectedOutletId}
                onChange={(e) => setSelectedOutletId(e.target.value)}
                className="bg-transparent text-xs font-bold text-heading focus:outline-none cursor-pointer pr-2 w-full truncate"
              >
                {outlets.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.code}: {o.name.replace('Obat Haus - ', '')}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {feedbackMessage && (
          <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 px-4 py-2.5 rounded-xl text-xs flex items-center gap-2 shadow-2xs animate-fade-in">
            <Sparkles className="w-4 h-4 text-emerald-600 shrink-0" />
            <span className="font-medium">{feedbackMessage}</span>
          </div>
        )}

        {/* Filter & Search Bar */}
        <div className="bg-white p-3.5 sm:p-4 rounded-2xl border border-borderline shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar max-w-full pb-0.5 sm:pb-0 sm:flex-wrap">
            <button
              type="button"
              onClick={() => setSelectedCategory('all')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer shrink-0 ${
                selectedCategory === 'all'
                  ? 'bg-[#FF6B00] text-white shadow-2xs'
                  : 'bg-[#FAFAFA] text-mutedtext hover:text-heading border border-borderline'
              }`}
            >
              Semua ({products.length})
            </button>
            {categories.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer shrink-0 ${
                  selectedCategory === cat
                    ? 'bg-[#FF6B00] text-white shadow-2xs'
                    : 'bg-[#FAFAFA] text-mutedtext hover:text-heading border border-borderline'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 text-mutedtext absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Cari menu produk..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 bg-[#FAFAFA] border border-borderline rounded-xl text-xs text-heading focus:outline-none focus:ring-2 focus:ring-[#FF6B00]/25 focus:border-[#FF6B00]"
            />
          </div>
        </div>

        {/* Product Pricing Table */}
        <div className="bg-white rounded-2xl border border-borderline shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-[#FAFAFA] border-b border-borderline text-mutedtext uppercase tracking-wider text-[11px] font-bold">
                  <th className="py-3 px-4">Menu Produk</th>
                  <th className="py-3 px-4">Kategori</th>
                  <th className="py-3 px-4 text-right">Harga Standar Pusat</th>
                  <th className="py-3 px-4 text-center">Harga Khusus Cabang Ini</th>
                  <th className="py-3 px-4 text-center">Status di Cabang Ini</th>
                  <th className="py-3 px-4 text-center">Aksi Cepat</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-borderline">
                {filteredProducts.map((prod) => {
                  const om = outletMenus.find((m) => m.product_id === prod.id);
                  const isCustomPrice = om?.price_override != null;
                  const effectivePrice = isCustomPrice ? om!.price_override! : prod.selling_price;
                  const isAvailable = om?.is_available ?? true;

                  return (
                    <tr key={prod.id} className="hover:bg-[#FAFAFA]/70 transition-colors">
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          {prod.image_url ? (
                            <img
                              src={prod.image_url}
                              alt={prod.name}
                              className="w-9 h-9 rounded-xl object-cover border border-borderline shrink-0"
                            />
                          ) : (
                            <div className="w-9 h-9 rounded-xl bg-[#FFF7ED] border border-[#FED7AA] flex items-center justify-center text-[#FF6B00] font-bold text-xs shrink-0">
                              {prod.name.slice(0, 2).toUpperCase()}
                            </div>
                          )}
                          <div>
                            <p className="font-bold text-heading text-xs">{prod.name}</p>
                            <p className="text-[11px] text-mutedtext font-mono">{prod.sku || '-'}</p>
                          </div>
                        </div>
                      </td>

                      <td className="py-3.5 px-4 text-mutedtext">
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#F4F4F5] text-heading border border-borderline">
                          {prod.category?.name || 'Umum'}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 text-right font-medium text-mutedtext font-mono">
                        {formatRupiah(prod.selling_price)}
                      </td>

                      <td className="py-3.5 px-4 text-center">
                        <div className="inline-flex items-center gap-1.5">
                          <span className="text-mutedtext font-mono text-[11px]">Rp</span>
                          <input
                            type="number"
                            step="1000"
                            placeholder={prod.selling_price.toString()}
                            defaultValue={isCustomPrice ? om!.price_override! : ''}
                            key={`${selectedOutletId}-${prod.id}-${om?.price_override}`}
                            onBlur={(e) => handlePriceChange(prod.id, e.target.value)}
                            className={`w-28 text-center font-mono font-bold text-xs p-1.5 rounded-lg border focus:outline-none focus:ring-2 focus:ring-[#FF6B00]/25 transition-all ${
                              isCustomPrice
                                ? 'bg-amber-50 border-amber-300 text-amber-900'
                                : 'bg-canvas border-borderline text-heading placeholder:text-mutedtext/50'
                            }`}
                          />
                          {isCustomPrice && (
                            <span className="text-[10px] font-bold text-amber-700 bg-amber-100 px-1.5 py-0.5 rounded">
                              Custom
                            </span>
                          )}
                        </div>
                      </td>

                      <td className="py-3.5 px-4 text-center">
                        <button
                          type="button"
                          onClick={() => handleToggleAvailability(prod.id, isAvailable)}
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold transition-colors cursor-pointer ${
                            isAvailable
                              ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200'
                              : 'bg-red-50 text-red-700 hover:bg-red-100 border border-red-200'
                          }`}
                        >
                          {isAvailable ? (
                            <>
                              <CheckCircle className="w-3 h-3 text-emerald-600" />
                              <span>Tersedia</span>
                            </>
                          ) : (
                            <>
                              <XCircle className="w-3 h-3 text-red-600" />
                              <span>Habis / Kosong</span>
                            </>
                          )}
                        </button>
                      </td>

                      <td className="py-3.5 px-4 text-center">
                        {isCustomPrice && (
                          <button
                            type="button"
                            onClick={() => handleResetToStandardPrice(prod.id)}
                            className="inline-flex items-center gap-1 text-[11px] text-mutedtext hover:text-[#FF6B00] hover:underline cursor-pointer"
                            title="Reset ke harga standar pusat"
                          >
                            <RotateCcw className="w-3 h-3" />
                            <span>Reset Standar</span>
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
