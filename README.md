# 🍵 OBAT HAUS — Operational System Management (Version 1.0)

Sistem Informasi Manajemen Terintegrasi: Point of Sale (POS), Operasional 7 Cabang Outlet, Gudang Logistik Pusat, Resep & HPP Otomatis (BOM), Valuasi Persediaan, dan Analisis Keuangan Komprehensif.

---

## 🚀 Fitur Utama Sistem

### 1. Panel Kasir POS (Per-Cabang)
- **Katalog Menu Cepat**: Filter kategori, pencarian real-time, varian, dan subtotal dinamis.
- **Manajemen Shift Kasir**: Buka shift dengan modal kas awal, pencatatan kas keluar (petty cash out), dan tutup shift dengan verifikasi selisih kas fisik.
- **Pencatatan Biaya Operasional**: Pengeluaran operasional cabang terkunci otomatis ke outlet yang aktif.
- **Logistik Cabang**: Pengajuan restock ke gudang pusat dan konfirmasi penerimaan Surat Jalan.

### 2. Panel Admin / Owner (Pusat Kendali)
- **Executive Dashboard**: Ringkasan omzet bersih, HPP, laba kotor, laba operasional, dan margin laba.
- **Pusat Persetujuan PO (Approval Center)**: Otorisasi permohonan pengadaan bahan baku dari Gudang Pusat ke supplier vendor.
- **Manajemen 7 Cabang Outlet**: Pengaturan menu cabang, override harga, dan kustomisasi header/footer struk invoice.
- **Master Data & Resep Menu (BOM)**: Perhitungan HPP dinamis berbasis gramasi resep bahan baku per porsi.
- **Laporan Finansial Komprehensif**: Perbandingan performa 7 cabang, rugi-laba, dan valuasi aset persediaan (gudang + cabang).
- **Audit Trail Sistem**: Rekam jejak seluruh aktivitas otorisasi, penutupan shift, dan mutasi data.

### 3. Panel Gudang Logistik Pusat (Central Warehouse)
- **Stok Fisik Bahan Baku**: Monitoring batas aman persediaan dan peringatan stok menipis.
- **Pengadaan PO Supplier**: Pengajuan dokumen permohonan pembelian bahan baku ke vendor supplier.
- **Penerimaan Barang (GRN)**: Pencatatan kedatangan fisik barang dari supplier dengan verifikasi nomor surat jalan vendor.
- **Distribusi Surat Jalan (Dispatch)**: Pengiriman bahan baku in-transit ke 7 outlet cabang.
- **Pemeriksaan Retur Cabang**: Inspeksi fisik bahan rusak/cacat dan penetapan disposisi stok.
- **Stock Opname Fisik**: Penghitungan berkala dengan penyesuaian selisih stok sistem vs fisik.
- **Riwayat Transaksi Terpadu**: Log transaksi outlet dan supplier dalam satu portal.

---

## 🏢 7 Cabang Outlet Resmi OBATHAUS

1. **OBATHAUS Cityfood (pusat)** — `OUT-01` (Jl. Todilaling, Kel. Pekkabata, Polewali)
2. **OBATHAUS Sentral** — `OUT-02` (Jl. Mr. Muh. Yamin, Kel. Pekkabata, Polewali)
3. **OBATHAUS Pantai Bahari** — `OUT-03` (Jl. Bahari, Kel. Polewali, Polewali Mandar)
4. **OBATHAUS Wonomulyo** — `OUT-04` (Jl. Jenderal Soedirman, Wonomulyo, Polewali Mandar)
5. **OBATHAUS Campalagian** — `OUT-05` (Jl. Poros Polman-Majene, Campalagian)
6. **OBATHAUS Tinambung** — `OUT-06` (Jl. Poros Polman-Majene, Tinambung)
7. **OBATHAUS Majene** — `OUT-07` (Jl. KH. Daeng, Banggae, Majene)
- **Gudang Logistik Pusat (Central Warehouse)** — `WH-01` (Polewali Mandar, Sulbar)

---

## 🛠️ Tech Stack

- **Framework**: [Next.js 15 (App Router)](https://nextjs.org/)
- **Bahasa**: [TypeScript 5](https://www.typescriptlang.org/)
- **Styling**: [Tailwind CSS 3](https://tailwindcss.com/)
- **Ikon**: [Lucide React](https://lucide.dev/)
- **Database & Storage**: [Supabase (PostgreSQL)](https://supabase.com/)
- **Hosting & Deployment**: [Vercel](https://vercel.com/)
- **Version Control**: [GitHub](https://github.com/)

---

## 📦 Memulai di Lingkungan Lokal (Local Development)

### 1. Kloning & Instal Dependensi
```bash
git clone https://github.com/username/obathaus-pos.git
cd obathaus-pos
npm install
```

### 2. Konfigurasi Environment Variables
Salin file `.env.example` menjadi `.env.local`:
```bash
cp .env.example .env.local
```
Sesuaikan isi `.env.local` jika menghubungkan ke instance Supabase Anda:
```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_DEFAULT_TIMEZONE=Asia/Makassar
```

### 3. Menjalankan Server Development
```bash
npm run dev
```
Buka browser di: [http://localhost:3001](http://localhost:3001) atau [http://localhost:3000](http://localhost:3000).

---

## 🔐 Kredensial Akun Pengguna (Demo Profiles)

| Peran (Role) | Username | Password | Deskripsi Hak Akses |
| :--- | :--- | :---: | :--- |
| **Administrator / Owner** | `admin` | `123456` | Akses global seluruh cabang, laporan finansial, HPP, dan approval PO. |
| **Kasir Cabang (Cityfood)** | `kasir` | `123456` | Akses kasir POS cabang Cityfood Pusat, buka/tutup shift, kas operasional. |
| **Kasir Cabang (Sentral)** | `siti` | `123456` | Akses kasir POS cabang Sentral. |
| **Kasir Cabang (Pantai Bahari)** | `dewi` | `123456` | Akses kasir POS cabang Pantai Bahari. |
| **Operator Gudang Pusat** | `gudang` | `123456` | Akses khusus logistik gudang, stok bahan, PO supplier, dispatch surat jalan. |

---

## 🌐 Panduan Deployment ke Supabase & Vercel

### 1. Setup Supabase
1. Buat project baru di [supabase.com](https://supabase.com).
2. Buka menu **SQL Editor**, lalu jalankan seluruh file migrasi dari folder `supabase/migrations/` secara berurutan.
3. Buat public bucket di Supabase Storage bernama `store-assets`.

### 2. Deploy ke Vercel via GitHub
1. Push repositori ini ke akun GitHub Anda.
2. Di Vercel, pilih **Add New -> Project** dan hubungkan repositori GitHub Anda.
3. Pada form **Environment Variables**, tambahkan:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `NEXT_PUBLIC_APP_URL`
   - `NEXT_PUBLIC_DEFAULT_TIMEZONE` = `Asia/Makassar`
4. Klik **Deploy**.

---

## 📄 Lisensi & Hak Cipta
Hak Cipta © 2026 **OBAT HAUS INDONESIA**. Dikembangkan oleh **LABIDE - Digital Creative Hub**.
Seluruh hak cipta dilindungi undang-undang.
