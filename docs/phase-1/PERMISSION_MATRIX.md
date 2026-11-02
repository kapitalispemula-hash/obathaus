# MATRIKS KEWENANGAN (PERMISSION MATRIX)
## OBAT HAUS – OPERATIONAL SYSTEM MANAGEMENT
**Dokumen:** Spesifikasi Kontrol Hak Akses Berbasis Peran & Lokasi (RBAC & LBAC)  
**Versi:** 1.0 — Phase 1 Foundation & Database Design  
**Status:** Rancangan Final (Menunggu Persetujuan Owner)

---

## 1. Definisi Tiga Role Utama Sistem

Sistem operasional Obat Haus menggunakan tepat **3 role**:

1. **`admin` (Admin sekaligus Owner / Pemilik Obat Haus)**:
   * Pemegang kendali utama seluruh ekosistem bisnis Obat Haus.
   * Merupakan satu-satunya identifier role untuk Admin / Owner (Admin dan Owner adalah entitas yang sama).
   * Memiliki akses penuh lintas seluruh 7 outlet dan 1 gudang pusat (*global scope*).
   * Satu-satunya role yang berhak mengelola master data (supplier, resep, harga outlet, akun pengguna, konfigurasi toko).
   * Menjadi pusat persetujuan (*approval authority*) untuk pengadaan supplier, penyesuaian stok opname, dan koreksi transaksi.
2. **`cashier` (Kasir / Staf Outlet)**:
   * Pelaksana operasional harian di cabang outlet tertentu.
   * Terikat secara ketat pada outlet yang ditugaskan (*location-locked*).
   * Menjalankan POS, membuka/menutup shift, melihat stok bahan outlet, membuat PO ke gudang, mengonfirmasi penerimaan barang, mengajukan retur, dan mencatat beban operasional outlet.
   * **Dilarang keras**: Mengubah/menghapus transaksi yang sudah diposting, mengubah master data, mengubah saldo stok secara langsung, atau melihat data outlet lain.
3. **`warehouse_operator` (Operator Gudang Pusat)**:
   * Pengelola persediaan dan lalu lintas distribusi di Gudang Pusat.
   * Terikat pada Gudang Pusat (*warehouse-scoped*).
   * Membuat draft/pengajuan PO supplier, mencatat penerimaan barang fisik dari supplier, memproses pemenuhan PO outlet, membuat surat jalan pengiriman, memeriksa fisik retur outlet, dan melakukan hitung fisik stok opname.
   * **Dilarang keras**: Menyetujui PO supplier buatan sendiri, menyetujui penyesuaian stok sendiri, mengelola master supplier, mengedit riwayat distribusi, atau mengubah saldo stok secara langsung.

---

## 2. Prinsip Penegakan Hak Akses Multi-Lapis (*Defense-in-Depth*)

Sesuai Pasal 5.4 Masterplan Final: **"Menyembunyikan tombol Edit atau Hapus pada frontend saja tidak cukup."** Hak akses ditegakkan pada 4 lapisan:

1. **Lapisan Basis Data (Row-Level Security / RLS & Triggers)**:
   * Kebijakan RLS di PostgreSQL memastikan kueri kasir hanya mengembalikan baris yang memiliki `outlet_id = auth.current_outlet_id()`.
   * Trigger PostgreSQL memblokir operasi `UPDATE` dan `DELETE` pada tabel `transactions`, `stock_ledger`, dan `audit_logs`.
2. **Lapisan Server / Service Layer (Backend Authorization Guard)**:
   * Setiap *action* memeriksa sesi pengguna, role, dan izin spesifik sebelum mengeksekusi logika bisnis.
   * Transaksi POS secara otomatis menolak pembayaran jika kasir belum membuka shift aktif.
3. **Lapisan Navigasi & Routing (Middleware Route Guard)**:
   * URL `/admin/*` otomatis me-redirect kasir dan operator gudang yang mencoba mengaksesnya.
   * URL gudang hanya dapat diakses oleh Admin (Owner) dan Operator Gudang.
4. **Lapisan Antarmuka (UI/UX Visibility)**:
   * Tombol aksi sensitif disembunyikan agar antarmuka tetap bersih dan tidak membingungkan pengguna operasional.

---

## 3. Matriks Hak Akses Modul Lengkap

Keterangan Kode Akses:
* **C (Create)**: Membuat dokumen atau data baru.
* **R (Read)**: Melihat / membaca data.
* **U (Update)**: Mengubah data yang belum diposting (draft).
* **D (Delete / Soft Delete)**: Menghapus / menonaktifkan data.
* **A (Approve / Reject)**: Menyetujui atau menolak dokumen pengajuan.
* **X (No Access)**: Dilarang sama sekali.

| Modul & Entitas Sistem | Admin (Owner) | Kasir / Outlet | Operator Gudang | Catatan Khusus & Aturan Keamanan |
| :--- | :---: | :---: | :---: | :--- |
| **A. MANAJEMEN MASTER DATA** | | | | |
| Master Outlet & Gudang | **C, R, U, D** | **X** | **X** | Hanya Admin (Owner) yang dapat menambah/menonaktifkan cabang & gudang. |
| Pengguna & Hak Akses | **C, R, U, D** | **X** | **X** | Admin (Owner) mengelola akun, password, dan penugasan lokasi staf. |
| Master Produk Menu (`products`) | **C, R, U, D** | **R (Menu POS)** | **R (Referensi)** | Kasir hanya membaca menu yang tersedia untuk dijual. |
| Kategori Menu (`categories`) | **C, R, U, D** | **R** | **X** | Hanya Admin (Owner) yang dapat mengelola kategori menu. |
| Harga & Menu per Outlet | **C, R, U, D** | **X** | **X** | Menentukan variasi harga produk di masing-masing cabang. |
| Master Bahan Baku (`raw_materials`) | **C, R, U, D** | **R (Stok Cabang)** | **R (Stok Gudang)** | Kasir & Operator tidak boleh menambah/mengubah bahan baku. |
| Kategori Bahan & Satuan/Konversi | **C, R, U, D** | **X** | **X** | Master satuan gram, ml, kg, liter dikunci oleh Admin (Owner). |
| Manajemen Resep & Versi Resep | **C, R, U, D** | **X** | **X** | Takaran bahan per resep menu hanya ditentukan oleh Admin (Owner). |
| Master Supplier (`suppliers`) | **C, R, U, D** | **X** | **R (Hanya Memilih)** | Operator Gudang hanya dapat memilih supplier yang sudah ada. |
| Konfigurasi Toko & Logo | **C, R, U, D** | **X** | **X** | Prefix invoice, pajak, printer, dan logo dikelola Admin (Owner). |
| | | | | |
| **B. TRANSAKSI POS & KASIR** | | | | |
| Transaksi Penjualan Baru | **C, R** | **C, R (Outlet)** | **X** | Wajib ada shift aktif. Kasir memproses pesanan dan pembayaran. |
| Transaksi Terposting (*Posted*) | **R, Koreksi (A)** | **R (Hanya Baca)** | **X** | **Immutable**: Kasir dilarang mengedit atau menghapus riwayat transaksi. |
| Buka / Tutup Shift Kasir | **R (Semua Shift)** | **C, R (Shift Sendiri)**| **X** | Kasir wajib input kas awal & uang fisik aktual saat tutup. |
| Mutasi Kas Darurat Shift | **R** | **C, R (Shift Aktif)** | **X** | Kasir mencatat uang keluar/masuk darurat laci kasir. |
| Koreksi Transaksi | **A (Eksekusi)** | **Pengajuan** | **X** | Koreksi transaksi historis wajib melalui persetujuan Admin (Owner). |
| | | | | |
| **C. PERSEDIAAN & STOCK LEDGER** | | | | |
| Saldo Stok Bahan Baku | **R (Semua Lokasi)**| **R (Outletnya)** | **R (Gudang & Transit)**| **Saldo dihitung otomatis**: Tidak ada role yang bisa edit saldo langsung. |
| Buku Besar Stok (`stock_ledger`)| **R (Semua Log)** | **R (Riwayat Outlet)**| **R (Riwayat Gudang)**| **Append-Only**: Tidak dapat diubah atau dihapus oleh siapa pun. |
| Hitung Fisik (Stok Opname) | **R, A (Persetujuan)**| **X** | **C, R, U (Input Fisik)**| Operator menghitung fisik, sistem hitung selisih. |
| Penyesuaian Stok (*Adjustment*)| **A (Eksekusi)** | **X** | **Pengajuan Saja** | Stok opname yang selisih hanya bertambah/berkurang jika disetujui Admin (Owner). |
| | | | | |
| **D. PENGADAAN SUPPLIER** | | | | |
| Buat PO Pembelian Supplier | **C, R, U, D** | **X** | **C, R, U (Draft/Ajukan)**| Operator Gudang menyusun daftar belanja bahan baku. |
| Persetujuan PO Supplier | **A (Approve/Reject)**| **X** | **X (Dilarang Self-Approve)**| Operator **tidak boleh** menyetujui PO yang dibuatnya sendiri. |
| Penerimaan Barang Supplier | **R** | **X** | **C, R (Konfirmasi)** | Operator mencatat barang aktual yang diterima dari supplier. |
| | | | | |
| **E. PERMINTAAN & DISTRIBUSI OUTLET**| | | | |
| Buat PO Outlet ke Gudang | **R (Semua PO)** | **C, R, U (Outletnya)**| **R (Proses Permintaan)**| Kasir outlet meminta bahan baku yang menipis ke gudang. |
| Pengiriman Gudang (*Dispatch*) | **R** | **X** | **C, R (Proses & Kirim)**| Operator gudang menerbitkan Surat Jalan & mengurangi stok gudang. |
| Penerimaan Aktual Outlet | **R** | **C, R (Konfirmasi Aktual)**| **R (Pantau Status)**| Kasir mengonfirmasi fisik yang tiba; stok outlet baru bertambah di sini. |
| | | | | |
| **F. RETUR BARANG OUTLET** | | | | |
| Pengajuan Retur dari Outlet | **R** | **C, R (Outletnya)** | **R (Terima Pengajuan)**| Kasir mengajukan bahan rusak/salah kirim disertai alasan & foto. |
| Pemeriksaan Fisik Retur | **R** | **X** | **C, R (Klasifikasi)** | Operator gudang mengklasifikasikan barang (Layak/Rusak/Expired). |
| | | | | |
| **G. KEUANGAN & BIAYA OPERASIONAL**| | | | |
| Pengeluaran Outlet | **R, U (Koreksi)** | **C, R (Outletnya)** | **X** | Kasir mencatat biaya listrik, air, es batu dengan bukti nota. |
| Pengeluaran Gudang | **R, U (Koreksi)** | **X** | **C, R (Gudangnya)** | Operator mencatat biaya operasional gudang pusat. |
| Laporan Laba Rugi & HPP | **R, Export** | **X** | **X** | Kasir dan Operator Gudang tidak berhak melihat HPP & laba rugi. |
| | | | | |
| **H. AUDIT & KEAMANAN SISTEM** | | | | |
| Riwayat Audit Log (`audit_logs`)| **R (Semua Audit)**| **X** | **X** | **Append-Only permanen**: Tidak ada tombol edit/hapus untuk role mana pun. |
| Reset Data Demonstrasi | **C (Khusus Demo)** | **X** | **X** | Hanya tersedia di mode sandbox bagi Admin (Owner) untuk testing. |

---

## 4. Mekanisme Isolasi Lokasi (*Location-Based Isolation / LBAC*)

Untuk memastikan data antar-outlet tidak bocor atau tercampur:

```
                  ┌───────────────────────────────────────────────┐
                  │                 ADMIN (OWNER)                 │
                  │   Scope: Global (Seluruh 7 Outlet + Gudang)   │
                  └───────────────────────┬───────────────────────┘
                                          │
                 ┌────────────────────────┴────────────────────────┐
                 ▼                                                 ▼
┌─────────────────────────────────┐               ┌─────────────────────────────────┐
│         KASIR OUTLET            │               │        OPERATOR GUDANG          │
│   Scope: Single Assigned Outlet │               │      Scope: Central Warehouse   │
├─────────────────────────────────┤               ├─────────────────────────────────┤
│ • POS Menu outletnya            │               │ • Stok persediaan gudang pusat   │
│ • Shift kasir outletnya         │               │ • PO Supplier (menunggu Admin)  │
│ • Transaksi & uang kas outlet   │               │ • PO Permintaan dari 7 outlet   │
│ • Stok bahan baku outletnya     │               │ • Surat jalan pengiriman        │
│ • PO permintaan ke gudang       │               │ • Pemeriksaan retur outlet      │
│ • Konfirmasi barang masuk       │               │ • Stok opname gudang            │
│ • Pengeluaran operasional cabang│               │ • Pengeluaran gudang pusat      │
└─────────────────────────────────┘               └─────────────────────────────────┘
```

### Aturan Isolasi Data:
1. **Kasir Outlet A**:
   * Tidak dapat melihat daftar transaksi, uang kas, shift, stok bahan, maupun pengeluaran di Outlet B s/d G.
   * Saat membuka halaman POS atau Riwayat Transaksi, filter database otomatis mengunci `outlet_id = user.primary_outlet_id`.
2. **Operator Gudang**:
   * Tidak dapat melakukan transaksi penjualan di POS.
   * Tidak dapat melihat data omzet penjualan kasir, margin laba kotor toko, maupun HPP finansial.
   * Fokus operasional pada kuantitas fisik persediaan (*quantity-based operational*).
3. **Admin (Owner)**:
   * Memiliki pemilih lokasi (*Outlet Switcher*) di header navigasi untuk melihat performa spesifik Outlet A s/d G, Gudang Pusat, atau memilih opsi **"Semua Outlet (Konsolidasi)"**.

---

## 5. Aturan Khusus Anti-Manipulasi (*Anti-Fraud Enforcement*)

1. **Shift Prerequisite**:
   * Jika tidak ada rekaman `cashier_shifts` dengan status `'active'` untuk kasir di outlet tersebut, tombol **"Bayar & Selesaikan Pesanan"** di POS otomatis terkunci. Request API checkout langsung dibatalkan di backend dengan pesan: *"Kasir wajib membuka shift sebelum bertransaksi"*.
2. **Posted Transaction Immutability**:
   * Transaksi penjualan yang telah berstatus `'completed'` tidak memiliki endpoint `PUT` atau `DELETE`.
   * Jika pelanggan membatalkan pesanan atau terjadi kesalahan input, alur yang sah adalah mengajukan dokumen **Koreksi Transaksi (`transaction_corrections`)** kepada Admin (Owner). Transaksi asli tetap tersimpan, dan dokumen koreksi mencatat siapa yang mengoreksi, kapan, dan apa alasannya.
3. **No Direct Inventory Balance Update**:
   * Saldo pada tabel `inventory_balances` hanya dapat bertambah/berkurang melalui pemicu transaksi sah di `stock_ledger`.
   * Tidak ada form atau tombol di antarmuka mana pun yang mengizinkan pengetikan saldo stok secara bebas.
4. **Segregation of Duties on Procurement (Pemisahan Tugas Pengadaan)**:
   * Operator Gudang yang membuat PO Supplier tidak dapat mengubah status PO menjadi `'approved'`.
   * Persetujuan hanya dapat dilakukan melalui akun Admin (Owner).
   * Operator Gudang hanya dapat mencatat barang masuk setelah nomor PO berstatus disetujui.
