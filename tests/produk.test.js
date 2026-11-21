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
