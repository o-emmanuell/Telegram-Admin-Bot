import axios from "axios";

const DEXSCREENER_BACHI_URL =
  "https://api.dexscreener.com/latest/dex/pairs/base/0x7a8137b5f3be0152b7e62cdcdf2e81ec03cb3f95";
const KACHI_MARKETPLACE_URL =
  "https://kaspa.com/tokens/marketplace/token/KACHI";

export interface TokenStats {
  price: string;
  priceUsd?: string;
  priceChange24h?: string;
  volume24h?: string;
  liquidity?: string;
  marketCap?: string;
  fdv?: string;
  txns24h?: string;
  dexName?: string;
  pairAddress?: string;
}

export async function fetchBachiStats(): Promise<TokenStats | null> {
  try {
    const { data } = await axios.get(DEXSCREENER_BACHI_URL, { timeout: 8000 });
    const pair = data?.pair ?? data?.pairs?.[0];
    if (!pair) return null;

    const priceUsd = pair.priceUsd
      ? `$${parseFloat(pair.priceUsd).toFixed(8)}`
      : "N/A";
    const priceNative = pair.priceNative
      ? `${parseFloat(pair.priceNative).toFixed(8)} ETH`
      : "N/A";
    const change24h = pair.priceChange?.h24 ?? "N/A";
    const vol24h = pair.volume?.h24
      ? `$${Number(pair.volume.h24).toLocaleString()}`
      : "N/A";
    const liq = pair.liquidity?.usd
      ? `$${Number(pair.liquidity.usd).toLocaleString()}`
      : "N/A";
    const mcap = pair.marketCap
      ? `$${Number(pair.marketCap).toLocaleString()}`
      : "N/A";
    const fdv = pair.fdv ? `$${Number(pair.fdv).toLocaleString()}` : "N/A";
    const txns =
      pair.txns?.h24
        ? `${(pair.txns.h24.buys ?? 0) + (pair.txns.h24.sells ?? 0)} (🟢${pair.txns.h24.buys ?? 0} / 🔴${pair.txns.h24.sells ?? 0})`
        : "N/A";

    return {
      price: priceNative,
      priceUsd,
      priceChange24h: change24h.toString(),
      volume24h: vol24h,
      liquidity: liq,
      marketCap: mcap,
      fdv,
      txns24h: txns,
      dexName: pair.dexId ?? "Unknown DEX",
      pairAddress: pair.pairAddress,
    };
  } catch {
    return null;
  }
}

export function formatBachiStats(stats: TokenStats): string {
  const changeEmoji =
    parseFloat(stats.priceChange24h ?? "0") >= 0 ? "🟢" : "🔴";
  return (
    `📊 *BACHI Token Stats*\n\n` +
    `💰 *Price:* ${stats.priceUsd}\n` +
    `⚖️ *Price (ETH):* ${stats.price}\n` +
    `📈 *24h Change:* ${changeEmoji} ${stats.priceChange24h}%\n` +
    `📦 *24h Volume:* ${stats.volume24h}\n` +
    `💧 *Liquidity:* ${stats.liquidity}\n` +
    `🏦 *Market Cap:* ${stats.marketCap}\n` +
    `🔮 *FDV:* ${stats.fdv}\n` +
    `🔄 *24h Txns:* ${stats.txns24h}\n` +
    `🏪 *DEX:* ${stats.dexName}\n\n` +
    `📡 [View on DexScreener](https://dexscreener.com/base/0x7a8137b5f3be0152b7e62cdcdf2e81ec03cb3f95)`
  );
}

export function formatBachiPrice(stats: TokenStats): string {
  const changeEmoji =
    parseFloat(stats.priceChange24h ?? "0") >= 0 ? "🟢" : "🔴";
  return (
    `💰 *BACHI Price*\n\n` +
    `*${stats.priceUsd}* ${changeEmoji} ${stats.priceChange24h}% (24h)\n\n` +
    `📡 [View on DexScreener](https://dexscreener.com/base/0x7a8137b5f3be0152b7e62cdcdf2e81ec03cb3f95)\n` +
    `🛒 [Trade BACHI](https://dexscreener.com/base/0x7a8137b5f3be0152b7e62cdcdf2e81ec03cb3f95)`
  );
}

export function formatKachiInfo(): string {
  return (
    `🌟 *KACHI Token Info & Price*\n\n` +
    `KACHI is a KRC-20 token on the Kaspa network.\n\n` +
    `💹 *Live Price & Chart:*\n` +
    `👉 [kaspa.com/tokens/marketplace/token/KACHI](${KACHI_MARKETPLACE_URL})\n\n` +
    `🛒 *Buy KACHI:*\n` +
    `👉 [Open KACHI Marketplace](${KACHI_MARKETPLACE_URL})\n\n` +
    `_Tap the link above to see real-time price, volume, and to buy directly on the Kaspa marketplace._`
  );
}

export function formatKachiPrice(): string {
  return (
    `💰 *KACHI Price & Buy*\n\n` +
    `Get the latest KACHI price and buy directly here:\n\n` +
    `👉 [kaspa.com/tokens/marketplace/token/KACHI](${KACHI_MARKETPLACE_URL})\n\n` +
    `_The link above has live price, 24h stats, and the buy button — all in one place._`
  );
}
