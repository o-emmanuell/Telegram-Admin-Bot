import { Telegraf, Context } from "telegraf";
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
import { getRandomKachiMessage, getRandomBachiMessage } from "./motivational";

const KACHI_GROUP_IDS = (process.env["KACHI_GROUP_IDS"] ?? "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

const BACHI_GROUP_IDS = (process.env["BACHI_GROUP_IDS"] ?? "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

const greetings = [
  "hello", "hi", "hey", "sup", "yo", "gm", "good morning",
  "good evening", "good afternoon", "good night", "howdy", "hiya",
  "what's up", "whats up", "wassup", "morning", "evening",
];

const greetingReplies = [
  "Hey hey! 👋 What's good fam? Ask me about price, stats, or just vibe with the community 😄",
  "Gm gm! ☀️ The bot is awake and ready to serve. What do you need?",
  "Yo! 🤙 Your friendly neighbourhood community bot, reporting for duty.",
  "Hey there! 🙌 I don't sleep, I don't eat, but I DO track prices. What can I help with?",
  "👋 Hiii! Need token stats? Price updates? Or just wanted to say hi? Either way, I'm here 😅",
  "Sup! 🫡 The market may be quiet but I'm very much awake. Ask me anything!",
  "Good vibes incoming ✨ What do you need from me today?",
  "Hey fam! I was just sitting here watching charts so your timing is perfect 😂 What's up?",
];

function randomGreeting(): string {
  return greetingReplies[Math.floor(Math.random() * greetingReplies.length)]!;
}

function detectToken(text: string): "kachi" | "bachi" | "both" | null {
  const lower = text.toLowerCase();
  const hasKachi = lower.includes("kachi");
  const hasBachi = lower.includes("bachi");
  if (hasKachi && hasBachi) return "both";
  if (hasKachi) return "kachi";
  if (hasBachi) return "bachi";
  return null;
}

function detectIntent(text: string): "price" | "buy" | "stats" | "greeting" | "unknown" {
  const lower = text.toLowerCase();
  if (greetings.some((g) => lower.includes(g))) return "greeting";
  if (lower.includes("buy") || lower.includes("purchase") || lower.includes("get some") || lower.includes("where to buy")) return "buy";
  if (lower.includes("price") || lower.includes("how much") || lower.includes("cost") || lower.includes("worth") || lower.includes("value")) return "price";
  if (lower.includes("stat") || lower.includes("info") || lower.includes("detail") || lower.includes("data") || lower.includes("volume") || lower.includes("market cap") || lower.includes("mcap") || lower.includes("fdv") || lower.includes("liquidity")) return "stats";
  return "unknown";
}

function isRelevantMessage(text: string): boolean {
  const lower = text.toLowerCase();
  const keywords = [
    "buy", "price", "stats", "stat", "kachi", "bachi", "info",
    "hello", "hi", "hey", "sup", "yo", "gm", "morning", "evening",
    "how much", "where", "market cap", "volume", "liquidity", "fdv",
    "token", "purchase", "trade", "chart", "dex",
  ];
  return keywords.some((kw) => lower.includes(kw));
}

async function handleTokenQuery(
  ctx: Context,
  token: "kachi" | "bachi" | "both",
  intent: "price" | "buy" | "stats" | "greeting" | "unknown"
) {
  if (token === "both") {
    await ctx.reply("Sure! Which one are you asking about — KACHI or BACHI? 😊");
    return;
  }

  if (token === "kachi") {
    if (intent === "stats" || intent === "unknown") {
      await ctx.replyWithMarkdown(formatKachiInfo(), { disable_web_page_preview: true } as any);
    } else {
      await ctx.replyWithMarkdown(formatKachiPrice(), { disable_web_page_preview: true } as any);
    }
    return;
  }

  if (token === "bachi") {
    const stats = await fetchBachiStats();
    if (!stats) {
      await ctx.reply(
        "Hmm, couldn't fetch BACHI stats right now. Check directly:\n🔗 https://dexscreener.com/base/0x7a8137b5f3be0152b7e62cdcdf2e81ec03cb3f95"
      );
      return;
    }

    if (intent === "stats") {
      await ctx.replyWithMarkdown(formatBachiStats(stats), { disable_web_page_preview: true } as any);
    } else if (intent === "buy") {
      await ctx.replyWithMarkdown(
        `🛒 *Buy BACHI*\n\n` +
        `Price: *${stats.priceUsd}*\n\n` +
        `👉 [Trade on DexScreener](https://dexscreener.com/base/0x7a8137b5f3be0152b7e62cdcdf2e81ec03cb3f95)\n\n` +
        `_Use a Base-compatible wallet like MetaMask or Coinbase Wallet._`,
        { disable_web_page_preview: true } as any
      );
    } else {
      await ctx.replyWithMarkdown(formatBachiPrice(stats), { disable_web_page_preview: true } as any);
    }
  }
}

export function createBot(token: string) {
  const bot = new Telegraf(token);

  bot.command("start", async (ctx) => {
    await ctx.replyWithMarkdown(
      `👋 *Welcome! I'm your community sentinel bot.*\n\n` +
      `I track *KACHI* and *BACHI* tokens and keep the community informed.\n\n` +
      `*Commands you can use:*\n` +
      `• Just say "price", "buy", "stats" + token name\n` +
      `• /kachi — KACHI info & price link\n` +
      `• /bachi — BACHI live stats\n` +
      `• /help — show this message\n\n` +
      `_I also send motivational messages every 3 hours — stay strong! 💎_`
    );
  });

  bot.command("help", async (ctx) => {
    await ctx.replyWithMarkdown(
      `🤖 *Bot Commands*\n\n` +
      `*/kachi* — KACHI price link & token info\n` +
      `*/bachi* — Live BACHI stats from DexScreener\n` +
      `*/stats* — Combined stats prompt\n` +
      `*/price* — Price info for both tokens\n\n` +
      `Or just type naturally — mention *buy*, *price*, *stats*, or a token name anywhere in a message and I'll pick it up!`
    );
  });

  bot.command("kachi", async (ctx) => {
    await ctx.replyWithMarkdown(formatKachiInfo(), { disable_web_page_preview: true } as any);
  });

  bot.command("bachi", async (ctx) => {
    const stats = await fetchBachiStats();
    if (!stats) {
      await ctx.reply("Couldn't reach DexScreener right now. Try: https://dexscreener.com/base/0x7a8137b5f3be0152b7e62cdcdf2e81ec03cb3f95");
      return;
    }
    await ctx.replyWithMarkdown(formatBachiStats(stats), { disable_web_page_preview: true } as any);
  });

  bot.command("price", async (ctx) => {
    const stats = await fetchBachiStats();
    const bachiPart = stats
      ? formatBachiPrice(stats)
      : `*BACHI:* Check 👉 https://dexscreener.com/base/0x7a8137b5f3be0152b7e62cdcdf2e81ec03cb3f95`;
    await ctx.replyWithMarkdown(
      `*💰 Token Prices*\n\n━━━━━━━━━━━━\n🟡 *KACHI*\n${formatKachiPrice()}\n\n━━━━━━━━━━━━\n🔵 *BACHI*\n${bachiPart}`,
      { disable_web_page_preview: true } as any
    );
  });

  bot.command("stats", async (ctx) => {
    const stats = await fetchBachiStats();
    const bachiPart = stats
      ? formatBachiStats(stats)
      : `*BACHI:* Check 👉 https://dexscreener.com/base/0x7a8137b5f3be0152b7e62cdcdf2e81ec03cb3f95`;
    await ctx.replyWithMarkdown(
      `📊 *Community Token Stats*\n\n━━━━━━━━━━━━\n🟡 *KACHI*\n${formatKachiInfo()}\n\n━━━━━━━━━━━━\n🔵 *BACHI*\n${bachiPart}`,
      { disable_web_page_preview: true } as any
    );
  });

  bot.on(message("text"), async (ctx) => {
    const text = ctx.message.text;
    const chatType = ctx.chat.type;
    const botUsername = ctx.botInfo?.username ?? "";

    const isMentioned =
      text.includes(`@${botUsername}`) ||
      (ctx.message.reply_to_message as any)?.from?.username === botUsername;

    const isPrivate = chatType === "private";

    if (!isPrivate && !isMentioned && !isRelevantMessage(text)) return;

    const intent = detectIntent(text);
    const token = detectToken(text);

    if (intent === "greeting" && !token) {
      await ctx.reply(randomGreeting());
      return;
    }

    if (token) {
      await handleTokenQuery(ctx, token, intent);
      return;
    }

    if (intent === "price" || intent === "buy") {
      await ctx.replyWithMarkdown(
        `Which token are you asking about? 🤔\n\n` +
        `• *KACHI* — type "kachi price" or "kachi buy"\n` +
        `• *BACHI* — type "bachi price" or "bachi buy"`
      );
      return;
    }

    if (intent === "stats") {
      const stats = await fetchBachiStats();
      const bachiPart = stats
        ? formatBachiStats(stats)
        : `BACHI: https://dexscreener.com/base/0x7a8137b5f3be0152b7e62cdcdf2e81ec03cb3f95`;
      await ctx.replyWithMarkdown(
        `📊 *Token Stats*\n\n🟡 *KACHI:*\n${formatKachiInfo()}\n\n🔵 *BACHI:*\n${bachiPart}`,
        { disable_web_page_preview: true } as any
      );
    }
  });

  bot.on("chat_member", async (ctx) => {
    const update = ctx.update as any;
    const member = update.chat_member ?? update.my_chat_member;
    if (!member) return;
    const chatId = member.chat?.id;
    const newMember = member.new_chat_member;
    const botId = ctx.botInfo?.id;
    if (newMember?.user?.id === botId && newMember?.status === "member") {
      logger.info({ chatId }, "Bot added to group");
    }
  });

  bot.on("new_chat_members", async (ctx) => {
    const newMembers = ctx.message.new_chat_members;
    const botId = ctx.botInfo?.id;
    const isBotAdded = newMembers.some((m) => m.id === botId);
    if (!isBotAdded) return;
    logger.info({ chatId: ctx.chat.id }, "Bot added to new group");
  });

  bot.catch((err, ctx) => {
    logger.error({ err, chatId: ctx.chat?.id }, "Bot error");
  });

  function startScheduler() {
    cron.schedule("0 */3 * * *", async () => {
      logger.info("Sending 3-hour motivational messages");

      for (const groupId of KACHI_GROUP_IDS) {
        try {
          await bot.telegram.sendMessage(groupId, getRandomKachiMessage(), {
            parse_mode: "Markdown",
          });
          logger.info({ groupId }, "Sent KACHI motivational message");
        } catch (err) {
          logger.error({ err, groupId }, "Failed to send KACHI motivational message");
        }
      }

      for (const groupId of BACHI_GROUP_IDS) {
        try {
          await bot.telegram.sendMessage(groupId, getRandomBachiMessage(), {
            parse_mode: "Markdown",
          });
          logger.info({ groupId }, "Sent BACHI motivational message");
        } catch (err) {
          logger.error({ err, groupId }, "Failed to send BACHI motivational message");
        }
      }
    });

    logger.info("3-hour motivational message scheduler started");
  }

  return { bot, startScheduler };
}
