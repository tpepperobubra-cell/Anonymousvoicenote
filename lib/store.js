import fs from 'fs';
import path from 'path';
import { randomUUID } from 'crypto';

const DATA_PATH = path.join(process.cwd(), 'data.json');

// Load or initialize store
let store = { users: [], messages: [] };
try {
  if (fs.existsSync(DATA_PATH)) {
    store = JSON.parse(fs.readFileSync(DATA_PATH, 'utf-8'));
    console.log('Loaded store from data.json');
  }
} catch (err) {
  console.error('Failed to load store:', err);
}

// Save store to file
function saveStore() {
  try {
    fs.writeFileSync(DATA_PATH, JSON.stringify(store, null, 2), 'utf-8');
    console.log('Store saved to data.json');
  } catch (err) {
    console.error('Failed to save store:', err);
  }
}

// ------------------- Users -------------------
export function createUser(username) {
  const userLink = `anonymous-${Math.random().toString(36).substring(2,10)}`;
  const adminToken = randomUUID();
  const u = {
    id: randomUUID(),
    username: username.trim(),
    userLink: userLink.trim().toLowerCase(),
    adminToken,
    createdAt: new Date().toISOString()
  };
  store.users.push(u);
  saveStore();
  console.log('User created:', u);
  return u;
}

export function getUserByLink(link) {
  if (!link) return null;
  const normalized = link.trim().toLowerCase();
  const user = store.users.find(u => u.userLink === normalized) || null;
  console.log('getUserByLink:', { input: link, normalized, found: !!user });
  return user;
}

// ------------------- Messages -------------------
export function addMessage({ userLink, audioBase64, mime, duration }) {
  const m = {
    id: randomUUID(),
    userLink: userLink.trim().toLowerCase(),
    audioBase64,
    mime,
    duration,
    createdAt: new Date().toISOString()
  };
  store.messages.push(m);
  saveStore();
  console.log('Message added:', { id: m.id, userLink: m.userLink });
  return m;
}

export function listMessagesForUser(userLink) {
  const normalized = userLink.trim().toLowerCase();
  return store.messages.filter(m => m.userLink === normalized);
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
