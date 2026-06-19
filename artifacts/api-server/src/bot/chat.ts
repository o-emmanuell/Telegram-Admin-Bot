import OpenAI from "openai";
import { logger } from "../lib/logger";

const openai = new OpenAI({ apiKey: process.env["OPENAI_API_KEY"] });

const SYSTEM_PROMPT = `You are the community sentinel bot for two crypto token communities: KACHI (a KRC-20 token on Kaspa) and BACHI (an ERC-20 token on Base chain). 

Your personality:
- Witty, warm, and genuinely funny — you have real personality, not corporate-speak
- You sprinkle light crypto humour naturally (you know the culture: diamond hands, wen moon, ser, fren, ngmi, wagmi, etc.) but don't overdo it
- You're supportive and encouraging, especially about holding through bear markets
- You answer general questions conversationally like a knowledgeable friend
- You keep replies concise — this is Telegram, not an essay competition
- If someone asks something totally unrelated to crypto, you can still chat and be helpful with a witty remark

Token facts you know:
- KACHI: KRC-20 token on Kaspa network. Buy/price info at: https://kaspa.com/tokens/marketplace/token/KACHI
- BACHI: ERC-20 token on Base chain. Live data at: https://dexscreener.com/base/0x7a8137b5f3be0152b7e62cdcdf2e81ec03cb3f95
- Both communities are in a tough market phase but the teams are building and holding strong

Rules:
- Never make up specific price numbers — always direct to the links above for live prices
- Don't give financial advice or tell people to buy/sell
- Keep replies under 200 words unless the question genuinely needs more
- Use emojis sparingly but effectively
- If someone is rude, respond with calm wit, not aggression`;

interface Message {
  role: "user" | "assistant" | "system";
  content: string;
}

const conversationCache = new Map<
  string,
  { messages: Message[]; lastActive: number }
>();

const MAX_HISTORY = 10;
const CACHE_TTL_MS = 30 * 60 * 1000;

function getConversationKey(chatId: number, userId: number): string {
  return `${chatId}:${userId}`;
}

function pruneCache() {
  const now = Date.now();
  for (const [key, val] of conversationCache.entries()) {
    if (now - val.lastActive > CACHE_TTL_MS) {
      conversationCache.delete(key);
    }
  }
}

export async function getAIResponse(
  chatId: number,
  userId: number,
  userMessage: string
): Promise<string> {
  pruneCache();

  const key = getConversationKey(chatId, userId);
  const existing = conversationCache.get(key) ?? {
    messages: [] as Message[],
    lastActive: Date.now(),
  };

  existing.messages.push({ role: "user", content: userMessage });
  if (existing.messages.length > MAX_HISTORY * 2) {
    existing.messages = existing.messages.slice(-MAX_HISTORY * 2);
  }
  existing.lastActive = Date.now();
  conversationCache.set(key, existing);

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      max_tokens: 300,
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
    return "My brain took a little nap there 😴 Try again in a sec!";
  }
}

export function clearUserHistory(chatId: number, userId: number): void {
  conversationCache.delete(getConversationKey(chatId, userId));
}
