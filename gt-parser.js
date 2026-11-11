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
  // HANYA ubah emoji yang benar-benar mewakili WL / DL / BGL
  text = text.replace(/<:([a-zA-Z0-9_]+):\d+>/gi, (m, name) => {
    const n = name.toUpperCase();
    if (n === 'BGL' || n === 'BLUEGEM' || n === 'BLUE_GEM') return ' BGL ';
    if (n === 'DL' || n === 'DIAMOND' || n === 'DIAMONDLOCK' || n === 'DIAMOND_LOCK') return ' DL ';
    if (n === 'WL' || n === 'WORLDLOCK' || n === 'WORLD_LOCK') return ' WL ';
    return ' ';
  });
  text = text.replace(/[*_~`]/g, '');
  return text;
}

function isBuyLine(line) {
  return (
    /(?:\bb[>:\/]\s*|\b(?:buy|buying|wtb|beli|lf|looking\s*for)\b)/i.test(line) ||
    /\b(?:sell\s+(?:to\s+)?me|who\s+sell|anyone\s+sell(?:ing)?)\b/i.test(line)
  );
}

function isSellLine(line) {
  return /(?:\bs[>:\/]\s*|\b(?:sell|selling|wts|jual|for\s*sale)\b)/i.test(line);
}

function escapeRegex(string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Ekstrak nama world dari teks chat Growtopia (contoh: at LEOPARD, go DTJH, world MAGSTORE, etc.)
 */
function extractWorld(text) {
  if (!text) return 'DM Penjual';
  const cleaned = text.replace(/[*_~`"”„“]/g, ' ');

  const patterns = [
    /\b(?:at|go|goto|world|drop\s*world|drop|remember|lokasi)\s*[:=]?\s*([a-zA-Z0-9]{2,20})\b/i,
    /\b(?:world)\s*[:=]?\s*([a-zA-Z0-9]{2,20})\b/i
  ];

  const ignoreWords = new Set([
    'me', 'dm', 'fast', 'now', 'here', 'cheap', 'fixed', 'each', 'pcs',
    'have', 'stock', 'and', 'the', 'you', 'your', 'wl', 'dl', 'bgl', 'wls',
    'dls', 'bgls', 'sell', 'buy', 'trade', 'seed', 'item', 'items', 'nego',
    'all', 'for', 'to', 'in', 'of', 'on', 'is', 'a', 'an', 'discord'
  ]);

  for (const pattern of patterns) {
    const match = cleaned.match(pattern);
    if (match && match[1]) {
      const candidate = match[1].trim();
      if (!ignoreWords.has(candidate.toLowerCase()) && !/^\d+$/.test(candidate)) {
        return candidate.toUpperCase();
      }
    }
  }

  return 'DM Penjual';
}

/**
 * Ekstrak harga yang berada TEPAT DI SEKITAR nama item (bukan harga item lain)
 */
function extractItemSpecificPrice(text, matchedKeyword) {
  const lower = text.toLowerCase();
  const kw = matchedKeyword.toLowerCase();
  const kwIndex = lower.indexOf(kw);

  if (kwIndex === -1) return { hasPrice: false };

  // Ambil teks tepat setelah nama item (contoh: 'Eldritch Flame 10wl' atau 'Eldritch Flame : 10wl')
  const afterText = lower.slice(kwIndex + kw.length, kwIndex + kw.length + 50);

  // Ambil teks tepat sebelum nama item (contoh: '10wl Eldritch Flame')
  const beforeText = lower.slice(Math.max(0, kwIndex - 40), kwIndex);

  let totalWls = 0;
  let hasPrice = false;
  let formatted = [];

  // Kombinasi DL dan WL misal: 4dl 50wl
  const comboDlWl = afterText.match(/^[^a-zA-Z0-9]*\b(\d+(?:[.,]\d+)?)\s*(?:dl|diamonds?|dls)\s*(\d+(?:[.,]\d+)?)\s*(?:wl|world\s*locks?|wls)\b/i);

  const afterBgl = afterText.match(/^[^a-zA-Z0-9]*\b(\d+(?:[.,]\d+)?)\s*(?:bgl|blue\s*gems?)\b/i);
  const afterDl = afterText.match(/^[^a-zA-Z0-9]*\b(\d+(?:[.,]\d+)?)\s*(?:dl|diamonds?|dls)\b/i);
  const afterWl = afterText.match(/^[^a-zA-Z0-9]*\b(\d+(?:[.,]\d+)?)\s*(?:wl|world\s*locks?|wls)\b/i);

  if (comboDlWl) {
    const dlVal = parseFloat(comboDlWl[1].replace(',', '.'));
    const wlVal = parseFloat(comboDlWl[2].replace(',', '.'));
    totalWls = (dlVal * WL_PER_DL) + wlVal;
    formatted.push(`${dlVal} DL ${wlVal} WL`);
    hasPrice = true;
  } else if (afterBgl) {
    const val = parseFloat(afterBgl[1].replace(',', '.'));
    totalWls = val * WL_PER_BGL;
    formatted.push(`${val} BGL`);
    hasPrice = true;
  } else if (afterDl) {
    const val = parseFloat(afterDl[1].replace(',', '.'));
    totalWls = val * WL_PER_DL;
    formatted.push(`${val} DL`);
    hasPrice = true;
  } else if (afterWl) {
    const val = parseFloat(afterWl[1].replace(',', '.'));
    totalWls = val;
    formatted.push(`${val} WL`);
    hasPrice = true;
  }

  // Jika tidak ditemukan di afterText, periksa beforeText
  if (!hasPrice) {
    const beforeBgl = beforeText.match(/\b(\d+(?:[.,]\d+)?)\s*(?:bgl|blue\s*gems?)\s*[^a-zA-Z0-9]*$/i);
    const beforeDl = beforeText.match(/\b(\d+(?:[.,]\d+)?)\s*(?:dl|diamonds?|dls)\s*[^a-zA-Z0-9]*$/i);
    const beforeWl = beforeText.match(/\b(\d+(?:[.,]\d+)?)\s*(?:wl|world\s*locks?|wls)\s*[^a-zA-Z0-9]*$/i);

    if (beforeBgl) {
      const val = parseFloat(beforeBgl[1].replace(',', '.'));
      totalWls = val * WL_PER_BGL;
      formatted.push(`${val} BGL`);
      hasPrice = true;
    } else if (beforeDl) {
      const val = parseFloat(beforeDl[1].replace(',', '.'));
      totalWls = val * WL_PER_DL;
      formatted.push(`${val} DL`);
      hasPrice = true;
    } else if (beforeWl) {
      const val = parseFloat(beforeWl[1].replace(',', '.'));
      totalWls = val;
      formatted.push(`${val} WL`);
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
 * 3. HANYA AMBIL HARGA YANG BERADA PERSIS DI DEKAT NAMA ITEM TARGET!
 * 4. MENDUKUNG DAFTAR BARANG YANG DIPISAH SLASH '/', '|', '•', ';', ATAU BARIS BARU!
 * 5. MENAMPILKAN SEMUA ITEM YANG COCOK DALAM SATU PESAN (BUKAN HANYA 1)!
 */
function evaluateTradeMessage(rawMessage, watchlist) {
  const cleaned = cleanDiscordMessage(rawMessage);
  
  // Pecah teks berdasarkan baris DAN pembatas daftar barang (/, |, •, ;)
  const segments = cleaned.split(/[\n/|•;]+/);
  const hasAnySell = segments.some(s => isSellLine(s)) || isSellLine(cleaned);

  const matchedDeals = [];
  const seenItems = new Set();

  for (const seg of segments) {
    const trimmed = seg.trim();
    if (!trimmed) continue;

    // Tolak jika segmen ini bertuliskan BUY / B>
    if (isBuyLine(trimmed)) continue;

    for (const target of watchlist) {
      // Jika item ini sudah pernah tertangkap di segmen sebelumnya, lewati agar tidak dobel
      if (seenItems.has(target.name)) continue;

      const itemName = target.name.toLowerCase();
      const aliases = (target.aliases || []).map(a => a.toLowerCase());
      const allKeywords = [itemName, ...aliases];

      const matchedKw = allKeywords.find(k => {
        const regex = new RegExp(`(?:^|[^a-zA-Z0-9])${escapeRegex(k)}(?:$|[^a-zA-Z0-9])`, 'i');
        return regex.test(trimmed);
      });

      if (matchedKw) {
        // Cek indikasi jual
        if (!isSellLine(trimmed) && !hasAnySell) {
          continue;
        }

        // Ekstrak harga KHUSUS untuk item ini di dalam segmennya!
        const price = extractItemSpecificPrice(trimmed, matchedKw);

        if (!price.hasPrice) {
          // Tidak ada harga spesifik untuk item ini -> TOLAK!
          continue;
        }

        const maxWlsAllowed = priceToWls(target.maxBgl || 0, target.maxDl || 0, target.maxWl || 0);

        if (price.totalWls <= maxWlsAllowed) {
          seenItems.add(target.name);
          matchedDeals.push({
            targetItem: target.name,
            detectedPrice: price.formatted,
            maxAllowed: `${target.maxBgl || 0} BGL ${target.maxDl || 0} DL ${target.maxWl || 0} WL`.replace(/^0 BGL | 0 WL$/g, '').trim(),
            dealReason: `🔥 HARGA MASUK TARGET! (${price.formatted} <= Target)`,
            matchedSegment: trimmed
          });
        }
      }
    }
  }

  return matchedDeals.length > 0 ? matchedDeals : null;
}

module.exports = {
  priceToWls,
  cleanDiscordMessage,
  extractItemSpecificPrice,
  extractWorld,
  isBuyLine,
  isSellLine,
  evaluateTradeMessage
};
