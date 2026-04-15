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

    const { data } = await axios.get(
  "https://shop.royalchallengers.com/ticket",
  {
    headers: {
      "User-Agent": "Mozilla/5.0",
    },
  }
);

const text = data.toLowerCase();

// 🎯 Detect ticket availability
const hasBuyButton = text.includes("buy tickets");
const isSoldOut = text.includes("sold out");

const isAvailable = hasBuyButton && !isSoldOut;

    

    if (isAvailable && !lastStatus) {
      console.log("🔥 TICKETS AVAILABLE!");

      playAlert();

      const ticketNames = availableTickets
        .map((p) => p.title)
        .join("\n");

      await sendTelegram(
        config.telegramToken,
        config.chatId,
        "🔥 RCB Tickets LIVE!\nhttps://shop.royalchallengers.com/ticket"
      );

      await open("https://shop.royalchallengers.com");

      lastStatus = true;

    }  else if (!isAvailable){
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