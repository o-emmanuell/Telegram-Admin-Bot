import app from "./app";
import { logger } from "./lib/logger";
import { createBot } from "./bot/index";
import { createServer } from "net";

const rawPort = process.env["PORT"];

if (!rawPort) {
  throw new Error("PORT environment variable is required but was not provided.");
}

const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

function startServer() {
  const server = app.listen(port, () => {
    logger.info({ port }, "Server listening");
  });

  server.on("error", (err: NodeJS.ErrnoException) => {
    if (err.code === "EADDRINUSE") {
      logger.warn({ port }, "Port in use, retrying in 3s...");
      setTimeout(() => {
        server.close();
        startServer();
      }, 3000);
    } else {
      logger.error({ err }, "Fatal server error");
      process.exit(1);
    }
  });

  return server;
}

startServer();

const telegramToken = process.env["TELEGRAM_BOT_TOKEN"];

if (!telegramToken) {
  logger.warn("TELEGRAM_BOT_TOKEN not set — bot will not start");
} else {
  const { bot, startScheduler } = createBot(telegramToken);

  startScheduler();

  bot.launch({ dropPendingUpdates: true })
    .then(() => {
      logger.info("Telegram bot started (polling)");
    })
    .catch((err) => {
      logger.error({ err }, "Failed to launch Telegram bot");
    });

  process.once("SIGINT", () => bot.stop("SIGINT"));
  process.once("SIGTERM", () => bot.stop("SIGTERM"));
}
