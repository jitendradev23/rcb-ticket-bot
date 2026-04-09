import axios from "axios";
import * as cheerio from "cheerio";
import cron from "node-cron";
import open from "open";
import { config } from "./config.js";
import { sendTelegram, playAlert } from "./utils/notifier.js";

let lastStatus = false;

async function checkTickets() {
  try {
    console.log("Checking tickets...");

    const { data } = await axios.get(config.url, {
      headers: {
        "User-Agent": "Mozilla/5.0",
      },
    });

    // ✅ Correct detection
    const isAvailable = data.includes('"available":true');

    if (isAvailable && !lastStatus) {
      console.log("🔥 TICKETS AVAILABLE!");

      playAlert();

      await sendTelegram(
        config.telegramToken,
        config.chatId,
        `🔥 RCB Tickets LIVE!\n${config.url}`
      );

      // Open main site (faster to act)
      await open("https://shop.royalchallengers.com");

      lastStatus = true;

    } else if (!isAvailable) {
      console.log("❌ Still not available");
      lastStatus = false;
    }

  } catch (err) {
    console.error("Error:", err.message);
  }
}

// ⏱ Run every X seconds
cron.schedule(`*/${config.interval} * * * * *`, checkTickets);

// Run immediately
checkTickets();