# RENCANA MIGRASI DATABASE (DATABASE MIGRATION PLAN)
## OBAT HAUS – OPERATIONAL SYSTEM MANAGEMENT
**Dokumen:** Analisis Tabel Eksisting, Strategi Backward-Compatibility & Rencana Migrasi SQL  
**Versi:** 1.0 — Phase 1 Foundation & Database Design  
**Target RDBMS:** PostgreSQL 15+ (Supabase)  
**Status:** Rancangan Perencanaan (Belum Dijalankan — Menunggu Persetujuan Owner)

---

## 1. Prinsip Utama Migrasi

1. **Zero Data Loss & Zero Table Renaming**: Seluruh 9 tabel yang sudah berjalan pada aplikasi Cafe POS (`profiles`, `store_settings`, `categories`, `products`, `transactions`, `transaction_items`, `expense_categories`, `operating_expenses`, `audit_logs`) dipertahankan secara utuh. Tidak ada tabel yang dihapus atau di-rename.
2. **Backward Compatibility Terjamin**:
   * Kolom-kolom baru yang ditambahkan ke tabel lama berstatus **`NULLABLE`** atau memiliki **`DEFAULT`** yang aman.
   * Kode frontend dan query yang saat ini sudah berjalan pada port 3001 tidak akan mengalami *syntax error* atau *null constraint violation*.
3. **Penyediaan Default Multi-Outlet Baseline**:
   * Migrasi akan secara otomatis mendaftarkan **Outlet 1 ('Obat Haus - Pusat')** dan **Gudang 1 ('Gudang Pusat Obat Haus')**.
   * Seluruh transaksi dan pengeluaran historis yang sudah ada otomatis dialokasikan ke Outlet 1 sehingga data analitik masa lalu tetap tampil utuh.
4. **Strategi Rollback Eksplisit**: Setiap berkas migrasi wajib menyertakan skrip pemulihan (*down migration*) yang dapat membatalkan perubahan secara bersih tanpa merusak data dasar.

---

## 2. Analisis Mendalam 9 Tabel Eksisting

### 2.1 Tabel `profiles`
* **Status**: **Dipertahankan & Diperluas (*Extended*)**.
* **Fungsi Saat Ini**: Menyimpan profil pengguna kasir dan admin.
* **Kolom yang Ditambahkan**:
  * `primary_outlet_id` (UUID, NULLABLE, FK -> `outlets(id)` ON DELETE SET NULL)
  * `primary_warehouse_id` (UUID, NULLABLE, FK -> `warehouses(id)` ON DELETE SET NULL)
* **Penyesuaian Constraint**:
  * Memperluas check constraint role agar mendukung role baru:  
    `ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_role_check;`  
    `ALTER TABLE profiles ADD CONSTRAINT profiles_role_check CHECK (role IN ('admin', 'cashier', 'warehouse_operator'));`
* **Dampak Data Lama**: Nol dampak. Akun admin dan kasir yang sudah ada tetap aktif dengan role lama ('admin' atau 'cashier').
* **Strategi Migrasi**:
  1. Buat tabel `outlets` dan `warehouses` terlebih dahulu.
  2. Tambahkan kolom `primary_outlet_id` dan `primary_warehouse_id`.
  3. Update data kasir eksisting agar `primary_outlet_id` merujuk ke Outlet 1 default.
* **Rollback**: `ALTER TABLE profiles DROP COLUMN IF EXISTS primary_outlet_id; ALTER TABLE profiles DROP COLUMN IF EXISTS primary_warehouse_id;`
* **Risiko Inkonsistensi**: Rendah.

---

### 2.2 Tabel `store_settings`
* **Status**: **Dipertahankan sebagai Konfigurasi Brand Induk (*Retained*)**.
* **Fungsi Saat Ini**: Menyimpan nama cafe, logo, format invoice, dan ukuran kertas struk kasir.
* **Kolom yang Ditambahkan**:
  * `organization_id` (UUID, NULLABLE, FK -> `organizations(id)` ON DELETE SET NULL)
* **Dampak Data Lama**: Nol dampak. Record singleton `id = '00000000-0000-0000-0000-000000000001'` tetap berfungsi membaca nama brand Obat Haus, logo, dan favicon URL bar.
* **Pengembangan Multi-Outlet**: Pengaturan spesifik per cabang (seperti alamat toko cabang, nomor telepon cabang, dan prefix nomor invoice unik) ditangani oleh tabel `outlets`.
* **Rollback**: `ALTER TABLE store_settings DROP COLUMN IF EXISTS organization_id;`
* **Risiko Inkonsistensi**: Nol.

---

### 2.3 Tabel `categories`
* **Status**: **Dipertahankan sebagai Master Kategori Menu POS (*Retained*)**.
* **Fungsi Saat Ini**: Mengelompokkan menu minuman/makanan di kasir (Coffee, Non-Coffee, Snacks).
* **Kolom yang Ditambahkan**: Tidak ada perubahan kolom wajib. Tabel ini khusus mengelola menu siap saji kasir.
* **Hubungan dengan Bahan Baku**: Master kategori bahan baku ditempatkan pada tabel baru tersendiri yaitu `raw_material_categories` agar tidak terjadi percampuran (*separation of concerns*).
* **Dampak Data Lama**: Nol dampak. Kategori eksisting tetap tampil di kasir POS.
* **Rollback**: Tidak memerlukan perubahan struktur.
* **Risiko Inkonsistensi**: Nol.

---

### 2.4 Tabel `products`
* **Status**: **Dipertahankan & Diekspansi (*Extended*)**.
* **Fungsi Saat Ini**: Menyimpan nama menu, foto, harga jual (`selling_price`), dan estimasi `hpp`.
* **Kolom yang Ditambahkan**:
  * `base_selling_price` (NUMERIC(12,2), NULLABLE) — Diselaraskan dengan `selling_price`.
  * `standard_hpp` (NUMERIC(12,2), NULLABLE, DEFAULT 0) — Diselaraskan dengan `hpp`.
* **Dampak Data Lama**:
  * Nilai `selling_price` dan `hpp` lama tetap ada dan dibaca normal oleh modul POS kasir yang berjalan.
  * Tambahan tabel relasi `outlet_products` dan `outlet_product_prices` memungkinkan penyesuaian ketersediaan menu dan harga khusus di masing-masing cabang Obat Haus.
* **Strategi Migrasi**:
  1. Tambahkan kolom baru tanpa menghapus `selling_price` dan `hpp`.
  2. Jalankan query seed: `UPDATE products SET base_selling_price = selling_price, standard_hpp = hpp WHERE base_selling_price IS NULL;`
  3. Hubungkan seluruh produk aktif ke tabel `outlet_products` untuk 7 outlet default.
* **Rollback**: `ALTER TABLE products DROP COLUMN IF EXISTS base_selling_price; ALTER TABLE products DROP COLUMN IF EXISTS standard_hpp;`
* **Risiko Inkonsistensi**: Sangat rendah.

---

### 2.5 Tabel `transactions`
* **Status**: **Dipertahankan & Diperluas (*Extended*)**.
* **Fungsi Saat Ini**: Mencatat seluruh faktur penjualan kasir POS.
* **Kolom yang Ditambahkan**:
  * `outlet_id` (UUID, NULLABLE, FK -> `outlets(id)` ON DELETE RESTRICT)
  * `shift_id` (UUID, NULLABLE, FK -> `cashier_shifts(id)` ON DELETE SET NULL)
* **Dampak Data Lama**:
  * Riwayat 30 hari transaksi realistis yang sudah ada tetap terbaca lengkap di Laporan Finansial dan Riwayat Transaksi.
  * Transaksi lama otomatis di-assign ke `outlet_id` Outlet 1 (Pusat).
* **Strategi Migrasi**:
  1. Tambahkan kolom `outlet_id` dan `shift_id` sebagai NULLABLE terlebih dahulu.
  2. Isi `outlet_id` pada transaksi lama: `UPDATE transactions SET outlet_id = (SELECT id FROM outlets WHERE code = 'OUT-01' LIMIT 1) WHERE outlet_id IS NULL;`
* **Rollback**: `ALTER TABLE transactions DROP COLUMN IF EXISTS outlet_id; ALTER TABLE transactions DROP COLUMN IF EXISTS shift_id;`
* **Risiko Inkonsistensi**: Rendah (terkendali penuh melalui default assignment).

---

### 2.6 Tabel `transaction_items`
* **Status**: **Dipertahankan & Diperluas (*Extended*)**.
* **Fungsi Saat Ini**: Rincian menu yang dibeli pelanggan beserta snapshot harga dan snapshot HPP.
* **Kolom yang Ditambahkan**:
  * `recipe_version_id` (UUID, NULLABLE, FK -> `recipe_versions(id)` ON DELETE SET NULL)
* **Dampak Data Lama**:
  * Nol dampak pada kalkulasi historis. Transaksi lama tetap memiliki `unit_price`, `unit_hpp`, `quantity`, dan `subtotal` yang akurat.
  * Transaksi baru di masa depan akan memiliki link ke resep aktif yang digunakan saat pesanan dibuat.
* **Rollback**: `ALTER TABLE transaction_items DROP COLUMN IF EXISTS recipe_version_id;`
* **Risiko Inkonsistensi**: Nol.

---

### 2.7 Tabel `expense_categories`
* **Status**: **Dipertahankan (*Retained*)**.
* **Fungsi Saat Ini**: Master kelompok biaya (Listrik, Sewa, Gaji, Perlengkapan, Operasional).
* **Kolom yang Ditambahkan**: Tidak ada perubahan kolom wajib.
* **Dampak Data Lama**: Kategori pengeluaran yang sudah ada tetap dipakai oleh kasir dan operator gudang.
* **Rollback**: Tidak ada perubahan struktur.
* **Risiko Inkonsistensi**: Nol.

---

### 2.8 Tabel `operating_expenses`
* **Status**: **Dipertahankan & Diperluas (*Extended*)**.
* **Fungsi Saat Ini**: Mencatat pengeluaran operasional toko.
* **Kolom yang Ditambahkan**:
  * `outlet_id` (UUID, NULLABLE, FK -> `outlets(id)` ON DELETE CASCADE)
  * `warehouse_id` (UUID, NULLABLE, FK -> `warehouses(id)` ON DELETE CASCADE)
* **Dampak Data Lama**:
  * Pengeluaran yang tercatat sebelumnya di-assign ke Outlet 1 default.
  * Laporan Laba Bersih di dashboard tetap menghitung pengurangan laba kotor secara presisi.
* **Strategi Migrasi**:
  1. Tambahkan `outlet_id` dan `warehouse_id`.
  2. Alokasikan data pengeluaran lama ke Outlet 1:  
     `UPDATE operating_expenses SET outlet_id = (SELECT id FROM outlets WHERE code = 'OUT-01' LIMIT 1) WHERE outlet_id IS NULL AND warehouse_id IS NULL;`
* **Rollback**: `ALTER TABLE operating_expenses DROP COLUMN IF EXISTS outlet_id; ALTER TABLE operating_expenses DROP COLUMN IF EXISTS warehouse_id;`
* **Risiko Inkonsistensi**: Sangat rendah.

---

### 2.9 Tabel `audit_logs`
* **Status**: **Dipertahankan sebagai Pondasi Audit Trail (*Retained & Expanded*)**.
* **Fungsi Saat Ini**: Mencatat log peristiwa aksi sistem (`user_id`, `action`, `entity_name`, `entity_id`, `payload`, `created_at`).
* **Kolom yang Ditambahkan**:
  * `outlet_id` (UUID, NULLABLE, FK -> `outlets(id)` ON DELETE SET NULL)
  * `warehouse_id` (UUID, NULLABLE, FK -> `warehouses(id)` ON DELETE SET NULL)
  * `ip_address` (TEXT, NULLABLE)
* **Dampak Data Lama**: Nol dampak. Log lama tetap tersimpan abadi (*append-only*).
* **Rollback**: `ALTER TABLE audit_logs DROP COLUMN IF EXISTS outlet_id; ALTER TABLE audit_logs DROP COLUMN IF EXISTS warehouse_id; ALTER TABLE audit_logs DROP COLUMN IF EXISTS ip_address;`
* **Risiko Inkonsistensi**: Nol.

---

## 3. Urutan Eksekusi Migrasi SQL (*Phased Migration Roadmap*)

Untuk mencegah kegagalan relasi *Foreign Key* (*cyclic dependencies*), migrasi dibagi menjadi 6 tahap berurutan:

```
[Tahap 1: Organisasi & Lokasi]
  ├── organizations
  ├── outlets (7 Outlet Obat Haus)
  └── warehouses (1 Gudang Pusat)
        │
        ▼
[Tahap 2: Ekstensi Pengguna & Hak Akses]
  ├── Ekstensi profiles (role baru, outlet assignment)
  ├── roles & permissions
  └── user_outlet_assignments
        │
        ▼
[Tahap 3: Master Bahan Baku & Resep]
  ├── raw_material_categories
  ├── units & unit_conversions
  ├── raw_materials
  └── recipes, recipe_versions, recipe_items
        │
        ▼
[Tahap 4: Mesin Persediaan & Stock Ledger]
  ├── inventory_locations
  ├── inventory_balances
  ├── stock_ledger (Immutable Journal)
  └── stock_opnames, stock_opname_items, stock_adjustments
        │
        ▼
[Tahap 5: Pengadaan Supplier & Distribusi Outlet]
  ├── suppliers, supplier_purchase_orders, supplier_receipts
  ├── outlet_purchase_orders, warehouse_dispatches, outlet_receipts
  └── return_requests, return_inspections
        │
        ▼
[Tahap 6: Ekstensi POS, Shift Kasir & Persetujuan]
  ├── cashier_shifts, shift_cash_movements
  ├── Ekstensi transactions (outlet_id, shift_id)
  ├── Ekstensi transaction_items (recipe_version_id)
  ├── transaction_corrections
  ├── approval_requests, approval_actions
  └── document_sequences, notifications
```

---

## 4. Rencana Data Seeding Awal Obat Haus

Saat migrasi dijalankan, sistem secara otomatis mengisi data awal (*seed data*):

1. **Organisasi**:
   * ID: `10000000-0000-0000-0000-000000000001` — 'Obat Haus Indonesia'.
2. **7 Cabang Outlet Obat Haus**:
   * `OUT-01`: Obat Haus - Ahmad Yani (Outlet Utama / Eksisting)
   * `OUT-02`: Obat Haus - Pettarani
   * `OUT-03`: Obat Haus - Hertasning
   * `OUT-04`: Obat Haus - Perintis Kemerdekaan
   * `OUT-05`: Obat Haus - Alauddin
   * `OUT-06`: Obat Haus - Ratulangi
   * `OUT-07`: Obat Haus - Daya
3. **1 Gudang Pusat**:
   * `WH-01`: Gudang Pusat Obat Haus (Central Warehouse Makassar)
4. **Master Satuan Standar**:
   * Berat: `gram`, `kg` (faktor konversi: 1 kg = 1000 gram).
   * Volume: `ml`, `liter` (faktor konversi: 1 liter = 1000 ml).
   * Kuantitas: `pcs`, `pack` (faktor konversi: 1 pack = 50 pcs), `karton`.
5. **Akun Pengguna Demo**:
   * Admin / Owner: `admin@obathaus.id` (Username: `admin`, Sandi: `123456`)
   * Operator Gudang: `gudang@obathaus.id` (Username: `gudang`, Sandi: `123456`)
   * Kasir Outlet 1: `kasir@obathaus.id` (Username: `kasir`, Sandi: `123456`)

---

## 5. Prosedur Keamanan & Verifikasi Pasca-Migrasi

1. **Backup Pra-Migrasi**:
   * Lakukan ekspor skema dan data eksisting sebelum menjalankan file SQL baru.
2. **Smoke Test Integrity**:
   * Buka halaman kasir POS (`/pos`) -> Pastikan seluruh menu minuman tetap muncul normal.
   * Lakukan transaksi demo -> Pastikan checkout dan cetak struk tetap berfungsi 100%.
   * Buka Dashboard Admin (`/admin/dashboard`) -> Pastikan grafik omzet dan laba tetap terbaca.
3. **Konfirmasi Bebas Error**:
   * Verifikasi dengan `npx tsc --noEmit` bahwa seluruh tipe antarmuka TypeScript sinkron tanpa komplain.
