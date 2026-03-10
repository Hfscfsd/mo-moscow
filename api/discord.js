// api/auth/discord.js
export default function handler(req, res) {
  // Ваши данные
  const CLIENT_ID = '1471781882231394344';
  
  // Жестко прописываем URL вашего сайта (без автоматики)
  const REDIRECT_URI = 'https://mo-moscow.vercel.app/api/auth/callback';
  
  // Формируем ссылку для Discord
  const discordAuthUrl = `https://discord.com/api/oauth2/authorize?client_id=${CLIENT_ID}&redirect_uri=${encodeURIComponent(REDIRECT_URI)}&response_type=code&scope=identify`;
  
  console.log('Redirect URI:', REDIRECT_URI);
  console.log('Full auth URL:', discordAuthUrl);
  
  // Отправляем пользователя в Discord
  res.redirect(discordAuthUrl);
}
