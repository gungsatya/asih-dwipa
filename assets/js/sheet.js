// Mengambil tab Google Sheet sebagai CSV (endpoint gviz).
import { parseCsv, bacaTabProduk, bacaTabVarian } from './stok.js';
import { BATAS_WAKTU_MS } from './config.js';

/** @param {string} sheetId @param {string} tab */
export function urlTab(sheetId, tab) {
  return `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(tab)}`;
}

/**
 * @param {string} sheetId @param {string} tab
 * @param {{ fetchFn?: typeof fetch, batasWaktuMs?: number }} [opsi]
 * @returns {Promise<string[][]>}
 */
export async function ambilTab(sheetId, tab, { fetchFn = fetch, batasWaktuMs = BATAS_WAKTU_MS } = {}) {
  const pembatal = new AbortController();
  const pewaktu = setTimeout(() => pembatal.abort(), batasWaktuMs);
  try {
    const res = await fetchFn(urlTab(sheetId, tab), { cache: 'no-store', signal: pembatal.signal });
    if (!res.ok) throw new Error(`Tab ${tab}: status ${res.status}`);
    const tipe = res.headers.get('content-type') || '';
    if (!tipe.includes('text/csv')) throw new Error(`Tab ${tab}: bukan CSV (${tipe})`);
    return parseCsv(await res.text());
  } finally {
    clearTimeout(pewaktu);
  }
}

/**
 * @param {string} sheetId
 * @param {{ fetchFn?: typeof fetch, batasWaktuMs?: number }} [opsi]
 */
export async function ambilStok(sheetId, opsi) {
  const [produk, varian] = await Promise.all([
    ambilTab(sheetId, 'Produk', opsi),
    ambilTab(sheetId, 'Varian', opsi),
  ]);
  return { tabProduk: bacaTabProduk(produk), tabVarian: bacaTabVarian(varian) };
}
