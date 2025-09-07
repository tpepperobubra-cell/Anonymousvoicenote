let users = [];
let messages = [];

export function getUsers() {
  return users;
}

export function addUser(name) {
  const user = { id: Date.now().toString(), name, createdAt: new Date(), messages: [] };
  users.push(user);
  return user;
}

export function getUserById(id) {
  return users.find(u => u.id === id);
}

export function getMessages() {
  return messages;
}

export function addMessage(content, userId) {
  const msg = { id: Date.now().toString(), content, userId, createdAt: new Date() };
  messages.push(msg);

  const user = users.find(u => u.id === userId);
  if (user) user.messages.push(msg);

  return msg;
}

export function getMessageById(id) {
  return messages.find(m => m.id === id);
}
