import puppeteer from "puppeteer";

async function checkTickets() {
  try {
    console.log("Checking tickets...");

   const browser = await puppeteer.launch({
  args: ["--no-sandbox", "--disable-setuid-sandbox"],
});

const page = await browser.newPage();

await page.goto("https://shop.royalchallengers.com/ticket", {
  waitUntil: "domcontentloaded",
});

// ⏳ WAIT EXTRA (important)
await new Promise((resolve) => setTimeout(resolve, 5000));

// Get FULL rendered HTML
const content = await page.content();
const text = content.toLowerCase();

    const content = await page.content();
    const text = content.toLowerCase();

    const isAvailable = text.includes("buy tickets");

    if (isAvailable && !lastStatus) {
      console.log("🔥 TICKETS AVAILABLE!");

      await sendTelegram(
        config.telegramToken,
        config.chatId,
        "🔥 RCB Tickets LIVE!\nhttps://shop.royalchallengers.com/ticket"
      );

      await open("https://shop.royalchallengers.com/ticket");

      lastStatus = true;

    } else if (!isAvailable) {
      console.log("❌ Still not available");
      lastStatus = false;
    }

    await browser.close();

  } catch (err) {
    console.error("Error:", err.message);
  }
}