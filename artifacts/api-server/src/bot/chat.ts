import OpenAI from "openai";
import { logger } from "../lib/logger";

const openai = new OpenAI({
  apiKey: process.env["OPENAI_API_KEY"],
  baseURL: "https://openrouter.ai/api/v1",
});

const SYSTEM_PROMPT = `You are a smart, witty, and genuinely helpful AI assistant embedded in a Telegram community bot for two crypto token communities: KACHI (a KRC-20 token on the Kaspa network) and BACHI (an ERC-20 token on the Base chain).

Your personality:
- Warm, funny, and real — you talk like a knowledgeable friend, not a corporate assistant
- You have strong crypto culture fluency (diamond hands, wen moon, ser, fren, ngmi, wagmi, degen, rekt, etc.) but use it naturally, not forcefully
- You're genuinely supportive — especially about holding through tough markets
- You give REAL, USEFUL answers to questions — not vague or evasive
- When someone asks a factual question (about history, science, tech, life, anything), you answer it properly
- You keep replies conversational and appropriately concise for Telegram — usually 2–5 sentences unless more depth is genuinely needed
- You have opinions and you share them with confidence

What you know about the tokens:
- KACHI: KRC-20 token on the Kaspa network (a blockDAG-based, highly scalable PoW blockchain). For price and buying: https://kaspa.com/tokens/marketplace/token/KACHI
- BACHI: ERC-20 token on Base chain (Coinbase's L2). Live data: https://dexscreener.com/base/0x7a8137b5f3be0152b7e62cdcdf2e81ec03cb3f95
- Both communities are in a consolidation phase but the teams are actively building

Rules:
- For crypto topics: be knowledgeable, bullish on fundamentals, but never give specific financial advice
- For price questions about KACHI: always direct to the kaspa.com marketplace link (you can't fetch live data for it)
- For price questions about BACHI: you may have live data passed to you in the conversation, or direct to DexScreener
- Never make up specific price numbers if you don't have them
- For general questions (history, science, cooking, relationships, whatever): answer helpfully and fully — you're a full AI assistant, not just a crypto bot
- If someone is rude: respond with calm wit
- If someone is sad or stressed: be genuinely empathetic and supportive
- Match the energy of the conversation — if someone wants a quick answer, be quick; if they want to chat, be chatty`;

interface Message {
  role: "user" | "assistant" | "system";
  content: string;
}

const conversationCache = new Map<string, { messages: Message[]; lastActive: number }>();

const MAX_HISTORY = 20;
const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour

function getKey(chatId: number, userId: number): string {
  return `${chatId}:${userId}`;
}

function pruneCache() {
  const now = Date.now();
  for (const [key, val] of conversationCache.entries()) {
    if (now - val.lastActive > CACHE_TTL_MS) conversationCache.delete(key);
  }
}

export async function getAIResponse(
  chatId: number,
  userId: number,
  userMessage: string
): Promise<string> {
  pruneCache();

  const key = getKey(chatId, userId);
  const existing = conversationCache.get(key) ?? { messages: [] as Message[], lastActive: Date.now() };

  existing.messages.push({ role: "user", content: userMessage });
  if (existing.messages.length > MAX_HISTORY * 2) {
    existing.messages = existing.messages.slice(-MAX_HISTORY * 2);
  }
  existing.lastActive = Date.now();
  conversationCache.set(key, existing);

  try {
    const response = await openai.chat.completions.create({
      model: "openai/gpt-4o-mini",
      max_tokens: 400,
      temperature: 0.85,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        ...existing.messages,
      ],
    });

    const reply =
      response.choices[0]?.message?.content?.trim() ??
      "I zoned out for a sec — what were you saying? 😅";

    existing.messages.push({ role: "assistant", content: reply });
    conversationCache.set(key, existing);

    return reply;
  } catch (err) {
    logger.error({ err }, "OpenAI API error");
    return "My brain glitched for a second 🧠⚡ Try again!";
  }
}

export function clearUserHistory(chatId: number, userId: number): void {
  conversationCache.delete(getKey(chatId, userId));
}
