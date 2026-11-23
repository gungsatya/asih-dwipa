// Membangun kartu produk di halaman.
// Teks dari spreadsheet (nama varian) selalu dipasang lewat textContent, tidak pernah sebagai HTML.

export const PESAN_CADANGAN = 'Status stok sedang tidak bisa dimuat — silakan tanyakan via WhatsApp.';

/** @param {string} tag @param {string} [kelas] @param {string} [teks] */
function el(tag, kelas, teks) {
  const node = document.createElement(tag);
  if (kelas) node.className = kelas;
  if (teks !== undefined) node.textContent = teks;
  return node;
}

/** @param {import('./stok.js').ProdukTampil} p @param {boolean} pertama */
function kartu(p, pertama) {
  const artikel = el('article', p.habis ? 'kartu kartu--habis' : 'kartu');
  artikel.dataset.produkId = p.id;

  const foto = el('div', 'kartu__foto');
  const img = el('img');
  img.src = p.foto;
  img.alt = p.nama;
  img.decoding = 'async';
  if (!pertama) img.loading = 'lazy';
  foto.append(img);
  if (p.habis) foto.append(el('span', 'label-habis', 'HABIS'));
  artikel.append(foto);

  const isi = el('div', 'kartu__isi');

  const nama = el('h2', 'kartu__nama');
  nama.append(el('span', 'aksen', p.aksen), document.createTextNode(p.nama.slice(p.aksen.length)));
  isi.append(nama);

  const harga = el('div', 'kartu__harga');
  for (const h of p.harga) {
    const baris = el('p', h.hot ? 'harga harga--hot' : 'harga', h.teks);
    if (h.hot) baris.append(el('span', 'label-hot', 'Hot Price'));
    harga.append(baris);
  }
  isi.append(harga);

  const deskripsi = el('p', 'kartu__deskripsi');
  deskripsi.innerHTML = p.deskripsi; // sumbernya produk.js di repo, bukan spreadsheet
  isi.append(deskripsi);

  if (p.varian.length > 0) {
    isi.append(el('p', 'kartu__judul-varian', p.judulVarian));
    const daftar = el('ul', 'daftar-varian');
    for (const v of p.varian) {
      const li = el('li', v.ada ? 'varian' : 'varian varian--habis');
      li.dataset.varian = v.nama;
      li.append(el('span', 'varian__nama', v.nama));
      if (!v.ada) li.append(el('span', 'label-varian-habis', 'Habis'));
      daftar.append(li);
    }
    isi.append(daftar);
  }

  artikel.append(isi);
  return artikel;
}

/**
 * @param {HTMLElement} wadah
 * @param {import('./stok.js').ProdukTampil[]} produk
 * @param {{ modeCadangan: boolean }} opsi
 */
export function renderKatalog(wadah, produk, { modeCadangan }) {
  wadah.replaceChildren();
  if (modeCadangan) {
    const catatan = el('p', 'catatan-stok', PESAN_CADANGAN);
    catatan.id = 'catatan-stok';
    wadah.append(catatan);
  }
  produk.forEach((p, i) => wadah.append(kartu(p, i === 0)));
}
