/**
 * Growtopia Trade Parser & Matcher
 * Didesain khusus untuk pasar trading Growtopia (seperti server Discord The Lost Nemo)
 */

const WL_PER_DL = 100;
const WL_PER_BGL = 10000;

function priceToWls(bgl = 0, dl = 0, wl = 0) {
  return (bgl * WL_PER_BGL) + (dl * WL_PER_DL) + wl;
}

/**
 * Bersihkan format Discord (Custom Emojis & Markdown)
 */
function cleanDiscordMessage(raw) {
  if (!raw) return '';
  let text = raw;
  // Ubah custom emoji <:WL:880251447470596157> atau :WL: menjadi kata 'WL'
  text = text.replace(/<:([a-zA-Z0-9_]+):\d+>/gi, (m, name) => {
    const n = name.toUpperCase();
    if (n.includes('BGL')) return ' BGL ';
    if (n.includes('DL')) return ' DL ';
    if (n.includes('WL')) return ' WL ';
    return ' ';
  });
  // Bersihkan markdown formatting (*, _, ~, `)
  text = text.replace(/[*_~`]/g, '');
  return text;
}

/**
 * Cek apakah pesan adalah postingan PENJUALAN (S>, Sell, WTS, Jual)
 */
function isSellIntent(text) {
  const sellPattern = /(?:\bs[>:\/]\s*|\b(?:sell|selling|wts|jual|for\s*sale)\b)/i;
  return sellPattern.test(text);
}

/**
 * Ekstrak harga dari baris teks
 */
function extractLinePrice(line) {
  const text = line.toLowerCase();

  let totalWls = 0;
  let hasPrice = false;
  let formatted = [];

  // 1. Cek BGL
  const bglMatch = text.match(/(\d+(?:[.,]\d+)?)\s*(?:bgl|blue\s*gem)/i);
  if (bglMatch) {
    const bglVal = parseFloat(bglMatch[1].replace(',', '.'));
    if (!isNaN(bglVal) && bglVal > 0) {
      totalWls += bglVal * WL_PER_BGL;
      formatted.push(`${bglVal} BGL`);
      hasPrice = true;
    }
  }

  // 2. Cek DL
  const dlMatch = text.match(/(\d+(?:[.,]\d+)?)\s*(?:dl|diamond|dls)/i);
  if (dlMatch) {
    const dlVal = parseFloat(dlMatch[1].replace(',', '.'));
    if (!isNaN(dlVal) && dlVal > 0) {
      totalWls += dlVal * WL_PER_DL;
      formatted.push(`${dlVal} DL`);
      hasPrice = true;
    }
  }

  // 3. Cek WL
  const wlMatch = text.match(/(\d+(?:[.,]\d+)?)\s*(?:wl|world\s*lock|wls|\bw\b)/i);
  if (wlMatch) {
    const wlVal = parseFloat(wlMatch[1].replace(',', '.'));
    if (!isNaN(wlVal) && wlVal > 0) {
      totalWls += wlVal;
      formatted.push(`${wlVal} WL`);
      hasPrice = true;
    }
  }

  return {
    hasPrice,
    totalWls: Math.round(totalWls),
    formatted: formatted.join(' ') || ''
  };
}

/**
 * Evaluasi pesan chat terhadap watchlist item trading user
 * KETAT: Hanya kirim jika harga <= batas maksimum user!
 */
function evaluateTradeMessage(rawMessage, watchlist, alertIfPriceMissing = false) {
  const cleaned = cleanDiscordMessage(rawMessage);

  if (!isSellIntent(cleaned)) {
    return null;
  }

  const lines = cleaned.split('\n');

  for (const target of watchlist) {
    const itemName = target.name.toLowerCase();
    const aliases = (target.aliases || []).map(a => a.toLowerCase());
    const allKeywords = [itemName, ...aliases];

    const maxWlsAllowed = priceToWls(target.maxBgl || 0, target.maxDl || 0, target.maxWl || 0);

    // Cari di setiap baris yang memuat nama item
    for (const line of lines) {
      const lowerLine = line.toLowerCase();
      const matchedKw = allKeywords.find(k => lowerLine.includes(k));

      if (matchedKw) {
        // Ekstrak harga dari baris yang bersangkutan (agar tidak tercampur dengan harga item lain di list)
        let price = extractLinePrice(line);

        // Jika baris tersebut tidak memuat harga, coba ekstrak dari seluruh pesan
        if (!price.hasPrice) {
          price = extractLinePrice(cleaned);
        }

        if (price.hasPrice) {
          // KETAT: Hanya kirim jika harga <= batas maksimum user!
          if (price.totalWls <= maxWlsAllowed) {
            return {
              targetItem: target.name,
              detectedPrice: price.formatted,
              maxAllowed: `${target.maxBgl || 0} BGL ${target.maxDl || 0} DL ${target.maxWl || 0} WL`.replace(/^0 BGL | 0 WL$/g, '').trim(),
              dealReason: `🔥 HARGA MASUK TARGET! (${price.formatted} <= Target)`,
              lineMatched: line.trim()
            };
          } else {
            // Harga di atas target kita (kemahalan), abaikan!
            continue;
          }
        } else if (alertIfPriceMissing) {
          // Hanya kirim jika opsi ini sengaja diaktifkan
          return {
            targetItem: target.name,
            detectedPrice: 'Harga belum tertera',
            maxAllowed: `${target.maxBgl || 0} BGL ${target.maxDl || 0} DL ${target.maxWl || 0} WL`.replace(/^0 BGL | 0 WL$/g, '').trim(),
            dealReason: '⚠️ Harga belum tertera di chat',
            lineMatched: line.trim()
          };
        }
      }
    }
  }

  return null;
}

module.exports = {
  priceToWls,
  cleanDiscordMessage,
  extractLinePrice,
  isSellIntent,
  evaluateTradeMessage
};
