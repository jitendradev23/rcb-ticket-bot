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
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    });

    const page = await browser.newPage();

    await page.goto("https://shop.royalchallengers.com/ticket", {
      waitUntil: "domcontentloaded",
    });

    // wait for UI
    await new Promise((r) => setTimeout(r, 4000));

    // ✅ ONLY THIS (no duplicate variables)
   const buyElements = await page.$$eval("*", (elements) =>
  elements.filter((el) => {
    const text = el.innerText?.toLowerCase() || "";
    return (
      text.includes("buy tickets") ||
      text.includes("buy") ||
      text.includes("book")
    );
  }).length
);

console.log("Buy elements found:", buyElements);

const isAvailable = buyElements > 0;

    if (isAvailable && !lastStatus) {
      console.log("🔥 TICKETS AVAILABLE!");

      await sendTelegram(
        config.telegramToken,
        config.chatId,
        "🔥 RCB Tickets LIVE!\nhttps://shop.royalchallengers.com/ticket"
      );

      lastStatus = true;
    }  else if (!isAvailable) {
      console.log("❌ Still not available");
      lastStatus = false;
    }

  } catch (err) {
    console.error("Error:", err.message);

  } finally {
    if (browser) await browser.close();
  }
}

// ⏱ Run every X seconds
cron.schedule(`*/${config.interval} * * * * *`, checkTickets);

// Run immediately
checkTickets();