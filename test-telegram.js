const fs = require('fs');
const path = require('path');
const { testTelegram } = require('./telegram');

const configPath = path.join(__dirname, 'config.json');

if (!fs.existsSync(configPath)) {
  console.error('[ERROR] config.json tidak ditemukan!');
  process.exit(1);
}

const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
const { botToken, chatId } = config.telegram || {};

if (!botToken || botToken.includes('ISI_BOT') || !chatId || chatId.includes('ISI_CHAT')) {
  console.log('\x1b[31m[ERROR] Silakan isi botToken dan chatId di config.json terlebih dahulu!\x1b[0m');
  process.exit(1);
}

console.log(`Sedang mengirim pesan tes ke Telegram (Chat ID: ${chatId})...`);

testTelegram(botToken, chatId)
  .then((res) => {
    if (res.ok) {
      console.log('\x1b[32m[SUKSES] Pesan tes berhasil terkirim ke Telegram Anda! Silakan cek Telegram Anda.\x1b[0m');
    } else {
      console.log('\x1b[31m[GAGAL]\x1b[0m Respons Telegram:', res);
    }
  })
  .catch((err) => {
    console.error('\x1b[31m[ERROR]\x1b[0m', err.message);
  });

