// api/telegram.js
// Vercel Serverless Function (Node.js)
// Uses env vars:
//   TELEGRAM_BOT_TOKEN
//   TELEGRAM_CHAT_ID

module.exports = async (req, res) => {
  try {
    if (req.method !== "POST") {
      return res.status(405).json({ ok: false, error: "Method not allowed" });
    }

    const token = process.env.TELEGRAM_BOT_TOKEN;
    const chatId = process.env.TELEGRAM_CHAT_ID;

    if (!token || !chatId) {
      return res.status(500).json({
        ok: false,
        error: "Missing TELEGRAM_BOT_TOKEN or TELEGRAM_CHAT_ID in environment variables",
      });
    }

    const body = req.body || {};

    // Expected fields from your frontend:
    // studentName, group, book, unit, exerciseType, score, totalQuestions, percentage, timestamp
    // Optional: timePerQuestion, details, answers, userAgent, pageUrl
    const {
      studentName = "Unknown Student",
      group = "Unknown Group",
      book = "Unknown Book",
      unit = "Unknown Unit",
      exerciseType = "Exercises",
      score = 0,
      totalQuestions = 0,
      percentage = 0,
      timestamp = new Date().toISOString(),
      timePerQuestion,
      details,
      answers,
      userAgent,
      pageUrl,
    } = body;

    // Build a clean Telegram message
    const lines = [
      "📩 *New Exercise Submission*",
      "",
      `👤 *Student:* ${escapeMd(studentName)}`,
      `👥 *Group:* ${escapeMd(group)}`,
      `📚 *Book:* ${escapeMd(book)}`,
      `🧩 *Unit:* ${escapeMd(unit)}`,
      `📝 *Type:* ${escapeMd(exerciseType)}`,
      "",
      `✅ *Score:* ${escapeMd(String(score))}/${escapeMd(String(totalQuestions))}  (*${escapeMd(String(percentage))}%*)`,
      timePerQuestion ? `⏱ *Time per question:* ${escapeMd(String(timePerQuestion))}` : null,
      "",
      `🕒 *Submitted:* ${escapeMd(String(timestamp))}`,
      pageUrl ? `🔗 *Page:* ${escapeMd(String(pageUrl))}` : null,
      userAgent ? `🧭 *UA:* ${escapeMd(String(userAgent))}` : null,
      "",
      details ? `📌 *Details:* ${escapeMd(String(details))}` : null,
      // If you later send "answers" as JSON, we’ll include a short preview:
      answers ? `📋 *Answers:* \`${trimLong(JSON.stringify(answers), 800)}\`` : null,
    ].filter(Boolean);

    const text = lines.join("\n");

    const tgRes = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: "Markdown",
        disable_web_page_preview: true,
      }),
    });

    const tgData = await tgRes.json();

    if (!tgRes.ok || !tgData.ok) {
      return res.status(502).json({
        ok: false,
        error: "Telegram API error",
        telegram: tgData,
      });
    }

    return res.status(200).json({ ok: true });
  } catch (err) {
    return res.status(500).json({
      ok: false,
      error: "Server error",
      message: err?.message || String(err),
    });
  }
};

// --- helpers ---
function escapeMd(text) {
  // Minimal escaping for Telegram Markdown
  return String(text)
    .replace(/\\/g, "\\\\")
    .replace(/\*/g, "\\*")
    .replace(/_/g, "\\_")
    .replace(/`/g, "\\`")
    .replace(/\[/g, "\\[")
    .replace(/\]/g, "\\]");
}

function trimLong(str, max) {
  if (!str) return "";
  return str.length > max ? str.slice(0, max) + "…" : str;
}
