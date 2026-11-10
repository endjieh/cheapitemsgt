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
  // Contoh: <:WL:123456>, <:DL:123456>, <:BGL:123456>
  text = text.replace(/<:([a-zA-Z0-9_]+):\d+>/gi, (m, name) => {
    const n = name.toUpperCase();
    if (n === 'BGL' || n === 'BLUEGEM' || n === 'BLUE_GEM') return ' BGL ';
    if (n === 'DL' || n === 'DIAMOND' || n === 'DIAMONDLOCK' || n === 'DIAMOND_LOCK') return ' DL ';
    if (n === 'WL' || n === 'WORLDLOCK' || n === 'WORLD_LOCK') return ' WL ';
    return ' '; // Emoji lain (gambar item, verified, centang, dll.) dibuang jadi spasi
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
 * KETAT: Harus ada ANGKA DAN SATUAN (WL / DL / BGL)!
 * Kata seperti 'w/' (with), nama world 'DLMART', jumlah pcs, dll. TIDAK AKAN dihitung harga!
 */
function extractLinePrice(line) {
  const text = line.toLowerCase();

  let totalWls = 0;
  let hasPrice = false;
  let formatted = [];

  // 1. Cek BGL (contoh: '2 bgl', '1.5 bgl', '1 blue gem')
  const bglMatch = text.match(/\b(\d+(?:[.,]\d+)?)\s*(?:bgl|blue\s*gems?)\b/i);
  if (bglMatch) {
    const bglVal = parseFloat(bglMatch[1].replace(',', '.'));
    if (!isNaN(bglVal) && bglVal > 0) {
      totalWls += bglVal * WL_PER_BGL;
      formatted.push(`${bglVal} BGL`);
      hasPrice = true;
    }
  }

  // 2. Cek DL (contoh: '2 dl', '1.8 dl', '2 dls', '2 diamond locks')
  const dlMatch = text.match(/\b(\d+(?:[.,]\d+)?)\s*(?:dl|diamonds?|dls)\b/i);
  if (dlMatch) {
    const dlVal = parseFloat(dlMatch[1].replace(',', '.'));
    if (!isNaN(dlVal) && dlVal > 0) {
      totalWls += dlVal * WL_PER_DL;
      formatted.push(`${dlVal} DL`);
      hasPrice = true;
    }
  }

  // 3. Cek WL (contoh: '15 wl', '15 wls', '15 world lock')
  // CATATAN PENTING: Jangan masukkan '\bw\b' agar kata 'w/' (with) tidak disalahartikan sebagai WL!
  const wlMatch = text.match(/\b(\d+(?:[.,]\d+)?)\s*(?:wl|world\s*locks?|wls)\b/i);
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

function escapeRegex(string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Cek apakah teks baris memuat keyword dengan boundary kata (bukan bagian dari kata lain)
 */
function lineContainsKeyword(line, keyword) {
  const regex = new RegExp(`(?:^|[^a-zA-Z0-9])${escapeRegex(keyword)}(?:$|[^a-zA-Z0-9])`, 'i');
  return regex.test(line);
}

/**
 * Evaluasi pesan chat terhadap watchlist item trading user
 * KETAT:
 * 1. HANYA MENERIMA PENJUALAN (SELL / S> / WTS / JUAL)!
 * 2. TOLAK 100% ORANG YANG INGIN BELI (BUY / B> / WTB / BELI)!
 * 3. HANYA KIRIM JIKA ADA ANGKA & SATUAN (WL / DL / BGL) DAN HARGA <= BATAS MAKSIMAL USER!
 * 4. JIKA TIDAK ADA ANGKA ATAU TIDAK ADA WL -> TOLAK 100%!
 */
function evaluateTradeMessage(rawMessage, watchlist) {
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

      // Cek apakah baris ini memuat nama item atau aliasnya (dengan boundary kata)
      const matchedKw = allKeywords.find(k => lineContainsKeyword(trimmed, k));

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

        // FILTER 4: EKSTRAK HARGA DARI BARIS ITEM INI
        // KETAT: HARUS ADA ANGKA DAN SATUAN (WL / DL / BGL)!
        const price = extractLinePrice(trimmed);

        if (!price.hasPrice) {
          // TIDAK ADA ANGKA / TIDAK ADA WL DI BARIS INI -> TOLAK 100%!
          continue;
        }

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
          // Kemahalan (misal: Malevolent Hair 350 WL padahal batas 180 WL), tolak!
          continue;
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
