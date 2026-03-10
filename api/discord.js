// api/auth/discord.js
export default function handler(req, res) {
  const CLIENT_ID = process.env.DISCORD_CLIENT_ID;
  
  // Автоматически определяем URL сайта
  const baseUrl = process.env.VERCEL_URL 
    ? `https://${process.env.VERCEL_URL}` 
    : 'http://localhost:3000';
    
  const REDIRECT_URI = `${baseUrl}/api/auth/callback`;
  
  const discordAuthUrl = `https://discord.com/api/oauth2/authorize?client_id=${CLIENT_ID}&redirect_uri=${encodeURIComponent(REDIRECT_URI)}&response_type=code&scope=identify`;
  
  console.log('Redirect URI:', REDIRECT_URI); // Для отладки
  
  res.redirect(discordAuthUrl);
}
