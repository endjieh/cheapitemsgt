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
function highlightInContent(content, itemName, detectedPrice) {
  let safe = escapeHtml(content.length > 2000 ? content.slice(0, 2000) + '...' : content);

  // Highlight nama item
  if (itemName) {
    const itemRegex = new RegExp(`(${escapeRegex(escapeHtml(itemName))})`, 'gi');
    safe = safe.replace(itemRegex, '<b><u>$1</u></b>');
  }

  // Highlight angka harga jika ada
  if (detectedPrice) {
    const priceParts = detectedPrice.split(' ');
    priceParts.forEach(part => {
      if (part && part.length > 1) {
        const pRegex = new RegExp(`\\b(${escapeRegex(escapeHtml(part))})\\b`, 'gi');
        safe = safe.replace(pRegex, '<b><u>$1</u></b>');
      }
    });
  }

  return safe;
}

async function sendTradeAlert(botToken, chatId, payload) {
  if (!botToken || !chatId || botToken.includes('ISI_')) {
    throw new Error('Telegram Bot Token atau Chat ID belum diisi.');
  }

  const {
    itemName,
    detectedPrice,
    maxAllowed,
    dealReason,
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
  const safeItem = escapeHtml(itemName).toUpperCase();
  const highlightedContent = highlightInContent(content, itemName, detectedPrice);

  const text = [
    `🚨 <b>[DEAL: ${safeItem} @ ${escapeHtml(detectedPrice)}]</b> 🚨`,
    `━━━━━━━━━━━━━━━━━━`,
    `📦 <b>ITEM TARGET:</b> <b><u>${safeItem}</u></b>`,
    `💰 <b>HARGA DAPAT:</b> <code>${escapeHtml(detectedPrice)}</code> <i>(Batas Max: ${escapeHtml(maxAllowed)})</i>`,
    `📊 <b>Status:</b> ${escapeHtml(dealReason)}`,
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
      text: `✅ <b>Koneksi Growtopia Trader Aktif!</b>\nBot siap memantau iklan jual item murah di Discord (seperti iHemo / The Lost Nemo) dan langsung kirim sinyal ke sini.`,
      parse_mode: 'HTML'
    })
  });
  return await response.json();
}

module.exports = {
  sendTradeAlert,
  testTelegram
};
