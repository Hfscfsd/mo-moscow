// ===========================================
// МИНИСТЕРСТВО ОБОРОНЫ Г.МОСКВА
// Система анонимных обращений
// Версия: 2.0.0
// ===========================================

const express = require('express');
const session = require('express-session');
const fetch = require('node-fetch');
const cors = require('cors');
const path = require('path');
const crypto = require('crypto');

// Инициализация приложения
const app = express();

// ===========================================
// КОНФИГУРАЦИЯ
// ===========================================

// Настройки сервера
const PORT = 3000;
const HOST = 'localhost';
const SESSION_SECRET = crypto.randomBytes(32).toString('hex'); // Генерируется при каждом запуске

// Discord OAuth2 настройки (ваши данные)
const DISCORD_CLIENT_ID = '1471781882231394344';
const DISCORD_CLIENT_SECRET = 'KW1dzvOIrrmtGVIn8yPwTSBQ7KdlVw_n';
const DISCORD_REDIRECT_URI = 'http://localhost:3000/auth/discord/callback';

// Discord Webhook (ваш)
const DISCORD_WEBHOOK_URL = 'https://discord.com/api/webhooks/1480813165477498920/iwqpqS7ziC4sd3jWU9tlFbNkm8h26gfdfH54Qy8pvzf4Qbv234Y4YWpL17cTtg9CdDxX';

// Roblox группа
const ROBLOX_GROUP_ID = 11490014;
const ROBLOX_GROUP_NAME = 'RP';

// ===========================================
// ХРАНИЛИЩЕ ДАННЫХ (в памяти)
// ===========================================

// Сообщения
let messages = [
    {
        id: 'ДОН-TEST-001',
        type: 'Тестовое сообщение',
        message: 'Это тестовое сообщение для проверки системы. Если вы это видите, значит админ-панель работает правильно.',
        userId: '970227637173764156',
        date: new Date().toISOString(),
        status: 'read',
        replies: []
    }
];

// Счетчик для генерации ID
let messageCounter = messages.length + 1;

// ===========================================
// БАЗА ДАННЫХ ЗВАНИЙ (тестовая)
// ===========================================

// Соответствие Discord ID -> Roblox звание
const RANKS_DATABASE = {
    // Главнокомандование (полный доступ)
    '970227637173764156': { 
        rank: 255, 
        name: 'Главнокомандующий',
        robloxId: '123456789',
        joinDate: '2020-01-01'
    },
    // Генералитет (доступ)
    '123456789012345678': { 
        rank: 200, 
        name: 'Генерал армии',
        robloxId: '234567890',
        joinDate: '2021-03-15'
    },
    '234567890123456789': { 
        rank: 150, 
        name: 'Генерал-лейтенант',
        robloxId: '345678901',
        joinDate: '2021-06-20'
    },
    '345678901234567890': { 
        rank: 100, 
        name: 'Генерал-майор',
        robloxId: '456789012',
        joinDate: '2022-01-10'
    },
    // Старшие офицеры (доступ)
    '456789012345678901': { 
        rank: 50, 
        name: 'Полковник',
        robloxId: '567890123',
        joinDate: '2022-08-05'
    },
    // Офицеры (НЕТ доступа)
    '567890123456789012': { 
        rank: 30, 
        name: 'Подполковник',
        robloxId: '678901234',
        joinDate: '2023-02-18'
    },
    '678901234567890123': { 
        rank: 20, 
        name: 'Майор',
        robloxId: '789012345',
        joinDate: '2023-05-22'
    }
};

// ===========================================
// НАСТРОЙКА MIDDLEWARE
// ===========================================

// Настройка сессий
app.use(session({
    secret: SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: { 
        secure: false, // true для HTTPS
        httpOnly: true,
        maxAge: 24 * 60 * 60 * 1000, // 24 часа
        sameSite: 'lax'
    },
    name: 'mo-moscow-session'
}));

// Разрешаем CORS
app.use(cors({
    origin: 'http://localhost:3000',
    credentials: true
}));

// Парсинг JSON
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Статические файлы
app.use(express.static(path.join(__dirname, 'public')));

// ===========================================
// ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ
// ===========================================

/**
 * Проверка звания пользователя в Roblox группе
 * @param {string} discordId - Discord ID пользователя
 * @returns {Promise<Object|null>} Информация о звании или null
 */
async function checkRobloxRank(discordId) {
    try {
        console.log(`🔍 Проверка звания для Discord ID: ${discordId}`);
        
        // Проверяем в локальной базе
        if (RANKS_DATABASE[discordId]) {
            console.log(`✅ Найдено звание: ${RANKS_DATABASE[discordId].name} (ранг ${RANKS_DATABASE[discordId].rank})`);
            return RANKS_DATABASE[discordId];
        }
        
        // Здесь будет реальный запрос к Roblox API
        // const response = await fetch(`https://groups.roblox.com/v1/groups/${ROBLOX_GROUP_ID}/users/${robloxId}`);
        // const data = await response.json();
        
        console.log(`⚠️ Пользователь ${discordId} не найден в базе званий`);
        return null;
    } catch (error) {
        console.error('❌ Ошибка при проверке звания:', error);
        return null;
    }
}

/**
 * Проверка доступа (Полковник и выше)
 * @param {number} rank - Числовой ранг
 * @returns {boolean} Есть ли доступ
 */
function hasAccess(rank) {
    if (!rank) return false;
    // Полковник = 50+, Генералы = 100-255
    const hasRank = rank >= 50;
    console.log(`🔐 Проверка доступа: ранг ${rank} -> ${hasRank ? '✅ ДОСТУП' : '❌ НЕТ ДОСТУПА'}`);
    return hasRank;
}

/**
 * Генерация ID сообщения
 * @returns {string} Уникальный ID
 */
function generateMessageId() {
    const timestamp = Date.now().toString(36).toUpperCase();
    const random = crypto.randomBytes(4).toString('hex').toUpperCase();
    const number = messageCounter++;
    return `ДОН-${timestamp}-${random}-${number}`;
}

/**
 * Форматирование даты
 * @param {string} date - ISO дата
 * @returns {string} Отформатированная дата
 */
function formatDate(date) {
    return new Date(date).toLocaleString('ru-RU', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
    });
}

// ===========================================
// МАРШРУТЫ АВТОРИЗАЦИИ
// ===========================================

/**
 * Начало авторизации через Discord
 */
app.get('/auth/discord', (req, res) => {
    const authUrl = new URL('https://discord.com/api/oauth2/authorize');
    authUrl.searchParams.append('client_id', DISCORD_CLIENT_ID);
    authUrl.searchParams.append('redirect_uri', DISCORD_REDIRECT_URI);
    authUrl.searchParams.append('response_type', 'code');
    authUrl.searchParams.append('scope', 'identify');
    
    console.log('🔐 Перенаправление на Discord для авторизации');
    console.log('📎 URL:', authUrl.toString());
    
    res.redirect(authUrl.toString());
});

/**
 * Callback после авторизации Discord
 */
app.get('/auth/discord/callback', async (req, res) => {
    const { code, error } = req.query;
    
    if (error) {
        console.error('❌ Ошибка авторизации от Discord:', error);
        return res.redirect('/?error=discord_auth_failed');
    }
    
    if (!code) {
        console.error('❌ Нет кода авторизации');
        return res.redirect('/?error=no_code');
    }
    
    console.log('📥 Получен код авторизации:', code.substring(0, 10) + '...');
    
    try {
        // Обмен кода на токен
        const tokenResponse = await fetch('https://discord.com/api/oauth2/token', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            body: new URLSearchParams({
                client_id: DISCORD_CLIENT_ID,
                client_secret: DISCORD_CLIENT_SECRET,
                code: code,
                grant_type: 'authorization_code',
                redirect_uri: DISCORD_REDIRECT_URI,
                scope: 'identify'
            })
        });
        
        if (!tokenResponse.ok) {
            const errorText = await tokenResponse.text();
            console.error('❌ Ошибка получения токена:', errorText);
            return res.redirect('/?error=token_failed');
        }
        
        const tokenData = await tokenResponse.json();
        console.log('✅ Токен получен успешно');
        
        // Получение информации о пользователе
        const userResponse = await fetch('https://discord.com/api/users/@me', {
            headers: {
                'Authorization': `Bearer ${tokenData.access_token}`
            }
        });
        
        if (!userResponse.ok) {
            console.error('❌ Ошибка получения данных пользователя');
            return res.redirect('/?error=user_failed');
        }
        
        const userData = await userResponse.json();
        console.log('✅ Данные пользователя получены:');
        console.log(`   ID: ${userData.id}`);
        console.log(`   Имя: ${userData.username}`);
        console.log(`   Дискриминатор: ${userData.discriminator}`);
        
        // Проверка звания в Roblox
        const robloxRank = await checkRobloxRank(userData.id);
        
        // Сохраняем пользователя в сессии
        req.session.user = {
            id: userData.id,
            username: userData.username,
            discriminator: userData.discriminator,
            avatar: userData.avatar,
            robloxRank: robloxRank,
            hasAccess: hasAccess(robloxRank?.rank),
            loginTime: new Date().toISOString(),
            ip: req.ip
        };
        
        console.log(`👤 Пользователь ${userData.username} авторизован`);
        console.log(`🎖️ Звание: ${robloxRank?.name || 'Не определено'}`);
        console.log(`🔐 Доступ к админке: ${req.session.user.hasAccess ? '✅' : '❌'}`);
        
        res.redirect('/');
    } catch (error) {
        console.error('❌ Критическая ошибка при авторизации:', error);
        res.redirect('/?error=auth_failed');
    }
});

// ===========================================
// API МАРШРУТЫ
// ===========================================

/**
 * Получение информации о текущем пользователе
 */
app.get('/api/user', (req, res) => {
    if (req.session.user) {
        console.log(`📊 Запрос информации о пользователе: ${req.session.user.username}`);
        res.json(req.session.user);
    } else {
        console.log('📊 Запрос информации о пользователе: не авторизован');
        res.status(401).json({ error: 'Not authenticated' });
    }
});

/**
 * Выход из системы
 */
app.post('/api/logout', (req, res) => {
    if (req.session.user) {
        console.log(`👋 Выход пользователя: ${req.session.user.username}`);
    }
    
    req.session.destroy((err) => {
        if (err) {
            console.error('❌ Ошибка при выходе:', err);
            return res.status(500).json({ error: 'Logout failed' });
        }
        res.json({ success: true, message: 'Successfully logged out' });
    });
});

/**
 * Отправка нового сообщения
 */
app.post('/api/send-message', async (req, res) => {
    try {
        const { type, message, userId } = req.body;
        
        console.log('📝 Получено новое донесение:');
        console.log(`   Тип: ${type}`);
        console.log(`   Сообщение: ${message.substring(0, 50)}${message.length > 50 ? '...' : ''}`);
        console.log(`   Discord ID: ${userId || 'Не указан'}`);
        
        // Валидация
        if (!type || !message) {
            console.log('❌ Ошибка: не заполнены обязательные поля');
            return res.status(400).json({ error: 'Type and message are required' });
        }
        
        if (message.length > 1000) {
            console.log('❌ Ошибка: сообщение слишком длинное');
            return res.status(400).json({ error: 'Message too long' });
        }
        
        // Создание сообщения
        const messageId = generateMessageId();
        const newMessage = {
            id: messageId,
            type: type,
            message: message,
            userId: userId || null,
            date: new Date().toISOString(),
            status: 'new',
            replies: [],
            userAgent: req.headers['user-agent'],
            ip: req.ip
        };
        
        messages.push(newMessage);
        console.log(`✅ Сообщение сохранено с ID: ${messageId}`);
        
        // Создание embed для Discord
        const embed = {
            title: `⚡ НОВОЕ ДОНЕСЕНИЕ`,
            color: 0xd4af37,
            description: `**ID:** ${messageId}\n**Тип:** ${type}\n\n**Содержание:**\n\`\`\`${message}\`\`\``,
            fields: [],
            timestamp: new Date().toISOString(),
            footer: {
                text: 'Министерство Обороны Г.Москва'
            }
        };
        
        if (userId) {
            embed.fields.push({
                name: '📧 Discord ID',
                value: `||${userId}||`,
                inline: true
            });
        }
        
        embed.fields.push({
            name: '📊 Статус',
            value: 'Ожидает рассмотрения',
            inline: true
        });
        
        // Кнопки для Discord
        const components = [{
            type: 1,
            components: [
                {
                    type: 2,
                    style: 1,
                    label: '⚔️ ОТВЕТИТЬ',
                    custom_id: `reply_${messageId}`,
                    emoji: { name: '⚔️' }
                },
                {
                    type: 2,
                    style: 3,
                    label: '✅ ПРИНЯТО',
                    custom_id: `read_${messageId}`,
                    emoji: { name: '✅' }
                },
                {
                    type: 2,
                    style: 4,
                    label: '🔥 УНИЧТОЖИТЬ',
                    custom_id: `delete_${messageId}`,
                    emoji: { name: '🔥' }
                }
            ]
        }];
        
        // Отправка в Discord с анимацией
        console.log('📤 Отправка в Discord...');
        
        try {
            // Сначала отправляем сообщение с анимацией
            const animResponse = await fetch(DISCORD_WEBHOOK_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    content: '⚡ **ПЕРЕДАЧА ДОНЕСЕНИЯ** ⚡',
                    username: 'Министерство Обороны Г.Москва',
                    avatar_url: 'https://cdn.discordapp.com/embed/avatars/0.png'
                })
            });
            
            if (!animResponse.ok) {
                console.warn('⚠️ Предупреждение: не удалось отправить анимацию');
            }
            
            // Через секунду отправляем полное сообщение
            setTimeout(async () => {
                try {
                    const fullResponse = await fetch(DISCORD_WEBHOOK_URL, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            embeds: [embed],
                            components: components,
                            username: 'Министерство Обороны Г.Москва',
                            avatar_url: 'https://cdn.discordapp.com/embed/avatars/0.png'
                        })
                    });
                    
                    if (fullResponse.ok) {
                        console.log('✅ Сообщение успешно отправлено в Discord');
                    } else {
                        console.warn('⚠️ Ошибка при отправке полного сообщения');
                    }
                } catch (error) {
                    console.error('❌ Ошибка при отправке в Discord:', error);
                }
            }, 1500);
            
        } catch (error) {
            console.error('❌ Ошибка при отправке в Discord:', error);
        }
        
        res.json({ 
            success: true, 
            messageId: messageId,
            message: 'Донесение успешно отправлено'
        });
        
    } catch (error) {
        console.error('❌ Критическая ошибка при отправке сообщения:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

/**
 * Получение всех сообщений (только для админов)
 */
app.get('/api/messages', (req, res) => {
    if (!req.session.user) {
        return res.status(401).json({ error: 'Not authenticated' });
    }
    
    if (!req.session.user.hasAccess) {
        return res.status(403).json({ 
            error: 'Access denied',
            message: 'Только офицеры в звании Полковник и выше имеют доступ'
        });
    }
    
    console.log(`📋 Запрос списка сообщений от ${req.session.user.username}`);
    res.json(messages);
});

/**
 * Отметить сообщение как прочитанное
 */
app.post('/api/messages/:id/read', (req, res) => {
    if (!req.session.user || !req.session.user.hasAccess) {
        return res.status(403).json({ error: 'Access denied' });
    }
    
    const { id } = req.params;
    const message = messages.find(m => m.id === id);
    
    if (!message) {
        return res.status(404).json({ error: 'Message not found' });
    }
    
    message.status = 'read';
    console.log(`✅ Сообщение ${id} отмечено как прочитанное пользователем ${req.session.user.username}`);
    
    res.json({ 
        success: true, 
        message: 'Message marked as read',
        id: id
    });
});

/**
 * Удалить сообщение
 */
app.post('/api/messages/:id/delete', (req, res) => {
    if (!req.session.user || !req.session.user.hasAccess) {
        return res.status(403).json({ error: 'Access denied' });
    }
    
    const { id } = req.params;
    const initialLength = messages.length;
    const deletedMessage = messages.find(m => m.id === id);
    
    messages = messages.filter(m => m.id !== id);
    
    if (messages.length === initialLength) {
        return res.status(404).json({ error: 'Message not found' });
    }
    
    console.log(`🔥 Сообщение ${id} удалено пользователем ${req.session.user.username}`);
    console.log(`   Тип: ${deletedMessage?.type}`);
    console.log(`   Дата: ${formatDate(deletedMessage?.date)}`);
    
    res.json({ 
        success: true, 
        message: 'Message deleted',
        id: id
    });
});

/**
 * Ответить на сообщение
 */
app.post('/api/messages/:id/reply', (req, res) => {
    if (!req.session.user || !req.session.user.hasAccess) {
        return res.status(403).json({ error: 'Access denied' });
    }
    
    const { id } = req.params;
    const { reply } = req.body;
    
    if (!reply) {
        return res.status(400).json({ error: 'Reply text is required' });
    }
    
    const message = messages.find(m => m.id === id);
    
    if (!message) {
        return res.status(404).json({ error: 'Message not found' });
    }
    
    if (!message.replies) {
        message.replies = [];
    }
    
    message.replies.push({
        text: reply,
        date: new Date().toISOString(),
        admin: req.session.user.username,
        rank: req.session.user.robloxRank?.name || 'Офицер'
    });
    
    message.status = 'replied';
    
    console.log(`✉️ Ответ на сообщение ${id} от ${req.session.user.username}`);
    console.log(`   Текст: ${reply.substring(0, 50)}${reply.length > 50 ? '...' : ''}`);
    
    res.json({ 
        success: true, 
        message: 'Reply sent',
        id: id
    });
});

/**
 * Получение статистики
 */
app.get('/api/stats', (req, res) => {
    if (!req.session.user || !req.session.user.hasAccess) {
        return res.status(403).json({ error: 'Access denied' });
    }
    
    const now = new Date();
    const today = now.toDateString();
    
    const stats = {
        total: messages.length,
        new: messages.filter(m => m.status === 'new').length,
        read: messages.filter(m => m.status === 'read').length,
        replied: messages.filter(m => m.status === 'replied').length,
        today: messages.filter(m => new Date(m.date).toDateString() === today).length,
        uniqueUsers: new Set(messages.map(m => m.userId).filter(Boolean)).size,
        lastUpdate: now.toISOString()
    };
    
    res.json(stats);
});

/**
 * Очистка всех сообщений (только для Главнокомандующего)
 */
app.post('/api/messages/clear', (req, res) => {
    if (!req.session.user || req.session.user.id !== '970227637173764156') {
        return res.status(403).json({ error: 'Только Главнокомандующий может выполнить это действие' });
    }
    
    const count = messages.length;
    messages = [];
    messageCounter = 1;
    
    console.log(`🔥 Все сообщения (${count}) удалены Главнокомандующим`);
    
    res.json({ 
        success: true, 
        message: `Удалено ${count} сообщений`,
        count: count
    });
});

// ===========================================
// ОБРАБОТКА ОШИБОК
// ===========================================

// 404
app.use((req, res) => {
    res.status(404).sendFile(path.join(__dirname, 'public', '404.html'));
});

// 500
app.use((err, req, res, next) => {
    console.error('❌ Необработанная ошибка:', err);
    res.status(500).json({ 
        error: 'Internal server error',
        message: 'Произошла внутренняя ошибка сервера'
    });
});

// ===========================================
// ЗАПУСК СЕРВЕРА
// ===========================================

app.listen(PORT, HOST, () => {
    console.log('\n' + '='.repeat(60));
    console.log('⚔️  МИНИСТЕРСТВО ОБОРОНЫ Г.МОСКВА ⚔️');
    console.log('='.repeat(60));
    console.log(`✅ Сервер запущен:`);
    console.log(`   📍 Адрес: http://${HOST}:${PORT}`);
    console.log(`   🕒 Время: ${new Date().toLocaleString('ru-RU')}`);
    console.log(`   🔐 Сессия: ${SESSION_SECRET.substring(0, 10)}...`);
    console.log('='.repeat(60));
    console.log(`📡 Discord OAuth2:`);
    console.log(`   🆔 Client ID: ${DISCORD_CLIENT_ID}`);
    console.log(`   🔄 Redirect URI: ${DISCORD_REDIRECT_URI}`);
    console.log('='.repeat(60));
    console.log(`📨 Discord Webhook:`);
    console.log(`   🔗 URL: ${DISCORD_WEBHOOK_URL.substring(0, 50)}...`);
    console.log('='.repeat(60));
    console.log(`🎮 Roblox интеграция:`);
    console.log(`   🏰 Группа ID: ${ROBLOX_GROUP_ID}`);
    console.log(`   📊 Пользователей в базе: ${Object.keys(RANKS_DATABASE).length}`);
    console.log('='.repeat(60));
    console.log(`📊 Статистика:`);
    console.log(`   💬 Всего сообщений: ${messages.length}`);
    console.log(`   🆕 Новых: ${messages.filter(m => m.status === 'new').length}`);
    console.log('='.repeat(60));
    console.log('🟢 Сервер готов к работе!\n');
});