// Titik masuk halaman: ambil stok dari spreadsheet, gabungkan dengan data produk, tampilkan.
import { PRODUK } from './produk.js';
import { gabungkan, cadangan, namaTidakDikenal } from './stok.js';
import { ambilStok } from './sheet.js';
import { SHEET_ID, BATAS_WAKTU_MS } from './config.js';
import { renderKatalog } from './render.js';
import { pasangZoom } from './zoom.js';

async function muatKatalog() {
  const wadah = document.getElementById('katalog');
  try {
    const { tabProduk, tabVarian } = await ambilStok(SHEET_ID, { batasWaktuMs: BATAS_WAKTU_MS });
    const asing = namaTidakDikenal(PRODUK, tabProduk, tabVarian);
    if (asing.length > 0) console.warn('Nama produk di spreadsheet tidak dikenali:', asing);
    renderKatalog(wadah, gabungkan(PRODUK, tabProduk, tabVarian), { modeCadangan: false });
    wadah.dataset.status = 'siap';
  } catch (galat) {
    console.warn('Spreadsheet stok gagal dimuat, memakai data cadangan.', galat);
    renderKatalog(wadah, cadangan(PRODUK), { modeCadangan: true });
    wadah.dataset.status = 'cadangan';
  }
  wadah.querySelectorAll('.kartu__foto img').forEach(pasangZoom);
}

function pasangTombolAtas() {
  const tombol = document.querySelector('.back-to-top');
  const sampul = document.querySelector('.sampul');
  if (!tombol) return;
  tombol.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));
  if ('IntersectionObserver' in window && sampul) {
    new IntersectionObserver(([entri]) => {
      tombol.classList.toggle('visible', !entri.isIntersecting);
    }, { threshold: 0.2 }).observe(sampul);
  } else {
    window.addEventListener('scroll', () => tombol.classList.toggle('visible', window.scrollY > 200));
  }
}

const sampul = document.querySelector('.sampul');
if (sampul) pasangZoom(sampul);
pasangTombolAtas();
muatKatalog();
