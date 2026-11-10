const { Client } = require('discord.js-selfbot-v13');
const fs = require('fs');
const path = require('path');

const config = JSON.parse(fs.readFileSync(path.join(__dirname, 'config.json'), 'utf8'));

if (!config.discord.userToken || config.discord.userToken.includes('ISI_TOKEN')) {
  console.log('[ERROR] Token Discord belum diisi!');
  process.exit(1);
}

console.log('Menguji koneksi token Discord Anda...');

const client = new Client({ checkUpdate: false });

client.on('ready', () => {
  console.log('\n\x1b[32m====================================================\x1b[0m');
  console.log('✅ \x1b[1mTOKEN DISCORD VALID & BERHASIL LOGIN!\x1b[0m');
  console.log(`👤 Username: \x1b[36m${client.user.tag}\x1b[0m (ID: ${client.user.id})`);
  console.log(`🌐 Total Server: \x1b[33m${client.guilds.cache.size} server\x1b[0m`);

  // Cari apakah ada server ihemo
  const ihemoGuild = client.guilds.cache.find(g => g.name.toLowerCase().includes('ihemo'));
  if (ihemoGuild) {
    console.log(`🎉 \x1b[32mServer iHemo DITEMUKAN!\x1b[0m: "${ihemoGuild.name}" (ID: ${ihemoGuild.id})`);
    const tradeChannels = ihemoGuild.channels.cache.filter(c => c.type === 'GUILD_TEXT' && (c.name.includes('trade') || c.name.includes('sell') || c.name.includes('buy')));
    console.log(`📡 Menemukan \x1b[35m${tradeChannels.size} channel jual-beli\x1b[0m di server iHemo siap dipantau!`);
  } else {
    console.log('⚠️ Server iHemo belum ditemukan di daftar server akun ini.');
    console.log('Daftar beberapa server yang diikuti:');
    client.guilds.cache.first(5).forEach(g => console.log(` - ${g.name}`));
  }

  console.log('\x1b[32m====================================================\x1b[0m\n');
  
  // Keluar setelah tes berhasil
  setTimeout(() => {
    client.destroy();
    process.exit(0);
  }, 1000);
});

client.on('error', (err) => {
  console.error('\x1b[31m[ERROR DISCORD]\x1b[0m', err.message);
  process.exit(1);
});

client.login(config.discord.userToken).catch((err) => {
  console.error('\x1b[31m[LOGIN GAGAL]\x1b[0m Token tidak valid atau kedaluwarsa:', err.message);
  process.exit(1);
});

