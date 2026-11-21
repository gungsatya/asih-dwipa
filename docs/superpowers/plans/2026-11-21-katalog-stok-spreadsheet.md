# Katalog Asih Dwipa — Stok dari Spreadsheet: Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ganti katalog berbasis gambar dengan katalog HTML yang membaca status stok & tampil/sembunyi produk dari Google Sheet.

**Architecture:** Situs statis (GitHub Pages) tanpa build step. Data produk tetap di repo (`assets/js/produk.js`); saat halaman dibuka, `app.js` mengambil dua tab Google Sheet sebagai CSV (endpoint `gviz`), menggabungkannya dengan data repo lewat fungsi murni di `stok.js`, lalu `render.js` membangun kartu produk. Jika spreadsheet gagal/timeout, dipakai data bawaan repo.

**Tech Stack:** HTML, CSS, ES modules (vanilla JS), Node 22 `node --test` untuk unit test, Playwright (terpasang global) untuk uji halaman, Python + Pillow untuk memotong foto, konektor Canva & Google (Drive/Sheets).

**Spec:** `docs/superpowers/specs/2026-11-21-katalog-stok-spreadsheet-design.md`

## Global Constraints

- Tanpa build step dan tanpa library JS eksternal/CDN; font boleh dari Google Fonts (Open Sans sudah dipakai).
- Tab spreadsheet bernama persis `Produk` (kolom: Produk | Tampilkan | Ada stok) dan `Varian` (kolom: Produk | Varian | Ada stok); baris 1 = judul.
- URL CSV: `https://docs.google.com/spreadsheets/d/<SHEET_ID>/gviz/tq?tqx=out:csv&sheet=<tab>`; fetch dengan `cache: 'no-store'`.
- Batas waktu memuat spreadsheet: 8000 ms.
- Teks tetap (salin persis): "Memuat katalog…", "Status stok sedang tidak bisa dimuat — silakan tanyakan via WhatsApp.", label foto "HABIS", label varian "Habis", label harga paket "Hot Price", judul varian bawaan "Koleksi aromatik:".
- Pesan WA terisi: "Halo Asih Dwipa, saya ingin memesan.\nNama :\nPesanan & Jumlah :\nPick Up/Delivery :\nAlamat (khusus delivery) :"
- Warna: oranye nama #ff914d; merah varian #d90007. Lebar konten maks 600 px, mobile-first.
- Foto produk ±800 px lebar, ≤ 200 KB per file.
- Desain Canva asli `DAGQEYPyiIM` TIDAK boleh diubah; semua edit hanya di salinan.
- Teks dari spreadsheet selalu dirender sebagai teks (`textContent`), tidak pernah sebagai HTML.
- Commit diakhiri baris atribusi sesi (Co-Authored-By + Claude-Session).

## Review Focus

- Spreadsheet belum dibagikan publik → `gviz` membalas 200 dengan halaman login HTML; harus masuk mode cadangan, bukan merender sampah. (Task 2)
- Pemilik mengosongkan sel centang atau mengetik "Habis"/"Tidak"/"FALSE" alih-alih checkbox → kosong = ya; FALSE/Habis/Tidak/0/No = tidak. (Task 1)
- Nama varian berisi koma/tanda kutip/kurung, mis. `Kemasan Panjang (2 Jam)` atau `Satwika, Rempah` → parser CSV menangani kutip. (Task 1)
- Nama varian berisi `<` atau tag HTML → tampil apa adanya sebagai teks. (Task 5)
- Jaringan lambat (> 8 dtk) → mode cadangan tampil, dan respons yang datang terlambat tidak merender ulang. (Task 2, Task 5)

---

## File Structure

| File | Tanggung jawab |
|---|---|
| `package.json` | `{"type":"module","private":true,"scripts":{"test":"node --test tests/"}}` — hanya untuk test |
| `assets/js/stok.js` | Fungsi murni: parsing CSV, membaca tab, menggabungkan dengan data repo, mode cadangan |
| `assets/js/sheet.js` | Mengambil tab dari Google (fetch + timeout + validasi CSV) |
| `assets/js/produk.js` | Data 16 produk (bawaan repo) |
| `assets/js/config.js` | `SHEET_ID`, `BATAS_WAKTU_MS` |
| `assets/js/render.js` | Membangun DOM kartu produk |
| `assets/js/zoom.js` | Modal zoom foto (dipindah dari `index.html` lama) |
| `assets/js/app.js` | Titik masuk: memuat, menggabungkan, merender, back-to-top |
| `assets/css/style.css` | Semua gaya |
| `index.html` | Kerangka halaman + Ketentuan Pemesanan (statis) |
| `assets/img/sampul.jpg`, `assets/img/produk/<id>.jpg` | Gambar |
| `scripts/potong-foto.py` | Memotong & mengompres halaman ekspor Canva |
| `CARA-UBAH-STOK.md` | Panduan pemilik |
| `tests/stok.test.js`, `tests/sheet.test.js`, `tests/produk.test.js`, `tests/halaman.test.js` | Tes |

Tipe bersama (JSDoc di `stok.js`):

```js
/** @typedef {{ teks: string, hot?: boolean }} Harga */
/** @typedef {{ id: string, nama: string, aksen: string, harga: Harga[], deskripsi: string,
 *   judulVarian: string|null, foto: string, tampil: boolean, varian: string[] }} Produk */
/** @typedef {{ nama: string, ada: boolean }} VarianTampil */
/** @typedef {Omit<Produk,'varian'|'tampil'> & { judulVarian: string, varian: VarianTampil[], habis: boolean }} ProdukTampil */
/** @typedef {Map<string, { tampil: boolean, ada: boolean }>} TabProduk */
/** @typedef {Map<string, VarianTampil[]>} TabVarian */
```

---

### Task 1: Logika stok (`stok.js`)

**Files:**
- Create: `package.json`, `assets/js/stok.js`
- Test: `tests/stok.test.js`

**Interfaces:**
- Produces:
  - `normalNama(s: string): string` — trim, huruf kecil, spasi beruntun jadi satu.
  - `nilaiCentang(s: string|undefined): boolean` — `false` hanya untuk (setelah normalNama) `false`, `0`, `tidak`, `habis`, `no`; selain itu (termasuk kosong) `true`.
  - `parseCsv(teks: string): string[][]`
  - `bacaTabProduk(baris: string[][]): TabProduk` — lewati baris 0 dan baris bernama kosong; kunci = `normalNama(kolom 0)`.
  - `bacaTabVarian(baris: string[][]): TabVarian` — lewati baris 0 dan baris dengan produk/varian kosong; urutan dipertahankan; `nama` varian = teks asli yang di-trim.
  - `gabungkan(produk: Produk[], tabProduk: TabProduk, tabVarian: TabVarian): ProdukTampil[]`
  - `cadangan(produk: Produk[]): ProdukTampil[]`
  - `namaTidakDikenal(produk: Produk[], tabProduk: TabProduk, tabVarian: TabVarian): string[]` — nama produk (asli) di kedua tab yang tidak cocok dengan produk repo.

- [ ] **Step 1: Tulis tes yang gagal** di `tests/stok.test.js` (`node:test` + `node:assert/strict`), dengan data uji kecil (2–3 produk buatan, bukan `produk.js`):
  - `parseCsv`: `'"a","b, c","say ""hi"""\r\n"x","",""'` → `[['a','b, c','say "hi"'],['x','','']]`; baris baru di dalam kutip dipertahankan; baris kosong terakhir diabaikan.
  - `nilaiCentang`: `'TRUE'`, `''`, `undefined`, `'ya'` → true; `'FALSE'`, `' false '`, `'Habis'`, `'TIDAK'`, `'0'`, `'no'` → false.
  - `bacaTabProduk`: header dilewati; `'  Nirvana   Incense '` menjadi kunci `'nirvana incense'`; baris nama kosong dilewati.
  - `bacaTabVarian`: urutan `[Bakti, Amertha, Meditation]` dipertahankan; baris varian kosong dilewati.
  - `gabungkan`:
    - produk dengan Tampilkan FALSE tidak ada di hasil;
    - produk tak ada di tab Produk → pakai `tampil` bawaan, `habis: false`;
    - Ada stok produk FALSE → `habis: true`;
    - semua varian FALSE → `habis: true`; sebagian FALSE → `habis: false` dan varian itu `ada: false`;
    - daftar varian dari tab Varian (termasuk varian baru yang tidak ada di `produk.varian`, dan urutan spreadsheet), bukan dari repo;
    - produk tanpa baris di tab Varian → `varian: []`;
    - `judulVarian` null + punya varian → `'Koleksi aromatik:'`;
    - urutan hasil mengikuti urutan `produk`.
  - `cadangan`: hanya `tampil: true`; varian dari repo, semua `ada: true`; `habis: false`.
  - `namaTidakDikenal`: mengembalikan `['Produk Asing']` untuk baris tak dikenal di salah satu tab, tanpa duplikat.

- [ ] **Step 2: Jalankan tes, pastikan gagal**
  Run: `npm test` · Expected: FAIL (modul `assets/js/stok.js` tidak ada).

- [ ] **Step 3: Implementasikan `assets/js/stok.js`** sesuai Interfaces + aturan spec bagian "Aturan". `parseCsv` = state machine karakter per karakter (kutip ganda, `""` sebagai escape, `,`, `\n`/`\r\n`).

- [ ] **Step 4: Jalankan tes, pastikan lulus**
  Run: `npm test` · Expected: semua PASS.

- [ ] **Step 5: Commit** — `package.json assets/js/stok.js tests/stok.test.js`, pesan "Tambah logika penggabungan stok dari spreadsheet".

### Task 2: Pengambil spreadsheet (`sheet.js`)

**Files:**
- Create: `assets/js/sheet.js`, `assets/js/config.js`
- Test: `tests/sheet.test.js`

**Interfaces:**
- Consumes: `parseCsv`, `bacaTabProduk`, `bacaTabVarian` (Task 1).
- Produces:
  - `config.js`: `export const SHEET_ID = 'BELUM_DIISI';` (diisi di Task 6) dan `export const BATAS_WAKTU_MS = 8000;`
  - `urlTab(sheetId: string, tab: string): string`
  - `ambilTab(sheetId: string, tab: string, opsi?: { fetchFn?: typeof fetch, batasWaktuMs?: number }): Promise<string[][]>` — melempar Error jika timeout (AbortController), `!res.ok`, atau `content-type` tidak mengandung `text/csv`.
  - `ambilStok(sheetId: string, opsi?): Promise<{ tabProduk: TabProduk, tabVarian: TabVarian }>` — kedua tab paralel; salah satu gagal → reject.

- [ ] **Step 1: Tulis tes yang gagal** dengan `fetchFn` palsu:
  - `urlTab('ABC','Varian')` === `'https://docs.google.com/spreadsheets/d/ABC/gviz/tq?tqx=out:csv&sheet=Varian'`.
  - `ambilTab` memanggil `fetchFn` dengan opsi `cache: 'no-store'` dan `signal`.
  - balasan 200 `text/csv; charset=utf-8` → array baris.
  - balasan 200 `text/html` (halaman login) → reject.
  - balasan 404 → reject.
  - `fetchFn` yang tidak pernah selesai kecuali dibatalkan + `batasWaktuMs: 50` → reject dalam < 500 ms.
  - `ambilStok`: tab Varian gagal → reject; keduanya berhasil → Map berisi.

- [ ] **Step 2: Jalankan tes, pastikan gagal** — `npm test` · Expected: FAIL (modul tidak ada).
- [ ] **Step 3: Implementasikan `sheet.js` dan `config.js`.**
- [ ] **Step 4: Jalankan tes, pastikan lulus** — `npm test` · Expected: semua PASS.
- [ ] **Step 5: Commit** — "Tambah pengambil data spreadsheet dengan batas waktu".

### Task 3: Data produk (`produk.js`)

**Files:**
- Create: `assets/js/produk.js`
- Test: `tests/produk.test.js`

**Interfaces:**
- Produces: `export const PRODUK: Produk[]` (16 entri, urutan Canva hal. 2–17).

Nilai dari tabel "Data produk" di spec (nama, harga, `hot` untuk harga paket, judul daftar, daftar varian bawaan). Tambahan:
- `id` dan foto `assets/img/produk/<id>.jpg`, berurutan: `nirvana`, `nirvana-3-jam`, `nirvana-5-jam`, `astha-8-jam`, `buddhi`, `riddhi`, `jauk-manis`, `legong-cendana`, `menyan-wangi`, `homa`, `tualen`, `agni-0-5-kg`, `agni-0-25-kg`, `siddhi`, `harum-2-jam`, `harum-5-jam`.
- `aksen` (bagian oranye): Nirvana ×3, Astha, Buddhi, Riddhi, `Jauk Manis`, Legong, Menyan, Homa, Tualen, Agni ×2, Siddhi, Harum ×2.
- `tampil`: true untuk 10 pertama, false untuk 6 terakhir.
- `deskripsi`: salin persis teks deskripsi dari Canva (`read-design` desain `DAGQEYPyiIM`), bagian tebal → `<strong>`, miring → `<em>`, baris baru → `<br>`. (Ini satu-satunya field yang dirender sebagai HTML — sumbernya repo, bukan spreadsheet.)
- `judulVarian`: null untuk Homa, Tualen, Agni 0.5 kg, Harum 2 Jam.

- [ ] **Step 1: Tulis tes yang gagal**: 16 produk; `id` unik dan sama dengan daftar di atas (urutan sama); setiap `nama.startsWith(aksen)`; `foto === \`assets/img/produk/${id}.jpg\``; `tampil` = 10× true lalu 6× false; harga Nirvana Incense 3 Jam = `[{teks:'IDR 7.000 / bks'},{teks:'IDR 60.000 / 10 bks',hot:true}]`; varian Buddhi = `['Cendana','Kemenyan Madu','Cempaka','Gaharu','Sari Madu']`; Homa `varian: []`.
- [ ] **Step 2: Jalankan tes, pastikan gagal** — `npm test`.
- [ ] **Step 3: Tulis `produk.js`.**
- [ ] **Step 4: Jalankan tes, pastikan lulus** — `npm test`.
- [ ] **Step 5: Commit** — "Tambah data 16 produk".

### Task 4: Foto dari Canva

**Files:**
- Create: `scripts/potong-foto.py`, `assets/img/sampul.jpg`, `assets/img/produk/*.jpg` (16)
- Test: tambah ke `tests/produk.test.js`

**Interfaces:**
- Consumes: daftar `id` (Task 3).
- Produces: file gambar di path `Produk.foto` dan `assets/img/sampul.jpg`.

- [ ] **Step 1: Tambah tes yang gagal** di `tests/produk.test.js`: setiap `PRODUK[i].foto` dan `assets/img/sampul.jpg` ada di disk, berformat JPEG, lebar 700–900 px (sampul ≤ 1100 px), ukuran ≤ 200 KB. (Baca header JPEG dengan `fs`; cukup cek SOF0/SOF2 untuk lebar.)
- [ ] **Step 2: Jalankan, pastikan gagal** — `npm test` · Expected: FAIL file tidak ada.
- [ ] **Step 3: Salin desain** — Canva `copy-design` dari `DAGQEYPyiIM`, `page_numbers: [1..17]`. Catat ID salinan. Jangan pernah membuka transaksi edit pada desain asli.
- [ ] **Step 4: Hapus cap stok di salinan** — `read-design` salinan (`open_transaction: true`, semua halaman), lalu `edit-design` `delete_element` untuk setiap elemen bergambar `mediaId` `MAGWzdLIlP4` (Stock Terbatas), `MAD3Uz4Zz9I` (Out of Stock), dan cap "Sold Out" (hal. 16–17 salinan; cari elemen gambar yang tumpang tindih dengan foto, cek lewat `get-assets`). JANGAN hapus `MAGQEmrRAHg` (Best Seller) atau "New Product". Periksa thumbnail, lalu `commit` (salinan saja). Simpan kotak foto utama per halaman — elemen `rect` berisi gambar, `opacity` 1, `top` ≈ 0, area terbesar — ke `scratchpad/kotak-foto.json` sebagai `{ "<halaman>": [left, top, width, height] }`.
- [ ] **Step 5: Ekspor** salinan sebagai PNG (semua halaman, ukuran asli 1638×2048), unduh tiap URL dengan `curl` ke folder baru di scratchpad.
- [ ] **Step 6: Tulis `scripts/potong-foto.py`** — `python3 scripts/potong-foto.py <folder-png> <kotak.json> <folder-keluar>`: hal. 1 → `sampul.jpg` (lebar 1000); hal. 2–17 → `produk/<id>.jpg` (potong sesuai kotak, dibatasi ke ukuran halaman, lebar 800); JPEG progressive, quality 82 (turunkan ke 75 jika > 200 KB). Daftar `id` dalam urutan halaman ditulis di skrip.
- [ ] **Step 7: Jalankan skrip** ke `assets/img/`, lalu lihat beberapa hasil (Read gambar) — pastikan tidak ada cap stok, Best Seller tetap.
- [ ] **Step 8: Jalankan tes** — `npm test` · Expected: semua PASS.
- [ ] **Step 9: Commit** — "Tambah foto produk dari Canva tanpa cap stok".

### Task 5: Halaman katalog

**Files:**
- Modify: `index.html` (tulis ulang)
- Create: `assets/css/style.css`, `assets/js/render.js`, `assets/js/zoom.js`, `assets/js/app.js`
- Delete: `image/1.png` … `image/11.png`
- Test: `tests/halaman.test.js`

**Interfaces:**
- Consumes: `gabungkan`, `cadangan`, `namaTidakDikenal` (Task 1); `ambilStok` (Task 2); `SHEET_ID`, `BATAS_WAKTU_MS` (Task 2); `PRODUK` (Task 3).
- Produces:
  - `renderKatalog(wadah: HTMLElement, produk: ProdukTampil[], opsi: { modeCadangan: boolean }): void` — mengosongkan `wadah`, lalu per produk `<article class="kartu" data-produk-id="<id>">` (+ kelas `kartu--habis` bila habis) berisi foto (`.kartu__foto img`, `alt` = nama, `loading="lazy"` kecuali kartu pertama) + `.label-habis` "HABIS" bila habis; `h2.kartu__nama` dengan `<span class="aksen">`; `.kartu__harga` (harga `hot` diberi kelas `harga--hot` + `<span class="label-hot">Hot Price</span>`); `.kartu__deskripsi` (innerHTML dari repo); bila ada varian: `p.kartu__judul-varian` + `ul` dengan `<li class="varian" data-varian="<nama>">` (+ `varian--habis` dan `<span class="label-varian-habis">Habis</span>` bila habis). Saat `modeCadangan`, sisipkan `<p id="catatan-stok">` dengan teks cadangan di atas kartu.
  - `pasangZoom(img: HTMLImageElement): void` — ketuk dua kali/double-click membuka modal pinch-zoom (perilaku sama dengan `index.html` lama, tanpa indikator "n / 11").
  - `app.js`: tampilkan "Memuat katalog…" di `#katalog`; `ambilStok(SHEET_ID, {batasWaktuMs: BATAS_WAKTU_MS})` → `gabungkan` → render; gagal → `cadangan` + `modeCadangan: true`. `console.warn` untuk `namaTidakDikenal`. Pasang zoom ke foto kartu + sampul; tombol Back to Top seperti sekarang.
  - `index.html`: header sticky (judul & subjudul lama), `<img class="sampul" src="assets/img/sampul.jpg">`, `<main id="katalog">`, `<section id="pemesanan">` dengan teks Ketentuan Pemesanan dari spec + 3 tautan `https://wa.me/<nomor>?text=<pesan ter-encode>` (`target="_blank" rel="noopener"`), footer lama, tombol Back to Top, markup modal; `og:image` → `assets/img/sampul.jpg`; `<script type="module" src="assets/js/app.js">`.

- [ ] **Step 1: Tulis tes yang gagal** `tests/halaman.test.js`: server statis `node:http` di port acak yang menyajikan repo; Playwright Chromium (`createRequire(import.meta.url)('playwright')`), viewport 390×844; `page.route('https://docs.google.com/**', …)` membalas CSV tiruan per `sheet=`. Kasus:
  - data normal: 10 kartu tampil, `harum-2-jam` tidak ada; kartu `jauk-manis` punya `kartu--habis` dan teks "HABIS"; `[data-produk-id=buddhi] [data-varian="Kemenyan Madu"]` punya `varian--habis` dan teks "Habis"; tidak ada `#catatan-stok`.
  - tab Produk mencentang Tampilkan `Harum 2 Jam` → kartu `harum-2-jam` muncul.
  - varian baru `Lavender` untuk Nirvana Incense di tab Varian → muncul sebagai `li` terakhir Nirvana.
  - varian bernama `<b>X</b>` → `li` berisi teks persis `<b>X</b>`, tanpa elemen `b`.
  - route membalas 500 → `#catatan-stok` berisi teks cadangan persis; 10 kartu; tidak ada `.varian--habis`.
  - route membalas `text/html` → mode cadangan.
  - route tidak pernah membalas → dalam ≤ 10 dtk mode cadangan tampil.
  - 3 tautan `a[href^="https://wa.me/"]` dengan nomor `6281338752652`, `6282144646225`, `6281236734839`; `decodeURIComponent` teks = pesan WA dari Global Constraints.
  - tidak ada error di console halaman (selain `console.warn`).
- [ ] **Step 2: Jalankan, pastikan gagal** — `node --test tests/halaman.test.js` · Expected: FAIL.
- [ ] **Step 3: Implementasikan** `render.js`, `zoom.js`, `app.js`, `style.css`, `index.html`; hapus `image/`. Gaya meniru Canva: nama serif/slab (font Google, pilih yang mirip), harga tebal, harga hot oranye, varian merah, foto habis `filter: grayscale(1)` + label "HABIS" di tengah.
- [ ] **Step 4: Jalankan semua tes** — `npm test` · Expected: semua PASS.
- [ ] **Step 5: Screenshot** viewport HP (deviceScaleFactor 2) dengan data tiruan normal: atas halaman, kartu Buddhi, kartu Jauk Manis, bagian Pemesanan; simpan di scratchpad dan periksa (Read). Perbaiki tampilan bila janggal.
- [ ] **Step 6: Commit** — "Bangun ulang katalog sebagai HTML dengan stok dari spreadsheet".

### Task 6: Spreadsheet asli, panduan, verifikasi langsung

**Files:**
- Modify: `assets/js/config.js` (isi `SHEET_ID`)
- Create: `CARA-UBAH-STOK.md`

**Interfaces:**
- Consumes: nama produk/varian dari `PRODUK` (Task 3) dan status awal dari tabel spec.
- Produces: spreadsheet "Asih Dwipa – Stok Katalog" + `SHEET_ID`.

- [ ] **Step 1: Muat skill `anthropic-skills:google-workspace`** sebelum memanggil konektor Google.
- [ ] **Step 2: Buat spreadsheet** "Asih Dwipa – Stok Katalog" di Drive dengan tab `Produk` (16 baris: nama, Tampilkan ✓ untuk 1–10 / ✗ untuk 11–16, Ada stok sesuai kolom "Produk" tabel spec) dan `Varian` (semua varian tabel spec dengan status awalnya). Kolom centang memakai validasi checkbox; baris 1 tebal & dibekukan.
- [ ] **Step 3: Bagikan** "Siapa saja yang memiliki link: Pelihat".
- [ ] **Step 4: Verifikasi endpoint** — `curl -sS "https://docs.google.com/spreadsheets/d/<ID>/gviz/tq?tqx=out:csv&sheet=Produk"` · Expected: CSV, 17 baris, kolom 2–3 berisi `TRUE`/`FALSE`. Ulangi untuk `Varian`.
- [ ] **Step 5: Isi `SHEET_ID`** di `config.js`.
- [ ] **Step 6: Uji langsung** — buka halaman lewat server lokal di Playwright tanpa route palsu · Expected: tidak ada `#catatan-stok`; Buddhi Kemenyan Madu tercoret; Jauk Manis berlabel HABIS; 10 kartu.
- [ ] **Step 7: Tulis `CARA-UBAH-STOK.md`** — link spreadsheet; cara mencentang stok, menyembunyikan/memunculkan produk, menambah/menghapus/mengurutkan varian (nama produk di tab Varian harus persis sama dengan tab Produk), jangan ganti nama di kolom Produk tab Produk; perubahan terlihat setelah halaman dimuat ulang; produk baru perlu perubahan di GitHub.
- [ ] **Step 8: Jalankan semua tes** — `npm test` · Expected: semua PASS.
- [ ] **Step 9: Commit & push** — "Sambungkan katalog ke spreadsheet stok + panduan pemilik"; `git push -u origin claude/bold-cerf-pdlnz7`.
