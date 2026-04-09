import dotenv from "dotenv";
dotenv.config();

export const config = {
  url: process.env.URL,
  interval: process.env.CHECK_INTERVAL || 30,
  telegramToken: process.env.TELEGRAM_BOT_TOKEN,
  chatId: process.env.TELEGRAM_CHAT_ID,
};