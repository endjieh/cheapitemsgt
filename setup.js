const readline = require('readline');
const fs = require('fs');
const path = require('path');
const { testTelegram } = require('./telegram');

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
const configPath = path.join(__dirname, 'config.json');

let config = JSON.parse(fs.readFileSync(configPath, 'utf8'));

function ask(question, defaultValue = '') {
  return new Promise((resolve) => {
    const prompt = defaultValue ? `${question} [${defaultValue}]: ` : `${question}: `;
    rl.question(prompt, (answer) => resolve(answer.trim() || defaultValue));
  });
}

async function run() {
  console.log('\n\x1b[36m====================================================\x1b[0m');
  console.log('🎮 \x1b[1mSETUP WIZARD - GROWTOPIA TRADE SNIPER\x1b[0m');
  console.log('\x1b[36m====================================================\x1b[0m\n');

  // 1. Telegram
  console.log('\x1b[33m--- [1/3] TELEGRAM ---\x1b[0m');
  console.log('Buat bot di @BotFather, lalu klik START di bot tersebut.');
  console.log('Ambil Chat ID Anda di @userinfobot.\n');
  const botToken = await ask('Bot Token Telegram', config.telegram?.botToken?.includes('ISI_') ? '' : config.telegram?.botToken);
  const chatId = await ask('Chat ID Telegram', config.telegram?.chatId?.includes('ISI_') ? '' : config.telegram?.chatId);

  // 2. Discord
  console.log('\n\x1b[33m--- [2/3] DISCORD ---\x1b[0m');
  console.log('Buka discord.com di browser > F12 > Console > tempel script token.\n');
  const discordToken = await ask('Discord User Token', config.discord?.userToken?.includes('ISI_') ? '' : config.discord?.userToken);

  // 3. Watchlist
  console.log('\n\x1b[33m--- [3/3] WATCHLIST ITEM GROWTOPIA ---\x1b[0m');
  const existingItems = config.growtopia?.watchlist?.map(w => w.name).join(', ') || '';
  console.log(`Item saat ini: ${existingItems || '(kosong)'}`);
  const editWatchlist = await ask('Mau edit watchlist item? (y/n)', 'n');

  if (editWatchlist.toLowerCase() === 'y') {
    const watchlist = [];
    let addMore = true;

    while (addMore) {
      console.log('\n--- Tambah Item Baru ---');
      const name = await ask('Nama Item (misal: Rayman)');
      if (!name) break;
      const aliasStr = await ask('Alias/singkatan (pisahkan koma, misal: ray,rayman)', name.toLowerCase());
      const maxBgl = parseInt(await ask('Harga Max BGL (0 jika tidak pakai BGL)', '0'), 10) || 0;
      const maxDl = parseInt(await ask('Harga Max DL', '0'), 10) || 0;
      const maxWl = parseInt(await ask('Harga Max WL', '0'), 10) || 0;

      watchlist.push({
        name,
        aliases: aliasStr.split(',').map(s => s.trim()).filter(Boolean),
        maxBgl,
        maxDl,
        maxWl
      });

      console.log(`\x1b[32m✔ ${name} ditambahkan (Max: ${maxBgl} BGL ${maxDl} DL ${maxWl} WL)\x1b[0m`);
      const more = await ask('Tambah item lagi? (y/n)', 'y');
      addMore = more.toLowerCase() === 'y';
    }

    if (watchlist.length > 0) {
      config.growtopia.watchlist = watchlist;
    }
  }

  // Simpan
  config.discord.userToken = discordToken || config.discord.userToken;
  config.telegram.botToken = botToken || config.telegram.botToken;
  config.telegram.chatId = chatId || config.telegram.chatId;
  fs.writeFileSync(configPath, JSON.stringify(config, null, 2), 'utf8');
  console.log('\n\x1b[32m✔ config.json berhasil disimpan!\x1b[0m');

  // Tes Telegram
  if (botToken && chatId && !botToken.includes('ISI_')) {
    console.log('\nMenguji koneksi Telegram...');
    try {
      const res = await testTelegram(botToken, chatId);
      if (res.ok) {
        console.log('\x1b[32m✔ Telegram SUKSES! Cek notifikasi di HP Anda.\x1b[0m');
      } else {
        console.log('\x1b[31m✖ Error Telegram:\x1b[0m', res.description);
      }
    } catch (err) {
      console.log('\x1b[31m✖ Gagal:\x1b[0m', err.message);
    }
  }

  console.log('\n\x1b[36m====================================================\x1b[0m');
  console.log('Setup selesai! Klik \x1b[32mstart.bat\x1b[0m untuk mulai snipe!');
  console.log('\x1b[36m====================================================\x1b[0m\n');
  rl.close();
}

run();
