import axios from "axios";
import crypto from "crypto";
import * as cheerio from "cheerio";
import cron from "node-cron";
import { config } from "./config.js";
import { sendTelegram } from "./notifier.js";

let lastHash = "";
let firstRun = true;

async function checkTickets() {
  try {
    console.log("Checking tickets...");

    const { data } = await axios.get(config.url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.5",
      },
    });

    // Try to detect ticket keywords directly in raw HTML
    const lowerData = data.toLowerCase();
    const hasBuyNow =
      lowerData.includes("buy now") ||
      lowerData.includes("book now") ||
      lowerData.includes("add to cart") ||
      lowerData.includes("buy ticket");

    console.log("Page contains ticket keywords:", hasBuyNow);

    const currentHash = crypto.createHash("md5").update(data).digest("hex");
    console.log("Hash:", currentHash);

    if (firstRun) {
      lastHash = currentHash;
      firstRun = false;
      console.log("Initial snapshot saved.");
      console.log("Ticket keywords on first run:", hasBuyNow);
      return;
    }

    // Alert if hash changed OR if buy keywords appeared
    if (currentHash !== lastHash) {
      console.log("🔥 PAGE CHANGED!");
      lastHash = currentHash;

      if (hasBuyNow) {
        await sendTelegram(
          config.telegramToken,
          config.chatId,
          "🚨 RCB TICKETS ARE LIVE! Buy now!\nhttps://shop.royalchallengers.com/ticket"
        );
      } else {
        await sendTelegram(
          config.telegramToken,
          config.chatId,
          "⚠️ RCB ticket page updated (no buy button yet)\nhttps://shop.royalchallengers.com/ticket"
        );
      }
    } else {
      console.log("❌ No change");
    }
  } catch (err) {
    console.error("Error:", err.message);
  }
}

// Run immediately on start
checkTickets();

// Then run every X seconds
cron.schedule(`*/${config.interval} * * * * *`, checkTickets);