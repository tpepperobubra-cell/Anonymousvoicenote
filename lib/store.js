// lib/store.js
// Simple in-memory store for demo purposes.
// WARNING: not persistent — data will reset on server restart/redeploy.

import { nanoid } from 'nanoid';

const store = {
  users: [], // { id, username, userLink, adminToken, createdAt }
  messages: [] // { id, userLink, audioBase64, mime, duration, createdAt }
};

export function createUser(username) {
  const id = nanoid(12);
  const userLink = `anonymous-${nanoid(8)}`;
  const adminToken = nanoid(32);
  const createdAt = new Date().toISOString();
  const u = { id, username, userLink, adminToken, createdAt };
  store.users.push(u);
  return u;
}

export function getUserByLink(userLink) {
  return store.users.find(u => u.userLink === userLink) || null;
}

export function getUserById(id) {
  return store.users.find(u => u.id === id) || null;
}

export function listUsers() {
  return store.users.slice().reverse();
}

export function addMessage({ userLink, audioBase64, mime='audio/webm', duration=null }) {
  const id = nanoid(12);
  const createdAt = new Date().toISOString();
  const m = { id, userLink, audioBase64, mime, duration, createdAt };
  store.messages.push(m);
  return m;
}

export function listMessagesForUser(userLink) {
  return store.messages.filter(m => m.userLink === userLink).slice().reverse();
}

export function getMessageById(id) {
  return store.messages.find(m => m.id === id) || null;
}

export function deleteMessageById(id) {
  const idx = store.messages.findIndex(m => m.id === id);
  if (idx === -1) return false;
  store.messages.splice(idx, 1);
  return true;
}
