# Growtopia Trade Sniper 🎮💎 → Telegram

Bot penyaring otomatis yang memantau chat jual-beli di server Discord (seperti **iHemo**), lalu mengirim notifikasi *realtime* ke **Telegram** Anda hanya jika ada orang yang **menjual item target dengan harga murah** (di bawah harga yang Anda tentukan).

---

## ⚡ Fitur
- **Realtime Gateway:** Membaca ribuan chat/menit dari semua channel di server iHemo secara instan.
- **Smart Sell Detection:** Hanya menangkap chat yang berniat **jual** (`S>`, `Sell`, `WTS`, `Jual`) dan membuang chat yang beli/obrolan biasa.
- **Auto Price Parser:** Mengenali mata uang Growtopia: `BGL`, `DL`, `WL` (dengan konversi otomatis).
- **Snipe Harga Murah:** Hanya kirim alert jika harga yang ditawarkan penjual ≤ harga maksimal target Anda.
- **Telegram Alert Realtime:** Notifikasi lengkap (nama item, harga, channel, nama penjual, link langsung ke chat Discord).
- **Hot-Reload:** Ubah harga/item di `config.json` kapan saja tanpa perlu restart bot.

---

## 🛠️ Penyiapan (2 Menit)

### Cara Cepat: Klik `setup.bat`
Klik ganda file **`setup.bat`**, Anda akan dipandu memasukkan token dan daftar item yang ingin dipantau.

### Cara Manual: Edit `config.json`

#### 1. Bot Token Telegram
1. Di Telegram, buka **@BotFather** → kirim `/newbot` → ikuti instruksinya.
2. Salin **HTTP API Token** yang diberikan.
3. Buka bot baru Anda, lalu tekan **Start**.

#### 2. Chat ID Telegram
1. Di Telegram, buka **@userinfobot** → kirim pesan apa saja.
2. Salin angka **Id** Anda.

#### 3. Discord User Token
1. Buka https://discord.com/app di browser (Chrome/Edge), login.
2. Tekan **F12** → tab **Console** → tempel:
   ```javascript
   (webpackChunkdiscord_app.push([[''],{},e=>{m=[];for(let c in e.c)m.push(e.c[c])}]),m).find(m=>m?.exports?.default?.getToken!==void 0).exports.default.getToken()
   ```
3. Salin token yang muncul.

#### 4. Watchlist Item & Harga
Atur item yang ingin Anda beli murah:
```json
"watchlist": [
  {
    "name": "Rayman",
    "aliases": ["rayman", "ray"],
    "maxBgl": 2,
    "maxDl": 85,
    "maxWl": 0
  }
]
```

---

## 🚀 Menjalankan
1. Klik ganda **`start.bat`** (atau `npm start`).
2. Bot akan login ke Discord dan mulai memantau server iHemo.
3. Setiap ada deal murah → notifikasi langsung masuk ke Telegram Anda!

## 🧪 Demo / Simulasi
Klik ganda **`demo.bat`** untuk melihat simulasi tanpa perlu token.

## ☁️ Hosting 24/7 (Tanpa Laptop)
Upload ke cloud (Koyeb/Render/Railway) menggunakan `Dockerfile` yang sudah tersedia. Atur token lewat Environment Variables agar aman.
