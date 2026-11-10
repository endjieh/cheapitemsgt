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
 * Deteksi apakah baris ini adalah postingan BELI (B>, Buy, Buying, WTB, Beli, LF, Looking For, Sell to me)
 */
function isBuyLine(line) {
  return (
    /(?:\bb[>:\/]\s*|\b(?:buy|buying|wtb|beli|lf|looking\s*for)\b)/i.test(line) ||
    /\b(?:sell\s+(?:to\s+)?me|who\s+sell|anyone\s+sell(?:ing)?)\b/i.test(line)
  );
}

/**
 * Deteksi apakah baris ini adalah postingan JUAL (S>, Sell, Selling, WTS, Jual, For Sale)
 */
function isSellLine(line) {
  return /(?:\bs[>:\/]\s*|\b(?:sell|selling|wts|jual|for\s*sale)\b)/i.test(line);
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
 * KETAT:
 * 1. HANYA MENERIMA PENJUALAN (SELL / S> / WTS / JUAL)!
 * 2. TOLAK 100% ORANG YANG INGIN BELI (BUY / B> / WTB / BELI)!
 * 3. HANYA KIRIM JIKA HARGA <= BATAS MAKSIMAL USER!
 */
function evaluateTradeMessage(rawMessage, watchlist, alertIfPriceMissing = false) {
  const cleaned = cleanDiscordMessage(rawMessage);
  const lines = cleaned.split('\n');

  // Cek apakah ada indikasi sell di dalam pesan
  const hasAnySell = lines.some(l => isSellLine(l));

  let currentSection = 'unknown'; // 'buy' | 'sell' | 'unknown'

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    // Perbarui penanda section
    if (isSellLine(trimmed)) {
      currentSection = 'sell';
    } else if (isBuyLine(trimmed)) {
      currentSection = 'buy';
    }

    for (const target of watchlist) {
      const itemName = target.name.toLowerCase();
      const aliases = (target.aliases || []).map(a => a.toLowerCase());
      const allKeywords = [itemName, ...aliases];
      const lowerLine = trimmed.toLowerCase();

      const matchedKw = allKeywords.find(k => lowerLine.includes(k));

      if (matchedKw) {
        // FILTER 1: TOLAK JIKA BARIS INI ADA INDIKASI BELI (B>, BUY, WTB, BELI, LF, dll.)
        if (isBuyLine(trimmed)) {
          continue; // SKIP! Orang ini ingin beli!
        }

        // FILTER 2: TOLAK JIKA BERADA DI BAWAH KATEGORI / SECTION BUY
        if (currentSection === 'buy' && !isSellLine(trimmed)) {
          continue; // SKIP! Masih dalam daftar beli!
        }

        // FILTER 3: HARUS ADA INDIKASI JUAL (SELL / S> / WTS / JUAL)
        const lineIsSell = isSellLine(trimmed);
        const sectionIsSell = currentSection === 'sell';

        if (!lineIsSell && !sectionIsSell && !hasAnySell) {
          continue; // SKIP! Bukan postingan jual!
        }

        // FILTER 4: EKSTRAK HARGA
        const price = extractLinePrice(trimmed);

        if (price.hasPrice) {
          const maxWlsAllowed = priceToWls(target.maxBgl || 0, target.maxDl || 0, target.maxWl || 0);

          // FILTER 5: HARGA HARUS <= BATAS MAKSIMAL TARGET USER
          if (price.totalWls <= maxWlsAllowed) {
            return {
              targetItem: target.name,
              detectedPrice: price.formatted,
              maxAllowed: `${target.maxBgl || 0} BGL ${target.maxDl || 0} DL ${target.maxWl || 0} WL`.replace(/^0 BGL | 0 WL$/g, '').trim(),
              dealReason: `🔥 HARGA MASUK TARGET! (${price.formatted} <= Target)`,
              lineMatched: trimmed
            };
          } else {
            // Kemahalan, abaikan!
            continue;
          }
        } else if (alertIfPriceMissing) {
          return {
            targetItem: target.name,
            detectedPrice: 'Harga belum tertera',
            maxAllowed: `${target.maxBgl || 0} BGL ${target.maxDl || 0} DL ${target.maxWl || 0} WL`.replace(/^0 BGL | 0 WL$/g, '').trim(),
            dealReason: '⚠️ Harga belum tertera di chat',
            lineMatched: trimmed
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
  isBuyLine,
  isSellLine,
  evaluateTradeMessage
};
