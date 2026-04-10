import dotenv from "dotenv";
dotenv.config();

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

    const products = data.products || [];

    const ticketProducts = products.filter((product) =>
      product.title.toLowerCase().includes("ticket") &&
      product.title.toLowerCase().includes("rcb")
    );

    const availableTickets = ticketProducts.filter((product) =>
      product.variants.some((v) => v.available)
    );

    console.log("Tickets found:", ticketProducts.length);

    if (availableTickets.length > 0 && !lastStatus) {
      console.log("🔥 TICKETS AVAILABLE!");

      playAlert();

      const ticketNames = availableTickets
        .map((p) => p.title)
        .join("\n");

      await sendTelegram(
        config.telegramToken,
        config.chatId,
        `🔥 RCB Tickets LIVE!\n\n${ticketNames}\n\n${config.url}`
      );

      await open("https://shop.royalchallengers.com");

      lastStatus = true;

    } else if (availableTickets.length === 0) {
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