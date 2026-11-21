import { test } from 'node:test';
import assert from 'node:assert/strict';
import { urlTab, ambilTab, ambilStok } from '../assets/js/sheet.js';
import { SHEET_ID, BATAS_WAKTU_MS } from '../assets/js/config.js';

const CSV = 'text/csv; charset=utf-8';
const balas = (isi, { status = 200, tipe = CSV } = {}) =>
  new Response(isi, { status, headers: { 'content-type': tipe } });

test('config berisi SHEET_ID dan batas waktu 8000 ms', () => {
  assert.equal(typeof SHEET_ID, 'string');
  assert.equal(BATAS_WAKTU_MS, 8000);
});

test('urlTab membentuk URL CSV gviz', () => {
  assert.equal(urlTab('ABC', 'Varian'),
    'https://docs.google.com/spreadsheets/d/ABC/gviz/tq?tqx=out:csv&sheet=Varian');
});

test('ambilTab meminta tanpa cache dengan signal dan mengembalikan baris', async () => {
  let dipanggil;
  const fetchFn = async (url, opsi) => { dipanggil = { url, opsi }; return balas('"a","b"\n"c","d"'); };
  const baris = await ambilTab('ABC', 'Produk', { fetchFn });
  assert.deepEqual(baris, [['a', 'b'], ['c', 'd']]);
  assert.equal(dipanggil.url, urlTab('ABC', 'Produk'));
  assert.equal(dipanggil.opsi.cache, 'no-store');
  assert.ok(dipanggil.opsi.signal);
});

test('ambilTab menolak balasan HTML (spreadsheet belum dibagikan)', async () => {
  const fetchFn = async () => balas('<html>login</html>', { tipe: 'text/html; charset=utf-8' });
  await assert.rejects(ambilTab('ABC', 'Produk', { fetchFn }));
});

test('ambilTab menolak status 404', async () => {
  const fetchFn = async () => balas('x', { status: 404 });
  await assert.rejects(ambilTab('ABC', 'Produk', { fetchFn }));
});

test('ambilTab menyerah setelah batas waktu', async () => {
  const fetchFn = (url, { signal }) => new Promise((_, tolak) => {
    signal.addEventListener('abort', () => tolak(new Error('dibatalkan')));
  });
  const mulai = Date.now();
  await assert.rejects(ambilTab('ABC', 'Produk', { fetchFn, batasWaktuMs: 50 }));
  assert.ok(Date.now() - mulai < 500);
});

test('ambilStok gagal bila tab Varian gagal', async () => {
  const fetchFn = async (url) => (url.includes('sheet=Varian') ? balas('x', { status: 500 }) : balas('"Produk"'));
  await assert.rejects(ambilStok('ABC', { fetchFn }));
});

test('ambilStok mengembalikan kedua tab yang sudah dibaca', async () => {
  const fetchFn = async (url) => (url.includes('sheet=Varian')
    ? balas('"Produk","Varian","Ada stok"\n"Buddhi Incense","Cendana","TRUE"')
    : balas('"Produk","Tampilkan","Ada stok"\n"Buddhi Incense","TRUE","FALSE"'));
  const { tabProduk, tabVarian } = await ambilStok('ABC', { fetchFn });
  assert.deepEqual(tabProduk.get('buddhi incense'), { tampil: true, ada: false });
  assert.deepEqual(tabVarian.get('buddhi incense'), [{ nama: 'Cendana', ada: true }]);
});
