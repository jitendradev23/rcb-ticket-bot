import dotenv from "dotenv";
dotenv.config();
console.log("ENV URL:", process.env.URL);
export const config = {
  url: process.env.URL,
  interval: process.env.CHECK_INTERVAL || 10,
  telegramToken: process.env.TELEGRAM_BOT_TOKEN,
  chatId: process.env.TELEGRAM_CHAT_ID,
};