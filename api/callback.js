// api/auth/callback.js
import fetch from 'node-fetch';
import { serialize } from 'cookie';

export default async function handler(req, res) {
  const { code } = req.query;
  
  if (!code) {
    return res.redirect('/?error=no_code');
  }
  
  try {
    const CLIENT_ID = '1471781882231394344';
    const CLIENT_SECRET = 'KW1dzvOIrrmtGVIn8yPwTSBQ7KdlVw_n';
    const REDIRECT_URI = 'https://ministry-defence.vercel.app/api/auth/callback';
    
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
    
    const userResponse = await fetch('https://discord.com/api/users/@me', {
      headers: { Authorization: `Bearer ${tokenData.access_token}` }
    });
    
    const userData = await userResponse.json();
    
    const hasAccess = userData.id === '970227637173764156';
    
    const user = {
      id: userData.id,
      username: userData.username,
      hasAccess: hasAccess
    };
    
    const cookie = serialize('user', JSON.stringify(user), {
      httpOnly: true,
      secure: true,
      maxAge: 60 * 60 * 24 * 7,
      path: '/'
    });
    
    res.setHeader('Set-Cookie', cookie);
    res.redirect('/');
    
  } catch (error) {
    console.error('Auth error:', error);
    res.redirect('/?error=auth_failed');
  }
}
