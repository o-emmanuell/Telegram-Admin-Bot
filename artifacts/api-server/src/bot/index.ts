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
import { getRandomKachiMessage, getRandomBachiMessage } from "./motivational";
import { registerGroup, unregisterGroup, getGroups, type TokenType } from "./registry";
import { getAIResponse, clearUserHistory } from "./chat";

const PREVIEW_OPTS = { parse_mode: "Markdown" as const, link_preview_options: { is_disabled: true } };
const MD_OPTS = { parse_mode: "Markdown" as const };

const GREETINGS = [
  "hello","hi","hey","sup","yo","gm","good morning","good evening",
  "good afternoon","good night","howdy","hiya","what's up","whats up",
  "wassup","morning","evening","night","afternoon",
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
  if (GREETINGS.some((g) => l === g || l.startsWith(g + " ") || l.startsWith(g + "!"))) return "greeting";
  if (l.includes("buy") || l.includes("purchase") || l.includes("where to buy") || l.includes("how to buy")) return "buy";
  if (l.includes("price") || l.includes("how much") || l.includes("cost") || l.includes("worth") || l.includes("value")) return "price";
  if (
    l.includes("stat") || l.includes("volume") || l.includes("market cap") ||
    l.includes("mcap") || l.includes("fdv") || l.includes("liquidity") ||
    l.includes("info") || l.includes("detail") || l.includes("data")
  ) return "stats";
  return "chat";
}

function isRelevantMessage(text: string): boolean {
  const l = text.toLowerCase();
  const keywords = [
    "buy","price","stat","kachi","bachi","info","hello","hi","hey","sup",
    "yo","gm","morning","evening","how much","market cap","volume","liquidity",
    "fdv","token","purchase","trade","chart","dex","worth","cost","pump",
    "moon","hold","hodl","wen","ngmi","wagmi","diamond","hands","fren","ser",
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
      `👋 *Hey there! I'm your community sentinel bot.*\n\n` +
      `I keep the KACHI and BACHI communities vibing — token stats, price info, and a little motivation when the market is being dramatic 🎭\n\n` +
      `*What I can do:*\n` +
      `• /kachi — KACHI info & buy link\n` +
      `• /bachi — Live BACHI stats\n` +
      `• /price — Quick price check\n` +
      `• /stats — Full token breakdown\n` +
      `• /help — Full command list\n\n` +
      `*For group admins:*\n` +
      `• /register kachi — Register for KACHI broadcasts\n` +
      `• /register bachi — Register for BACHI broadcasts\n\n` +
      `_Or just talk to me normally — I don't bite_ 😄`,
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
      `*/groupstatus* — Check this group's registration\n` +
      `*/newchat* — Reset your conversation with me\n\n` +
      `*Admin commands:*\n` +
      `*/register kachi* — Enrol group in KACHI broadcasts\n` +
      `*/register bachi* — Enrol group in BACHI broadcasts\n` +
      `*/unregister kachi* — Remove from KACHI broadcasts\n` +
      `*/unregister bachi* — Remove from BACHI broadcasts\n\n` +
      `_Or just type naturally — I understand plain English too_ 🧠`,
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
    const bachiPart = stats ? formatBachiPrice(stats) : `BACHI: https://dexscreener.com/base/0x7a8137b5f3be0152b7e62cdcdf2e81ec03cb3f95`;
    await ctx.reply(
      `*💰 Token Prices*\n\n━━━━━━━━━━━━\n🟡 *KACHI*\n${formatKachiPrice()}\n\n━━━━━━━━━━━━\n🔵 *BACHI*\n${bachiPart}`,
      PREVIEW_OPTS
    );
  });

  bot.command("stats", async (ctx) => {
    const stats = await fetchBachiStats();
    const bachiPart = stats ? formatBachiStats(stats) : `BACHI: https://dexscreener.com/base/0x7a8137b5f3be0152b7e62cdcdf2e81ec03cb3f95`;
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

    if (!inKachi && !inBachi) {
      await ctx.reply(
        `📋 *Group Status*\n\nNot registered for any broadcasts yet.\n\n` +
        `• \`/register kachi\` — join KACHI community broadcasts\n` +
        `• \`/register bachi\` — join BACHI community broadcasts`,
        MD_OPTS
      );
    } else {
      await ctx.reply(
        `📋 *Group Registration Status*\n\n` +
        `🟡 *KACHI* — ${inKachi ? "✅ Registered (3-hour broadcasts active)" : "❌ Not registered"}\n` +
        `🔵 *BACHI* — ${inBachi ? "✅ Registered (3-hour broadcasts active)" : "❌ Not registered"}`,
        MD_OPTS
      );
    }
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
        `❓ Which token?\n\n\`/register kachi\` — for KACHI community\n\`/register bachi\` — for BACHI community`,
        MD_OPTS
      );
      return;
    }

    const chatTitle = (ctx.chat as any).title ?? "this group";
    const result = registerGroup(ctx.chat.id, tokenArg as TokenType);

    if (result === "already") {
      await ctx.reply(
        `✅ *${chatTitle}* is already a registered ${tokenArg.toUpperCase()} community — motivational drops are already flowing every 3 hours 💎`,
        MD_OPTS
      );
    } else {
      await ctx.reply(
        `🎉 *${chatTitle}* is now officially a *${tokenArg.toUpperCase()}* community!\n\n` +
        `Every 3 hours I'll drop a motivational message to keep the community spirit alive through this market 💎🙌\n\n` +
        `_Use \`/unregister ${tokenArg}\` if you ever want to opt out._`,
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
      await ctx.reply(
        `❓ Usage:\n\`/unregister kachi\` or \`/unregister bachi\``,
        MD_OPTS
      );
      return;
    }

    const chatTitle = (ctx.chat as any).title ?? "this group";
    const result = unregisterGroup(ctx.chat.id, tokenArg as TokenType);

    if (result === "not_found") {
      await ctx.reply(
        `ℹ️ *${chatTitle}* wasn't registered for ${tokenArg.toUpperCase()} broadcasts. Nothing to remove!`,
        MD_OPTS
      );
    } else {
      await ctx.reply(
        `✅ Removed *${chatTitle}* from *${tokenArg.toUpperCase()}* broadcasts. You can re-register anytime with \`/register ${tokenArg}\``,
        MD_OPTS
      );
    }
  });

  bot.on(message("text"), async (ctx) => {
    const text = ctx.message.text.trim();
    const chatType = ctx.chat.type;
    const botUsername = ctx.botInfo?.username ?? "";
    const from = ctx.from;
    if (!from) return;

    if (text.startsWith("/")) return;

    const isMentioned =
      text.includes(`@${botUsername}`) ||
      (ctx.message.reply_to_message as any)?.from?.username === botUsername;
    const isPrivate = chatType === "private";

    if (!isPrivate && !isMentioned && !isRelevantMessage(text)) return;

    const cleanText = text.replace(`@${botUsername}`, "").trim();
    const intent = detectIntent(cleanText);
    const token = detectToken(cleanText);

    if (intent === "greeting" && !token) {
      const replies = [
        "Hey hey! 👋 What's good fam?",
        "Gm gm! ☀️ Ready to serve.",
        "Yo! 🤙 Your friendly neighbourhood crypto bot checking in.",
        "Hey! 🙌 I don't sleep, I don't eat, but I DO track prices 😄",
        "Sup fren! 🫡 The market may be rough but I'm full of energy.",
        "Good vibes incoming ✨ What do you need?",
        "Hey! I was just staring at charts — perfect timing 😂",
        "Gm! Still holding? 💎 Good. What's up?",
      ];
      await ctx.reply(replies[Math.floor(Math.random() * replies.length)]!);
      return;
    }

    if (token === "both" && (intent === "price" || intent === "buy" || intent === "stats")) {
      const stats = await fetchBachiStats();
      const bachiPart = stats ? (intent === "stats" ? formatBachiStats(stats) : formatBachiPrice(stats)) : `Check: https://dexscreener.com/base/0x7a8137b5f3be0152b7e62cdcdf2e81ec03cb3f95`;
      await ctx.reply(
        `📊 *Both Tokens*\n\n━━━━━━━━━━━━\n🟡 *KACHI*\n${intent === "stats" ? formatKachiInfo() : formatKachiPrice()}\n\n━━━━━━━━━━━━\n🔵 *BACHI*\n${bachiPart}`,
        PREVIEW_OPTS
      );
      return;
    }

    if (token === "kachi") {
      if (intent === "stats") {
        await ctx.reply(formatKachiInfo(), PREVIEW_OPTS);
      } else {
        await ctx.reply(formatKachiPrice(), PREVIEW_OPTS);
      }
      return;
    }

    if (token === "bachi") {
      const stats = await fetchBachiStats();
      if (!stats) {
        await ctx.reply("Couldn't fetch BACHI data right now 😬 Check: https://dexscreener.com/base/0x7a8137b5f3be0152b7e62cdcdf2e81ec03cb3f95");
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

    const aiReply = await getAIResponse(ctx.chat.id, from.id, cleanText);
    await ctx.reply(aiReply);
  });

  bot.on("my_chat_member", async (ctx) => {
    const update = ctx.myChatMember;
    const newStatus = update.new_chat_member.status;
    const chat = ctx.chat;
    if ((newStatus === "member" || newStatus === "administrator") && chat.type !== "private") {
      const title = (chat as any).title ?? "this group";
      await ctx.reply(
        `👋 Hey ${title}! Thanks for adding me.\n\n` +
        `⚠️ *Important setup step:*\n` +
        `I currently can't see regular messages in groups due to Telegram's bot privacy settings. To let me respond to greetings, "buy", "price" etc. — an admin needs to do ONE of these:\n\n` +
        `*Option 1 (Recommended):* Disable privacy mode via BotFather:\n` +
        `1. Open @BotFather\n` +
        `2. Send /mybots → select this bot\n` +
        `3. Bot Settings → Group Privacy → Turn off\n` +
        `4. Remove and re-add me to this group\n\n` +
        `*Option 2:* Make me a group admin (I can read messages as admin)\n\n` +
        `Once done, I'll respond to everything! 🚀\n\n` +
        `_For now, commands like /kachi /bachi /price /stats already work._`,
        { parse_mode: "Markdown" }
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
          await bot.telegram.sendMessage(groupId, getRandomKachiMessage(), { parse_mode: "Markdown" });
          logger.info({ groupId }, "Sent KACHI motivational message");
        } catch (err: any) {
          logger.error({ err: err?.message, groupId }, "Failed KACHI message — removing stale group");
          unregisterGroup(groupId, "kachi");
        }
      }

      for (const groupId of getGroups("bachi")) {
        try {
          await bot.telegram.sendMessage(groupId, getRandomBachiMessage(), { parse_mode: "Markdown" });
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
