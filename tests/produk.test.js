import { test } from 'node:test';
import assert from 'node:assert/strict';
import { PRODUK } from '../assets/js/produk.js';

const ID = ['nirvana', 'nirvana-3-jam', 'nirvana-5-jam', 'astha-8-jam', 'buddhi', 'riddhi',
  'jauk-manis', 'legong-cendana', 'menyan-wangi', 'homa', 'tualen', 'agni-0-5-kg',
  'agni-0-25-kg', 'siddhi', 'harum-2-jam', 'harum-5-jam'];
const cari = (id) => PRODUK.find((p) => p.id === id);

test('ada 16 produk dengan id unik sesuai urutan Canva', () => {
  assert.deepEqual(PRODUK.map((p) => p.id), ID);
});

test('nama setiap produk diawali aksennya', () => {
  for (const p of PRODUK) assert.ok(p.nama.startsWith(p.aksen), p.id);
  assert.equal(cari('jauk-manis').aksen, 'Jauk Manis');
});

test('foto mengikuti pola assets/img/produk/<id>.jpg', () => {
  for (const p of PRODUK) assert.equal(p.foto, `assets/img/produk/${p.id}.jpg`);
});

test('10 produk pertama tampil, 6 terakhir disembunyikan', () => {
  assert.deepEqual(PRODUK.map((p) => p.tampil), [...Array(10).fill(true), ...Array(6).fill(false)]);
});

test('harga paket ditandai hot', () => {
  assert.deepEqual(cari('nirvana-3-jam').harga,
    [{ teks: 'IDR 7.000 / bks' }, { teks: 'IDR 60.000 / 10 bks', hot: true }]);
  assert.deepEqual(cari('tualen').harga,
    [{ teks: 'IDR 8.500 / bks' }, { teks: 'IDR 86.000 / 12 bks', hot: true }]);
  assert.deepEqual(cari('siddhi').harga, [{ teks: 'IDR 45.000 / 10 bks' }]);
});

test('varian bawaan dan judulnya sesuai spec', () => {
  assert.deepEqual(cari('buddhi').varian, ['Cendana', 'Kemenyan Madu', 'Cempaka', 'Gaharu', 'Sari Madu']);
  assert.deepEqual(cari('homa').varian, []);
  assert.equal(cari('homa').judulVarian, null);
  assert.equal(cari('legong-cendana').judulVarian, 'Tersedia dalam:');
  assert.deepEqual(cari('jauk-manis').varian, ['Kemasan Panjang (2 Jam)', 'Kemasan Pendek (1 Jam)']);
});

test('setiap produk punya deskripsi dan minimal satu harga', () => {
  for (const p of PRODUK) {
    assert.ok(p.deskripsi.length > 20, p.id);
    assert.ok(p.harga.length >= 1, p.id);
  }
});

import { readFileSync, existsSync } from 'node:fs';

/** Lebar gambar JPEG dari penanda SOF0/SOF2. */
function lebarJpeg(buf) {
  assert.equal(buf.readUInt16BE(0), 0xffd8, 'bukan JPEG');
  let i = 2;
  while (i < buf.length) {
    const penanda = buf.readUInt16BE(i);
    const panjang = buf.readUInt16BE(i + 2);
    if (penanda === 0xffc0 || penanda === 0xffc2) return buf.readUInt16BE(i + 7);
    i += 2 + panjang;
  }
  throw new Error('penanda SOF tidak ditemukan');
}

test('setiap foto produk ada, JPEG, lebar 700–900 px, maks 200 KB', () => {
  for (const p of PRODUK) {
    assert.ok(existsSync(p.foto), `${p.foto} tidak ada`);
    const buf = readFileSync(p.foto);
    const lebar = lebarJpeg(buf);
    assert.ok(lebar >= 700 && lebar <= 900, `${p.foto} lebar ${lebar}`);
    assert.ok(buf.length <= 200 * 1024, `${p.foto} ${buf.length} byte`);
  }
});

test('sampul ada, JPEG, lebar maks 1100 px, maks 200 KB', () => {
  const buf = readFileSync('assets/img/sampul.jpg');
  assert.ok(lebarJpeg(buf) <= 1100);
  assert.ok(buf.length <= 200 * 1024);
});
