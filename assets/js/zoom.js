// Zoom foto: ketuk dua kali (HP) atau double-click (komputer) membuka modal dengan pinch-zoom.
// Dipindahkan dari index.html versi lama; geser/scroll kecil tidak membuka modal.

const DOUBLE_TAP_DELAY = 450;
const MOVE_TOLERANCE = 18;

let modal;
let modalImg;
let skala = 1;
let geserX = 0;
let geserY = 0;
let awalX = 0;
let awalY = 0;
let skalaAwal = 1;
let jarakAwal = 0;
let sedangGeser = false;

const terapkan = () => {
  modalImg.style.transform = `translate(${geserX}px, ${geserY}px) scale(${skala})`;
};
const ulang = () => {
  skala = 1; geserX = 0; geserY = 0;
  terapkan();
};
const jarak = (a, b) => Math.hypot(b.clientX - a.clientX, b.clientY - a.clientY);

function buka(src, alt) {
  modalImg.src = src;
  modalImg.alt = alt;
  ulang();
  modal.classList.add('show');
  document.body.style.overflow = 'hidden';
}

function tutup() {
  modal.classList.remove('show');
  modalImg.removeAttribute('src');
  document.body.style.overflow = '';
}

function siapkanModal() {
  if (modal) return true;
  modal = document.getElementById('imageModal');
  modalImg = document.getElementById('modalImage');
  if (!modal || !modalImg) return false;

  document.getElementById('modalBackdrop').addEventListener('click', tutup);
  document.getElementById('modalClose').addEventListener('click', tutup);
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') tutup(); });

  modalImg.addEventListener('touchstart', (e) => {
    if (e.touches.length === 2) {
      e.preventDefault();
      jarakAwal = jarak(e.touches[0], e.touches[1]);
      skalaAwal = skala;
      sedangGeser = false;
    } else if (e.touches.length === 1 && skala > 1) {
      sedangGeser = true;
      awalX = e.touches[0].clientX - geserX;
      awalY = e.touches[0].clientY - geserY;
    }
  }, { passive: false });

  modalImg.addEventListener('touchmove', (e) => {
    if (e.touches.length === 2) {
      e.preventDefault();
      skala = Math.min(4, Math.max(1, skalaAwal * (jarak(e.touches[0], e.touches[1]) / jarakAwal)));
      if (skala === 1) { geserX = 0; geserY = 0; }
      terapkan();
    } else if (e.touches.length === 1 && sedangGeser && skala > 1) {
      e.preventDefault();
      geserX = e.touches[0].clientX - awalX;
      geserY = e.touches[0].clientY - awalY;
      terapkan();
    }
  }, { passive: false });

  modalImg.addEventListener('touchend', () => {
    sedangGeser = false;
    if (skala <= 1.02) ulang();
  });
  return true;
}

/** @param {HTMLImageElement} img */
export function pasangZoom(img) {
  if (!siapkanModal()) return;
  let ketukTerakhir = 0;
  let mulaiX = 0;
  let mulaiY = 0;
  let bergeser = false;

  img.addEventListener('touchstart', (e) => {
    if (e.touches.length !== 1) return;
    bergeser = false;
    mulaiX = e.touches[0].clientX;
    mulaiY = e.touches[0].clientY;
  }, { passive: true });

  img.addEventListener('touchmove', (e) => {
    if (e.touches.length !== 1) return;
    if (Math.abs(e.touches[0].clientX - mulaiX) > MOVE_TOLERANCE
      || Math.abs(e.touches[0].clientY - mulaiY) > MOVE_TOLERANCE) bergeser = true;
  }, { passive: true });

  img.addEventListener('touchend', (e) => {
    if (bergeser) { ketukTerakhir = 0; return; }
    const sekarang = Date.now();
    if (ketukTerakhir && sekarang - ketukTerakhir < DOUBLE_TAP_DELAY) {
      e.preventDefault();
      buka(img.currentSrc || img.src, img.alt);
      ketukTerakhir = 0;
    } else {
      ketukTerakhir = sekarang;
    }
  }, { passive: false });

  img.addEventListener('dblclick', (e) => {
    e.preventDefault();
    buka(img.currentSrc || img.src, img.alt);
  });
}
