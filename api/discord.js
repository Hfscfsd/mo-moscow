// api/auth/discord.js
export default function handler(req, res) {
  const CLIENT_ID = '1471781882231394344';
  
  // ВАЖНО: используем правильное имя домена
  const REDIRECT_URI = 'https://ministry-defence.vercel.app/api/auth/callback';
  
  const discordAuthUrl = `https://discord.com/api/oauth2/authorize?client_id=${CLIENT_ID}&redirect_uri=${encodeURIComponent(REDIRECT_URI)}&response_type=code&scope=identify`;
  
  res.redirect(discordAuthUrl);
}
