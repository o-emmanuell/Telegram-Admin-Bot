import app from "./app";
import { logger } from "./lib/logger";
import { createBot } from "./bot/index";
import { createTelegramRouter } from "./routes/telegram";

const rawPort = process.env["PORT"];
if (!rawPort) throw new Error("PORT environment variable is required.");
const port = Number(rawPort);
if (Number.isNaN(port) || port <= 0) throw new Error(`Invalid PORT: "${rawPort}"`);

const telegramToken = process.env["TELEGRAM_BOT_TOKEN"];

if (!telegramToken) {
  logger.warn("TELEGRAM_BOT_TOKEN not set — bot will not start");
  startServer();
} else {
  const { bot, startScheduler } = createBot(telegramToken);

  app.use("/api", createTelegramRouter(bot));

  startServer();
  startScheduler();

  const devDomain = process.env["REPLIT_DEV_DOMAIN"];
  const deployDomain = process.env["REPLIT_DEPLOYMENT_DOMAIN"];
  const domain = deployDomain ?? devDomain;

  if (!domain) {
    logger.warn("No Replit domain found — falling back to polling");
    bot.launch({ dropPendingUpdates: true })
      .then(() => logger.info("Bot started (polling)"))
      .catch((err) => logger.error({ err }, "Failed to start bot (polling)"));
    process.once("SIGINT", () => bot.stop("SIGINT"));
    process.once("SIGTERM", () => bot.stop("SIGTERM"));
  } else {
    const webhookUrl = `https://${domain}/api/telegram/webhook`;
    bot.telegram
      .setWebhook(webhookUrl, { drop_pending_updates: true })
      .then(() => logger.info({ webhookUrl }, "Webhook registered — bot active"))
      .catch((err) => logger.error({ err }, "Failed to set webhook"));
  }
}

function startServer() {
  function tryListen() {
    const server = app.listen(port, () => {
      logger.info({ port }, "Server listening");
    });
    server.on("error", (err: NodeJS.ErrnoException) => {
      if (err.code === "EADDRINUSE") {
        logger.warn({ port }, "Port in use, retrying in 2s...");
        setTimeout(() => { server.close(); tryListen(); }, 2000);
      } else {
        logger.error({ err }, "Fatal server error");
        process.exit(1);
      }
    });
  }
  tryListen();
}
