import axios from "axios";
import cron from "node-cron";
import http from "http";
import { config } from "./config.js";
import { sendTelegram } from "./notifier.js";

let wasAvailable = false;
let firstRun = true;

async function checkTickets() {
  try {
    console.log("Checking tickets...");

    // Shopify products API - no browser needed, always server-rendered
    const { data } = await axios.get(
      "https://shop.royalchallengers.com/products.json?limit=250",
      {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36",
        },
        timeout: 15000,
      }
    );

    const products = data.products || [];

    // Find ticket-related products
    const ticketProducts = products.filter((p) => {
      const title = p.title.toLowerCase();
      return (
        title.includes("ticket") ||
        title.includes("match") ||
        title.includes("ipl") ||
        title.includes("rcb") ||
        title.includes("chinnaswamy")
      );
    });

    console.log(`Found ${ticketProducts.length} ticket product(s)`);

    // Check if any variant is available
    const availableTickets = ticketProducts.filter((p) =>
      p.variants?.some((v) => v.available === true)
    );

    const isAvailable = availableTickets.length > 0;
    console.log("Tickets available:", isAvailable);

    if (firstRun) {
      wasAvailable = isAvailable;
      firstRun = false;
      console.log("✅ Initial snapshot saved");
      if (isAvailable) {
        console.log("🎟️ Tickets were already available on first check!");
        await sendTelegram(
          config.telegramToken,
          config.chatId,
          `🚨 RCB TICKETS ARE LIVE RIGHT NOW!\n\n${availableTickets.map((p) => `• ${p.title}`).join("\n")}\n\nhttps://shop.royalchallengers.com/ticket`
        );
      }
      return;
    }

    if (isAvailable && !wasAvailable) {
      // Tickets just went live!
      console.log("🔥 TICKETS JUST WENT LIVE!");
      wasAvailable = true;

      const ticketList = availableTickets
        .map((p) => `• ${p.title}`)
        .join("\n");

      await sendTelegram(
        config.telegramToken,
        config.chatId,
        `🚨 RCB TICKETS ARE LIVE!\n\n${ticketList}\n\nBuy now 👉 https://shop.royalchallengers.com/ticket`
      );

    } else if (!isAvailable && wasAvailable) {
      // Tickets just sold out
      console.log("😔 Tickets sold out");
      wasAvailable = false;

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
    console.log("Keep-alive server started on port", process.env.PORT || 3000)
  );

// Run immediately on start
checkTickets();

// Then every X seconds
cron.schedule(`*/${config.interval} * * * * *`, checkTickets);