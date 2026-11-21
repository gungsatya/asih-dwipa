import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  normalNama, nilaiCentang, parseCsv, bacaTabProduk, bacaTabVarian,
  gabungkan, cadangan, namaTidakDikenal,
} from '../assets/js/stok.js';

const PRODUK_UJI = [
  { id: 'nirvana', nama: 'Nirvana Incense', aksen: 'Nirvana', harga: [{ teks: 'IDR 18.000 / bks' }],
    deskripsi: 'd', judulVarian: 'Koleksi aromatik:', foto: 'f1', tampil: true,
    varian: ['Bakti', 'Meditation', 'Amertha'] },
  { id: 'homa', nama: 'Homa Incense', aksen: 'Homa', harga: [{ teks: 'IDR 10.000 / bks' }],
    deskripsi: 'd', judulVarian: null, foto: 'f2', tampil: true, varian: [] },
  { id: 'harum', nama: 'Harum 2 Jam', aksen: 'Harum', harga: [{ teks: 'IDR 7.000 / bks' }],
    deskripsi: 'd', judulVarian: null, foto: 'f3', tampil: false, varian: [] },
];

const KEPALA_PRODUK = ['Produk', 'Tampilkan', 'Ada stok'];
const KEPALA_VARIAN = ['Produk', 'Varian', 'Ada stok'];
const tabP = (...baris) => bacaTabProduk([KEPALA_PRODUK, ...baris]);
const tabV = (...baris) => bacaTabVarian([KEPALA_VARIAN, ...baris]);

test('parseCsv menangani kutip, koma, kutip ganda, dan CRLF', () => {
  assert.deepEqual(
    parseCsv('"a","b, c","say ""hi"""\r\n"x","",""'),
    [['a', 'b, c', 'say "hi"'], ['x', '', '']],
  );
});

test('parseCsv mempertahankan baris baru di dalam kutip dan membuang baris kosong terakhir', () => {
  assert.deepEqual(parseCsv('"a\nb","c"\n"d","e"\n'), [['a\nb', 'c'], ['d', 'e']]);
});

test('parseCsv membaca nilai tanpa kutip', () => {
  assert.deepEqual(parseCsv('a,TRUE,FALSE\nb,,1'), [['a', 'TRUE', 'FALSE'], ['b', '', '1']]);
});

test('normalNama merapikan spasi dan huruf besar', () => {
  assert.equal(normalNama('  Nirvana   Incense '), 'nirvana incense');
});

test('nilaiCentang: kosong dan TRUE berarti ya', () => {
  for (const s of ['TRUE', '', undefined, 'ya', 'Ada']) assert.equal(nilaiCentang(s), true, String(s));
});

test('nilaiCentang: FALSE, Habis, Tidak, 0, no berarti tidak', () => {
  for (const s of ['FALSE', ' false ', 'Habis', 'TIDAK', '0', 'no']) assert.equal(nilaiCentang(s), false, s);
});

test('bacaTabProduk melewati judul dan nama kosong, kunci dinormalkan', () => {
  const t = tabP(['  Nirvana   Incense ', 'TRUE', 'FALSE'], ['', 'FALSE', 'FALSE']);
  assert.equal(t.size, 1);
  assert.deepEqual(t.get('nirvana incense'), { tampil: true, ada: false });
});

test('bacaTabVarian mempertahankan urutan dan melewati baris kosong', () => {
  const t = tabV(
    ['Nirvana Incense', 'Bakti', 'TRUE'],
    ['Nirvana Incense', '', 'TRUE'],
    ['', 'Yatim', 'TRUE'],
    ['nirvana incense', ' Amertha ', 'FALSE'],
    ['Nirvana Incense', 'Meditation', 'TRUE'],
  );
  assert.deepEqual(t.get('nirvana incense'), [
    { nama: 'Bakti', ada: true }, { nama: 'Amertha', ada: false }, { nama: 'Meditation', ada: true },
  ]);
  assert.equal(t.size, 1);
});

test('gabungkan menyembunyikan produk dengan Tampilkan FALSE', () => {
  const hasil = gabungkan(PRODUK_UJI, tabP(['Nirvana Incense', 'FALSE', 'TRUE']), tabV());
  assert.deepEqual(hasil.map((p) => p.id), ['homa']);
});

test('gabungkan memakai tampil bawaan untuk produk yang tidak ada di tab Produk', () => {
  const hasil = gabungkan(PRODUK_UJI, tabP(), tabV());
  assert.deepEqual(hasil.map((p) => p.id), ['nirvana', 'homa']);
  assert.equal(hasil[0].habis, false);
});

test('gabungkan memunculkan produk tersembunyi bawaan bila Tampilkan dicentang', () => {
  const hasil = gabungkan(PRODUK_UJI, tabP(['Harum 2 Jam', 'TRUE', 'TRUE']), tabV());
  assert.deepEqual(hasil.map((p) => p.id), ['nirvana', 'homa', 'harum']);
});

test('gabungkan: Ada stok produk FALSE berarti habis', () => {
  const [, homa] = gabungkan(PRODUK_UJI, tabP(['Homa Incense', 'TRUE', 'FALSE']), tabV());
  assert.equal(homa.habis, true);
});

test('gabungkan: semua varian FALSE berarti produk habis', () => {
  const [nirvana] = gabungkan(PRODUK_UJI, tabP(),
    tabV(['Nirvana Incense', 'Bakti', 'FALSE'], ['Nirvana Incense', 'Amertha', 'FALSE']));
  assert.equal(nirvana.habis, true);
});

test('gabungkan: sebagian varian FALSE, produk tetap ada dan varian ditandai', () => {
  const [nirvana] = gabungkan(PRODUK_UJI, tabP(),
    tabV(['Nirvana Incense', 'Bakti', 'TRUE'], ['Nirvana Incense', 'Amertha', 'FALSE']));
  assert.equal(nirvana.habis, false);
  assert.deepEqual(nirvana.varian, [{ nama: 'Bakti', ada: true }, { nama: 'Amertha', ada: false }]);
});

test('gabungkan: daftar varian mengikuti spreadsheet, termasuk varian baru dan urutannya', () => {
  const [nirvana] = gabungkan(PRODUK_UJI, tabP(),
    tabV(['Nirvana Incense', 'Lavender', 'TRUE'], ['Nirvana Incense', 'Bakti', 'TRUE']));
  assert.deepEqual(nirvana.varian.map((v) => v.nama), ['Lavender', 'Bakti']);
});

test('gabungkan: produk tanpa baris di tab Varian tidak punya varian', () => {
  const [nirvana] = gabungkan(PRODUK_UJI, tabP(), tabV());
  assert.deepEqual(nirvana.varian, []);
  assert.equal(nirvana.habis, false);
});

test('gabungkan: judul varian bawaan "Koleksi aromatik:" bila produk tidak punya judul', () => {
  const [, homa] = gabungkan(PRODUK_UJI, tabP(), tabV(['Homa Incense', 'Coblong', 'TRUE']));
  assert.equal(homa.judulVarian, 'Koleksi aromatik:');
  assert.deepEqual(homa.varian, [{ nama: 'Coblong', ada: true }]);
});

test('gabungkan mempertahankan urutan repo, bukan urutan spreadsheet', () => {
  const hasil = gabungkan(PRODUK_UJI,
    tabP(['Homa Incense', 'TRUE', 'TRUE'], ['Nirvana Incense', 'TRUE', 'TRUE']), tabV());
  assert.deepEqual(hasil.map((p) => p.id), ['nirvana', 'homa']);
});

test('gabungkan tidak membawa field tampil ke hasil dan mempertahankan data repo', () => {
  const [nirvana] = gabungkan(PRODUK_UJI, tabP(), tabV());
  assert.equal('tampil' in nirvana, false);
  assert.equal(nirvana.nama, 'Nirvana Incense');
  assert.deepEqual(nirvana.harga, [{ teks: 'IDR 18.000 / bks' }]);
});

test('cadangan: hanya produk tampil bawaan, varian repo semua ada, tidak habis', () => {
  const hasil = cadangan(PRODUK_UJI);
  assert.deepEqual(hasil.map((p) => p.id), ['nirvana', 'homa']);
  assert.deepEqual(hasil[0].varian.map((v) => v.ada), [true, true, true]);
  assert.deepEqual(hasil[0].varian.map((v) => v.nama), ['Bakti', 'Meditation', 'Amertha']);
  assert.equal(hasil.every((p) => p.habis === false), true);
  assert.equal(hasil[0].judulVarian, 'Koleksi aromatik:');
});

test('namaTidakDikenal melaporkan nama asing dari kedua tab tanpa duplikat', () => {
  const hasil = namaTidakDikenal(PRODUK_UJI,
    tabP(['Produk Asing', 'TRUE', 'TRUE'], ['nirvana incense', 'TRUE', 'TRUE']),
    tabV(['Produk Asing', 'X', 'TRUE'], ['Nirvana Incense', 'Bakti', 'TRUE']));
  assert.deepEqual(hasil, ['produk asing']);
});
