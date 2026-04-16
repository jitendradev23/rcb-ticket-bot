import axios from "axios";
import cron from "node-cron";
import http from "http";
import { config } from "./config.js";
import { sendTelegram } from "./notifier.js";

const STAND_LIST_URL = "https://tg3.s3.ap-south-1.amazonaws.com/revents/standview/standList.json";

let wasAvailable = false;
let firstRun = true;

async function checkTickets() {
  try {
    console.log("Checking tickets...");

    const { data } = await axios.get(STAND_LIST_URL, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36",
        "Cache-Control": "no-cache",
        "Pragma": "no-cache",
      },
      timeout: 15000,
    });

    const stands = data.stands || [];

    // Tickets are available when ANY stand has a real price (not "-")
    const availableStands = stands.filter(
      (s) => s.price && s.price !== "-" && s.price !== ""
    );

    const isAvailable = availableStands.length > 0;

    console.log(`Total stands: ${stands.length}`);
    console.log(`Available stands: ${availableStands.length}`);
    console.log("Tickets available:", isAvailable);

    if (firstRun) {
      wasAvailable = isAvailable;
      firstRun = false;
      console.log("✅ Initial snapshot saved");

      if (isAvailable) {
        console.log("🎟️ Tickets already on sale on first check!");
        const standList = availableStands
          .map((s) => `• ${s.stand_Name} — ₹${s.price}`)
          .join("\n");
        await sendTelegram(
          config.telegramToken,
          config.chatId,
          `🚨 RCB TICKETS ARE LIVE!\n\n${standList}\n\nBuy NOW 👉 https://shop.royalchallengers.com/ticket`
        );
      }
      return;
    }

    if (isAvailable && !wasAvailable) {
      // 🔥 Tickets just went live!
      wasAvailable = true;
      console.log("🔥 TICKETS JUST WENT LIVE!");

      const standList = availableStands
        .map((s) => `• ${s.stand_Name} — ₹${s.price}`)
        .join("\n");

      await sendTelegram(
        config.telegramToken,
        config.chatId,
        `🚨 RCB TICKETS ARE LIVE!\n\n${standList}\n\nBuy NOW 👉 https://shop.royalchallengers.com/ticket`
      );

    } else if (!isAvailable && wasAvailable) {
      // Tickets sold out
      wasAvailable = false;
      console.log("😔 Tickets sold out");

      await sendTelegram(
        config.telegramToken,
        config.chatId,
        "😔 RCB tickets are now sold out.\nhttps://shop.royalchallengers.com/ticket"
      );

    } else {
      console.log("❌ No change —", isAvailable ? "still available" : "still not available");
    }

  } catch (err) {
    console.error("Error:", err.message);
  }
}

// Keep Railway container alive
http
  .createServer((req, res) => res.end("RCB Bot running ✅"))
  .listen(process.env.PORT || 3000, () =>
    console.log("Keep-alive server on port", process.env.PORT || 3000)
  );

// Run immediately on start
checkTickets();

// Then every X seconds
cron.schedule(`*/${config.interval} * * * * *`, checkTickets);