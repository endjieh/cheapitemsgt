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

  const safeContent = escapeHtml(content.length > 2000 ? content.slice(0, 2000) + '...' : content);
  const safeAuthor = escapeHtml(authorName);
  const safeChannel = escapeHtml(channelName);
  const safeServer = escapeHtml(serverName);

  const text = [
    `💎 <b>[GROWTOPIA TRADE ALERT!]</b>`,
    `━━━━━━━━━━━━━━━━━━`,
    `📦 <b>Item:</b> <code>${escapeHtml(itemName).toUpperCase()}</code>`,
    `💰 <b>Harga Terdeteksi:</b> <b>${escapeHtml(detectedPrice)}</b>`,
    `🎯 <b>Target Maksimal:</b> ${escapeHtml(maxAllowed)}`,
    `📊 <b>Status:</b> ${escapeHtml(dealReason)}`,
    `━━━━━━━━━━━━━━━━━━`,
    `🏠 <b>Server:</b> ${safeServer}`,
    `💬 <b>Channel:</b> #${safeChannel}`,
    `👤 <b>Penjual:</b> <b>${safeAuthor}</b>`,
    `⏰ <b>Waktu:</b> ${timestamp}`,
    `━━━━━━━━━━━━━━━━━━`,
    `📝 <b>Isi Iklan:</b>`,
    `<i>"${safeContent}"</i>`,
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
      text: `✅ <b>Koneksi Growtopia Trader Aktif!</b>\nBot siap memantau iklan jual item murah di Discord (seperti iHemo) dan langsung kirim sinyal ke sini.`,
      parse_mode: 'HTML'
    })
  });
  return await response.json();
}

module.exports = {
  sendTradeAlert,
  testTelegram
};
