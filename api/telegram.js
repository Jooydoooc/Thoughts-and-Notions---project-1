export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
  const CHAT_ID = process.env.TELEGRAM_CHAT_ID;

  if (!BOT_TOKEN || !CHAT_ID) {
    return res.status(500).json({ error: "Telegram env variables missing" });
  }

  const { studentName, score, percentage, group, unit, book } = req.body;

  const message = `
📘 Reading Platform Result
👤 Student: ${studentName}
👥 Group: ${group}
📚 Book: ${book}
📖 Unit: ${unit}
✅ Score: ${score}
📊 Percentage: ${percentage}%
  `;

  const url = `https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`;

  await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: CHAT_ID,
      text: message
    })
  });

  res.status(200).json({ success: true });
}
