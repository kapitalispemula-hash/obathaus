# PRODUCT REQUIREMENTS DOCUMENT (PRD)
# CAFE POS — POINT OF SALE & FINANCIAL ANALYTICS

**Document Version:** 1.0  
**Product:** Cafe POS  
**Document Status:** Development Specification  
**Platform:** Web Application + Progressive Web App  
**Development Environment:** Antigravity  
**Frontend:** Next.js + TypeScript  
**Backend & Database:** Supabase  
**Deployment:** Vercel  
**Default Language:** Bahasa Indonesia  
**Default Currency:** IDR (Rupiah)  
**Default Timezone:** Asia/Makassar  

---

# 1. PRODUCT OVERVIEW

## 1.1 Product Description

Cafe POS merupakan aplikasi kasir berbasis Web Application dan Progressive Web App (PWA) yang dirancang untuk membantu operasional bisnis cafe.

Aplikasi menyediakan sistem pengelolaan produk, kategori, transaksi penjualan, pengguna, laporan keuangan, serta analisis keuntungan usaha.

Aplikasi memiliki dua jenis pengguna:

1. Admin
2. Kasir

Admin memiliki akses terhadap seluruh pengelolaan aplikasi, termasuk konfigurasi toko dan analisis keuangan.

Kasir memiliki akses terhadap aktivitas transaksi penjualan dan riwayat transaksi miliknya sendiri.

## 1.2 Product Objectives

1. Mempermudah proses transaksi penjualan cafe.
2. Mempermudah pengelolaan produk dan kategori.
3. Menyediakan pencatatan transaksi terpusat.
4. Menyediakan laporan penjualan berdasarkan periode.
5. Menghitung HPP produk yang terjual.
6. Menghitung laba kotor dan keuntungan bersih operasional.
7. Menyediakan pengelolaan biaya operasional.
8. Menyediakan aplikasi yang nyaman digunakan melalui HP dan tablet.
9. Menyediakan pengalaman demonstrasi produk yang realistis kepada calon klien.

## 1.3 Product Scope

### Included in V1

- Authentication dan authorization.
- Admin Dashboard.
- Cashier POS.
- Product Management.
- Category Management.
- Cart Management.
- Checkout dan Payment Simulation.
- Transaction History.
- Sales Reports.
- HPP Calculation.
- Gross Profit Calculation.
- Operating Expenses.
- Net Operating Profit Calculation.
- User Management.
- Store Settings.
- Invoice Settings.
- Receipt Settings.
- PWA.
- Demo Data Management.
- Report Export.

### Excluded from V1

- Payment gateway sungguhan.
- Manajemen bahan baku dan resep.
- Inventory bahan baku.
- Multi-cabang.
- Integrasi aplikasi delivery.
- Akuntansi lengkap.
- Payroll.
- Loyalty Program.
- Native Bluetooth Printer Integration.
- Offline Transaction Synchronization.

---

# 2. USER ROLES & ACCESS CONTROL

## 2.1 Admin

Admin merupakan pengguna dengan hak akses tertinggi.

Admin dapat:

- Mengakses Dashboard.
- Mengelola produk.
- Mengelola kategori.
- Mengakses POS.
- Melihat seluruh transaksi.
- Melihat laporan penjualan.
- Melihat HPP dan keuntungan.
- Mengelola biaya operasional.
- Mengelola akun Kasir.
- Mengelola profil toko.
- Mengatur invoice.
- Mengatur struk.
- Mengatur bahasa dan mata uang.
- Mengatur pajak dan diskon.
- Mengelola data demonstrasi.

## 2.2 Kasir

Kasir merupakan pengguna operasional yang bertugas memproses transaksi.

Kasir dapat:

- Mengakses halaman POS.
- Melihat produk aktif.
- Mencari produk.
- Memilih kategori.
- Menambahkan produk ke keranjang.
- Mengatur kuantitas.
- Menghapus item keranjang.
- Memproses pembayaran.
- Mencetak struk.
- Melihat riwayat transaksi sendiri.
- Melihat profil sendiri.

Kasir tidak boleh:

- Mengakses Admin Dashboard.
- Melihat HPP produk.
- Melihat margin keuntungan.
- Melihat laporan keuangan.
- Mengakses biaya operasional.
- Mengelola produk dan kategori.
- Mengelola pengguna.
- Mengubah pengaturan toko.

## 2.3 Access Control Matrix

| Modul | Admin | Kasir |
|---|---|---|
| Dashboard | Full | No Access |
| POS | Full | Full |
| Products | CRUD | Read |
| Categories | CRUD | Read |
| Transactions | All | Own |
| Reports | Full | No Access |
| HPP | Full | No Access |
| Operating Expenses | Full | No Access |
| User Management | Full | No Access |
| Store Settings | Full | No Access |
| Receipt Printing | Yes | Yes |
| Own Profile | Yes | Yes |

## 2.4 Authorization Rules

1. Setiap pengguna harus memiliki akun terautentikasi.
2. Role pengguna ditentukan melalui data profil yang dikelola secara aman.
3. Pengguna tidak dapat mengubah role melalui browser.
4. Kasir tidak dapat mengakses halaman Admin melalui URL langsung.
5. Pembatasan akses harus diterapkan di frontend dan backend.
6. Supabase Row Level Security wajib aktif.
7. Service Role Key tidak boleh diekspos kepada client.
8. Pengguna nonaktif tidak boleh melakukan login atau mengakses sistem.
9. Setiap pengguna hanya dapat mengakses data toko yang menjadi haknya.

---

# 3. AUTHENTICATION REQUIREMENTS

## AUTH-001 — Login

Sistem harus menyediakan halaman login dengan:

- Email.
- Password.
- Show/hide password.
- Tombol Login.
- Validasi form.
- Loading state.
- Error message.

## AUTH-002 — Role Redirect

Setelah login berhasil:

- Admin diarahkan ke `/admin/dashboard`.
- Kasir diarahkan ke `/pos`.

## AUTH-003 — Session Management

Sistem harus:

- Mempertahankan session selama masih valid.
- Mengelola refresh session.
- Mengarahkan pengguna ke login ketika session tidak valid.
- Menyediakan logout.
- Mencegah akses halaman terlindungi tanpa autentikasi.

## AUTH-004 — User Status

Akun dengan status nonaktif tidak boleh mengakses aplikasi.

## AUTH-005 — Account Creation

Pembuatan akun Kasir dilakukan oleh Admin melalui mekanisme server-side yang aman menggunakan Supabase Auth.

Admin tidak boleh mendapatkan akses ke password pengguna yang sudah dibuat.

---

# 4. ADMIN DASHBOARD REQUIREMENTS

## DASH-001 — Dashboard Overview

Dashboard menampilkan ringkasan operasional cafe.

Komponen:

1. Total omzet hari ini.
2. Jumlah transaksi.
3. Total produk terjual.
4. Rata-rata transaksi.
5. Grafik penjualan.
6. Produk terlaris.
7. Transaksi terbaru.
8. Metode pembayaran.

## DASH-002 — Date Filter

Admin dapat memilih periode:

- Hari ini.
- Kemarin.
- 7 hari terakhir.
- 30 hari terakhir.
- Bulan ini.
- Custom date range.

## DASH-003 — Dynamic Data

Semua statistik harus diambil dari database.

Tidak diperbolehkan menggunakan angka statis sebagai pengganti data aktual.

## DASH-004 — Financial Privacy

Informasi HPP dan keuntungan hanya dapat dilihat oleh Admin.

---

# 5. PRODUCT MANAGEMENT REQUIREMENTS

## PROD-001 — Product Listing

Admin dapat melihat seluruh produk dalam format tabel atau grid.

Kolom:

- Foto.
- Nama produk.
- SKU.
- Kategori.
- Harga jual.
- HPP.
- Laba kotor per unit.
- Margin.
- Status.
- Action.

## PROD-002 — Add Product

Admin dapat menambahkan produk baru.

Field:

| Field | Required |
|---|---|
| Product Name | Yes |
| SKU | No |
| Category | Yes |
| Description | No |
| Selling Price | Yes |
| HPP | Yes |
| Product Image | No |
| Status | Yes |

## PROD-003 — Edit Product

Admin dapat mengubah:

- Nama produk.
- SKU.
- Deskripsi.
- Kategori.
- Harga jual.
- HPP.
- Foto.
- Status.

Perubahan HPP dan harga jual hanya berlaku untuk transaksi berikutnya.

## PROD-004 — Archive Product

Produk yang telah digunakan dalam transaksi tidak boleh dihapus permanen.

Gunakan status aktif/nonaktif atau soft delete.

## PROD-005 — Product Search

Admin dapat mencari berdasarkan nama dan SKU.

## PROD-006 — Product Filter

Filter berdasarkan:

- Kategori.
- Status.
- Rentang harga.

## PROD-007 — Product Profit Calculation

Sistem menghitung:

Gross Profit per Unit = Selling Price - HPP

Gross Margin = Gross Profit / Selling Price × 100%

Jika Selling Price bernilai nol, margin ditampilkan sebagai tidak tersedia dan sistem harus menolak harga jual nol atau negatif.

## PROD-008 — Product Image

Gambar produk disimpan menggunakan Supabase Storage.

Sistem harus memvalidasi format dan ukuran file serta mengoptimalkan tampilan gambar.

---

# 6. CATEGORY MANAGEMENT REQUIREMENTS

## CAT-001 — Category Listing

Admin dapat melihat semua kategori.

## CAT-002 — Add Category

Field:

- Nama kategori.
- Deskripsi.
- Gambar atau ikon.
- Urutan tampilan.
- Status aktif/nonaktif.

## CAT-003 — Edit Category

Admin dapat mengubah informasi kategori.

## CAT-004 — Delete Category

Kategori yang masih digunakan oleh produk tidak boleh dihapus sebelum produk dipindahkan atau dinonaktifkan sesuai aturan.

## CAT-005 — Category Ordering

Admin dapat mengatur urutan kategori yang ditampilkan pada POS.

## CAT-006 — Category Visibility

Kategori nonaktif tidak ditampilkan sebagai pilihan produk di POS.

---

# 7. POINT OF SALE REQUIREMENTS

## POS-001 — POS Interface

Halaman POS harus menjadi halaman utama Kasir.

Layout tablet landscape:

- Area katalog produk.
- Area keranjang.
- Ringkasan pembayaran.
- Tombol checkout.

Layout HP:

- Grid produk dua kolom.
- Keranjang melalui bottom sheet.
- Tombol checkout yang mudah dijangkau.

## POS-002 — Product Catalog

Sistem menampilkan produk aktif.

Informasi produk:

- Foto.
- Nama.
- Harga.
- Kategori.

## POS-003 — Product Search

Kasir dapat mencari produk berdasarkan nama.

## POS-004 — Category Filter

Kasir dapat memilih kategori untuk menyaring produk.

## POS-005 — Add to Cart

Kasir dapat menambahkan produk ke keranjang.

Jika produk yang sama ditambahkan kembali, sistem dapat menambah kuantitas pada item yang sudah ada.

## POS-006 — Cart Management

Kasir dapat:

- Menambah kuantitas.
- Mengurangi kuantitas.
- Menghapus produk.
- Mengosongkan keranjang.
- Menambahkan catatan pesanan.

Kuantitas harus berupa bilangan bulat positif.

## POS-007 — Price Snapshot

Harga jual produk yang digunakan saat checkout harus diambil ulang dan divalidasi dari database.

Harga tidak boleh dipercaya hanya berdasarkan nilai yang dikirim browser.

## POS-008 — Cart Calculation

Sistem menghitung:

- Subtotal.
- Diskon.
- Pajak.
- Grand Total.

## POS-009 — Empty Cart

Checkout tidak dapat dilakukan jika keranjang kosong.

## POS-010 — Cart Persistence

Keranjang dapat dipertahankan sementara ketika halaman direfresh pada perangkat yang sama.

Keranjang belum dianggap transaksi permanen sebelum checkout berhasil.

---

# 8. CHECKOUT & PAYMENT REQUIREMENTS

## CHECK-001 — Checkout Summary

Menampilkan:

- Daftar produk.
- Kuantitas.
- Harga satuan.
- Subtotal.
- Diskon.
- Pajak.
- Total akhir.

## CHECK-002 — Payment Method

Metode pembayaran:

1. Cash.
2. QRIS.
3. Debit.
4. Bank Transfer.

Seluruh metode menggunakan simulasi pembayaran.

## CHECK-003 — Cash Payment

Untuk pembayaran tunai, sistem menerima nominal pembayaran.

Change = Amount Received - Grand Total

Nominal pembayaran harus sama dengan atau lebih besar daripada total transaksi.

## CHECK-004 — Non-Cash Payment

Untuk QRIS, Debit, dan Transfer, sistem menggunakan konfirmasi pembayaran simulasi.

Tidak ada pemrosesan uang sungguhan.

## CHECK-005 — Transaction Number

Setiap transaksi mempunyai nomor invoice unik.

Format invoice dapat dikonfigurasi Admin.

Contoh:

INV-20261101-0001

Nomor invoice harus dibuat secara aman di server/database dan tidak boleh hanya bergantung pada nomor urut yang dihitung browser.

## CHECK-006 — Atomic Checkout

Proses checkout harus menggunakan database transaction/RPC yang atomik.

Dalam satu proses:

1. Validasi pengguna dan role.
2. Validasi toko.
3. Validasi produk.
4. Ambil harga dan HPP aktual.
5. Hitung ulang total.
6. Hitung diskon dan pajak.
7. Buat transaksi.
8. Simpan detail transaksi.
9. Simpan pembayaran.
10. Simpan snapshot harga dan HPP.
11. Commit transaksi.

Jika salah satu proses gagal, seluruh proses harus dibatalkan.

## CHECK-007 — Double Submission Protection

Sistem harus menggunakan mekanisme idempotency untuk mencegah transaksi ganda akibat double click, refresh, atau request berulang.

## CHECK-008 — Transaction Success

Setelah transaksi berhasil:

- Tampilkan halaman transaksi berhasil.
- Tampilkan nomor invoice.
- Tampilkan total.
- Tampilkan pembayaran.
- Tampilkan kembalian jika tunai.
- Sediakan tombol cetak struk.
- Sediakan tombol transaksi baru.

Transaksi tidak boleh dianggap berhasil sebelum database mengonfirmasi penyimpanan.

---

# 9. RECEIPT & INVOICE REQUIREMENTS

## REC-001 — Receipt Content

Struk berisi:

- Logo toko.
- Nama toko.
- Alamat.
- Nomor telepon.
- Nomor invoice.
- Tanggal dan waktu.
- Nama kasir.
- Produk.
- Kuantitas.
- Harga satuan.
- Subtotal.
- Diskon.
- Pajak.
- Grand total.
- Metode pembayaran.
- Uang diterima.
- Kembalian.
- Pesan penutup.

## REC-002 — Receipt Format

Mendukung:

- Thermal 58 mm.
- Thermal 80 mm.
- Browser Print.
- PDF.

## REC-003 — Receipt Customization

Admin dapat mengatur:

- Header.
- Footer.
- Informasi toko.
- Logo.
- Pesan terima kasih.
- Tampilan invoice.

## REC-004 — Reprint

Admin dan Kasir dapat mencetak ulang struk sesuai hak akses transaksi.

Cetak ulang tidak boleh membuat transaksi baru.

## REC-005 — Financial Privacy

Struk pelanggan tidak boleh menampilkan HPP, margin keuntungan, maupun biaya internal.

---

# 10. TRANSACTION HISTORY REQUIREMENTS

## TRX-001 — Transaction Listing

Admin dapat melihat seluruh transaksi.

Kasir hanya dapat melihat transaksi miliknya.

## TRX-002 — Transaction Detail

Menampilkan:

- Nomor invoice.
- Tanggal.
- Kasir.
- Daftar produk.
- Harga snapshot.
- Kuantitas.
- Subtotal.
- Diskon.
- Pajak.
- Total.
- Pembayaran.
- Status.

## TRX-003 — Transaction Filter

Filter berdasarkan:

- Tanggal.
- Nomor invoice.
- Kasir.
- Metode pembayaran.
- Status.

## TRX-004 — Transaction Status

Status transaksi:

- Completed.
- Voided.
- Refunded.

## TRX-005 — Void Transaction

Admin dapat membatalkan transaksi dengan alasan yang wajib diisi.

Transaksi tidak dihapus secara permanen.

## TRX-006 — Refund

Jika refund diimplementasikan pada V1, proses harus:

- Membuat catatan refund.
- Menyimpan alasan.
- Menyimpan nilai refund.
- Menyimpan waktu dan pengguna yang melakukan refund.
- Mengoreksi laporan keuangan.
- Mempertahankan transaksi aslinya.

Refund penuh dan parsial harus dibedakan.

---

# 11. FINANCIAL ANALYTICS & REPORT REQUIREMENTS

MODUL INI MERUPAKAN SALAH SATU FITUR UTAMA CAFE POS.

## FIN-001 — Reporting Period

Sistem menyediakan:

1. Daily Report.
2. Weekly Report.
3. Monthly Report.
4. Yearly Report.

Admin dapat memilih periode dan tanggal sesuai kebutuhan.

## FIN-002 — Financial Summary

Setiap periode menampilkan:

- Total omzet.
- Total HPP.
- Laba kotor.
- Total biaya operasional.
- Keuntungan bersih operasional.
- Net Profit Margin.
- Jumlah transaksi.
- Jumlah produk terjual.

## FIN-003 — Revenue Calculation

Omzet bersih dihitung dari penjualan setelah diskon.

Pajak yang dipungut untuk disetorkan tidak dihitung sebagai pendapatan usaha.

Refund dan void harus dikoreksi sesuai nilai transaksi yang benar-benar diakui sebagai penjualan.

## FIN-004 — HPP Calculation

HPP dihitung dari snapshot HPP setiap produk yang terjual.

Formula:

HPP = SUM(Quantity × HPP Snapshot)

## FIN-005 — Gross Profit Calculation

Gross Profit = Net Revenue - HPP

## FIN-006 — Operating Expenses

Admin dapat mengelola biaya operasional.

Field:

- Kategori biaya.
- Nominal.
- Tanggal pengeluaran.
- Deskripsi.
- Waktu pembuatan.
- Pengguna yang mencatat.

Admin dapat:

- Menambahkan biaya.
- Mengedit biaya.
- Menghapus biaya dengan konfirmasi.
- Melihat daftar pengeluaran.
- Memfilter pengeluaran berdasarkan periode.

## FIN-007 — Net Operating Profit

Net Operating Profit = Gross Profit - Operating Expenses

Istilah yang ditampilkan di UI:

"Keuntungan Bersih Operasional"

Jangan mengklaim sebagai laba bersih akuntansi karena V1 belum mencakup seluruh komponen pajak usaha, bunga, penyusutan, dan kewajiban akuntansi lainnya.

## FIN-008 — Net Profit Margin

Net Profit Margin = Net Operating Profit / Net Revenue × 100%

Jika omzet nol, sistem tidak boleh menghasilkan pembagian dengan nol.

## FIN-009 — Financial Charts

Grafik:

- Revenue Chart.
- HPP Chart.
- Gross Profit Chart.
- Operating Expenses Chart.
- Net Operating Profit Chart.

## FIN-010 — Product Performance

Analisis:

- Produk terlaris berdasarkan kuantitas.
- Produk dengan omzet tertinggi.
- Produk dengan laba kotor tertinggi.
- Produk dengan margin tertinggi.
- Produk dengan kontribusi laba terendah.

## FIN-011 — Financial Report Export

Format:

- PDF.
- CSV.
- Excel jika implementasi export XLSX tersedia.

Isi laporan:

- Identitas toko.
- Periode.
- Total omzet.
- Total HPP.
- Laba kotor.
- Biaya operasional.
- Keuntungan bersih.
- Margin.
- Ringkasan produk.
- Ringkasan transaksi.

## FIN-012 — Reporting Consistency

Semua periode harus menggunakan formula dan aturan perhitungan yang sama.

Hasil laporan harian, mingguan, bulanan, dan tahunan harus konsisten jika rentang waktunya mencakup transaksi yang sama.

---

# 12. FINANCIAL BUSINESS RULES

## 12.1 Product Cost Snapshot

Ketika transaksi dibuat, sistem wajib menyimpan:

- Nama produk.
- SKU.
- Harga jual.
- HPP.
- Kuantitas.
- Diskon item.

Perubahan harga atau HPP produk di masa mendatang tidak boleh mengubah transaksi historis.

## 12.2 Discount Allocation

Diskon transaksi harus dialokasikan secara konsisten ke item transaksi apabila laporan HPP dan laba dihitung per produk.

Alokasi harus mempertimbangkan proporsi nilai item dan aturan pembulatan.

Total alokasi harus sama dengan nilai diskon transaksi.

## 12.3 Tax Treatment

Pajak yang dipungut atas nama pemerintah atau pihak lain harus dipisahkan dari pendapatan usaha.

Konfigurasi pajak harus mendukung:

- Harga sebelum pajak.
- Harga termasuk pajak.
- Tarif pajak yang dapat diatur.

## 12.4 Expense Recognition

Biaya operasional diakui berdasarkan tanggal pengeluaran.

Satu biaya tidak boleh dihitung dua kali.

Biaya operasional tidak boleh otomatis mengurangi stok atau menambah HPP.

## 12.5 Void & Refund Treatment

Transaksi void tidak dihitung dalam penjualan.

Refund harus mengurangi pendapatan dan membalikkan HPP sesuai nilai produk yang direfund.

Refund parsial hanya membalikkan item atau kuantitas yang direfund.

## 12.6 Historical Reporting

Laporan harus menggunakan snapshot transaksi dan data biaya pada periode yang benar.

Perubahan HPP produk tidak boleh mengubah laporan historis.

## 12.7 Reporting Timezone

Semua waktu transaksi disimpan dalam UTC menggunakan TIMESTAMPTZ.

Pengelompokan laporan mengikuti timezone toko.

Default: Asia/Makassar.

---

# 13. USER MANAGEMENT REQUIREMENTS

## USER-001 — Cashier Listing

Admin dapat melihat seluruh akun kasir.

## USER-002 — Create Cashier

Admin dapat membuat akun Kasir.

## USER-003 — Edit Cashier

Admin dapat mengubah:

- Nama.
- Email melalui mekanisme yang aman.
- Status.
- Informasi profil.

## USER-004 — Deactivate Cashier

Admin dapat menonaktifkan akun Kasir.

## USER-005 — Transaction Ownership

Setiap transaksi wajib mencatat identitas kasir yang memproses transaksi.

## USER-006 — Account Security

Pengelolaan password harus menggunakan Supabase Auth.

Password tidak boleh disimpan dalam tabel profiles.

---

# 14. STORE SETTINGS REQUIREMENTS

## SET-001 — Store Profile

Pengaturan:

- Nama toko.
- Logo.
- Alamat.
- Nomor telepon.
- Email.
- Zona waktu.

## SET-002 — Invoice Settings

Pengaturan:

- Prefix invoice.
- Format nomor.
- Panjang nomor urut.
- Reset nomor jika diizinkan sesuai periode.

Nomor invoice harus tetap unik.

## SET-003 — Receipt Settings

Pengaturan:

- Ukuran kertas.
- Header.
- Footer.
- Logo.
- Informasi kontak.
- Pesan penutup.

## SET-004 — Tax Settings

Admin dapat mengatur tarif pajak dan perlakuan harga termasuk/tidak termasuk pajak.

## SET-005 — Discount Settings

Admin dapat mengaktifkan atau menonaktifkan fitur diskon serta mengatur batas diskon sesuai kebijakan toko.

## SET-006 — Language

Bahasa awal:

- Indonesia.
- English.

## SET-007 — Currency

Mata uang awal:

IDR.

Sistem dapat menyiapkan opsi mata uang lain untuk demonstrasi.

## SET-008 — Appearance

- Light Mode.
- Dark Mode.
- System Preference.

## SET-009 — PWA Settings

- Nama aplikasi.
- Short name.
- App icon.
- Install instructions.

---

# 15. PWA REQUIREMENTS

## PWA-001

Aplikasi dapat di-install melalui browser yang mendukung PWA.

## PWA-002

Mendukung manifest dan service worker.

## PWA-003

Mendukung standalone display.

## PWA-004

Aset statis dapat di-cache.

## PWA-005

Aplikasi harus menampilkan status koneksi jika offline.

## PWA-006

Checkout memerlukan koneksi internet dan konfirmasi penyimpanan database.

## PWA-007

Service worker tidak boleh menyajikan data transaksi lama sebagai data terbaru tanpa penanda.

---

# 16. DEMO DATA MANAGEMENT

## DEMO-001 — Seed Data

Sistem harus menyediakan data awal:

- 8 kategori.
- 30–40 produk.
- Harga jual dan HPP.
- Foto produk.
- 1 akun Admin.
- 2 akun Kasir.
- 30 hari riwayat transaksi.
- Kategori biaya operasional.
- Data pengeluaran simulasi.

## DEMO-002 — Demo Reset

Admin dapat mengembalikan data demo ke kondisi awal.

## DEMO-003 — Reset Confirmation

Reset memerlukan konfirmasi yang jelas.

## DEMO-004 — Data Separation

Data transaksi simulasi harus dapat dibedakan dari konfigurasi toko.

## DEMO-005 — Demo Environment Protection

Fitur reset hanya boleh tersedia pada environment demo dan tidak boleh dapat dipanggil oleh pengguna tanpa hak akses.

---

# 17. NON-FUNCTIONAL REQUIREMENTS

## NFR-001 — Responsive Design

Aplikasi harus optimal pada:

- Smartphone.
- Tablet portrait.
- Tablet landscape.
- Desktop.

## NFR-002 — Performance

- Navigasi terasa responsif.
- Gambar produk dioptimalkan.
- Query database efisien.
- Tabel menggunakan pagination jika diperlukan.
- Hindari mengambil seluruh data transaksi sekaligus.

## NFR-003 — Security

- Supabase RLS.
- Server-side validation.
- Secure authentication.
- Protected routes.
- Environment variables.
- No exposed service role key.
- Audit logs untuk aktivitas sensitif.

## NFR-004 — Reliability

- Checkout atomik.
- Pencegahan transaksi ganda.
- Error handling.
- Loading state.
- Empty state.
- Success state.

## NFR-005 — Accessibility

- Kontras warna memadai.
- Tombol mudah disentuh.
- Form memiliki label.
- Pesan error jelas.
- Navigasi keyboard tersedia untuk komponen yang relevan.

## NFR-006 — Localization

- Bahasa Indonesia sebagai default.
- Rupiah sebagai mata uang default.
- Asia/Makassar sebagai timezone default.
- Format tanggal dan angka konsisten.

---

# 18. APPLICATION ERROR HANDLING

Sistem harus menangani kondisi berikut:

1. Login gagal.
2. Session kedaluwarsa.
3. Pengguna tidak memiliki izin.
4. Produk tidak ditemukan.
5. Produk dinonaktifkan.
6. Harga produk berubah sebelum checkout.
7. Keranjang kosong.
8. Pembayaran kurang.
9. Koneksi database gagal.
10. Checkout gagal.
11. Nomor invoice gagal dibuat.
12. Upload gambar gagal.
13. Export laporan gagal.
14. Printer tidak tersedia.
15. Data tidak ditemukan.

Setiap kondisi harus memiliki pesan yang dapat dipahami pengguna.

Jangan menampilkan pesan error database mentah kepada pengguna.

---

# 19. ACCEPTANCE CRITERIA

## AC-01 Authentication

- Admin dapat login.
- Kasir dapat login.
- Role redirect benar.
- Halaman terlindungi.
- Logout berjalan.

## AC-02 Product & Category

- Admin dapat CRUD produk.
- Admin dapat CRUD kategori.
- HPP tersimpan.
- Produk nonaktif tidak dapat dijual.

## AC-03 POS

- Kasir dapat memilih produk.
- Keranjang berfungsi.
- Kuantitas dapat diubah.
- Total dihitung benar.
- Pembayaran dapat diproses.

## AC-04 Transaction

- Invoice unik.
- Transaksi tersimpan.
- Detail transaksi tersimpan.
- Snapshot harga tersimpan.
- Snapshot HPP tersimpan.
- Double checkout dicegah.

## AC-05 Financial Analytics

- HPP sesuai produk yang terjual.
- Laba kotor benar.
- Biaya operasional benar.
- Laba bersih benar.
- Margin benar.
- Void dan refund dikoreksi.
- Laporan konsisten antarperiode.

## AC-06 Receipt

- Informasi transaksi benar.
- Struk dapat dicetak.
- Ukuran 58 mm dan 80 mm didukung.
- HPP tidak tampil pada struk.

## AC-07 Settings

- Profil toko dapat diubah.
- Format invoice dapat diubah.
- Struk dapat dikonfigurasi.
- Pajak dan diskon dapat diatur.
- Bahasa dan mata uang dapat diubah.

## AC-08 PWA

- Aplikasi dapat di-install.
- Icon tampil.
- Standalone display berjalan.
- Tampilan HP dan tablet optimal.

---

# 20. FINANCIAL TEST SCENARIOS

Antigravity wajib melakukan pengujian perhitungan berikut.

### Scenario 1 — Basic Transaction

Produk:
- Harga jual: Rp25.000.
- HPP: Rp8.500.
- Kuantitas: 2.

Hasil:
- Omzet: Rp50.000.
- HPP: Rp17.000.
- Laba kotor: Rp33.000.

### Scenario 2 — Transaction Discount

Produk:
- Omzet awal: Rp100.000.
- Diskon: Rp10.000.
- HPP: Rp35.000.

Hasil:
- Omzet bersih: Rp90.000.
- HPP: Rp35.000.
- Laba kotor: Rp55.000.

### Scenario 3 — Operating Expenses

- Omzet bersih: Rp1.000.000.
- HPP: Rp350.000.
- Biaya operasional: Rp150.000.

Hasil:
- Laba kotor: Rp650.000.
- Laba bersih operasional: Rp500.000.
- NPM: 50%.

### Scenario 4 — HPP Change

Transaksi pertama:
- HPP: Rp8.500.

Admin mengubah HPP:
- HPP baru: Rp9.000.

Hasil:
- Transaksi pertama tetap menggunakan Rp8.500.
- Transaksi berikutnya menggunakan Rp9.000.

### Scenario 5 — Voided Transaction

Transaksi dibatalkan.

Hasil:
- Tidak dihitung sebagai omzet.
- Tidak dihitung sebagai HPP penjualan.
- Tidak dihitung sebagai laba.
- Riwayat pembatalan tetap tersedia.

### Scenario 6 — Partial Refund

Sebagian item transaksi dikembalikan.

Hasil:
- Pendapatan dikurangi sesuai nilai refund.
- HPP dibalik sesuai HPP snapshot item yang dikembalikan.
- Laporan diperbarui secara konsisten.

### Scenario 7 — Zero Revenue

Jika tidak ada omzet:

- NPM tidak boleh membagi dengan nol.
- Tampilkan nilai 0 atau tanda tidak tersedia sesuai desain.
- Tidak boleh terjadi error aplikasi.

---

# 21. DEVELOPMENT RULES FOR ANTIGRAVITY

Dokumen ini merupakan sumber requirement utama untuk pembangunan.

Antigravity wajib mengikuti aturan:

1. Membaca MASTERPLAN.md dan PRD.md sebelum implementasi.
2. Tidak mengubah arsitektur tanpa persetujuan.
3. Menggunakan TypeScript.
4. Menggunakan Supabase sebagai database utama.
5. Tidak menggunakan localStorage sebagai pengganti database.
6. Tidak menggunakan data statis untuk fitur operasional.
7. Menggunakan Supabase migrations untuk perubahan schema.
8. Mengimplementasikan RLS.
9. Menggunakan server-side validation untuk transaksi.
10. Menyimpan HPP snapshot.
11. Mempertahankan konsistensi design system.
12. Memastikan layout responsif.
13. Tidak menghilangkan fitur yang sudah selesai.
14. Melakukan pengujian setelah setiap fase.
15. Memperbarui dokumentasi setelah perubahan penting.
16. Tidak melanjutkan ke fase berikutnya jika fase sebelumnya belum lolos pengujian.
17. Memisahkan konfigurasi development, demo, dan production.
18. Tidak mengekspos secret atau service role key.

---

# 22. DEFINITION OF DONE

PRD dianggap telah terpenuhi apabila:

- Semua modul V1 telah diimplementasikan.
- Seluruh halaman berfungsi.
- Admin dan Kasir memiliki pembatasan akses yang benar.
- Transaksi dapat dilakukan dan disimpan.
- Struk dapat dicetak.
- Rekap dapat menghitung omzet.
- HPP dapat dihitung berdasarkan snapshot.
- Laba kotor dapat dihitung.
- Biaya operasional dapat dicatat.
- Keuntungan bersih operasional dapat dihitung.
- Laporan dapat difilter dan diekspor.
- PWA dapat di-install.
- Aplikasi responsif di HP dan tablet.
- Database aman dengan RLS.
- Seluruh acceptance criteria telah diuji.

**END OF PRODUCT REQUIREMENTS DOCUMENT — V1.0**
