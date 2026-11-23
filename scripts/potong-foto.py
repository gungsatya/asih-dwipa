#!/usr/bin/env python3
"""Potong foto produk dari halaman ekspor Canva dan kompres untuk web.

Pemakaian:
    python3 scripts/potong-foto.py <folder-png> <kotak.json> <folder-keluar>

<folder-png>  : hasil ekspor PNG desain Canva (01.png = sampul, 02.png–17.png = produk)
<kotak.json>  : {"<halaman>": [left, top, width, height]} kotak foto utama per halaman
<folder-keluar>: biasanya assets/img (menghasilkan sampul.jpg dan produk/<id>.jpg)
"""
import json
import sys
from io import BytesIO
from pathlib import Path

from PIL import Image

# Urutan id sama dengan halaman Canva 2–17 (dan assets/js/produk.js).
ID_PRODUK = [
    'nirvana', 'nirvana-3-jam', 'nirvana-5-jam', 'astha-8-jam', 'buddhi', 'riddhi',
    'jauk-manis', 'legong-cendana', 'menyan-wangi', 'homa', 'tualen', 'agni-0-5-kg',
    'agni-0-25-kg', 'siddhi', 'harum-2-jam', 'harum-5-jam',
]
LEBAR_PRODUK = 800
LEBAR_SAMPUL = 1000
BATAS_BYTE = 200 * 1024


def simpan_jpeg(gambar: Image.Image, tujuan: Path, lebar: int) -> None:
    tinggi = round(gambar.height * lebar / gambar.width)
    kecil = gambar.convert('RGB').resize((lebar, tinggi), Image.LANCZOS)
    for kualitas in (82, 78, 75, 70, 65):
        buf = BytesIO()
        kecil.save(buf, 'JPEG', quality=kualitas, progressive=True, optimize=True)
        if buf.tell() <= BATAS_BYTE:
            break
    tujuan.parent.mkdir(parents=True, exist_ok=True)
    tujuan.write_bytes(buf.getvalue())
    print(f'{tujuan} {lebar}x{tinggi} q{kualitas} {buf.tell() // 1024} KB')


def main(folder_png: str, file_kotak: str, folder_keluar: str) -> None:
    sumber = Path(folder_png)
    keluar = Path(folder_keluar)
    kotak = json.loads(Path(file_kotak).read_text())

    simpan_jpeg(Image.open(sumber / '01.png'), keluar / 'sampul.jpg', LEBAR_SAMPUL)

    for i, id_produk in enumerate(ID_PRODUK, start=2):
        halaman = Image.open(sumber / f'{i:02d}.png')
        left, top, width, height = kotak[str(i)]
        x0, y0 = max(0, left), max(0, top)
        x1, y1 = min(halaman.width, left + width), min(halaman.height, top + height)
        simpan_jpeg(halaman.crop((x0, y0, x1, y1)), keluar / 'produk' / f'{id_produk}.jpg', LEBAR_PRODUK)


if __name__ == '__main__':
    if len(sys.argv) != 4:
        sys.exit(__doc__)
    main(*sys.argv[1:])
