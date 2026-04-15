import puppeteer from "puppeteer";
import crypto from "crypto";
import cron from "node-cron";
import { config } from "./config.js";
import { sendTelegram } from "./notifier.js";
import http from "http";

let lastHash = "";
let firstRun = true;

async function checkTickets() {
  let browser;
  try {
    console.log("Checking tickets...");

    browser = await puppeteer.launch({
      headless: "new",
      args: [
        "--no-sandbox",              // Required for Railway/Docker
        "--disable-setuid-sandbox", // Required for Railway/Docker
        "--disable-dev-shm-usage",  // Prevents crashes in low memory
        "--disable-gpu",
        "--no-zygote",
        "--single-process",         // Important for Railway
      ],
    });

    const page = await browser.newPage();

    await page.setUserAgent(
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36"
    );

    // Wait until network is idle so JS-rendered content loads
    await page.goto(config.url, {
      waitUntil: "networkidle2",
      timeout: 30000,
    });

    // Extra wait for dynamic content
    await new Promise((r) => setTimeout(r, 3000));

    const content = await page.content();

    const lowerContent = content.toLowerCase();
    const hasBuyNow =
      lowerContent.includes("buy now") ||
      lowerContent.includes("book now") ||
      lowerContent.includes("add to cart") ||
      lowerContent.includes("buy ticket") ||
      lowerContent.includes("sold out") === false && lowerContent.includes("ticket");

    console.log("Page contains ticket keywords:", hasBuyNow);

    const currentHash = crypto.createHash("md5").update(content).digest("hex");
    console.log("Hash:", currentHash);

    if (firstRun) {
      lastHash = currentHash;
      firstRun = false;
      console.log("✅ Initial snapshot saved");
      return;
    }

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
          "⚠️ RCB ticket page updated!\nhttps://shop.royalchallengers.com/ticket"
        );
      }
    } else {
      console.log("❌ No change");
    }

  } catch (err) {
    console.error("Error:", err.message);
  } finally {
    // Always close browser to prevent memory leaks
    if (browser) await browser.close();
  }
}

// Keep-alive HTTP server so Railway doesn't kill the container
http
  .createServer((req, res) => res.end("Bot running ✅"))
  .listen(process.env.PORT || 3000, () =>
    console.log("Keep-alive server started")
  );

// Run immediately
checkTickets();

// Then every X seconds
cron.schedule(`*/${config.interval} * * * * *`, checkTickets);