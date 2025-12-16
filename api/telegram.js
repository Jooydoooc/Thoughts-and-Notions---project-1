// Telegram Bot API endpoint for Vercel
export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }
    
    try {
        const {
            studentName,
            studentId,
            group,
            book,
            unit,
            score,
            totalQuestions,
            percentage,
            readingTime,
            vocabularyFound,
            timestamp
        } = req.body;
        
        // Get environment variables (set in Vercel dashboard)
        const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
        const CHAT_ID = process.env.TELEGRAM_CHAT_ID;
        
        if (!BOT_TOKEN || !CHAT_ID) {
            console.error('Telegram credentials not configured');
            return res.status(500).json({ error: 'Telegram not configured' });
        }
        
        // Format message for Telegram
        const message = `
📚 *IELTS Reading Platform - New Submission*
━━━━━━━━━━━━━━━━━━━━
👤 *Student:* ${studentName}
🎯 *Group:* ${group}
📖 *Book:* ${book}
📝 *Unit:* ${unit}
━━━━━━━━━━━━━━━━━━━━
📊 *Results:*
• Score: ${score}/${totalQuestions} (${percentage}%)
• Reading Time: ${readingTime} minutes
• Vocabulary Found: ${vocabularyFound} words
━━━━━━━━━━━━━━━━━━━━
⏰ *Submitted:* ${new Date(timestamp).toLocaleString()}
🆔 *Student ID:* ${studentId}
        `.trim();
        
        // Send to Telegram
        const telegramUrl = `https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`;
        const response = await fetch(telegramUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                chat_id: CHAT_ID,
                text: message,
                parse_mode: 'Markdown',
                disable_notification: false
            })
        });
        
        const data = await response.json();
        
        if (!data.ok) {
            console.error('Telegram API error:', data);
            return res.status(500).json({ error: 'Failed to send to Telegram' });
        }
        
        return res.status(200).json({ success: true, message: 'Notification sent' });
        
    } catch (error) {
        console.error('Telegram handler error:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
}
