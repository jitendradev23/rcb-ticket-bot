import axios from "axios";
import crypto from "crypto";

let lastHash = "";
let firstRun = true;

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

    const currentHash = crypto
      .createHash("md5")
      .update(data)
      .digest("hex");

    console.log("Hash:", currentHash);

    if (firstRun) {
      lastHash = currentHash;
      firstRun = false;
      console.log("Initial snapshot saved");
      return;
    }

    if (currentHash !== lastHash) {
      console.log("🔥 PAGE CHANGED!");

      await sendTelegram(
        config.telegramToken,
        config.chatId,
        "🔥 RCB ticket page updated!\nhttps://shop.royalchallengers.com/ticket"
      );

      lastHash = currentHash;
    } else {
      console.log("❌ No change");
    }

  } catch (err) {
    console.error("Error:", err.message);
  }
}
// ⏱ Run every X seconds
cron.schedule(`*/${config.interval} * * * * *`, checkTickets);

// Run immediately
checkTickets();