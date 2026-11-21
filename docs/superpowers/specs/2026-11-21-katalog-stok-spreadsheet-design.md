# Katalog Asih Dwipa — stok & tampil produk dari spreadsheet

Tanggal: 2026-11-21 · Status: rancangan, menunggu persetujuan pemilik

## Maksud dan alasan

Situs katalog (GitHub Pages, repo `gungsatya/asih-dwipa`) sekarang hanya
menampilkan 11 gambar PNG hasil ekspor Canva. Status stok (coretan + cap
"OUT OF STOCK") tertanam di dalam gambar, jadi setiap perubahan stok berarti
mengedit Canva, mengekspor, lalu meng-upload ulang gambar (riwayat commit
penuh "Update 4.png").

Pemilik ingin mengubah status stok (ada/habis) dan menyembunyikan produk
**dari spreadsheet di HP**, tanpa menyentuh GitHub atau Canva.

## Tujuan

- Katalog menampilkan sampul + **16 produk** (desain Canva hal. 2–17) +
  **Ketentuan Pemesanan** (hal. 18).
- Status stok per varian dan per produk, serta tampil/sembunyi per produk,
  dibaca dari Google Sheet setiap kali halaman dibuka. Perubahan di
  spreadsheet terlihat pengunjung dalam hitungan detik–menit.
- Tetap nyaman dan ringan dibuka di HP.

## Bukan tujuan

- Mengubah harga, nama, deskripsi, atau foto lewat spreadsheet (tetap di repo).
- Halaman admin/login, keranjang, pembayaran online.
- Kartu ucapan Galungan/Nyepi (Canva hal. 19–22).
- Mengubah desain Canva asli.

## Anti-tujuan (gagal walaupun "jalan")

- Katalog kosong atau rusak ketika Google bermasalah.
- Produk yang disembunyikan sempat "berkedip" tampil saat halaman dimuat.
- Halaman berat (16 gambar × 1–1,6 MB seperti sekarang).
- Pemilik harus paham GitHub/kode untuk urusan stok sehari-hari.

## Batasan

- GitHub Pages: statis, tanpa server. Cukup HTML/CSS/JS biasa, tanpa build step.
- Spreadsheet harus dibagikan "Siapa saja yang memiliki link: Pelihat".
- Branch `backup` = salinan `master` di commit `0b45f34` (sudah dibuat).
  Pengerjaan di branch `claude/bold-cerf-pdlnz7`; masuk ke `master` lewat PR
  atas permintaan pemilik.

## Pendekatan yang dipertimbangkan

1. **Situs membaca spreadsheet langsung saat dibuka — DIPILIH pemilik.**
   Perubahan cepat terlihat, tanpa commit. Kekurangan: bergantung pada Google
   saat halaman dibuka → perlu fallback.
2. GitHub Action menyalin spreadsheet ke repo secara berkala — ditolak: ada
   jeda (jadwal GitHub sering molor), commit otomatis menumpuk, lebih banyak
   bagian yang bisa rusak.
3. Halaman admin dengan login — dibuang: Pages tidak punya server, token akses
   harus disimpan di browser (berisiko).

Tampilan: mempertahankan gambar lama + menempel label di atasnya tidak
mungkin, karena coretan stok lama ikut tertanam di gambar. Jadi teks (nama,
harga, deskripsi, varian) dibangun ulang sebagai HTML; hanya foto produk yang
tetap berupa gambar.

## Keputusan pemilik

- Cara 1 (baca spreadsheet langsung).
- Spreadsheet dua tab dengan kotak centang (detail di bawah).
- Semua 16 produk + Ketentuan Pemesanan dimasukkan.
- Produk bisa disembunyikan lewat spreadsheet.
- Foto diambil dari desain Canva `DAGQEYPyiIM`.
- Tampilan kartu produk meniru gaya Canva (sketsa disetujui, lihat bagian
  Halaman).
- Enam produk yang dulu diturunkan dari situs (Tualen, Agni 0.5 kg,
  Agni 0.25 kg, Siddhi, Harum 2 Jam, Harum 5 Jam) **disembunyikan dulu**;
  pemilik memunculkannya sendiri dari spreadsheet.
- **Varian bisa ditambah dari spreadsheet**: daftar varian di situs mengikuti
  tab `Varian` (termasuk urutannya).

## Akun

- Spreadsheet dibuat di akun Google yang tersambung ke sesi ini (akun
  pemilik). Pemilik bisa menambah editor lain (mis. keluarga) lewat tombol
  Bagikan; link umum hanya "Pelihat".
- Salinan Canva dibuat di akun Canva yang tersambung (sudah terbukti bisa
  membaca desain `DAGQEYPyiIM`).

## Spreadsheet

Nama file: **"Asih Dwipa – Stok Katalog"**, dibuat di Google Drive pemilik,
dibagikan "Siapa saja yang memiliki link: Pelihat".

Tab **`Produk`** — satu baris per produk, urutan sama dengan katalog:

| A: Produk | B: Tampilkan (checkbox) | C: Ada stok (checkbox) |
|---|---|---|

Tab **`Varian`** — satu baris per varian:

| A: Produk | B: Varian | C: Ada stok (checkbox) |
|---|---|---|

Baris 1 = judul kolom (dibekukan). Nilai awal Ada stok = kondisi di gambar
Canva sekarang (lihat tabel produk). Tampilkan awal = ✓ untuk produk 1–10,
✗ untuk produk 11–16.

Dibaca situs lewat endpoint CSV:
`https://docs.google.com/spreadsheets/d/<ID>/gviz/tq?tqx=out:csv&sheet=Produk`
(dan `sheet=Varian`). Checkbox muncul sebagai `TRUE`/`FALSE`. ID spreadsheet
disimpan di satu konstanta di kode.

### Aturan

- Pencocokan baris ↔ produk di repo lewat **nama** (trim, abaikan huruf
  besar/kecil, rapikan spasi ganda).
- Produk **disembunyikan** jika Tampilkan = FALSE.
- Produk **habis** jika Ada stok (tab Produk) = FALSE, **atau** produk punya
  varian dan semua variannya FALSE.
- Varian **habis** jika Ada stok (tab Varian) = FALSE → dicoret + label "Habis".
- **Daftar varian berasal dari tab `Varian`**: semua baris milik produk itu,
  sesuai urutan di spreadsheet. Varian baru cukup ditambah satu baris (nama
  produk harus persis sama). Produk tanpa baris di tab Varian → tanpa daftar
  varian. Judul daftar memakai judul produk di repo; jika produk tidak punya
  judul (mis. Homa diberi varian baru) → "Koleksi aromatik:".
- Produk di repo yang tidak ada di tab Produk → pakai nilai bawaan repo
  (tampil sesuai bawaan, dianggap ada stok).
- Baris yang nama produknya tidak cocok dengan produk di repo → diabaikan
  (dicatat di console). Menambah **produk** baru tetap lewat repo (perlu foto,
  harga, deskripsi).
- Baris kosong (nama kosong) diabaikan.
- Saat memuat: tampilkan "Memuat katalog…" sampai spreadsheet terbaca, supaya
  produk tersembunyi tidak berkedip. Batas waktu ±8 detik.
- Jika salah satu tab gagal/timeout: pakai **data bawaan repo** — produk
  dengan `tampil` bawaan ✓ (produk 1–10; 11–16 tetap tersembunyi), daftar
  varian bawaan repo, **tanpa** label stok, + catatan kecil "Status stok
  sedang tidak bisa dimuat — silakan tanyakan via WhatsApp."
- Fetch tanpa cache browser (mis. parameter penanda waktu), supaya perubahan
  cepat terlihat.

## Data produk (di repo)

Per produk di repo: nama, harga, deskripsi, judul daftar, foto, `tampil`
bawaan, dan daftar varian bawaan (dipakai hanya saat spreadsheet gagal).
Kolom "Produk" = Ada stok awal di tab Produk. Tampil bawaan: ✓ untuk 1–10,
✗ untuk 11–16.

| # | Produk (nama di spreadsheet) | Harga | Judul daftar | Varian (awal: ✓ ada / ✗ habis) | Produk |
|---|---|---|---|---|---|
| 1 | Nirvana Incense | IDR 18.000 / bks | Koleksi aromatik: | Bakti ✓, Meditation ✓, Amertha ✗ | ✓ |
| 2 | Nirvana Incense 3 Jam | IDR 7.000 / bks; **IDR 60.000 / 10 bks** (Hot Price) | Koleksi aromatik: | Bakti ✓, Amertha ✓, Meditation ✗ | ✓ |
| 3 | Nirvana Incense 5 Jam | IDR 7.500 / bks; **IDR 70.000 / 10 bks** (Hot Price) | Koleksi aromatik: | Amertha ✓, Vrindavan ✓, Bakti ✓, Meditation ✓ | ✓ |
| 4 | Astha Incense 8 Jam | IDR 12.000 / bks; **IDR 110.000 / 10 bks** (Hot Price) | Koleksi aromatik: | Cendana ✓, Seribu Bunga ✓ | ✓ |
| 5 | Buddhi Incense | IDR 37.000 / bks | Koleksi aromatik: | Cendana ✓, Kemenyan Madu ✗, Cempaka ✗, Gaharu ✗, Sari Madu ✗ | ✓ |
| 6 | Riddhi Incense | IDR 25.000 / bks | Koleksi aromatik: | Cendana ✓, Tunjung ✓, Sari Madu ✗, Jasmine ✗, Jempiring ✗ | ✓ |
| 7 | Jauk Manis Incense | IDR 32.000 / bks | Tersedia dalam: | Kemasan Panjang (2 Jam) ✗, Kemasan Pendek (1 Jam) ✗ | ✗ |
| 8 | Legong Cendana | IDR 32.000 / bks | Tersedia dalam: | Kemasan Panjang (2 Jam) ✓, Kemasan Pendek (1 Jam) ✓ | ✓ |
| 9 | Menyan Wangi | IDR 25.000 / bks | Tersedia dalam: | Kemasan Panjang ✓, Kemasan Pendek ✓ | ✓ |
| 10 | Homa Incense | IDR 10.000 / bks | — | — | ✓ |
| 11 | Tualen Incense | IDR 8.500 / bks; **IDR 86.000 / 12 bks** (Hot Price) | — | — | ✓ |
| 12 | Agni 0.5 kg | IDR 26.000 / bks | — | — | ✓ |
| 13 | Agni 0.25 kg | IDR 13.000 / bks | Koleksi aromatik: | Kemenyan Madu ✓, Lotus ✗, Kemenyan ✗ | ✓ |
| 14 | Siddhi Incense | IDR 45.000 / 10 bks | Koleksi aromatik: | Satwika Aroma Rempah ✓, Bhintara Herbal Bali ✓ | ✓ |
| 15 | Harum 2 Jam | IDR 7.000 / bks | — | — | ✗ |
| 16 | Harum 5 Jam | IDR 10.000 / bks | Koleksi aromatik: | Seribu Bunga ✗, Jasmine ✗ | ✗ |

Deskripsi produk diambil apa adanya dari teks Canva (`read-design`), termasuk
bagian tebal/miring. Nama produk ditampilkan dua warna seperti Canva: kata
pertama oranye (#ff914d), sisanya hitam (mis. "**Nirvana** Incense",
"**Agni** 0.5 kg", "**Legong** Cendana").

## Foto

- Sumber: desain Canva `DAGQEYPyiIM`. **Desain asli tidak diubah.**
- Buat salinan (copy-design) hal. 1–18 di akun Canva pemilik. Di salinan,
  hapus cap stok: "Stock Terbatas" (asset `MAGWzdLIlP4`), "Out of Stock"
  (`MAD3Uz4Zz9I`), "Sold Out" (hal. 16–17). Lencana **"Best Seller"**
  (`MAGQEmrRAHg`) dan **"New Product"** tetap.
- Ekspor halaman salinan sebagai PNG, potong ke area foto utama (elemen foto
  besar di bagian atas, ±1150–1176 × 1421 px), perkecil ke lebar ±800 px,
  kompres (target ≤ 200 KB per foto).
- Sampul (hal. 1) diekspor utuh & dikompres; dipakai di atas katalog dan
  sebagai `og:image`.
- Salinan Canva dibiarkan di akun pemilik (boleh dihapus pemilik).
- Gambar lama `image/1.png`–`11.png` dihapus dari versi baru (tetap ada di
  branch `backup` dan riwayat git).

## Halaman

Urutan: header (sticky, seperti sekarang) → sampul → 16 kartu produk (urutan
Canva) → Ketentuan Pemesanan → footer ("Vibe code by Gung Satya").

Kartu produk (1 kolom, lebar maks ±600 px seperti sekarang; isi kartu
bertumpuk vertikal, bukan berdampingan seperti di Canva):

```
┌────────────────────────────┐
│   [foto produk]            │
│   (abu-abu + label "HABIS" │
│    jika produk habis)      │
├────────────────────────────┤
│ Buddhi Incense             │
│ IDR 37.000 / bks           │
│ Nyala dupa selama 2 jam…   │
│ Koleksi aromatik:          │
│  • Cendana                 │
│  • ~~Kemenyan Madu~~ HABIS │
└────────────────────────────┘
```

- Foto; jika produk habis: foto abu-abu + label besar "HABIS".
- Nama (dua warna, font serif/slab mirip Canva), harga tebal; harga paket
  berwarna oranye dengan label kecil "Hot Price".
- Deskripsi.
- Judul daftar ("Koleksi aromatik:" / "Tersedia dalam:") + daftar varian;
  varian habis dicoret + label "Habis".
- Font isi: Open Sans (sudah dipakai). Warna mengikuti Canva (oranye #ff914d,
  merah varian #d90007/#ff2204).

Ketentuan Pemesanan (teks dari Canva hal. 18):
1. Kirim pesan WA ke nomor kontak dengan format: Nama / Pesanan & Jumlah /
   Pick Up/Delivery / Alamat (khusus delivery).
2. Free Delivery sekitaran kota Singaraja.
3. Melayani COD dan transfer.

Kontak (bisa diketuk, membuka WhatsApp dengan format pesanan terisi):
- 081338752652 (Sumiarsih) → `https://wa.me/6281338752652?text=…`
- 082144646225 (Satya) → `https://wa.me/6282144646225?text=…`
- 081236734839 (Pratiwi) → `https://wa.me/6281236734839?text=…`

Teks pesan terisi: "Halo Asih Dwipa, saya ingin memesan.\nNama :\nPesanan &
Jumlah :\nPick Up/Delivery :\nAlamat (khusus delivery) :"

Dipertahankan dari versi sekarang: tombol "Back to Top", zoom foto
(ketuk dua kali / double-click membuka modal dengan pinch-zoom), meta
description & Open Graph. Dibuang: indikator "n / 11" (tidak relevan lagi).

## Pengujian

- Data spreadsheet tiruan (CSV lokal) untuk kasus: produk disembunyikan,
  produk habis, varian habis, semua varian habis, varian baru ditambah,
  urutan varian diubah, nama beda huruf besar/kecil, baris tak dikenal,
  baris kosong, spreadsheet gagal dimuat/timeout (produk 11–16 tetap
  tersembunyi).
- Cek tampilan di viewport HP (Playwright) + screenshot untuk pemilik.
- Setelah spreadsheet asli dibuat: cek situs membaca data asli.

## Panduan untuk pemilik

File singkat `CARA-UBAH-STOK.md` (bahasa Indonesia): cara mencentang stok,
menyembunyikan/memunculkan produk, menambah/menghapus/mengurutkan varian
(baris di tab Varian, nama produk harus persis sama), dan bahwa nama di kolom
Produk tab `Produk` tidak boleh diubah tanpa mengubah situs.

## Diserahkan ke pembangun

Struktur file & JS, cara parsing CSV, pilihan font serif yang mirip, format
gambar (JPG/WebP) dan ukuran pasti, detail tampilan "Memuat…", gaya label
"Habis"/"Hot Price".

## Risiko

- Endpoint `gviz` adalah fitur Google yang tidak terdokumentasi resmi untuk
  CSV. Jika tidak bisa (CORS/berubah), alternatifnya "Publikasikan ke web"
  → CSV (perubahan bisa telat ±5 menit).
- Konektor Google mungkin tidak bisa membuat checkbox/izin berbagi. Jika
  gagal: berikan file `.xlsx`/CSV siap impor + langkah manual singkat.
- Ekspor Canva lewat konektor bisa gagal/terbatas. Alternatif: potong foto
  dari gambar lama (cap stok yang menempel di foto tetap terlihat) atau
  pemilik mengekspor manual.
