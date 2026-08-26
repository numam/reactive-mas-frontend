# Reactive MAS Dashboard — Frontend

Dashboard untuk simulasi **Reactive Multi-Agent System (MAS)** pada rantai pasok unggas. Frontend ini menampilkan hasil simulasi 100 skenario disrupsi dengan mode **Reactive** (kebijakan reorder tetap, tanpa koordinasi MAS).

---

## Prasyarat

- [Node.js](https://nodejs.org/) v18 atau lebih baru
- Backend harus berjalan sebelum membuka dashboard  
  → Repo backend: **https://github.com/numam/reactive-mas-backend.git**

---

## Cara Menjalankan

### 1. Jalankan Backend

Clone dan jalankan backend terlebih dahulu sesuai instruksi di repo-nya. Backend berjalan di:

```
http://localhost:8000
```

### 2. Clone & Install Frontend

```bash
git clone <url-repo-ini>
cd frontend
npm install
```

### 3. Jalankan Dev Server

```bash
npm run dev
```

Buka browser di **http://localhost:5173**

---

## Fitur Utama

| Halaman | Deskripsi |
|---------|-----------|
| **Dashboard** | Ringkasan statistik hasil simulasi |
| **Inventory** | Level stok per node rantai pasok |
| **Suppliers** | Profil supplier dalam sistem |
| **Simulation** | Jalankan 100 skenario disrupsi (mode Reactive) |
| **Reports** | Lihat dan unduh hasil simulasi dalam bentuk tabel & CSV |

### Cara Pakai Simulasi

1. Buka halaman **Simulation**
2. Pilih salah satu skenario dari grid (100 skenario tersedia)
3. Klik **Run S001** untuk menjalankan satu skenario, atau **Run All 100** untuk menjalankan semua secara berurutan
4. Hasil (metrics + event log) muncul otomatis setelah selesai
5. File CSV tersimpan otomatis dan bisa diunduh dari panel **Saved CSV Files**

---

## Build untuk Produksi

```bash
npm run build
```

Output tersimpan di folder `dist/`.

---

## Tech Stack

- React 19 + Vite 8
- Tailwind CSS v4
- React Router v7
- Backend: FastAPI (lihat repo backend)

---

## Catatan

- Semua request API diarahkan ke `http://localhost:8000`
- Jika backend belum jalan, semua halaman akan menampilkan data kosong
- Dark mode tersedia via toggle di navbar kanan atas
