# KEPUTUSAN TERBUKA (OPEN DECISIONS)
## OBAT HAUS – OPERATIONAL SYSTEM MANAGEMENT
**Dokumen:** Daftar Kebijakan Bisnis & Teknis yang Menunggu Arahan Final Owner  
**Versi:** 1.0 — Phase 1 Foundation & Database Design  
**Status:** Menunggu Keputusan Owner (Desain Database Sudah Dirancang Netral & Fleksibel)

---

## 1. Pendahuluan

Sesuai Pasal F Instruksi Phase 1: **"Jangan menetapkan keputusan sepihak untuk hal-hal strategis."**

Seluruh struktur database dan fondasi teknis yang dirancang pada Phase 1 telah dibuat **netral (*agnostic*) dan fleksibel**, sehingga siap mendukung opsi mana pun yang nantinya dipilih oleh Owner tanpa perlu membongkar ulang arsitektur tabel (*zero architectural breaking*).

Berikut adalah 4 Keputusan Terbuka yang membutuhkan pertimbangan dan arahan resmi dari Owner Obat Haus:

---

## 2. Daftar Keputusan Terbuka

### OPEN DECISION 01: Metode Penilaian HPP & Persediaan (FIFO vs Weighted Average)

#### Konteks:
Harga beli bahan baku dari supplier sering berfluktuasi (misalnya biji kopi minggu ini dibeli Rp 120.000/kg, namun minggu depan naik menjadi Rp 130.000/kg). Sistem perlu menentukan harga modal bahan yang digunakan saat menghitung laba kotor di kasir POS.

#### Opsi yang Tersedia:
* **Opsi A: FIFO (*First In, First Out*)**
  * *Cara Kerja*: Bahan baku yang pertama kali dibeli dari supplier dianggap yang pertama kali digunakan untuk meracik minuman.
  * *Kelebihan*: Mencerminkan aliran fisik bahan makanan/minuman yang memiliki masa kedaluwarsa (*shelf-life*); nilai sisa stok di gudang mencerminkan harga pasar terbaru.
  * *Kekurangan*: Membutuhkan pelacakan *batch lot* pembelian yang lebih detail saat transaksi checkout.
* **Opsi B: Rata-Rata Tertimbang (*Weighted Average Cost / WAC*) — [Rekomendasi Awal]**
  * *Cara Kerja*: Setiap kali barang baru masuk dari supplier, sistem memperbarui harga rata-rata bahan:  
    $$\text{Average Cost} = \frac{(\text{Stok Lama} \times \text{Harga Lama}) + (\text{Stok Baru} \times \text{Harga Baru})}{\text{Total Stok}}$$
  * *Kelebihan*: Sangat stabil terhadap fluktuasi harga sesaat; proses kalkulasi saat kasir checkout POS jauh lebih cepat dan tidak membebani server; sangat umum dan disukai untuk operasional F&B cafe/minuman cepat saji.
  * *Kekurangan*: Nilai HPP merupakan harga rata-rata campuran, bukan harga persis dari karung kopi tertentu.

#### Dampak terhadap Desain Database:
Tabel `raw_materials` telah dilengkapi kolom `average_cost` dan `last_purchase_price`, sementara tabel `stock_ledger` mencatat `unit_cost` pada setiap pergerakan. **Skema saat ini sudah 100% mendukung kedua metode**.

---

### OPEN DECISION 02: Kebijakan Stok Negatif (*Negative Stock Policy*)

#### Konteks:
Di jam sibuk (*rush hour*) cafe, terkadang ada kiriman bahan baku yang sudah tiba dan langsung dipakai oleh barista di outlet, namun kasir/staf belum sempat menekan tombol "Konfirmasi Penerimaan" di sistem. Ketika kasir melayani pesanan, sistem mendeteksi stok bahan di komputer tercatat "0" atau habis.

#### Opsi yang Tersedia:
* **Opsi A: Stok Negatif Dilarang Keras (*Strict Zero/Negative Block*) — [Rekomendasi Awal]**
  * *Cara Kerja*: Transaksi POS langsung ditolak jika salah satu takaran bahan baku resep bernilai kurang dari stok sistem.
  * *Kelebihan*: Mencegah selisih gaib (*ghost inventory*); memaksa kedisiplinan staf outlet untuk segera mengonfirmasi penerimaan barang sebelum mulai jualan.
  * *Kekurangan*: Dapat menghambat antrean pelanggan di kasir jika staf terlambat menginput barang masuk.
* **Opsi B: Izinkan Penjualan dengan Peringatan (*Allow Negative with Audit Flag*)**
  * *Cara Kerja*: Transaksi tetap diproses agar antrean kasir tidak macet, namun saldo stok menjadi minus (misal: `-150 gram susu`) dan sistem otomatis mengirimkan notifikasi peringatan berprioritas tinggi kepada Owner dan Kasir bahwa ada transaksi tanpa penerimaan barang resmi.
  * *Kelebihan*: Layanan ke pelanggan tidak pernah terhenti (*zero cashier disruption*).
  * *Kekurangan*: Membutuhkan proses rekonsiliasi manual di akhir shift saat barang masuk akhirnya diinput.

#### Dampak terhadap Desain Database:
Kolom `current_quantity` pada tabel `inventory_balances` disiapkan bertipe `NUMERIC(12,4)` tanpa check constraint `< 0` yang kaku, sehingga batasan dapat diatur melalui switch konfigurasi di tabel `store_settings` (`allow_negative_stock = true/false`).

---

### OPEN DECISION 03: Mekanisme Koreksi Transaksi Penjualan (*Transaction Correction & Reversal*)

#### Konteks:
Pelanggan salah memesan menu, atau kasir salah memilih metode pembayaran setelah invoice dicetak dan diposting. Karena kasir dilarang menghapus transaksi, diperlukan mekanisme koreksi yang aman dan transparan.

#### Opsi yang Tersedia:
* **Opsi A: Mekanisme Storno / Jurnal Pembalik (*Storno / Accounting Reversal*) — [Rekomendasi Standar Anti-Fraud]**
  * *Cara Kerja*: Transaksi nomor `INV-001` tetap ada di database dan diberi tanda status `'voided'`. Sistem secara otomatis menerbitkan dokumen pembalik (transaksi minus) yang mengembalikan stok bahan baku ke saldo outlet dan mencatat pembalikan uang kas di shift kasir.
  * *Kelebihan*: Standar audit akuntansi tertinggi; tidak ada angka yang hilang; jejak kecurangan kasir dapat dilacak 100%.
  * *Kekurangan*: Di laporan riwayat akan terlihat baris transaksi asli dan baris pembatalan.
* **Opsi B: Koreksi Nilai Langsung oleh Owner (*Owner Edit with Audit Trail*)**
  * *Cara Kerja*: Owner memiliki wewenang khusus untuk mengedit nilai transaksi atau metode bayar secara langsung, namun sistem menyimpan data sebelum vs sesudah di tabel `transaction_corrections` dan `audit_logs`.
  * *Kelebihan*: Tampilan laporan akhir terlihat lebih ringkas.
  * *Kekurangan*: Memerlukan penyesuaian ulang terhadap buku besar stok yang sudah terpotong sebelumnya.

#### Dampak terhadap Desain Database:
Tabel `transaction_corrections` telah disediakan untuk menampung referensi transaksi, alasan koreksi, identitas admin, serta perubahan nilai sebelum dan sesudah.

---

### OPEN DECISION 04: Kebijakan Autentikasi Staf Kasir (*Cashier Authentication Policy*)

#### Konteks:
Di operasional cafe, pergantian kasir sering terjadi saat pergantian shift atau saat kasir istirahat sejenak.

#### Opsi yang Tersedia:
* **Opsi A: Username & Kata Sandi Mandiri (Eksisting) — [Rekomendasi Praktis]**
  * *Cara Kerja*: Setiap kasir memiliki akun tersendiri (`username` unik dan `password` / PIN 6 digit). Saat berganti kasir, kasir sebelumnya melakukan *Log Out* dan kasir baru *Log In* dengan akunnya.
  * *Kelebihan*: Setiap transaksi terikat pada nama kasir yang sah; tidak ada saling lempar tanggung jawab jika terjadi selisih uang laci kas.
  * *Kekurangan*: Membutuhkan waktu beberapa detik untuk keluar-masuk akun saat pergantian staf.
* **Opsi B: Akun Terminal Outlet Bersama + PIN Kasir Cepat (*Shared POS Terminal with Quick PIN*)**
  * *Cara Kerja*: Laptop/tablet outlet tetap login sebagai "Outlet Ahmad Yani", namun setiap kali kasir ingin memencet tombol bayar atau membuka laci, kasir cukup memasukkan PIN 4-6 digit stafnya.
  * *Kelebihan*: Sangat cepat untuk operasional kasir bersama.
  * *Kekurangan*: Sesi login perangkat menjadi shared.

#### Dampak terhadap Desain Database:
Tabel `profiles` telah memiliki kolom `username`, `password`, dan penugasan ke `primary_outlet_id`. Mendukung kedua skenario dengan mulus.

---

## 3. Matriks Ringkasan Rekomendasi Teknis

| Keputusan Terbuka | Pilihan Opsi yang Direkomendasikan | Alasan Utama Rekomendasi |
| :--- | :--- | :--- |
| **01. Metode HPP** | **Weighted Average Cost (WAC)** | Lebih stabil untuk F&B, performa checkout kasir instan, dan mudah diaudit. |
| **02. Stok Negatif** | **Strict Block (Dilarang Negatif)** | Mencegah kebocoran bahan baku dan memaksa staf outlet disiplin mengonfirmasi barang masuk. *(Bisa diberikan opsi toggle darurat oleh Owner)*. |
| **03. Koreksi Transaksi**| **Storno / Reversal Transparan** | Menjamin integritas anti-fraud dan mencegah kecurangan manipulasi omzet di kasir. |
| **04. Autentikasi Kasir**| **Username + Password/PIN Pribadi** | Akuntabilitas uang kasir di shift terikat 100% pada orang yang bertanggung jawab. |

---

> **Keputusan Akhir Berada Penuh di Tangan Owner.**  
> Silakan Owner meninjau rekomendasi di atas atau menentukan pilihan kebijakan yang paling sesuai dengan budaya operasional Obat Haus.
