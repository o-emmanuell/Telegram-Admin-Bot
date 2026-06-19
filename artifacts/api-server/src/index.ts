import app from "./app";
import { logger } from "./lib/logger";
import { createBot } from "./bot/index";

const rawPort = process.env["PORT"];
if (!rawPort) throw new Error("PORT environment variable is required.");
const port = Number(rawPort);
if (Number.isNaN(port) || port <= 0) throw new Error(`Invalid PORT: "${rawPort}"`);

const telegramToken = process.env["TELEGRAM_BOT_TOKEN"];

if (!telegramToken) {
  logger.warn("TELEGRAM_BOT_TOKEN not set — bot will not start");
} else {
  const { bot, startScheduler } = createBot(telegramToken);

  app.post("/api/telegram/webhook", async (req, res) => {
    res.status(200).json({ ok: true }); // ACK Telegram immediately
    try {
      logger.info({ update_id: req.body?.update_id, type: Object.keys(req.body ?? {}).find(k => k !== 'update_id') }, "Telegram update received");
      await bot.handleUpdate(req.body); // No res — use standard API calls
    } catch (err) {
      logger.error({ err }, "Webhook handler error");
    }
  });

  startScheduler();

  const domain = process.env["REPLIT_DEPLOYMENT_DOMAIN"] ?? process.env["REPLIT_DEV_DOMAIN"];

  if (!domain) {
    logger.warn("No domain found — falling back to polling");
    bot.launch({ dropPendingUpdates: true })
      .then(() => logger.info("Bot started (polling)"))
      .catch((err) => logger.error({ err }, "Polling failed"));
    process.once("SIGINT", () => bot.stop("SIGINT"));
    process.once("SIGTERM", () => bot.stop("SIGTERM"));
  } else {
    const webhookUrl = `https://${domain}/api/telegram/webhook`;
    bot.telegram
      .setWebhook(webhookUrl, { drop_pending_updates: true })
      .then(() => logger.info({ webhookUrl }, "Webhook set — bot active"))
      .catch((err) => logger.error({ err }, "Failed to set webhook"));
  }
}

function tryListen(retries = 0) {
  const server = app.listen(port, () => {
    logger.info({ port }, "Server listening");
  });
  server.on("error", (err: NodeJS.ErrnoException) => {
    if (err.code === "EADDRINUSE" && retries < 5) {
      logger.warn({ port, retries }, "Port in use, retrying in 2s...");
      setTimeout(() => { server.close(); tryListen(retries + 1); }, 2000);
    } else {
      logger.error({ err }, "Fatal server error");
      process.exit(1);
    }
  });
}

tryListen();
