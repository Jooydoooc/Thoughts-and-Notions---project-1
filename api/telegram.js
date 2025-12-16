// Telegram Bot API endpoint for Vercel
export default async function handler(req, res) {
    // Log request for debugging
    console.log('Telegram API called:', req.method, req.body);
    
    if (req.method !== 'POST') {
        console.log('Method not allowed:', req.method);
        return res.status(405).json({ 
            error: 'Method not allowed',
            supported: ['POST']
        });
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
        
        console.log('Processing submission for:', studentName);
        
        // Get environment variables
        const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
        const CHAT_ID = process.env.TELEGRAM_CHAT_ID;
        
        console.log('Bot token exists:', !!BOT_TOKEN);
        console.log('Chat ID exists:', !!CHAT_ID);
        
        if (!BOT_TOKEN || !CHAT_ID) {
            console.error('Missing environment variables:');
            console.error('BOT_TOKEN:', BOT_TOKEN ? 'Set' : 'Missing');
            console.error('CHAT_ID:', CHAT_ID ? 'Set' : 'Missing');
            
            // For local development, return success without sending
            if (process.env.NODE_ENV !== 'production') {
                console.log('Local development - simulating Telegram send');
                return res.status(200).json({ 
                    success: true, 
                    message: 'Simulated in development',
                    data: req.body 
                });
            }
            
            return res.status(500).json({ 
                error: 'Telegram not configured',
                message: 'Please set TELEGRAM_BOT_TOKEN and TELEGRAM_CHAT_ID environment variables'
            });
        }
        
        // Format message for Telegram
        const message = `
📚 *IELTS Reading Platform - New Submission*
━━━━━━━━━━━━━━━━━━━━
👤 *Student:* ${studentName || 'Unknown'}
🎯 *Group:* ${group || 'No Group'}
📖 *Book:* ${book || 'Unknown'}
📝 *Unit:* ${unit || 'Unknown'}
━━━━━━━━━━━━━━━━━━━━
📊 *Results:*
• Score: ${score || 0}/${totalQuestions || 0} (${percentage || 0}%)
• Reading Time: ${readingTime || 0} minutes
• Vocabulary Found: ${vocabularyFound || 0} words
━━━━━━━━━━━━━━━━━━━━
⏰ *Submitted:* ${timestamp ? new Date(timestamp).toLocaleString() : new Date().toLocaleString()}
🆔 *Student ID:* ${studentId || 'Unknown'}
        `.trim();
        
        console.log('Sending to Telegram:', message);
        
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
        console.log('Telegram API response:', data);
        
        if (!data.ok) {
            console.error('Telegram API error details:', {
                error_code: data.error_code,
                description: data.description
            });
            
            return res.status(500).json({ 
                error: 'Telegram API error',
                telegram_error: data.description,
                error_code: data.error_code
            });
        }
        
        console.log('Successfully sent to Telegram');
        return res.status(200).json({ 
            success: true, 
            message: 'Notification sent to Telegram',
            telegram_message_id: data.result.message_id
        });
        
    } catch (error) {
        console.error('Telegram handler error:', error);
        console.error('Error stack:', error.stack);
        
        return res.status(500).json({ 
            error: 'Internal server error',
            message: error.message,
            stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
        });
    }
}
