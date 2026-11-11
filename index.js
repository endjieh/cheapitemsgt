require('dotenv').config();
const { Client } = require('discord.js-selfbot-v13');
const fs = require('fs');
const path = require('path');
const { evaluateTradeMessage } = require('./gt-parser');
const { sendTradeAlert } = require('./telegram');

const configPath = path.join(__dirname, 'config.json');
const watchlistPath = path.join(__dirname, 'watchlist.json');

let config = {
  discord: { userToken: process.env.DISCORD_USER_TOKEN || '' },
  telegram: { botToken: process.env.TELEGRAM_BOT_TOKEN || '', chatId: process.env.TELEGRAM_CHAT_ID || '' },
  growtopia: {
    targetServerIds: process.env.TARGET_SERVER_IDS 
      ? process.env.TARGET_SERVER_IDS.split(',').map(s => s.trim()) 
      : ['571992648190263317', '1107067283773333614'],
    targetServerNames: ['The Lost Nemo!', "iHemo's Legacy 🦉"],
    cooldownSeconds: parseInt(process.env.COOLDOWN_SECONDS || '3', 10),
    watchlist: []
  }
};

function loadConfig() {
  if (fs.existsSync(configPath)) {
    try {
      const fileConfig = JSON.parse(fs.readFileSync(configPath, 'utf8'));
      config = {
        ...config,
        ...fileConfig,
        discord: { ...config.discord, ...(fileConfig.discord || {}) },
        telegram: { ...config.telegram, ...(fileConfig.telegram || {}) },
        growtopia: { ...config.growtopia, ...(fileConfig.growtopia || {}) }
      };
    } catch (err) {
      console.error('\x1b[31m[CONFIG ERROR] Gagal parse config.json:\x1b[0m', err.message);
    }
  }

  // Jika ada watchlist.json terpisah, pakai itu sebagai prioritas (aman untuk git / cloud)
  if (fs.existsSync(watchlistPath)) {
    try {
      config.growtopia.watchlist = JSON.parse(fs.readFileSync(watchlistPath, 'utf8'));
    } catch (err) {}
  }

  return true;
}

loadConfig();

// Hot-reload config, watchlist & parser
const watchFile = (filePath, onReload) => {
  if (fs.existsSync(filePath)) {
    fs.watch(filePath, (eventType) => {
      if (eventType === 'change') {
        setTimeout(() => {
          if (onReload) onReload();
          const items = config.growtopia?.watchlist?.map(w => w.name).join(', ') || 'kosong';
          console.log(`\n\x1b[33m[UPDATE TERDETEKSI] File ${path.basename(filePath)} diperbarui otomatis!\x1b[0m\n`);
        }, 200);
      }
    });
  }
};
watchFile(configPath, loadConfig);
watchFile(watchlistPath, loadConfig);
watchFile(path.join(__dirname, 'gt-parser.js'), () => {
  delete require.cache[require.resolve('./gt-parser')];
});

// Validasi token
if (!config.discord.userToken || config.discord.userToken.includes('ISI_TOKEN')) {
  console.log('\x1b[31m[PERINGATAN] Discord userToken belum diisi di config.json!\x1b[0m');
  console.log('Jalankan \x1b[32msetup.bat\x1b[0m untuk memasukkan token.');
  process.exit(1);
}

const client = new Client({ checkUpdate: false });
const recentAlerts = new Map();

client.on('ready', () => {
  console.log('\n\x1b[32m====================================================\x1b[0m');
  console.log('🎮 \x1b[1mGROWTOPIA TRADE SNIPER BOT AKTIF!\x1b[0m');
  console.log(`👤 Akun Discord: \x1b[36m${client.user.tag}\x1b[0m`);
  // Ambil daftar server target
  const targetIds = config.growtopia.targetServerIds || (config.growtopia.targetServerId ? [config.growtopia.targetServerId] : []);
  const monitoredGuilds = client.guilds.cache.filter(g => {
    if (targetIds.length > 0 && targetIds.includes(g.id)) return true;
    if (config.growtopia.targetServerNames && config.growtopia.targetServerNames.some(name => g.name.toLowerCase().includes(name.toLowerCase()))) return true;
    if (config.growtopia.targetServer && g.name.toLowerCase().includes(config.growtopia.targetServer.toLowerCase())) return true;
    return false;
  });

  const totalChannels = monitoredGuilds.reduce((acc, g) => acc + g.channels.cache.filter(c => c.type === 'GUILD_TEXT').size, 0);
  console.log(`🎯 Target Server (${monitoredGuilds.size} server, total ${totalChannels} channel):`);
  monitoredGuilds.forEach(g => {
    const textCount = g.channels.cache.filter(c => c.type === 'GUILD_TEXT').size;
    console.log(`   - \x1b[33m${g.name}\x1b[0m (${textCount} channel text)`);
  });
  console.log(`📋 Item di Watchlist: \x1b[35m${config.growtopia.watchlist.length} item\x1b[0m`);
  
  config.growtopia.watchlist.forEach((target, i) => {
    const max = `${target.maxBgl || 0} BGL ${target.maxDl || 0} DL ${target.maxWl || 0} WL`.replace(/^0 BGL | 0 WL$/g, '').trim();
    console.log(`   ${i + 1}. \x1b[1m${target.name}\x1b[0m -> Max Beli: \x1b[32m${max || 'Bebas'}\x1b[0m`);
  });

  console.log(`📲 Realtime Alert: \x1b[32mTELEGRAM AKTIF\x1b[0m (Chat ID: ${config.telegram.chatId})`);
  console.log('\x1b[32m====================================================\x1b[0m');
  console.log('Sedang mendengarkan ribuan chat jual-beli di Discord...\n');
});

client.on('messageCreate', async (message) => {
  // Abaikan pesan sendiri
  if (message.author.id === client.user.id) return;

  const serverName = message.guild?.name || '';
  const channelName = message.channel?.name || '';

  // Filter server jika ditentukan (ID atau Nama Server)
  const targetIds = config.growtopia.targetServerIds || (config.growtopia.targetServerId ? [config.growtopia.targetServerId] : []);
  if (targetIds.length > 0 && message.guild?.id) {
    if (!targetIds.includes(message.guild.id)) {
      return;
    }
  } else if (config.growtopia.targetServerNames && config.growtopia.targetServerNames.length > 0) {
    const isTarget = config.growtopia.targetServerNames.some(name => serverName.toLowerCase().includes(name.toLowerCase()));
    if (!isTarget) return;
  } else if (config.growtopia.targetServer) {
    const target = config.growtopia.targetServer.toLowerCase();
    if (!serverName.toLowerCase().includes(target)) {
      return;
    }
  }

  // Gabungkan pesan chat + embed
  let fullText = message.content || '';
  if (message.embeds && message.embeds.length > 0) {
    for (const embed of message.embeds) {
      if (embed.title) fullText += ` ${embed.title}`;
      if (embed.description) fullText += ` ${embed.description}`;
    }
  }

  if (!fullText.trim()) return;

  // Evaluasi apakah pesan ini menjual item yang ada di watchlist kita dengan harga masuk akal
  const { evaluateTradeMessage } = require('./gt-parser');
  const match = evaluateTradeMessage(fullText, config.growtopia.watchlist);

  if (match) {
    const deals = Array.isArray(match) ? match : [match];

    // Anti-spam per author per item dalam jeda beberapa detik
    const cooldown = (config.growtopia.cooldownSeconds || 3) * 1000;
    const cacheKey = `${message.author.id}_${deals.map(d => d.targetItem).sort().join('_')}`;
    const lastAlert = recentAlerts.get(cacheKey);
    const nowMs = Date.now();

    if (lastAlert && (nowMs - lastAlert) < cooldown) {
      return;
    }
    recentAlerts.set(cacheKey, nowMs);

    const now = new Date();
    const timeStr = now.toLocaleTimeString('id-ID', { hour12: false }) + ' WIB';
    const authorName = message.author.tag || message.author.username;
    const messageUrl = message.guild
      ? `https://discord.com/channels/${message.guild.id}/${message.channel.id}/${message.id}`
      : `https://discord.com/channels/@me/${message.channel.id}/${message.id}`;

    const { extractWorld } = require('./gt-parser');
    const worldName = extractWorld(fullText);

    // Format notifikasi ringkas khusus CMD sesuai permintaan:
    // [nama item wl/dl] (SEMUA item yang masuk list ditampilkan!)
    // world: xxx
    // nama usn dc
    console.log(`\x1b[32m=================================================\x1b[0m`);
    deals.forEach(d => {
      console.log(`\x1b[1m\x1b[33m${d.targetItem} ${d.detectedPrice}\x1b[0m`);
    });
    console.log(`world: \x1b[36m${worldName}\x1b[0m`);
    console.log(`nama usn dc: \x1b[35m${authorName}\x1b[0m`);
    console.log(`\x1b[90m[${timeStr} | ${serverName} #${channelName}]\x1b[0m`);
    console.log(`\x1b[32m=================================================\x1b[0m\n`);

    // Kirim alert realtime ke Telegram
    try {
      await sendTradeAlert(config.telegram.botToken, config.telegram.chatId, {
        items: deals,
        itemName: deals[0].targetItem,
        detectedPrice: deals[0].detectedPrice,
        maxAllowed: deals[0].maxAllowed,
        dealReason: deals[0].dealReason,
        serverName,
        channelName,
        authorName,
        content: fullText,
        messageUrl,
        timestamp: `${now.toLocaleDateString('id-ID')} ${timeStr}`
      });
      console.log(`   \x1b[36m📲 Realtime Alert berhasil meluncur ke Telegram Anda!\x1b[0m\n`);
    } catch (err) {
      console.error(`   \x1b[31m❌ Gagal kirim Telegram: ${err.message}\x1b[0m\n`);
    }
  }
});

client.on('error', (err) => console.error('\x1b[31m[CLIENT ERROR]\x1b[0m', err.message));
process.on('unhandledRejection', (reason) => console.error('\x1b[31m[ERROR]\x1b[0m', reason));

// Health-check server sederhana agar kompatibel dengan semua platform cloud (Koyeb, Render, Railway, dll.)
const http = require('http');
const PORT = process.env.PORT || 8080;
const server = http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.end('Growtopia Sniper is Running 24/7!\n');
});
server.on('error', (err) => {
  // Abaikan jika port sudah terpakai di lokal
  if (err.code !== 'EADDRINUSE') console.error('HTTP server error:', err.message);
});
server.listen(PORT, () => {
  console.log(`🌐 Health-check server aktif di port ${PORT}`);
});

console.log('Sedang login ke Discord...');
client.login(config.discord.userToken).catch((err) => {
  console.error('\x1b[31m[GAGAL LOGIN]\x1b[0m Token salah atau kedaluwarsa:', err.message);
});
