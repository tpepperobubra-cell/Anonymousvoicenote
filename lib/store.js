import fs from 'fs';
import path from 'path';
import { randomUUID } from 'crypto';

const DATA_PATH = path.join(process.cwd(), 'data.json');

// Load data from file or initialize
let store = { users: [], messages: [] };
try {
  if (fs.existsSync(DATA_PATH)) {
    store = JSON.parse(fs.readFileSync(DATA_PATH, 'utf-8'));
  }
} catch (err) {
  console.error('Failed to load store:', err);
}

// Save store to file
function saveStore() {
  fs.writeFileSync(DATA_PATH, JSON.stringify(store, null, 2), 'utf-8');
}

// Users
export function createUser(username) {
  const userLink = `anonymous-${Math.random().toString(36).substring(2,10)}`;
  const adminToken = randomUUID();
  const u = { id: randomUUID(), username, userLink, adminToken, createdAt: new Date().toISOString() };
  store.users.push(u);
  saveStore();
  return u;
}

export function getUserByLink(link) {
  if (!link) return null;
  return store.users.find(u => u.userLink.toLowerCase() === link.toLowerCase()) || null;
}

// Messages
export function addMessage({ userLink, audioBase64, mime, duration }) {
  const m = { id: randomUUID(), userLink, audioBase64, mime, duration, createdAt: new Date().toISOString() };
  store.messages.push(m);
  saveStore();
  return m;
}

export function listMessagesForUser(userLink) {
  return store.messages.filter(m => m.userLink.toLowerCase() === userLink.toLowerCase());
}

export function getMessageById(id) {
  return store.messages.find(m => m.id === id) || null;
}

export function deleteMessageById(id) {
  const index = store.messages.findIndex(m => m.id === id);
  if (index === -1) return false;
  store.messages.splice(index, 1);
  saveStore();
  return true;
}
