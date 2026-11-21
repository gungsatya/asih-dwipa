// Logika murni: membaca isi spreadsheet stok dan menggabungkannya dengan data produk di repo.

/** @typedef {{ teks: string, hot?: boolean }} Harga */
/** @typedef {{ id: string, nama: string, aksen: string, harga: Harga[], deskripsi: string,
 *   judulVarian: string|null, foto: string, tampil: boolean, varian: string[] }} Produk */
/** @typedef {{ nama: string, ada: boolean }} VarianTampil */
/** @typedef {Omit<Produk,'varian'|'tampil'> & { judulVarian: string, varian: VarianTampil[], habis: boolean }} ProdukTampil */
/** @typedef {Map<string, { tampil: boolean, ada: boolean }>} TabProduk */
/** @typedef {Map<string, VarianTampil[]>} TabVarian */

export const JUDUL_VARIAN_BAWAAN = 'Koleksi aromatik:';

const NILAI_TIDAK = new Set(['false', '0', 'tidak', 'habis', 'no']);

/** @param {string} s */
export function normalNama(s) {
  return String(s ?? '').trim().replace(/\s+/g, ' ').toLowerCase();
}

/** Kosong atau nilai lain berarti "ya"; hanya FALSE/0/Tidak/Habis/No berarti "tidak". */
export function nilaiCentang(s) {
  return !NILAI_TIDAK.has(normalNama(s));
}

/**
 * Parser CSV sederhana (RFC 4180): kutip ganda, "" sebagai escape, koma, \n atau \r\n.
 * @param {string} teks
 * @returns {string[][]}
 */
export function parseCsv(teks) {
  const baris = [];
  let kolom = [];
  let sel = '';
  let dalamKutip = false;

  const tutupBaris = () => {
    kolom.push(sel);
    baris.push(kolom);
    kolom = [];
    sel = '';
  };

  for (let i = 0; i < teks.length; i++) {
    const c = teks[i];
    if (dalamKutip) {
      if (c === '"') {
        if (teks[i + 1] === '"') { sel += '"'; i++; } else { dalamKutip = false; }
      } else {
        sel += c;
      }
    } else if (c === '"') {
      dalamKutip = true;
    } else if (c === ',') {
      kolom.push(sel);
      sel = '';
    } else if (c === '\n' || c === '\r') {
      if (c === '\r' && teks[i + 1] === '\n') i++;
      tutupBaris();
    } else {
      sel += c;
    }
  }
  if (sel !== '' || kolom.length > 0) tutupBaris();
  return baris;
}

/** @param {string[][]} baris @returns {TabProduk} */
export function bacaTabProduk(baris) {
  const hasil = new Map();
  for (const [nama, tampil, ada] of baris.slice(1)) {
    const kunci = normalNama(nama);
    if (!kunci) continue;
    hasil.set(kunci, { tampil: nilaiCentang(tampil), ada: nilaiCentang(ada) });
  }
  return hasil;
}

/** @param {string[][]} baris @returns {TabVarian} */
export function bacaTabVarian(baris) {
  const hasil = new Map();
  for (const [produk, varian, ada] of baris.slice(1)) {
    const kunci = normalNama(produk);
    const nama = String(varian ?? '').trim();
    if (!kunci || !nama) continue;
    if (!hasil.has(kunci)) hasil.set(kunci, []);
    hasil.get(kunci).push({ nama, ada: nilaiCentang(ada) });
  }
  return hasil;
}

/** @param {Produk} p @param {VarianTampil[]} varian @param {boolean} habis @returns {ProdukTampil} */
function keTampil(p, varian, habis) {
  const { tampil, varian: _bawaan, ...sisa } = p;
  return { ...sisa, judulVarian: p.judulVarian || JUDUL_VARIAN_BAWAAN, varian, habis };
}

/**
 * @param {Produk[]} produk @param {TabProduk} tabProduk @param {TabVarian} tabVarian
 * @returns {ProdukTampil[]}
 */
export function gabungkan(produk, tabProduk, tabVarian) {
  const hasil = [];
  for (const p of produk) {
    const kunci = normalNama(p.nama);
    const info = tabProduk.get(kunci);
    const tampil = info ? info.tampil : p.tampil;
    if (!tampil) continue;
    const varian = (tabVarian.get(kunci) ?? []).map((v) => ({ ...v }));
    const habis = (info ? !info.ada : false) || (varian.length > 0 && varian.every((v) => !v.ada));
    hasil.push(keTampil(p, varian, habis));
  }
  return hasil;
}

/** Data bawaan repo saat spreadsheet gagal dimuat: tanpa status stok. */
export function cadangan(produk) {
  return produk
    .filter((p) => p.tampil)
    .map((p) => keTampil(p, p.varian.map((nama) => ({ nama, ada: true })), false));
}

/** Nama produk (dinormalkan) di spreadsheet yang tidak cocok dengan produk mana pun di repo. */
export function namaTidakDikenal(produk, tabProduk, tabVarian) {
  const dikenal = new Set(produk.map((p) => normalNama(p.nama)));
  const asing = new Set();
  for (const kunci of [...tabProduk.keys(), ...tabVarian.keys()]) {
    if (!dikenal.has(kunci)) asing.add(kunci);
  }
  return [...asing];
}
