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
import {
  registerGroup,
  unregisterGroup,
  getGroups,
  type TokenType,
} from "./registry";

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
  if (
    lower.includes("buy") || lower.includes("purchase") ||
    lower.includes("get some") || lower.includes("where to buy")
  ) return "buy";
  if (
    lower.includes("price") || lower.includes("how much") ||
    lower.includes("cost") || lower.includes("worth") || lower.includes("value")
  ) return "price";
  if (
    lower.includes("stat") || lower.includes("info") || lower.includes("detail") ||
    lower.includes("data") || lower.includes("volume") || lower.includes("market cap") ||
    lower.includes("mcap") || lower.includes("fdv") || lower.includes("liquidity")
  ) return "stats";
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

async function isAdminOrCreator(ctx: Context, userId: number): Promise<boolean> {
  try {
    const chat = ctx.chat;
    if (!chat) return false;
    if (chat.type === "private") return true;
    const member = await ctx.telegram.getChatMember(chat.id, userId);
    return member.status === "administrator" || member.status === "creator";
  } catch {
    return false;
  }
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
      `*Quick Commands:*\n` +
      `• /kachi — KACHI info & buy link\n` +
      `• /bachi — Live BACHI stats\n` +
      `• /price — Token prices\n` +
      `• /stats — Full token stats\n` +
      `• /help — All commands\n\n` +
      `*For group admins:*\n` +
      `• /register kachi — Register this group as a KACHI community\n` +
      `• /register bachi — Register this group as a BACHI community\n\n` +
      `_I also send motivational messages every 3 hours to registered groups! 💎_`
    );
  });

  bot.command("help", async (ctx) => {
    await ctx.replyWithMarkdown(
      `🤖 *Bot Commands*\n\n` +
      `*/kachi* — KACHI price link & token info\n` +
      `*/bachi* — Live BACHI stats from DexScreener\n` +
      `*/price* — Price info for both tokens\n` +
      `*/stats* — Full token stats\n\n` +
      `*Admin-only:*\n` +
      `*/register kachi* — Add this group to KACHI broadcasts\n` +
      `*/register bachi* — Add this group to BACHI broadcasts\n` +
      `*/unregister kachi* — Remove from KACHI broadcasts\n` +
      `*/unregister bachi* — Remove from BACHI broadcasts\n` +
      `*/groupstatus* — See this group's registration\n\n` +
      `_Or just type naturally — say "kachi price", "buy bachi", "stats" etc. and I'll respond!_`
    );
  });

  bot.command("register", async (ctx) => {
    const from = ctx.from;
    if (!from) return;

    const isAdmin = await isAdminOrCreator(ctx, from.id);
    if (!isAdmin) {
      await ctx.reply("⛔ Only group admins can register this group.");
      return;
    }

    const args = ctx.message.text.split(" ").slice(1);
    const tokenArg = args[0]?.toLowerCase();

    if (tokenArg !== "kachi" && tokenArg !== "bachi") {
      await ctx.replyWithMarkdown(
        `❓ *Usage:*\n` +
        `\`/register kachi\` — Register as a KACHI community\n` +
        `\`/register bachi\` — Register as a BACHI community`
      );
      return;
    }

    const chatId = ctx.chat.id;
    const chatTitle = (ctx.chat as any).title ?? "this group";
    const result = registerGroup(chatId, tokenArg as TokenType);

    if (result === "already") {
      await ctx.replyWithMarkdown(
        `✅ *${chatTitle}* is already registered as a *${tokenArg.toUpperCase()}* community.\n\n` +
        `Motivational messages are already being sent here every 3 hours. 💎`
      );
    } else {
      await ctx.replyWithMarkdown(
        `🎉 *Success!* This group is now registered as a *${tokenArg.toUpperCase()}* community.\n\n` +
        `I'll send motivational messages here every *3 hours* to keep the community strong. 💎🙌\n\n` +
        `_Use \`/unregister ${tokenArg}\` to remove this group from broadcasts._`
      );
      logger.info({ chatId, token: tokenArg }, "Group registered via command");
    }
  });

  bot.command("unregister", async (ctx) => {
    const from = ctx.from;
    if (!from) return;

    const isAdmin = await isAdminOrCreator(ctx, from.id);
    if (!isAdmin) {
      await ctx.reply("⛔ Only group admins can unregister this group.");
      return;
    }

    const args = ctx.message.text.split(" ").slice(1);
    const tokenArg = args[0]?.toLowerCase();

    if (tokenArg !== "kachi" && tokenArg !== "bachi") {
      await ctx.replyWithMarkdown(
        `❓ *Usage:*\n` +
        `\`/unregister kachi\` — Remove from KACHI broadcasts\n` +
        `\`/unregister bachi\` — Remove from BACHI broadcasts`
      );
      return;
    }

    const chatId = ctx.chat.id;
    const chatTitle = (ctx.chat as any).title ?? "this group";
    const result = unregisterGroup(chatId, tokenArg as TokenType);

    if (result === "not_found") {
      await ctx.replyWithMarkdown(
        `ℹ️ *${chatTitle}* is not registered as a *${tokenArg.toUpperCase()}* community.\n` +
        `Use \`/register ${tokenArg}\` to add it.`
      );
    } else {
      await ctx.replyWithMarkdown(
        `✅ *${chatTitle}* has been removed from *${tokenArg.toUpperCase()}* broadcasts.\n\n` +
        `No more motivational messages will be sent here. You can re-register anytime with \`/register ${tokenArg}\`.`
      );
    }
  });

  bot.command("groupstatus", async (ctx) => {
    const chatId = String(ctx.chat.id);
    const kachiGroups = getGroups("kachi");
    const bachiGroups = getGroups("bachi");
    const inKachi = kachiGroups.includes(chatId);
    const inBachi = bachiGroups.includes(chatId);

    if (!inKachi && !inBachi) {
      await ctx.replyWithMarkdown(
        `📋 *Group Status*\n\n` +
        `This group is *not registered* for any broadcasts.\n\n` +
        `Use:\n` +
        `• \`/register kachi\` to join KACHI community broadcasts\n` +
        `• \`/register bachi\` to join BACHI community broadcasts`
      );
    } else {
      const lines: string[] = [`📋 *Group Registration Status*\n`];
      if (inKachi) lines.push(`🟡 *KACHI* — ✅ Registered (receiving 3-hour broadcasts)`);
      else lines.push(`🟡 *KACHI* — ❌ Not registered`);
      if (inBachi) lines.push(`🔵 *BACHI* — ✅ Registered (receiving 3-hour broadcasts)`);
      else lines.push(`🔵 *BACHI* — ❌ Not registered`);
      await ctx.replyWithMarkdown(lines.join("\n"));
    }
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

    if (text.startsWith("/")) return;

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

  bot.catch((err, ctx) => {
    logger.error({ err, chatId: ctx.chat?.id }, "Bot error");
  });

  function startScheduler() {
    cron.schedule("0 */3 * * *", async () => {
      logger.info("Running 3-hour motivational broadcast");

      const kachiGroups = getGroups("kachi");
      const bachiGroups = getGroups("bachi");

      for (const groupId of kachiGroups) {
        try {
          await bot.telegram.sendMessage(groupId, getRandomKachiMessage(), {
            parse_mode: "Markdown",
          });
          logger.info({ groupId }, "Sent KACHI motivational message");
        } catch (err) {
          logger.error({ err, groupId }, "Failed to send KACHI message — removing stale group");
          unregisterGroup(groupId, "kachi");
        }
      }

      for (const groupId of bachiGroups) {
        try {
          await bot.telegram.sendMessage(groupId, getRandomBachiMessage(), {
            parse_mode: "Markdown",
          });
          logger.info({ groupId }, "Sent BACHI motivational message");
        } catch (err) {
          logger.error({ err, groupId }, "Failed to send BACHI message — removing stale group");
          unregisterGroup(groupId, "bachi");
        }
      }

      logger.info(
        { kachiCount: kachiGroups.length, bachiCount: bachiGroups.length },
        "Motivational broadcast complete"
      );
    });

    logger.info("3-hour motivational scheduler started");
  }

  return { bot, startScheduler };
}
