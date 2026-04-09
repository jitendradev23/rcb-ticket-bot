import axios from "axios";

export async function sendTelegram(token, chatId, message) {
  if (!token || !chatId) return;

  await axios.post(`https://api.telegram.org/bot${token}/sendMessage`, {
    chat_id: chatId,
    text: message,
  });
}

export function playAlert() {
  process.stdout.write("\x07"); // Beep sound
}