import { Telegraf } from "telegraf";
import { message } from "telegraf/filters";
import cron from "node-cron";
import { logger } from "../lib/logger";
import {
  fetchBachiStats,
  formatBachiStats,
  formatBachiPrice,
  formatKachiInfo,
  formatKachiPrice,
} from "./price";
import { getNextKachiMessage, getNextBachiMessage } from "./motivational";
import { registerGroup, unregisterGroup, getGroups, type TokenType } from "./registry";
import { getAIResponse, clearUserHistory } from "./chat";

const PREVIEW_OPTS = { parse_mode: "Markdown" as const, link_preview_options: { is_disabled: true } };
const MD_OPTS = { parse_mode: "Markdown" as const };

const GREETINGS = [
  "hello","hi","hey","sup","yo","gm","good morning","good evening",
  "good afternoon","good night","howdy","hiya","what's up","whats up",
  "wassup","morning","evening","night","afternoon","hola","heya","greetings",
];

const GREETING_REPLIES = [
  "Hey hey! 👋 What's good fam?",
  "Gm gm! ☀️ Ready to serve.",
  "Yo! 🤙 Your friendly neighbourhood crypto bot checking in.",
  "Hey! 🙌 I don't sleep, I don't eat, but I DO track prices 😄",
  "Sup fren! 🫡 The market may be rough but I'm full of energy.",
  "Good vibes incoming ✨ What do you need?",
  "Hey! I was just staring at charts — perfect timing 😂",
  "Gm! Still holding? 💎 Good. What's up?",
  "Wassup! 🚀 I'm locked in. Are you?",
  "Heya! Diamond hands club — how can I help? 💎",
  "Yo yo yo! 🎉 The bot is online and caffeinated.",
  "Hello fren! 👀 Ready to talk crypto and keep vibes high.",
];

function detectToken(text: string): "kachi" | "bachi" | "both" | null {
  const l = text.toLowerCase();
  const k = l.includes("kachi"), b = l.includes("bachi");
  if (k && b) return "both";
  if (k) return "kachi";
  if (b) return "bachi";
  return null;
}

function detectIntent(text: string): "price" | "buy" | "stats" | "greeting" | "chat" {
  const l = text.toLowerCase();
  if (GREETINGS.some((g) => l === g || l.startsWith(g + " ") || l.startsWith(g + "!") || l.startsWith(g + ","))) return "greeting";
  if (l.includes("buy") || l.includes("purchase") || l.includes("where to buy") || l.includes("how to buy") || l.includes("get some")) return "buy";
  if (l.includes("price") || l.includes("how much") || l.includes("cost") || l.includes("worth") || l.includes("value") || l.includes("rate")) return "price";
  if (
    l.includes("stat") || l.includes("volume") || l.includes("market cap") ||
    l.includes("mcap") || l.includes("fdv") || l.includes("liquidity") ||
    l.includes("info") || l.includes("detail") || l.includes("data") ||
    l.includes("chart") || l.includes("number")
  ) return "stats";
  return "chat";
}

function isRelevantMessage(text: string): boolean {
  const l = text.toLowerCase();
  const keywords = [
    "buy","price","stat","kachi","bachi","info",
    "hello","hi","hey","sup","yo","gm","morning","evening","howdy","hiya",
    "how much","market cap","volume","liquidity","fdv","token",
    "purchase","trade","chart","dex","worth","cost",
    "pump","moon","hold","hodl","wen","ngmi","wagmi","diamond","hands",
    "fren","ser","degen","ape","rekt","bullish","bearish","mooning",
    "rate","value","number","data","detail",
  ];
  return keywords.some((kw) => l.includes(kw));
}

async function isAdmin(bot: Telegraf, chatId: number, userId: number): Promise<boolean> {
  try {
    const member = await bot.telegram.getChatMember(chatId, userId);
    return member.status === "administrator" || member.status === "creator";
  } catch {
    return false;
  }
}

export function createBot(token: string) {
  const bot = new Telegraf(token);

  bot.command("start", async (ctx) => {
    await ctx.reply(
      `👋 *Hey there! I'm your KACHI & BACHI community bot.*\n\n` +
      `I track prices, deliver stats, and keep the community spirit high 24/7.\n\n` +
      `*Commands that always work:*\n` +
      `• /kachi — KACHI info & buy link\n` +
      `• /bachi — Live BACHI stats\n` +
      `• /price — Quick price check for both tokens\n` +
      `• /stats — Full stats breakdown\n` +
      `• /help — Full command list\n\n` +
      `*For group admins:*\n` +
      `• /register kachi — Auto 3-hour KACHI community boosts\n` +
      `• /register bachi — Auto 3-hour BACHI community boosts\n\n` +
      `_Or just talk to me — I'm fluent in crypto and sarcasm_ 😄`,
      MD_OPTS
    );
  });

  bot.command("help", async (ctx) => {
    await ctx.reply(
      `🤖 *Bot Commands*\n\n` +
      `*/kachi* — KACHI token info & marketplace link\n` +
      `*/bachi* — Live BACHI stats from DexScreener\n` +
      `*/price* — Price overview for both tokens\n` +
      `*/stats* — Full stats for both tokens\n` +
      `*/groupstatus* — Check this group's broadcast status\n` +
      `*/newchat* — Reset your conversation with me\n\n` +
      `*Admin commands:*\n` +
      `*/register kachi* — Enrol group in 3-hour KACHI broadcasts\n` +
      `*/register bachi* — Enrol group in 3-hour BACHI broadcasts\n` +
      `*/unregister kachi* — Remove from KACHI broadcasts\n` +
      `*/unregister bachi* — Remove from BACHI broadcasts\n\n` +
      `💡 *Tip:* Make me a group admin or disable group privacy in @BotFather so I can respond to keywords like "price", "buy", "stats" without being @mentioned.`,
      MD_OPTS
    );
  });

  bot.command("kachi", async (ctx) => {
    await ctx.reply(formatKachiInfo(), PREVIEW_OPTS);
  });

  bot.command("bachi", async (ctx) => {
    const stats = await fetchBachiStats();
    if (!stats) {
      await ctx.reply(
        "Couldn't reach DexScreener right now 😬 Check directly:\nhttps://dexscreener.com/base/0x7a8137b5f3be0152b7e62cdcdf2e81ec03cb3f95"
      );
      return;
    }
    await ctx.reply(formatBachiStats(stats), PREVIEW_OPTS);
  });

  bot.command("price", async (ctx) => {
    const stats = await fetchBachiStats();
    const bachiPart = stats
      ? formatBachiPrice(stats)
      : `BACHI: [View on DexScreener](https://dexscreener.com/base/0x7a8137b5f3be0152b7e62cdcdf2e81ec03cb3f95)`;
    await ctx.reply(
      `*💰 Live Token Prices*\n\n━━━━━━━━━━━━\n🟡 *KACHI*\n${formatKachiPrice()}\n\n━━━━━━━━━━━━\n🔵 *BACHI*\n${bachiPart}`,
      PREVIEW_OPTS
    );
  });

  bot.command("stats", async (ctx) => {
    const stats = await fetchBachiStats();
    const bachiPart = stats
      ? formatBachiStats(stats)
      : `BACHI: [View on DexScreener](https://dexscreener.com/base/0x7a8137b5f3be0152b7e62cdcdf2e81ec03cb3f95)`;
    await ctx.reply(
      `📊 *Community Token Stats*\n\n━━━━━━━━━━━━\n🟡 *KACHI*\n${formatKachiInfo()}\n\n━━━━━━━━━━━━\n🔵 *BACHI*\n${bachiPart}`,
      PREVIEW_OPTS
    );
  });

  bot.command("newchat", async (ctx) => {
    if (!ctx.from) return;
    clearUserHistory(ctx.chat.id, ctx.from.id);
    await ctx.reply("Fresh start! 🧹 What's on your mind?");
  });

  bot.command("groupstatus", async (ctx) => {
    const chatId = String(ctx.chat.id);
    const inKachi = getGroups("kachi").includes(chatId);
    const inBachi = getGroups("bachi").includes(chatId);

    const stats = await fetchBachiStats();
    const bachiLine = stats
      ? `Price: *${stats.priceUsd}* ${parseFloat(stats.priceChange24h ?? "0") >= 0 ? "🟢" : "🔴"} ${stats.priceChange24h}% | Vol: ${stats.volume24h}`
      : `Check live: [DexScreener](https://dexscreener.com/base/0x7a8137b5f3be0152b7e62cdcdf2e81ec03cb3f95)`;

    const header = `📋 *Group Broadcast Status*\n\n` +
      `🟡 *KACHI* — ${inKachi ? "✅ Registered (broadcasts every 3h)" : "❌ Not registered"}\n` +
      `🔵 *BACHI* — ${inBachi ? "✅ Registered (broadcasts every 3h)" : "❌ Not registered"}\n\n`;

    const tokenInfo = `*Latest Token Snapshot:*\n` +
      `🟡 KACHI → [kaspa.com Marketplace](https://kaspa.com/tokens/marketplace/token/KACHI)\n` +
      `🔵 BACHI → ${bachiLine}\n\n`;

    const tip = (inKachi || inBachi)
      ? `_Use /unregister kachi or /unregister bachi to opt out._`
      : `_Use /register kachi or /register bachi to get 3-hour community boosts._`;

    await ctx.reply(header + tokenInfo + tip, PREVIEW_OPTS);
  });

  bot.command("register", async (ctx) => {
    const from = ctx.from;
    if (!from) return;

    const chatType = ctx.chat.type;
    if (chatType === "private") {
      await ctx.reply("This command is for groups only — add me to a group first! 😄");
      return;
    }

    const admin = await isAdmin(bot, ctx.chat.id, from.id);
    if (!admin) {
      await ctx.reply("⛔ Only group admins can register this group. Nice try though 😅");
      return;
    }

    const tokenArg = ctx.message.text.split(" ")[1]?.toLowerCase();
    if (tokenArg !== "kachi" && tokenArg !== "bachi") {
      await ctx.reply(
        `❓ Which token?\n\n\`/register kachi\` — for KACHI community broadcasts\n\`/register bachi\` — for BACHI community broadcasts`,
        MD_OPTS
      );
      return;
    }

    const chatTitle = (ctx.chat as any).title ?? "this group";
    const result = registerGroup(ctx.chat.id, tokenArg as TokenType);

    if (result === "already") {
      await ctx.reply(
        `✅ *${chatTitle}* is already registered for ${tokenArg.toUpperCase()} — motivational drops are flowing every 3 hours 💎`,
        MD_OPTS
      );
    } else {
      await ctx.reply(
        `🎉 *${chatTitle}* is now officially a *${tokenArg.toUpperCase()}* community!\n\n` +
        `Every 3 hours I'll drop a motivational message to keep the vibes alive through this market 💎🙌\n\n` +
        `_Use \`/unregister ${tokenArg}\` to opt out anytime._`,
        MD_OPTS
      );
    }
  });

  bot.command("unregister", async (ctx) => {
    const from = ctx.from;
    if (!from) return;

    const admin = await isAdmin(bot, ctx.chat.id, from.id);
    if (!admin) {
      await ctx.reply("⛔ Only group admins can do that.");
      return;
    }

    const tokenArg = ctx.message.text.split(" ")[1]?.toLowerCase();
    if (tokenArg !== "kachi" && tokenArg !== "bachi") {
      await ctx.reply(`❓ Usage:\n\`/unregister kachi\` or \`/unregister bachi\``, MD_OPTS);
      return;
    }

    const chatTitle = (ctx.chat as any).title ?? "this group";
    const result = unregisterGroup(ctx.chat.id, tokenArg as TokenType);

    if (result === "not_found") {
      await ctx.reply(
        `ℹ️ *${chatTitle}* wasn't registered for ${tokenArg.toUpperCase()} broadcasts — nothing to remove!`,
        MD_OPTS
      );
    } else {
      await ctx.reply(
        `✅ Removed *${chatTitle}* from *${tokenArg.toUpperCase()}* broadcasts. Re-register anytime with \`/register ${tokenArg}\``,
        MD_OPTS
      );
    }
  });

  // Natural language message handler
  bot.on(message("text"), async (ctx) => {
    const text = ctx.message.text.trim();
    const chatType = ctx.chat.type;
    const botUsername = ctx.botInfo?.username ?? "";
    const from = ctx.from;
    if (!from) return;

    // Skip commands (handled above)
    if (text.startsWith("/")) return;

    const isMentioned =
      text.includes(`@${botUsername}`) ||
      (ctx.message.reply_to_message as any)?.from?.username === botUsername;
    const isPrivate = chatType === "private";

    // In groups: respond to @mentions, replies to bot, or relevant keywords
    // (requires privacy mode off in BotFather or bot to be admin)
    if (!isPrivate && !isMentioned && !isRelevantMessage(text)) return;

    const cleanText = text.replace(`@${botUsername}`, "").trim();
    const intent = detectIntent(cleanText);
    const token = detectToken(cleanText);

    // Greeting — no token context
    if (intent === "greeting" && !token) {
      const reply = GREETING_REPLIES[Math.floor(Math.random() * GREETING_REPLIES.length)]!;
      await ctx.reply(reply);
      return;
    }

    // Both tokens
    if (token === "both" && (intent === "price" || intent === "buy" || intent === "stats")) {
      const stats = await fetchBachiStats();
      const bachiPart = stats
        ? (intent === "stats" ? formatBachiStats(stats) : formatBachiPrice(stats))
        : `BACHI: [DexScreener](https://dexscreener.com/base/0x7a8137b5f3be0152b7e62cdcdf2e81ec03cb3f95)`;
      await ctx.reply(
        `📊 *Both Tokens*\n\n━━━━━━━━━━━━\n🟡 *KACHI*\n${intent === "stats" ? formatKachiInfo() : formatKachiPrice()}\n\n━━━━━━━━━━━━\n🔵 *BACHI*\n${bachiPart}`,
        PREVIEW_OPTS
      );
      return;
    }

    // KACHI
    if (token === "kachi") {
      if (intent === "stats") {
        await ctx.reply(formatKachiInfo(), PREVIEW_OPTS);
      } else if (intent === "buy") {
        await ctx.reply(formatKachiPrice(), PREVIEW_OPTS);
      } else {
        await ctx.reply(formatKachiPrice(), PREVIEW_OPTS);
      }
      return;
    }

    // BACHI
    if (token === "bachi") {
      const stats = await fetchBachiStats();
      if (!stats) {
        await ctx.reply(
          "Couldn't fetch BACHI data right now 😬 Check directly: https://dexscreener.com/base/0x7a8137b5f3be0152b7e62cdcdf2e81ec03cb3f95"
        );
        return;
      }
      if (intent === "stats") {
        await ctx.reply(formatBachiStats(stats), PREVIEW_OPTS);
      } else if (intent === "buy") {
        await ctx.reply(
          `🛒 *Buy BACHI*\n\nPrice: *${stats.priceUsd}*\n\n👉 [Trade on DexScreener](https://dexscreener.com/base/0x7a8137b5f3be0152b7e62cdcdf2e81ec03cb3f95)\n\n_Use a Base-compatible wallet like MetaMask or Coinbase Wallet._`,
          PREVIEW_OPTS
        );
      } else {
        await ctx.reply(formatBachiPrice(stats), PREVIEW_OPTS);
      }
      return;
    }

    // General intent without specific token — show both
    if (intent === "price" || intent === "buy" || intent === "stats") {
      const stats = await fetchBachiStats();
      const bachiPart = stats
        ? (intent === "stats" ? formatBachiStats(stats) : formatBachiPrice(stats))
        : `BACHI: [DexScreener](https://dexscreener.com/base/0x7a8137b5f3be0152b7e62cdcdf2e81ec03cb3f95)`;
      await ctx.reply(
        `📊 *Token Overview*\n\n━━━━━━━━━━━━\n🟡 *KACHI*\n${intent === "stats" ? formatKachiInfo() : formatKachiPrice()}\n\n━━━━━━━━━━━━\n🔵 *BACHI*\n${bachiPart}`,
        PREVIEW_OPTS
      );
      return;
    }

    // Fallback: AI conversation
    const aiReply = await getAIResponse(ctx.chat.id, from.id, cleanText);
    await ctx.reply(aiReply);
  });

  // Welcome message when bot is added to a group
  bot.on("my_chat_member", async (ctx) => {
    const update = ctx.myChatMember;
    const newStatus = update.new_chat_member.status;
    const chat = ctx.chat;

    if ((newStatus === "member" || newStatus === "administrator") && chat.type !== "private") {
      const title = (chat as any).title ?? "this group";

      // Fetch live stats to show immediately
      const bachiStats = await fetchBachiStats();
      const bachiSnap = bachiStats
        ? `💰 ${bachiStats.priceUsd} ${parseFloat(bachiStats.priceChange24h ?? "0") >= 0 ? "🟢" : "🔴"} ${bachiStats.priceChange24h}% | Vol: ${bachiStats.volume24h} | MCap: ${bachiStats.marketCap}`
        : `[Live data →](https://dexscreener.com/base/0x7a8137b5f3be0152b7e62cdcdf2e81ec03cb3f95)`;

      await ctx.reply(
        `👋 *Hey ${title}!* Thanks for having me.\n\n` +
        `I'm your *KACHI & BACHI community bot* — live stats, price info, and 3-hour motivational drops to keep the community strong 💎\n\n` +
        `*📊 Current Snapshot:*\n` +
        `🟡 *KACHI* → [kaspa.com Marketplace](https://kaspa.com/tokens/marketplace/token/KACHI)\n` +
        `🔵 *BACHI* → ${bachiSnap}\n\n` +
        `*Commands that work right now:*\n` +
        `/kachi /bachi /price /stats\n\n` +
        `*To activate 3-hour community broadcasts:*\n` +
        `\`/register kachi\` or \`/register bachi\` _(admins only)_\n\n` +
        `_For me to respond to keywords like "price", "buy", "stats" in group chat — make me an admin or turn off Group Privacy in @BotFather._`,
        { parse_mode: "Markdown", link_preview_options: { is_disabled: true } }
      );
    }
  });

  bot.catch((err: any, ctx) => {
    logger.error({ err: err?.message ?? err, chatId: ctx.chat?.id }, "Bot error");
  });

  function startScheduler() {
    cron.schedule("0 */3 * * *", async () => {
      logger.info("Running 3-hour motivational broadcast");

      for (const groupId of getGroups("kachi")) {
        try {
          const msg = getNextKachiMessage(groupId);
          await bot.telegram.sendMessage(groupId, msg, { parse_mode: "Markdown" });
          logger.info({ groupId }, "Sent KACHI motivational message");
        } catch (err: any) {
          logger.error({ err: err?.message, groupId }, "Failed KACHI message — removing stale group");
          unregisterGroup(groupId, "kachi");
        }
      }

      for (const groupId of getGroups("bachi")) {
        try {
          const msg = getNextBachiMessage(groupId);
          await bot.telegram.sendMessage(groupId, msg, { parse_mode: "Markdown" });
          logger.info({ groupId }, "Sent BACHI motivational message");
        } catch (err: any) {
          logger.error({ err: err?.message, groupId }, "Failed BACHI message — removing stale group");
          unregisterGroup(groupId, "bachi");
        }
      }
    });

    logger.info("3-hour motivational scheduler started");
  }

  return { bot, startScheduler };
}
