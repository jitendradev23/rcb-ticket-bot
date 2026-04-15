import dotenv from "dotenv";
dotenv.config();

import puppeteer from "puppeteer";
import cron from "node-cron";
import open from "open";
import { config } from "./config.js";
import { sendTelegram, playAlert } from "./utils/notifier.js";

let lastStatus = false;

async function checkTickets() {
  let browser;

  try {
    console.log("Checking tickets...");

    browser = await puppeteer.launch({
      headless: "new",
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-dev-shm-usage",
      ],
    });

    const page = await browser.newPage();

    await page.goto("https://shop.royalchallengers.com/ticket", {
      waitUntil: "domcontentloaded",
    });

    // ⏳ Wait for dynamic content to load
    await new Promise((resolve) => setTimeout(resolve, 5000));

    // 🎯 Detect BUY buttons (real UI detection)
    const buyButtons = await page.$$eval("button", (buttons) =>
      buttons.filter((btn) =>
        btn.innerText.toLowerCase().includes("buy")
      ).length
    );

    console.log("Buy buttons found:", buyButtons);

    const isAvailable = buyButtons > 0;

    if (isAvailable && !lastStatus) {
      console.log("🔥 TICKETS AVAILABLE!");

      playAlert();

      await sendTelegram(
        config.telegramToken,
        config.chatId,
        "🔥 RCB Tickets LIVE!\nhttps://shop.royalchallengers.com/ticket"
      );

      // Open browser for quick action
      await open("https://shop.royalchallengers.com/ticket");

      lastStatus = true;

    } else if (!isAvailable) {
      console.log("❌ Still not available");
      lastStatus = false;
    }

  } catch (err) {
    console.error("Error:", err.message);

  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

// ⏱ Run every X seconds
cron.schedule(`*/${config.interval} * * * * *`, checkTickets);

// Run immediately
checkTickets();