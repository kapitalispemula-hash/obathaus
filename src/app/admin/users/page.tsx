'use client';

import React, { useState, useEffect } from 'react';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { dbService } from '@/lib/services/database';
import { INITIAL_PROFILES } from '@/lib/mock-data';
import { Profile, UserRole, Outlet, Warehouse } from '@/types/database';
import { formatDateTime } from '@/lib/format';
import { useAuth } from '@/lib/auth-context';
import {
  Users,
  UserPlus,
  User,
  Edit2,
  AlertCircle,
  X,
  Mail,
  Lock,
  Eye,
  EyeOff,
  Trash2,
  Loader2,
  ShieldCheck,
  Shield,
} from 'lucide-react';

export default function AdminUsersPage() {
  const { user: currentUser } = useAuth();
  const [profiles, setProfiles] = useState<Profile[]>(INITIAL_PROFILES);
  const [outlets, setOutlets] = useState<Outlet[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [loading, setLoading] = useState(false);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProfile, setEditingProfile] = useState<Profile | null>(null);

  // Delete State
  const [profileToDelete, setProfileToDelete] = useState<Profile | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const [formName, setFormName] = useState('');
  const [formUsername, setFormUsername] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formPassword, setFormPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [formRole, setFormRole] = useState<UserRole>('cashier');
  const [formOutletId, setFormOutletId] = useState<string>('');
  const [formWarehouseId, setFormWarehouseId] = useState<string>('');
  const [formIsActive, setFormIsActive] = useState(true);
  const [formError, setFormError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const loadData = async () => {
    try {
      setLoading(true);
      const [data, outList, whList] = await Promise.all([
        dbService.getProfiles(),
        dbService.getOutlets(),
        dbService.getWarehouses(),
      ]);
      setProfiles(data);
      setOutlets(outList);
      setWarehouses(whList);
      if (outList.length > 0 && !formOutletId) setFormOutletId(outList[0].id);
      if (whList.length > 0 && !formWarehouseId) setFormWarehouseId(whList[0].id);
    } catch (err) {
      console.error('Failed to load profiles:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const openAddModal = () => {
    setEditingProfile(null);
    setFormName('');
    setFormUsername('');
    setFormEmail('');
    setFormPassword('');
    setShowPassword(false);
    setFormRole('cashier');
    setFormOutletId(outlets[0]?.id || '');
    setFormWarehouseId(warehouses[0]?.id || '');
    setFormIsActive(true);
    setFormError(null);
    setIsModalOpen(true);
  };

  const openEditModal = (p: Profile) => {
    setEditingProfile(p);
    setFormName(p.full_name);
    setFormUsername(p.username || p.email.split('@')[0] || '');
    setFormEmail(p.email);
    setFormPassword(p.password || '');
    setShowPassword(false);
    setFormRole(p.role);
    setFormOutletId(p.primary_outlet_id || outlets[0]?.id || '');
    setFormWarehouseId(p.primary_warehouse_id || warehouses[0]?.id || '');
    setFormIsActive(p.is_active);
    setFormError(null);
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!formName.trim()) {
      setFormError('Nama lengkap staf wajib diisi.');
      return;
    }

    const cleanUsername = formUsername.trim().toLowerCase() || formName.trim().split(' ')[0].toLowerCase().replace(/\s+/g, '');
    const finalEmail = formEmail.trim().toLowerCase() || `${cleanUsername}@obathaus.id`;

    if (!editingProfile && !formPassword.trim()) {
      setFormError('Kata sandi awal wajib diisi (minimal 4 karakter).');
      return;
    }

    setIsSaving(true);
    try {
      if (editingProfile) {
        const updateData: Partial<Profile> = {
          full_name: formName.trim(),
          username: cleanUsername,
          is_active: formIsActive,
          role: formRole,
          primary_outlet_id: formRole === 'cashier' ? formOutletId : null,
          primary_warehouse_id: formRole === 'warehouse_operator' ? formWarehouseId : null,
        };
        if (formPassword.trim()) {
          updateData.password = formPassword.trim();
        }
        await dbService.updateProfile(editingProfile.id, updateData);
      } else {
        await dbService.createCashier(
          finalEmail,
          formName.trim(),
          formPassword.trim() || '123456',
          formRole,
          cleanUsername,
          formRole === 'cashier' ? formOutletId : null,
          formRole === 'warehouse_operator' ? formWarehouseId : null
        );
      }
      setIsModalOpen(false);
      loadData();
    } catch (err: any) {
      setFormError(err.message || 'Gagal menyimpan profil pengguna.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggleStatus = async (p: Profile) => {
    try {
      await dbService.updateProfile(p.id, { is_active: !p.is_active });
      loadData();
    } catch (err: any) {
      alert(err.message || 'Gagal mengubah status akun.');
    }
  };

  const handleDeleteProfile = (p: Profile) => {
    setDeleteError(null);
    setProfileToDelete(p);
  };

  const confirmDeleteProfile = async () => {
    if (!profileToDelete) return;
    try {
      setIsDeleting(true);
      setDeleteError(null);
      await dbService.deleteProfile(profileToDelete.id, currentUser?.id);
      setProfileToDelete(null);
      if (isModalOpen && editingProfile?.id === profileToDelete.id) {
        setIsModalOpen(false);
      }
      await loadData();
    } catch (err: any) {
      setDeleteError(err.message || 'Gagal menghapus akun pengguna.');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-heading tracking-tight">
              Manajemen Pengguna & Kasir
            </h1>
            <p className="text-xs sm:text-sm text-mutedtext mt-0.5">
              Kelola akun staf kasir dan administrator dengan kontrol hak akses (RBAC).
            </p>
          </div>

          <button
            onClick={openAddModal}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-[#FF6B00] hover:bg-[#EA580C] text-white text-xs sm:text-sm font-bold rounded-xl shadow-md shadow-orange-500/20 transition-all cursor-pointer self-start sm:self-auto"
          >
            <UserPlus className="w-4 h-4" />
            <span>Tambah Akun Kasir</span>
          </button>
        </div>

        {/* Users Table */}
        <div className="bg-white rounded-2xl border border-borderline shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs sm:text-sm">
              <thead className="bg-canvas border-b border-borderline text-mutedtext text-[11px] uppercase tracking-wider font-bold">
                <tr>
                  <th className="py-3.5 px-4">Nama Lengkap</th>
                  <th className="py-3.5 px-4">Alamat Email</th>
                  <th className="py-3.5 px-4 text-center">Hak Akses Role</th>
                  <th className="py-3.5 px-4">Penugasan Lokasi</th>
                  <th className="py-3.5 px-4 text-center">Status Akun</th>
                  <th className="py-3.5 px-4">Terdaftar Pada</th>
                  <th className="py-3.5 px-4 text-center">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-borderline font-medium text-heading">
                {loading ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-mutedtext">
                      Memuat daftar pengguna...
                    </td>
                  </tr>
                ) : profiles.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-mutedtext">
                      Belum ada akun terdaftar.
                    </td>
                  </tr>
                ) : (
                  profiles.map((p) => (
                    <tr key={p.id} className="hover:bg-canvas/60 transition-colors">
                      <td className="py-3 px-4 font-bold text-heading">
                        <div className="text-heading font-bold">{p.full_name}</div>
                        <div className="text-[11px] font-semibold text-[#FF6B00]">
                          @{p.username || p.email.split('@')[0]}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-mutedtext">
                        {p.email}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span
                          className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                            p.role === 'admin'
                              ? 'bg-[#FFF7ED] text-[#FF6B00]'
                              : p.role === 'warehouse_operator'
                              ? 'bg-blue-50 text-blue-700 border border-blue-200'
                              : 'bg-canvas border border-borderline text-heading'
                          }`}
                        >
                          {p.role === 'admin' ? 'Admin / Owner' : p.role === 'warehouse_operator' ? 'Operator Gudang' : 'Kasir Cabang'}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-xs">
                        {p.role === 'admin' ? (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#FFF7ED] text-[#FF6B00] border border-[#FED7AA]">
                            🌐 Seluruh 7 Cabang & Gudang
                          </span>
                        ) : p.role === 'warehouse_operator' ? (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                            🏢 {p.warehouse?.name || 'Gudang Pusat Makassar'}
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
                            📍 {p.outlet?.name || 'Cabang Hasanuddin'}
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <button
                          onClick={() => handleToggleStatus(p)}
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold transition-colors ${
                            p.is_active
                              ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                              : 'bg-canvas border border-borderline text-mutedtext hover:bg-slate-200/60'
                          }`}
                        >
                          {p.is_active ? 'Aktif' : 'Nonaktif'}
                        </button>
                      </td>
                      <td className="py-3 px-4 text-mutedtext text-xs">
                        {formatDateTime(p.created_at)}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => openEditModal(p)}
                            className="p-1.5 text-mutedtext hover:text-[#FF6B00] rounded-lg hover:bg-[#FFF7ED] transition-colors cursor-pointer"
                            title="Edit Pengguna"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteProfile(p)}
                            disabled={p.id === currentUser?.id}
                            className={`p-1.5 rounded-lg transition-colors ${
                              p.id === currentUser?.id
                                ? 'text-mutedtext/30 cursor-not-allowed'
                                : 'text-mutedtext hover:text-red-600 hover:bg-red-50 cursor-pointer'
                            }`}
                            title={
                              p.id === currentUser?.id
                                ? 'Akun Anda sedang aktif digunakan'
                                : 'Hapus Akun Pengguna'
                            }
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Add / Edit Profile Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-xl border border-borderline overflow-hidden flex flex-col max-h-[90vh]">
            <div className="px-6 py-4 border-b border-borderline flex items-center justify-between bg-white">
              <h3 className="font-bold text-heading text-base">
                {editingProfile ? 'Edit Akun Pengguna' : 'Tambah Akun Kasir Baru'}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="w-8 h-8 flex items-center justify-center text-mutedtext hover:text-heading rounded-full hover:bg-canvas transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSave} className="p-6 overflow-y-auto space-y-4 bg-white">
              {formError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-heading mb-1">
                  Nama Lengkap Staf *
                </label>
                <input
                  type="text"
                  value={formName}
                  onChange={(e) => {
                    const name = e.target.value;
                    setFormName(name);
                    if (!editingProfile && !formUsername) {
                      setFormUsername(name.toLowerCase().split(' ')[0].replace(/[^a-z0-9]/g, ''));
                    }
                  }}
                  placeholder="Contoh: Budi Santoso"
                  required
                  className="w-full text-xs sm:text-sm p-2.5 bg-canvas border border-borderline rounded-xl text-heading focus:outline-none focus:ring-2 focus:ring-[#FF6B00]/20 focus:border-[#FF6B00]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-heading mb-1">
                  Username Akun Kasir *
                </label>
                <div className="relative flex items-center">
                  <div className="absolute left-3 text-mutedtext">
                    <User className="w-4 h-4" />
                  </div>
                  <input
                    type="text"
                    value={formUsername}
                    onChange={(e) => setFormUsername(e.target.value.toLowerCase().replace(/\s+/g, ''))}
                    placeholder="Contoh: kasir1 / budi"
                    required
                    className="w-full text-xs sm:text-sm pl-9 pr-3 py-2.5 bg-canvas border border-borderline rounded-xl text-heading focus:outline-none focus:ring-2 focus:ring-[#FF6B00]/20 focus:border-[#FF6B00]"
                  />
                </div>
                <p className="text-[11px] text-mutedtext mt-1">
                  Username singkat untuk login kasir di halaman masuk tanpa perlu ketik email panjang.
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-heading mb-1">
                  Alamat Email Akun (Opsional)
                </label>
                <input
                  type="email"
                  value={formEmail}
                  onChange={(e) => setFormEmail(e.target.value)}
                  placeholder={`${formUsername || 'username'}@cafepos.demo`}
                  disabled={!!editingProfile}
                  className="w-full text-xs sm:text-sm p-2.5 bg-canvas border border-borderline rounded-xl text-heading focus:outline-none focus:ring-2 focus:ring-[#FF6B00]/20 focus:border-[#FF6B00] disabled:opacity-60"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-heading mb-1">
                  Kata Sandi (Password Akun) {editingProfile ? '(Opsional / Biarkan jika tidak ingin diubah)' : '*'}
                </label>
                <div className="relative flex items-center">
                  <div className="absolute left-3 text-mutedtext">
                    <Lock className="w-4 h-4" />
                  </div>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={formPassword}
                    onChange={(e) => setFormPassword(e.target.value)}
                    placeholder={
                      editingProfile
                        ? 'Kosongkan jika tetap menggunakan sandi lama'
                        : 'Masukkan kata sandi (contoh: 123456 atau kasir123)'
                    }
                    className="w-full text-xs sm:text-sm pl-9 pr-10 py-2.5 bg-canvas border border-borderline rounded-xl text-heading focus:outline-none focus:ring-2 focus:ring-[#FF6B00]/20 focus:border-[#FF6B00]"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 text-mutedtext hover:text-heading cursor-pointer p-1"
                    title={showPassword ? 'Sembunyikan Kata Sandi' : 'Lihat Kata Sandi'}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                <p className="text-[11px] text-mutedtext mt-1">
                  {editingProfile
                    ? 'Kata sandi ini digunakan staf untuk masuk di halaman login kasir POS.'
                    : 'Kata sandi awal staf kasir untuk masuk ke sistem (default: 123456).'}
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-heading mb-1">
                  Hak Akses (Role)
                </label>
                <select
                  value={formRole}
                  onChange={(e) => setFormRole(e.target.value as UserRole)}
                  className="w-full text-xs sm:text-sm p-2.5 bg-canvas border border-borderline rounded-xl text-heading font-medium focus:outline-none focus:ring-2 focus:ring-[#FF6B00]/20 focus:border-[#FF6B00]"
                >
                  <option value="cashier">Kasir (Akses POS & Riwayat Transaksi Outlet)</option>
                  <option value="warehouse_operator">Operator Gudang (Akses Gudang Pusat & Stok Fisik)</option>
                  <option value="admin">Admin / Owner (Akses Penuh Seluruh Sistem & 7 Outlet)</option>
                </select>
              </div>

              {formRole === 'cashier' && (
                <div>
                  <label className="block text-xs font-bold text-heading mb-1">
                    Penugasan Cabang Outlet Kasir *
                  </label>
                  <select
                    value={formOutletId}
                    onChange={(e) => setFormOutletId(e.target.value)}
                    className="w-full text-xs sm:text-sm p-2.5 bg-canvas border border-borderline rounded-xl text-heading font-medium focus:outline-none focus:ring-2 focus:ring-[#FF6B00]/20 focus:border-[#FF6B00]"
                  >
                    {outlets.map((o) => (
                      <option key={o.id} value={o.id}>
                        {o.code}: {o.name}
                      </option>
                    ))}
                  </select>
                  <p className="text-[11px] text-mutedtext mt-1">
                    Kasir ini hanya dapat bertransaksi dan melihat shift di cabang ini.
                  </p>
                </div>
              )}

              {formRole === 'warehouse_operator' && (
                <div>
                  <label className="block text-xs font-bold text-heading mb-1">
                    Penugasan Gudang Logistik *
                  </label>
                  <select
                    value={formWarehouseId}
                    onChange={(e) => setFormWarehouseId(e.target.value)}
                    className="w-full text-xs sm:text-sm p-2.5 bg-canvas border border-borderline rounded-xl text-heading font-medium focus:outline-none focus:ring-2 focus:ring-[#FF6B00]/20 focus:border-[#FF6B00]"
                  >
                    {warehouses.map((w) => (
                      <option key={w.id} value={w.id}>
                        {w.code}: {w.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="flex items-center gap-2.5 pt-1">
                <input
                  type="checkbox"
                  id="userActive"
                  checked={formIsActive}
                  onChange={(e) => setFormIsActive(e.target.checked)}
                  className="w-4 h-4 text-[#FF6B00] rounded focus:ring-[#FF6B00] border-borderline"
                />
                <label htmlFor="userActive" className="text-xs font-bold text-heading cursor-pointer">
                  Status Akun Aktif (Dapat Login ke Sistem)
                </label>
              </div>

              <div className="pt-4 border-t border-borderline flex items-center justify-between gap-3">
                {editingProfile ? (
                  <button
                    type="button"
                    disabled={editingProfile.id === currentUser?.id}
                    onClick={() => {
                      setIsModalOpen(false);
                      handleDeleteProfile(editingProfile);
                    }}
                    className={`inline-flex items-center gap-1.5 px-3 py-2 text-xs font-bold rounded-xl transition-colors ${
                      editingProfile.id === currentUser?.id
                        ? 'text-mutedtext/30 cursor-not-allowed'
                        : 'text-red-600 hover:text-red-700 hover:bg-red-50 cursor-pointer'
                    }`}
                    title={
                      editingProfile.id === currentUser?.id
                        ? 'Tidak dapat menghapus akun Anda sendiri'
                        : 'Hapus Akun Pengguna'
                    }
                  >
                    <Trash2 className="w-4 h-4" />
                    <span>Hapus Akun Ini</span>
                  </button>
                ) : (
                  <div />
                )}

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="px-4 py-2 text-xs font-bold text-mutedtext hover:text-heading hover:bg-canvas rounded-xl cursor-pointer"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    disabled={isSaving}
                    className="px-5 py-2 bg-[#FF6B00] hover:bg-[#EA580C] text-white text-xs sm:text-sm font-bold rounded-xl shadow-md shadow-orange-500/20 transition-all cursor-pointer"
                  >
                    {isSaving ? 'Menyimpan...' : 'Simpan Akun'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete User Confirmation Modal */}
      {profileToDelete && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-xl border border-borderline overflow-hidden p-6 space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-red-50 text-red-600 flex items-center justify-center mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>

            <div className="text-center space-y-1.5">
              <h3 className="text-lg font-black text-heading">Hapus Akun Pengguna?</h3>
              <p className="text-xs text-mutedtext leading-relaxed">
                Apakah Anda yakin ingin menghapus akun pengguna{' '}
                <strong className="text-heading font-bold">"{profileToDelete.full_name}"</strong>?
                Staf ini tidak akan dapat login lagi ke mesin kasir maupun panel admin.
              </p>
            </div>

            <div className="bg-canvas p-3 rounded-xl border border-borderline flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-[#FFF7ED] text-[#FF6B00] font-black text-xs flex items-center justify-center shrink-0 border border-[#FED7AA]">
                {profileToDelete.full_name.slice(0, 2).toUpperCase()}
              </div>
              <div className="text-left flex-1 min-w-0">
                <div className="text-xs font-bold text-heading truncate">{profileToDelete.full_name}</div>
                <div className="text-[11px] text-mutedtext truncate">{profileToDelete.email}</div>
              </div>
              <span
                className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                  profileToDelete.role === 'admin'
                    ? 'bg-[#FFF7ED] text-[#FF6B00]'
                    : 'bg-white border border-borderline text-heading'
                }`}
              >
                {profileToDelete.role}
              </span>
            </div>

            {deleteError && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{deleteError}</span>
              </div>
            )}

            <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-borderline">
              <button
                type="button"
                onClick={() => {
                  setProfileToDelete(null);
                  setDeleteError(null);
                }}
                disabled={isDeleting}
                className="px-4 py-2 text-xs font-bold text-mutedtext hover:text-heading hover:bg-canvas rounded-xl transition-colors cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={confirmDeleteProfile}
                disabled={isDeleting}
                className="inline-flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 disabled:opacity-70 text-white text-xs font-bold rounded-xl shadow-md shadow-red-600/20 transition-all cursor-pointer"
              >
                {isDeleting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                <span>{isDeleting ? 'Menghapus...' : 'Ya, Hapus Akun'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
