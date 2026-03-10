// api/send-message.js
import { addMessage } from '../lib/storage.js';
import fetch from 'node-fetch';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  
  const { type, message, userId } = req.body;
  
  if (!type || !message) {
    return res.status(400).json({ error: 'Type and message are required' });
  }
  
  const messageId = `ДОН-${Date.now().toString(36).toUpperCase()}`;
  
  const newMessage = {
    id: messageId,
    type,
    message,
    userId: userId || null,
    date: new Date().toISOString(),
    status: 'new'
  };
  
  addMessage(newMessage);
  
  // Отправка в Discord Webhook
  const WEBHOOK_URL = process.env.DISCORD_WEBHOOK_URL;
  
  if (WEBHOOK_URL) {
    const embed = {
      title: `⚡ НОВОЕ ДОНЕСЕНИЕ`,
      color: 0xd4af37,
      description: `**Тип:** ${type}\n\n**Содержание:**\n\`\`\`${message}\`\`\``,
      timestamp: new Date().toISOString(),
      footer: { text: 'Министерство Обороны Г.Москва' }
    };
    
    if (userId) {
      embed.fields = [{ name: '📧 Discord ID', value: `||${userId}||` }];
    }
    
    await fetch(WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ embeds: [embed] })
    }).catch(console.error);
  }
  
  res.json({ success: true, messageId });
}