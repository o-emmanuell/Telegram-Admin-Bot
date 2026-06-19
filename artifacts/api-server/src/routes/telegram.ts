import { Router } from "express";
import type { Telegraf } from "telegraf";

export function createTelegramRouter(bot: Telegraf) {
  const router = Router();

  router.post("/telegram/webhook", bot.webhookCallback("/api/telegram/webhook"));

  return router;
}
