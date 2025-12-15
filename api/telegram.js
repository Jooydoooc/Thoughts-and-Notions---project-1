const express = require('express');
const TelegramBot = require('node-telegram-bot-api');

const app = express();

// Configure Telegram Bot
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;

let bot;
if (TELEGRAM_BOT_TOKEN && TELEGRAM_CHAT_ID) {
  bot = new TelegramBot(TELEGRAM_BOT_TOKEN, { polling: false });
}

app.use(express.json());

app.post('/api/telegram', async (req, res) => {
  try {
    const { studentName, exerciseType, score, totalQuestions, unit, book } = req.body;
    
    if (!bot) {
      return res.status(200).json({ success: true, message: 'Telegram not configured' });
    }
    
    const message = `
📚 *New Exercise Submission*
• Student: ${studentName}
• Book: ${book}
• Unit: ${unit}
• Exercise: ${exerciseType}
• Score: ${score}/${totalQuestions}
• Time: ${new Date().toLocaleString()}
    `;
    
    await bot.sendMessage(TELEGRAM_CHAT_ID, message, { parse_mode: 'Markdown' });
    
    res.status(200).json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = app;
