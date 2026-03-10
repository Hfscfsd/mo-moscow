// api/messages.js
import { loadMessages } from '../lib/storage.js';
import { parse } from 'cookie';

export default function handler(req, res) {
  const cookies = parse(req.headers.cookie || '');
  const user = cookies.user ? JSON.parse(cookies.user) : null;
  
  if (!user || !user.hasAccess) {
    return res.status(403).json({ error: 'Access denied' });
  }
  
  const messages = loadMessages();
  res.json(messages);
}