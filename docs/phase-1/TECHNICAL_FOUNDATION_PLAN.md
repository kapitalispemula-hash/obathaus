# RANCANGAN FONDASI TEKNIS (TECHNICAL FOUNDATION PLAN)
## OBAT HAUS – OPERATIONAL SYSTEM MANAGEMENT
**Dokumen:** Spesifikasi Arsitektur Perangkat Lunak, Struktur Lapisan & Layanan Bisnis  
**Versi:** 1.0 — Phase 1 Foundation & Database Design  
**Framework:** Next.js 15 (App Router), React 19, TypeScript 5, Tailwind CSS, Supabase / PostgreSQL  
**Status:** Rancangan Teknis (Menunggu Persetujuan Owner)

---

## 1. Prinsip Desain Arsitektur

1. **Konservasi Arsitektur Eksisting (*Architectural Continuity*)**:
   * Mempertahankan struktur Next.js App Router yang saat ini terbukti responsif, cepat, dan stabil di port 3001.
   * Tidak mengubah atau memindahkan direktori komponen POS lama yang sudah bekerja dengan baik.
2. **Pola Berlapis Bersih (*Clean Layered Architecture*)**:
   * **Presentation Layer**: Antarmuka pengguna (UI Components, Modals, Forms, Views).
   * **State & Context Layer**: Mengelola sesi otentikasi (`AuthContext`), keranjang pesanan (`CartContext`), dan pilihan lokasi aktif (`OutletContext`).
   * **Service Layer**: Logika bisnis murni (Stock Ledger Service, Recipe Engine, Checkout Orchestrator, Approval Service, Audit Service).
   * **Data Access / Repository Layer**: Abstraksi akses basis data dengan *Dual-Engine* (Supabase PostgreSQL Client untuk online + Local Storage Engine untuk demo/offline).
3. **Pemberian Hak Akses & Isolasi Lokasi (*Context-Driven Isolation*)**:
   * Setiap request layanan menyertakan konteks identitas pengguna (`userId`, `role`, `activeOutletId`, `activeWarehouseId`).

---

## 2. Struktur Direktori Target (Modular & Preservasi Proyek Lama)

Direktori diperluas secara teratur tanpa mengganggu file yang sudah ada:

```
cafeposdemo/
├── docs/                                  # Dokumentasi Induk Masterplan & Fase
│   ├── phase-0/                           # Laporan Audit & Gap Analysis
│   └── phase-1/                           # ERD, Permission Matrix, Migration Plan, Tech Plan, Open Decisions
├── src/
│   ├── app/                               # Next.js 15 App Router Routes
│   │   ├── globals.css                    # Desain token, styling print thermal, background dot-grid
│   │   ├── layout.tsx                     # Root Layout (AuthProvider, CartProvider, OutletProvider, PWA)
│   │   ├── page.tsx                       # Redirect cerdas ke /pos atau /admin/dashboard sesuai role
│   │   ├── login/page.tsx                 # Halaman login modern (Username, Sandi, Brand Logo, Labide footer)
│   │   ├── pos/                           # Workspace Kasir Outlet (PRESERVED 100%)
│   │   │   ├── page.tsx                   # Grid katalog menu, filter kategori, search, My Order cart
│   │   │   ├── history/page.tsx           # Riwayat transaksi kasir & cetak ulang struk
│   │   │   ├── shift/page.tsx             # [Baru] Buka/tutup shift kasir, hitung uang fisik laci
│   │   │   ├── inventory/page.tsx         # [Baru] Monitoring stok bahan baku outlet (read-only)
│   │   │   ├── po/page.tsx                # [Baru] Buat permintaan bahan baku ke gudang pusat
│   │   │   ├── receipts/page.tsx          # [Baru] Konfirmasi penerimaan pengiriman fisik dari gudang
│   │   │   └── returns/page.tsx           # [Baru] Pengajuan retur bahan rusak/salah ke gudang
│   │   ├── warehouse/                     # [Baru] Workspace Operator Gudang Pusat
│   │   │   ├── dashboard/page.tsx         # Metrik stok gudang, PO pending, pengiriman aktif
│   │   │   ├── stock/page.tsx             # Daftar stok bahan baku gudang pusat
│   │   │   ├── supplier-po/page.tsx       # Pengadaan bahan baku supplier (menunggu persetujuan Admin)
│   │   │   ├── supplier-receipts/page.tsx # Penerimaan barang fisik dari supplier
│   │   │   ├── outlet-orders/page.tsx     # Pemrosesan permintaan PO dari 7 outlet
│   │   │   ├── dispatch/page.tsx          # Surat Jalan & pengiriman barang (status in-transit)
│   │   │   ├── returns/page.tsx           # Pemeriksaan fisik retur dari outlet
│   │   │   └── stock-opname/page.tsx      # Sesi hitung fisik & pengajuan selisih ke Admin
│   │   └── admin/                         # Workspace Inti Admin / Owner (PRESERVED & EXPANDED)
│   │       ├── dashboard/page.tsx         # Dashboard finansial konsolidasi seluruh outlet & filter cabang
│   │       ├── outlets/page.tsx           # [Baru] Manajemen 7 outlet & gudang pusat
│   │       ├── users/page.tsx             # Manajemen pengguna, role, outlet assignment, reset password
│   │       ├── products/page.tsx          # Master menu produk & kalkulasi HPP
│   │       ├── outlet-menus/page.tsx      # [Baru] Atur ketersediaan & harga menu per outlet
│   │       ├── raw-materials/page.tsx     # [Baru] Master bahan baku, satuan, konversi
│   │       ├── recipes/page.tsx           # [Baru] Manajemen resep & takaran bahan per menu
│   │       ├── inventory/page.tsx         # [Baru] Pantau stok seluruh outlet, gudang & in-transit
│   │       ├── suppliers/page.tsx         # [Baru] Master data supplier bahan baku
│   │       ├── approvals/page.tsx         # [Baru] Pusat persetujuan Admin / Owner (PO supplier, opname, koreksi)
│   │       ├── categories/page.tsx        # Master kategori menu kasir
│   │       ├── transactions/page.tsx      # Log transaksi seluruh outlet & opsi koreksi
│   │       ├── shifts/page.tsx            # [Baru] Pengawasan seluruh shift kasir & selisih kas
│   │       ├── reports/page.tsx           # Laporan P&L, performa menu, HPP, ekspor PDF/Excel
│   │       ├── expenses/page.tsx          # Biaya operasional cabang dan gudang
│   │       ├── audit-logs/page.tsx        # [Baru] Penelusuran audit trail lengkap (append-only)
│   │       └── settings/page.tsx          # Pengaturan toko, favicon browser sync, prefix, reset demo
│   ├── components/                        # UI Components Reusable
│   │   ├── common/                        # BrandLogo, TargetLogo, CategoryIcon, PwaSupport
│   │   ├── layout/                        # TopHeader, AdminLayout, CashierLayout, WarehouseLayout
│   │   ├── pos/                           # ProductCard, CartPanel, CheckoutModal, TransactionSuccessModal
│   │   ├── receipt/                       # ReceiptModal (Thermal print 58mm/80mm)
│   │   └── shared/                        # [Baru] ApprovalBadge, StatusPill, DataTable, OutletSwitcher
│   ├── lib/                               # Core Logic & Contexts
│   │   ├── auth-context.tsx               # Otentikasi, session, role guards
│   │   ├── cart-context.tsx               # Keranjang POS kasir, diskon, catatan
│   │   ├── outlet-context.tsx             # [Baru] Manajemen outlet aktif (Admin switcher / Kasir locked)
│   │   ├── format.ts                      # Format Rupiah, tanggal WITA, angka
│   │   ├── services/                      # Modular Business Services
│   │   │   ├── database.ts                # Unified entry point repository
│   │   │   ├── stock-ledger.service.ts    # [Baru] Layanan mutasi stok debit/kredit
│   │   │   ├── recipe.service.ts          # [Baru] Perhitungan resep & konsumsi bahan
│   │   │   ├── checkout.service.ts        # [Baru] Eksekutor checkout atomik (penjualan + potong stok)
│   │   │   ├── shift.service.ts           # [Baru] Manajemen buka/tutup shift & kontrol uang laci
│   │   │   ├── approval.service.ts        # [Baru] Alur pengajuan & persetujuan dokumen
│   │   │   └── audit.service.ts           # [Baru] Perekaman audit trail append-only
│   │   └── supabase/                      # Supabase client & SSR utilities
│   └── types/                             # TypeScript Definitions
│       ├── database.ts                    # Seluruh tipe entitas database
│       └── operational.ts                 # [Baru] Payload PO, mutasi stok, status workflow
└── supabase/migrations/                   # Berkas migrasi database PostgreSQL
```

---

## 3. Desain Layanan Bisnis Inti (*Core Business Services*)

### 3.1 Layanan Checkout POS Atomik (*Atomic Checkout Orchestrator*)

Ketika kasir mengklik tombol **"Selesaikan Pembayaran"** di POS, seluruh proses wajib dieksekusi secara **atomik (*all-or-nothing*)** menggunakan PostgreSQL RPC / Database Transaction:

```
[KASIR KLIK BAYAR]
       │
       ▼
[1. VALIDASI SHIFT] ────(Jika tidak ada shift aktif)────> GAGAL & TAMPILKAN PERINGATAN
       │
       ▼ (Shift Valid)
[2. AMBIL RESEP AKTIF] ─> Ambil snapshot resep menu yang dibeli untuk outlet tersebut
       │
       ▼
[3. CEK KETERSEDIAAN STOK BAHAN]
       │ ├── (Jika stok kurang & kebijakan = Block) ───> GAGAL: "Bahan Baku Habis"
       │ └── (Jika stok cukup / kebijakan = Allow)
       ▼
[4. EKSEKUSI TRANSAKSI ATOMIK (SINGLE TRANSACTION)]
       │
       ├── A. Terbitkan Nomor Invoice (Concurrency-safe sequence)
       ├── B. Simpan Header `transactions` (terikat ke outlet_id & shift_id)
       ├── C. Simpan Detail `transaction_items` (snapshot harga & snapshot HPP)
       ├── D. Catat Mutasi Kredit di `stock_ledger` untuk setiap gram/ml bahan yang terpakai
       ├── E. Update `inventory_balances` cabang bersangkutan
       ├── F. Catat Pergerakan Kas Masuk jika metode = Tunai
       └── G. Terbitkan Catatan Audit Log
       │
       ▼
[5. RETURN SUCCESS] ───> Buka Modal Sukses & Cetak Struk Kasir Otomatis
```

### 3.2 Layanan Buku Besar Persediaan (*Stock Ledger Service*)

Seluruh penambahan dan pengurangan saldo stok wajib melalui fungsi terstandarisasi:

```typescript
interface RecordStockMovementPayload {
  documentNumber: string;
  movementType: 
    | 'supplier_receipt'
    | 'dispatch_to_transit'
    | 'transit_to_outlet'
    | 'pos_consumption'
    | 'stock_opname_adjustment'
    | 'return_to_warehouse'
    | 'waste_damaged';
  fromLocationId?: string | null;
  toLocationId?: string | null;
  rawMaterialId: string;
  quantity: number;
  unitId: string;
  unitCost?: number;
  referenceTable: string;
  referenceId: string;
  userId: string;
  notes?: string;
}
```

* **Aturan Pengurangan**: Mengurangi `inventory_balances` di lokasi asal (`fromLocationId`).
* **Aturan Penambahan**: Menambah `inventory_balances` di lokasi tujuan (`toLocationId`).
* **Verifikasi Konsistensi**: Setiap saat, saldo `inventory_balances` dapat direkonsiliasi dengan menghitung `SUM(quantity in) - SUM(quantity out)` dari tabel `stock_ledger`.

### 3.3 Layanan Alur Distribusi & *In-Transit Inventory*

Memastikan barang yang sedang dalam perjalanan tidak hilang dari pencatatan:

1. **Gudang Pusat Mengirim Barang**:
   * Lokasi Asal: `Gudang Pusat`.
   * Lokasi Tujuan: `In-Transit (Cabang A)`.
   * Stok fisik gudang berkurang seketika, namun stok fisik cabang belum bertambah.
2. **Cabang Menerima Barang**:
   * Kasir memeriksa fisik barang dan menginput jumlah aktual yang diterima.
   * Lokasi Asal: `In-Transit (Cabang A)`.
   * Lokasi Tujuan: `Cabang A`.
   * Jika ada barang kurang atau tumpah di perjalanan, selisihnya otomatis dibukukan ke jurnal kerugian pengiriman (*damaged/lost in transit*).

### 3.4 Layanan Alur Persetujuan (*Approval Workflow Service*)

Mendukung kontrol penuh Admin (Owner) atas pengeluaran besar dan koreksi stok:

```typescript
interface SubmitApprovalPayload {
  requestType: 'supplier_po' | 'stock_opname_adjustment' | 'transaction_correction';
  referenceTable: string;
  referenceId: string;
  requestedBy: string;
  notes?: string;
}

interface ProcessApprovalPayload {
  requestId: string;
  decidedBy: string; // Wajib Admin (Owner)
  decision: 'approved' | 'rejected';
  reason?: string;
}
```

* **Ketika Disetujui (`approved`)**: Sistem otomatis mengeksekusi aksi lanjutan (misalnya menerbitkan PO Supplier resmi, membukukan penyesuaian stok di `stock_ledger`, atau memposting koreksi transaksi).
* **Ketika Ditolak (`rejected`)**: Dokumen kembali ke status draft dengan alasan penolakan dari Admin (Owner).

### 3.5 Layanan Audit Trail (*Append-Only Audit Service*)

Merekam seluruh peristiwa penting tanpa menyediakan fungsi hapus:

```typescript
interface LogAuditEventPayload {
  userId?: string | null;
  action: 'CREATE' | 'UPDATE' | 'DELETE' | 'APPROVE' | 'REJECT' | 'LOGIN' | 'LOGOUT';
  entityName: string;
  entityId?: string;
  outletId?: string | null;
  warehouseId?: string | null;
  payload?: Record<string, any>;
}
```

---

## 4. Mekanisme Multi-Outlet Context (`OutletContext`)

Untuk memastikan antarmuka tetap bersih dan data terisolasi:

```typescript
interface OutletContextType {
  activeOutlet: Outlet | null;         // Outlet yang sedang dipilih
  activeWarehouse: Warehouse | null;   // Gudang yang sedang dipilih
  availableOutlets: Outlet[];          // Daftar outlet yang boleh diakses pengguna
  isAdmin: boolean;                    // Apakah pengguna memiliki hak lintas outlet (Admin / Owner)
  setActiveOutlet: (outletId: string | 'all') => void;
}
```

* **Untuk Kasir**: `activeOutlet` otomatis terkunci pada `primary_outlet_id` staf tersebut. Tombol pemilih outlet tidak ditampilkan.
* **Untuk Operator Gudang**: `activeWarehouse` otomatis terkunci pada Gudang Pusat.
* **Untuk Admin (Owner)**: Tampil dropdown **"Pilih Outlet"** di bagian atas TopHeader navigasi, memungkinkan Admin/Owner berpindah antar-outlet dalam 1 klik atau memilih mode konsolidasi **"Semua Outlet"**.

---

## 5. Rencana Pengujian Otomatis & Konsistensi (*Quality Assurance*)

1. **Unit Test Perhitungan Resep & HPP**:
   * Memastikan pengurangan bahan gramasi desimal (misal 18.5 gram bubuk kopi) terpotong presisi tanpa pembulatan liar (*floating point errors*).
2. **Concurrency Test Transaksi Bersamaan**:
   * Simulasi 10 kasir di cabang berbeda melakukan checkout pada detik yang sama -> Memastikan penomoran invoice (`INV-01-xxxx`, `INV-02-xxxx`) tidak pernah duplikat (*collision-free*).
3. **Simulasi Rekonsiliasi Kas Kasir**:
   * Pengujian pembukaan shift (modal Rp 200.000) + 15 transaksi tunai + 1 pengeluaran kas darurat -> Memverifikasi selisih kas fisik vs sistem terhitung akurat 100%.
