// Uji halaman di browser sungguhan (Playwright) dengan spreadsheet tiruan.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { chromium } = require('playwright');

const AKAR = new URL('..', import.meta.url).pathname;
const TIPE = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.jpg': 'image/jpeg', '.png': 'image/png' };
const PESAN_CADANGAN = 'Status stok sedang tidak bisa dimuat — silakan tanyakan via WhatsApp.';
const PESAN_WA = 'Halo Asih Dwipa, saya ingin memesan.\nNama :\nPesanan & Jumlah :\nPick Up/Delivery :\nAlamat (khusus delivery) :';

const csv = (baris) => baris.map((b) => b.map((s) => `"${String(s).replace(/"/g, '""')}"`).join(',')).join('\n');

// Kondisi awal sesuai spec.
const PRODUK_AWAL = [
  ['Nirvana Incense', 'TRUE', 'TRUE'], ['Nirvana Incense 3 Jam', 'TRUE', 'TRUE'],
  ['Nirvana Incense 5 Jam', 'TRUE', 'TRUE'], ['Astha Incense 8 Jam', 'TRUE', 'TRUE'],
  ['Buddhi Incense', 'TRUE', 'TRUE'], ['Riddhi Incense', 'TRUE', 'TRUE'],
  ['Jauk Manis Incense', 'TRUE', 'FALSE'], ['Legong Cendana', 'TRUE', 'TRUE'],
  ['Menyan Wangi', 'TRUE', 'TRUE'], ['Homa Incense', 'TRUE', 'TRUE'],
  ['Tualen Incense', 'FALSE', 'TRUE'], ['Agni 0.5 kg', 'FALSE', 'TRUE'],
  ['Agni 0.25 kg', 'FALSE', 'TRUE'], ['Siddhi Incense', 'FALSE', 'TRUE'],
  ['Harum 2 Jam', 'FALSE', 'FALSE'], ['Harum 5 Jam', 'FALSE', 'FALSE'],
];
const VARIAN_AWAL = [
  ['Nirvana Incense', 'Bakti', 'TRUE'], ['Nirvana Incense', 'Meditation', 'TRUE'], ['Nirvana Incense', 'Amertha', 'FALSE'],
  ['Buddhi Incense', 'Cendana', 'TRUE'], ['Buddhi Incense', 'Kemenyan Madu', 'FALSE'], ['Buddhi Incense', 'Cempaka', 'FALSE'],
  ['Jauk Manis Incense', 'Kemasan Panjang (2 Jam)', 'FALSE'], ['Jauk Manis Incense', 'Kemasan Pendek (1 Jam)', 'FALSE'],
];
const KEPALA_P = ['Produk', 'Tampilkan', 'Ada stok'];
const KEPALA_V = ['Produk', 'Varian', 'Ada stok'];

let server; let browser; let alamat;

before(async () => {
  server = createServer(async (req, res) => {
    const jalur = normalize(decodeURIComponent(new URL(req.url, 'http://x').pathname)).replace(/^\/+/, '') || 'index.html';
    try {
      const isi = await readFile(join(AKAR, jalur));
      res.writeHead(200, { 'content-type': TIPE[extname(jalur)] || 'application/octet-stream' });
      res.end(isi);
    } catch {
      res.writeHead(404); res.end();
    }
  });
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  alamat = `http://127.0.0.1:${server.address().port}/`;
  browser = await chromium.launch();
});

after(async () => {
  await browser?.close();
  server?.close();
});

/**
 * Buka halaman dengan spreadsheet tiruan.
 * @param {{ produk?: string[][], varian?: string[][], status?: number, tipe?: string, diam?: boolean }} [opsi]
 */
async function buka({ produk = PRODUK_AWAL, varian = VARIAN_AWAL, status = 200, tipe = 'text/csv; charset=utf-8', diam = false } = {}) {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  const galat = [];
  page.on('console', (m) => { if (m.type() === 'error') galat.push(m.text()); });
  page.on('pageerror', (e) => galat.push(e.message));
  await page.route(/fonts\.(googleapis|gstatic)\.com/, (r) => r.fulfill({ status: 200, contentType: 'text/css', body: '' }));
  await page.route('https://docs.google.com/**', (r) => {
    if (diam) return; // tidak pernah membalas
    const tab = new URL(r.request().url()).searchParams.get('sheet');
    const isi = tab === 'Produk' ? csv([KEPALA_P, ...produk]) : csv([KEPALA_V, ...varian]);
    return r.fulfill({ status, contentType: tipe, body: isi, headers: { 'access-control-allow-origin': '*' } });
  });
  await page.goto(alamat);
  await page.waitForSelector('#katalog[data-status]', { timeout: 15000 });
  return { page, galat };
}

const idKartu = (page) => page.$$eval('.kartu', (els) => els.map((e) => e.dataset.produkId));

test('data normal: 10 kartu, Jauk Manis habis, varian Buddhi tercoret', async () => {
  const { page, galat } = await buka();
  const id = await idKartu(page);
  assert.equal(id.length, 10);
  assert.ok(!id.includes('harum-2-jam'));
  const jauk = page.locator('[data-produk-id="jauk-manis"]');
  assert.ok((await jauk.getAttribute('class')).includes('kartu--habis'));
  assert.match(await jauk.innerText(), /HABIS/);
  const km = page.locator('[data-produk-id="buddhi"] [data-varian="Kemenyan Madu"]');
  assert.ok((await km.getAttribute('class')).includes('varian--habis'));
  assert.match(await km.innerText(), /Habis/);
  assert.equal(await page.locator('#catatan-stok').count(), 0);
  assert.equal(await page.getAttribute('#katalog', 'data-status'), 'siap');
  assert.deepEqual(galat, []);
  await page.close();
});

test('Tampilkan Harum 2 Jam dicentang → kartunya muncul', async () => {
  const produk = PRODUK_AWAL.map((b) => (b[0] === 'Harum 2 Jam' ? ['Harum 2 Jam', 'TRUE', 'TRUE'] : b));
  const { page } = await buka({ produk });
  assert.ok((await idKartu(page)).includes('harum-2-jam'));
  await page.close();
});

test('varian baru di spreadsheet muncul paling akhir', async () => {
  const { page } = await buka({ varian: [...VARIAN_AWAL, ['Nirvana Incense', 'Lavender', 'TRUE']] });
  const nama = await page.$$eval('[data-produk-id="nirvana"] .varian', (els) => els.map((e) => e.dataset.varian));
  assert.deepEqual(nama, ['Bakti', 'Meditation', 'Amertha', 'Lavender']);
  await page.close();
});

test('nama varian berisi tag HTML tampil sebagai teks', async () => {
  const { page } = await buka({ varian: [['Nirvana Incense', '<b>X</b>', 'TRUE']] });
  const li = page.locator('[data-produk-id="nirvana"] .varian').first();
  assert.match(await li.innerText(), /<b>X<\/b>/);
  assert.equal(await li.locator('b').count(), 0);
  await page.close();
});

for (const [nama, opsi] of [
  ['status 500', { status: 500 }],
  ['balasan HTML (belum dibagikan)', { tipe: 'text/html; charset=utf-8' }],
]) {
  test(`spreadsheet gagal (${nama}) → mode cadangan`, async () => {
    const { page } = await buka(opsi);
    assert.equal(await page.locator('#catatan-stok').innerText(), PESAN_CADANGAN);
    assert.equal((await idKartu(page)).length, 10);
    assert.equal(await page.locator('.varian--habis, .kartu--habis').count(), 0);
    assert.equal(await page.getAttribute('#katalog', 'data-status'), 'cadangan');
    await page.close();
  });
}

test('spreadsheet tidak membalas → mode cadangan dalam 10 detik', async () => {
  const mulai = Date.now();
  const { page } = await buka({ diam: true });
  assert.ok(Date.now() - mulai < 10500);
  assert.equal(await page.locator('#catatan-stok').innerText(), PESAN_CADANGAN);
  await page.close();
});

test('tiga tautan WhatsApp dengan pesan pesanan terisi', async () => {
  const { page } = await buka();
  const href = await page.$$eval('a[href^="https://wa.me/"]', (els) => els.map((e) => e.getAttribute('href')));
  assert.deepEqual(href.map((h) => h.split('?')[0]),
    ['https://wa.me/6281338752652', 'https://wa.me/6282144646225', 'https://wa.me/6281236734839']);
  for (const h of href) assert.equal(new URL(h).searchParams.get('text'), PESAN_WA);
  await page.close();
});

test('harga paket bertanda Hot Price dan sampul tampil', async () => {
  const { page } = await buka();
  const hot = page.locator('[data-produk-id="nirvana-3-jam"] .harga--hot');
  assert.match(await hot.innerText(), /IDR 60\.000 \/ 10 bks/);
  assert.match(await hot.innerText(), /Hot Price/);
  assert.equal(await page.locator('img.sampul').count(), 1);
  await page.close();
});
