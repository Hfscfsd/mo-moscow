// api/auth/callback.js
import fetch from 'node-fetch';
import { serialize } from 'cookie';

export default async function handler(req, res) {
  const { code } = req.query;
  
  if (!code) {
    return res.redirect('/?error=no_code');
  }
  
  try {
    const CLIENT_ID = process.env.DISCORD_CLIENT_ID;
    const CLIENT_SECRET = process.env.DISCORD_CLIENT_SECRET;
    const REDIRECT_URI = `${process.env.VERCEL_URL ? 'https://' + process.env.VERCEL_URL : 'http://localhost:3000'}/api/auth/callback`;
    
    // Обмен кода на токен
    const tokenResponse = await fetch('https://discord.com/api/oauth2/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: CLIENT_ID,
        client_secret: CLIENT_SECRET,
        code,
        grant_type: 'authorization_code',
        redirect_uri: REDIRECT_URI,
        scope: 'identify'
      })
    });
    
    const tokenData = await tokenResponse.json();
    
    // Получение информации о пользователе
    const userResponse = await fetch('https://discord.com/api/users/@me', {
      headers: { Authorization: `Bearer ${tokenData.access_token}` }
    });
    
    const userData = await userResponse.json();
    
    // Здесь можно добавить проверку звания из Roblox
    const user = {
      id: userData.id,
      username: userData.username,
      avatar: userData.avatar,
      hasAccess: userData.id === process.env.ADMIN_USER_ID // Простая проверка
    };
    
    // Сохраняем в куки (в Vercel нет сессий)
    const cookie = serialize('user', JSON.stringify(user), {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 60 * 60 * 24 * 7, // 7 дней
      path: '/'
    });
    
    res.setHeader('Set-Cookie', cookie);
    res.redirect('/');
    
  } catch (error) {
    console.error('Auth error:', error);
    res.redirect('/?error=auth_failed');
  }
}