// lib/storage.js
// В Vercel нельзя полагаться на глобальные переменные. Используем простой JSON-файл.
// В реальном проекте лучше использовать базу данных (MongoDB, PostgreSQL и т.д.)

import fs from 'fs';
import path from 'path';

const STORAGE_FILE = path.join('/tmp', 'messages.json'); // /tmp доступен для записи в Vercel

// Загрузка сообщений
export function loadMessages() {
  try {
    if (fs.existsSync(STORAGE_FILE)) {
      const data = fs.readFileSync(STORAGE_FILE, 'utf8');
      return JSON.parse(data);
    }
  } catch (error) {
    console.error('Error loading messages:', error);
  }
  return [];
}

// Сохранение сообщений
export function saveMessages(messages) {
  try {
    fs.writeFileSync(STORAGE_FILE, JSON.stringify(messages, null, 2));
    return true;
  } catch (error) {
    console.error('Error saving messages:', error);
    return false;
  }
}

// Добавление нового сообщения
export function addMessage(message) {
  const messages = loadMessages();
  messages.push(message);
  saveMessages(messages);
  return message;
}

// Обновление статуса сообщения
export function updateMessageStatus(id, status) {
  const messages = loadMessages();
  const index = messages.findIndex(m => m.id === id);
  if (index !== -1) {
    messages[index].status = status;
    saveMessages(messages);
    return true;
  }
  return false;
}

// Удаление сообщения
export function deleteMessage(id) {
  const messages = loadMessages();
  const filtered = messages.filter(m => m.id !== id);
  if (filtered.length !== messages.length) {
    saveMessages(filtered);
    return true;
  }
  return false;
}