/**
 * Growtopia Trade Sniper Simulator — Item list dari watchlist user
 */
const { evaluateTradeMessage } = require('./gt-parser');
const fs = require('fs');
const path = require('path');

const config = JSON.parse(fs.readFileSync(path.join(__dirname, 'config.json'), 'utf8'));

const IHEMO_CHANNELS = [
  'selling-1-99wls',
  'selling-100-999wls',
  'selling-1-9dls',
  'selling-10-99dls',
  'selling-100dls',
  'buying-1-99wls',
  'buying-100-999wls',
  'buying-1-9dls',
  'overpay-trades',
  'trade-general'
];

// Simulasi chat realistis iHemo — campuran spam, beli, jual kemahalan, dan deal murah
const SIMULATED_CHATS = [
  // Obrolan / spam (dibuang)
  { text: 'anyone know growtopia update today?', user: 'Noob2026#111' },
  { text: 'LF trusted MM for big trade', user: 'SafeTrader#200' },
  { text: 'drop world BUYCHEAP for free items!!', user: 'Scammer#666' },

  // Beli (B>) — bukan target kita, kita cari yang JUAL
  { text: 'B> Apocalypse Steed 14wl each have 20 slots dm me', user: 'BulkBuyer#321' },
  { text: 'buying demon megalodon 13wl fast', user: 'MegaFan#444' },
  { text: 'b> cursed katana 190wl need 3 pcs', user: 'KatanaLover#555' },

  // Jual tapi KEMAHALAN (dibuang — harga di atas target kita)
  { text: 'S> Apocalypse Steed 18wl each stock 10', user: 'ExpensiveGuy#101' },
  { text: 'WTS demon megalodon 20wl fixed no nego', user: 'GreedKing#202' },
  { text: 'sell cursed katana 250wl dm fast', user: 'Overpriced#303' },
  { text: 'S> Black Aura 7dl fixed price', user: 'RichSeller#707' },
  { text: 's> malevolent hair 2dl each', user: 'HairDealer#808' },

  // ===== DEAL MURAH! Alert langsung ke Telegram! =====
  { text: 'S> Apocalypse Steed 12wl each have 5 DM NOW!', user: 'QuickSell#771' },
  { text: 'WTS demon megalodon 14wl drop world DEMONSALE', user: 'UrgentSeller#882' },
  { text: 's> familiar leash 5wl each stock 8 dm me fast', user: 'LeashFarm#553' },
  { text: 'JUAL cursed katana 180wl butuh wl cepat DM', user: 'KatanaDump#664' },
  { text: 'S> black aura 4dl 50wl nego tipis', user: 'AuraCheap#775' },
  { text: 'sell malevolent hair 170wl fast need dl', user: 'HairCheap#886' },
  { text: 's> eldritch flame 2wl each stock banyak drop ELDWORLD', user: 'FlameFarm#997' },
  { text: 'WTS cape tatters 15wl dm aja', user: 'CapeGuy#118' },

  // Pesan tanpa harga eksplisit tapi jual item target
  { text: 'S> Familiar Leash cheap DM for price', user: 'Mystery#229' },

  // Lebih banyak spam untuk realistis
  { text: 'anyone selling growscan?', user: 'Random#330' },
  { text: 'rate check dl/wl today?', user: 'Changer#441' },
  { text: 'S> Legendary Wizard 50dl dm', user: 'WizSeller#552' },
];

console.log('\n\x1b[36m====================================================\x1b[0m');
console.log('🎮 \x1b[1mSIMULASI GROWTOPIA TRADE SNIPER (iHEMO)\x1b[0m');
console.log('\x1b[36m====================================================\x1b[0m');
console.log('Item yang dipantau:\n');
config.growtopia.watchlist.forEach((t, i) => {
  const max = [];
  if (t.maxBgl > 0) max.push(`${t.maxBgl} BGL`);
  if (t.maxDl > 0) max.push(`${t.maxDl} DL`);
  if (t.maxWl > 0) max.push(`${t.maxWl} WL`);
  console.log(`   ${i + 1}. \x1b[33m${t.name}\x1b[0m — Max: \x1b[32m${max.join(' ')}\x1b[0m`);
});
console.log('\n\x1b[36m====================================================\x1b[0m\n');

let totalSeen = 0;
let totalAlerts = 0;
let totalSkipped = 0;

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function run() {
  for (const chat of SIMULATED_CHATS) {
    totalSeen++;
    const ch = IHEMO_CHANNELS[Math.floor(Math.random() * IHEMO_CHANNELS.length)];
    const time = new Date().toLocaleTimeString('id-ID', { hour12: false });

    const match = evaluateTradeMessage(chat.text, config.growtopia.watchlist);

    if (match) {
      totalAlerts++;
      console.log(`\x1b[32m[${time}] 🚨 DEAL MURAH!\x1b[0m`);
      console.log(`   📦 Item   : \x1b[1m${match.targetItem}\x1b[0m`);
      console.log(`   💰 Harga  : \x1b[33m${match.detectedPrice}\x1b[0m (Max: ${match.maxAllowed})`);
      console.log(`   📊 Status : \x1b[32m${match.dealReason}\x1b[0m`);
      console.log(`   💬 #${ch} — 👤 ${chat.user}`);
      console.log(`   📝 "${chat.text}"`);
      console.log(`   📲 \x1b[36m=> KIRIM KE TELEGRAM!\x1b[0m`);
      console.log('   -------------------------------------------------');
    } else {
      totalSkipped++;
      console.log(`\x1b[90m[${time}] ✗ #${ch} — ${chat.user}: "${chat.text.slice(0, 50)}..."\x1b[0m`);
    }

    await sleep(600);
  }

  console.log(`\n\x1b[32m====================================================\x1b[0m`);
  console.log(`✔ SIMULASI SELESAI`);
  console.log(`   Total chat dipantau  : ${totalSeen}`);
  console.log(`   Dibuang (spam/mahal) : \x1b[90m${totalSkipped}\x1b[0m`);
  console.log(`   Alert ke Telegram    : \x1b[32m${totalAlerts} deal murah!\x1b[0m`);
  console.log(`\x1b[32m====================================================\x1b[0m\n`);
}

run();
