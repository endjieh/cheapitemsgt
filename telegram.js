/**
 * Telegram Notification Service khusus Growtopia Trading
 */

function escapeHtml(text) {
  if (!text) return '';
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function escapeRegex(string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Beri efek highlight (Tebal + Garis Bawah) pada kata kunci item & harga di isi chat penjual
 */
function highlightInContent(content, itemsList) {
  let safe = escapeHtml(content.length > 2000 ? content.slice(0, 2000) + '...' : content);

  itemsList.forEach(it => {
    const name = it.targetItem || it.itemName;
    const price = it.detectedPrice;

    // Highlight nama item
    if (name) {
      const itemRegex = new RegExp(`(${escapeRegex(escapeHtml(name))})`, 'gi');
      safe = safe.replace(itemRegex, '<b><u>$1</u></b>');
    }

    // Highlight angka harga
    if (price) {
      const priceParts = price.split(' ');
      priceParts.forEach(part => {
        if (part && part.length > 1) {
          const pRegex = new RegExp(`\\b(${escapeRegex(escapeHtml(part))})\\b`, 'gi');
          safe = safe.replace(pRegex, '<b><u>$1</u></b>');
        }
      });
    }
  });

  return safe;
}

async function sendTradeAlert(botToken, chatId, payload) {
  if (!botToken || !chatId || botToken.includes('ISI_')) {
    throw new Error('Telegram Bot Token atau Chat ID belum diisi.');
  }

  const {
    items,
    serverName,
    channelName,
    authorName,
    content,
    messageUrl,
    timestamp
  } = payload;

  const safeAuthor = escapeHtml(authorName);
  const safeChannel = escapeHtml(channelName);
  const safeServer = escapeHtml(serverName);

  // Pastikan daftar item berupa array
  const itemList = items && items.length > 0 ? items : [{
    targetItem: payload.itemName,
    detectedPrice: payload.detectedPrice,
    maxAllowed: payload.maxAllowed,
    dealReason: payload.dealReason
  }];

  const isMultiple = itemList.length > 1;
  let headerText = '';
  let itemsSection = [];

  if (isMultiple) {
    headerText = `🚨 <b>[DEAL: ${itemList.length} ITEM COCOK!]</b> 🚨`;
    itemsSection = [
      `📦 <b>ITEM TARGET COCOK (${itemList.length} ITEM):</b>`,
      ...itemList.map(it => `• <b><u>${escapeHtml(it.targetItem).toUpperCase()}</u></b>: <code>${escapeHtml(it.detectedPrice)}</code> <i>(Max: ${escapeHtml(it.maxAllowed)})</i>`)
    ];
  } else {
    const single = itemList[0];
    const safeItem = escapeHtml(single.targetItem).toUpperCase();
    headerText = `🚨 <b>[DEAL: ${safeItem} @ ${escapeHtml(single.detectedPrice)}]</b> 🚨`;
    itemsSection = [
      `📦 <b>ITEM TARGET:</b> <b><u>${safeItem}</u></b>`,
      `💰 <b>HARGA DAPAT:</b> <code>${escapeHtml(single.detectedPrice)}</code> <i>(Batas Max: ${escapeHtml(single.maxAllowed)})</i>`,
      `📊 <b>Status:</b> ${escapeHtml(single.dealReason)}`
    ];
  }

  const highlightedContent = highlightInContent(content, itemList);

  const text = [
    headerText,
    `━━━━━━━━━━━━━━━━━━`,
    ...itemsSection,
    `━━━━━━━━━━━━━━━━━━`,
    `🏠 <b>Server:</b> ${safeServer}`,
    `💬 <b>Channel:</b> #${safeChannel}`,
    `👤 <b>Penjual:</b> <b>${safeAuthor}</b>`,
    `⏰ <b>Waktu:</b> ${timestamp}`,
    `━━━━━━━━━━━━━━━━━━`,
    `📝 <b>Isi Iklan (Highlighted):</b>`,
    highlightedContent,
    `━━━━━━━━━━━━━━━━━━`,
    `⚡ <a href="${messageUrl}"><b>KLIK DI SINI UNTUK LANGSUNG AMBIL & DM PENJUAL!</b></a>`
  ].join('\n');

  const url = `https://api.telegram.org/bot${botToken}/sendMessage`;
  
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: chatId,
      text: text,
      parse_mode: 'HTML',
      disable_web_page_preview: true
    })
  });

  const data = await response.json();
  if (!data.ok) {
    throw new Error(`Gagal kirim ke Telegram: ${data.description || 'Unknown error'}`);
  }
  return data;
}

async function testTelegram(botToken, chatId) {
  const url = `https://api.telegram.org/bot${botToken}/sendMessage`;
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: chatId,
      text: `✅ <b>Koneksi Growtopia Trader Aktif!</b>\nBot siap memantau iklan jual item murah di Discord (The Lost Nemo & iHemo Legacy) dan langsung kirim sinyal ke sini.`,
      parse_mode: 'HTML'
    })
  });
  return await response.json();
}

module.exports = {
  sendTradeAlert,
  testTelegram
};
