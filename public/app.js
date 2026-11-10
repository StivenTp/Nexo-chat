'use strict';

/**
 * NEXO Chat - Cliente del navegador.
 *
 * Eventos destacados:
 * user:join -> ingreso; chat:send -> mensaje enviado; chat:message -> difusión;
 * users:update -> participantes; chat:typing -> escribiendo; chat:history -> historial.
 * Todos los textos suministrados por usuarios se muestran con textContent (no HTML).
 */
const socket = io({ autoConnect: false, reconnection: true });

const $ = (selector) => document.querySelector(selector);
const elements = {
  sidebar: $('#sidebar'), menuButton: $('#menuButton'), mobileOverlay: $('#mobileOverlay'),
  modal: $('#joinModal'), joinForm: $('#joinForm'), joinButton: $('#joinButton'),
  usernameInput: $('#usernameInput'), joinError: $('#joinError'),
  input: $('#messageInput'), form: $('#messageForm'), sendButton: $('#sendButton'),
  messages: $('#messages'), intro: $('#chatIntro'), conversation: $('#conversation'),
  bottomAnchor: $('#bottomAnchor'), typingLabel: $('#typingLabel'),
  sidebarStatusLight: $('#sidebarStatusLight'), sidebarConnectionText: $('#sidebarConnectionText'),
  sidebarOnlineCount: $('#sidebarOnlineCount'), headerOnlineCount: $('#headerOnlineCount'),
  headerOnlineLight: $('#headerOnlineLight'), onlineUsers: $('#onlineUsers'),
  myAvatar: $('#myAvatar'), myName: $('#myName'), disconnectBanner: $('#disconnectBanner'),
  charCount: $('#charCount'), inviteButton: $('#inviteButton'), toast: $('#toast'),
};

let username = '';
let joined = false;
let typingTimeout;
let toastTimeout;
const remoteTyping = new Map();

try { elements.usernameInput.value = localStorage.getItem('nexo_name') || ''; } catch { /* almacenamiento opcional */ }

function initials(name) {
  return name.trim().split(/\s+/).slice(0, 2).map((word) => word[0]).join('').toUpperCase();
}

function formatTime(timestamp) {
  return new Date(timestamp).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' });
}

function scrollToLatest(smooth = false) {
  elements.bottomAnchor.scrollIntoView({ block: 'end', behavior: smooth ? 'smooth' : 'instant' });
}

function updateComposer() {
  const value = elements.input.value.trim();
  elements.input.disabled = !joined;
  elements.sendButton.disabled = !joined || !value;
  elements.charCount.textContent = `${elements.input.value.length} / 500`;
  elements.input.style.height = '30px';
  elements.input.style.height = `${Math.min(elements.input.scrollHeight, 120)}px`;
}

function makeElement(tag, className, content) {
  const el = document.createElement(tag);
  if (className) el.className = className;
  if (content !== undefined) el.textContent = content;
  return el;
}

function appendMessage(message, smooth = true) {
  if (!message || typeof message.text !== 'string') return;
  elements.intro.hidden = true;
  const own = message.senderId === socket.id;
  const item = makeElement('article', `message${own ? ' own' : ''}`);
  const avatar = makeElement('span', 'message-avatar', initials(message.username || '?'));
  avatar.setAttribute('aria-hidden', 'true');
  const content = makeElement('div', 'message-content');
  const info = makeElement('div', 'message-info');
  const author = makeElement('span', 'message-author', own ? 'Tú' : message.username);
  const time = makeElement('time', 'message-time', formatTime(message.timestamp));
  time.dateTime = message.timestamp;
  const bubble = makeElement('div', 'message-bubble', message.text);
  info.append(author, time);
  content.append(info, bubble);
  item.append(avatar, content);
  elements.messages.append(item);
  scrollToLatest(smooth);
}

function appendSystem(notice) {
  if (!notice || typeof notice.text !== 'string') return;
  const item = makeElement('div', 'system-message', `✦  ${notice.text}`);
  elements.messages.append(item);
  scrollToLatest(true);
}

function renderUsers(users) {
  elements.onlineUsers.replaceChildren();
  elements.sidebarOnlineCount.textContent = String(users.length);
  elements.headerOnlineCount.textContent = `${users.length} en línea`;
  if (!users.length) {
    elements.onlineUsers.append(makeElement('p', 'users-empty', 'Esperando participantes…'));
    return;
  }
  for (const user of users) {
    const me = user.id === socket.id;
    const row = makeElement('div', `online-user${me ? ' you' : ''}`);
    row.append(makeElement('div', 'user-avatar', initials(user.username)));
    row.append(makeElement('span', 'user-name', user.username));
    if (me) row.append(makeElement('span', 'you-label', '(tú)'));
    elements.onlineUsers.append(row);
  }
}

function updateConnection(connected) {
  elements.sidebarStatusLight.classList.toggle('offline', !connected);
  elements.headerOnlineLight.classList.toggle('offline', !connected);
  elements.sidebarConnectionText.textContent = connected ? 'Conectado en vivo' : 'Sin conexión';
  elements.disconnectBanner.hidden = connected || !username || !elements.modal.hidden;
}

function showToast(text) {
  elements.toast.textContent = text;
  elements.toast.classList.add('show');
  clearTimeout(toastTimeout);
  toastTimeout = setTimeout(() => elements.toast.classList.remove('show'), 2800);
}

function registerUser() {
  if (!socket.connected || !username) return;
  socket.emit('user:join', username, (result) => {
    elements.joinButton.disabled = false;
    if (!result || !result.ok) {
      elements.joinError.textContent = result?.error || 'No fue posible ingresar.';
      return;
    }
    joined = true;
    username = result.username;
    elements.modal.hidden = true;
    elements.myName.textContent = username;
    elements.myAvatar.textContent = initials(username);
    try { localStorage.setItem('nexo_name', username); } catch { /* almacenamiento opcional */ }
    updateConnection(true);
    updateComposer();
    elements.input.focus();
  });
}

elements.joinForm.addEventListener('submit', (event) => {
  event.preventDefault();
  const candidate = elements.usernameInput.value.replace(/\s+/g, ' ').trim();
  if (candidate.length < 2 || candidate.length > 24) {
    elements.joinError.textContent = 'Escribe un nombre de 2 a 24 caracteres.';
    return;
  }
  username = candidate;
  elements.joinError.textContent = '';
  elements.joinButton.disabled = true;
  if (socket.connected) registerUser();
  else socket.connect();
});

socket.on('connect', () => {
  updateConnection(true);
  if (username) registerUser();
});

socket.on('disconnect', () => {
  joined = false;
  remoteTyping.clear();
  updateTyping();
  updateComposer();
  updateConnection(false);
  renderUsers([]);
});

socket.on('connect_error', () => {
  updateConnection(false);
  elements.joinButton.disabled = false;
  if (!elements.modal.hidden) {
    elements.joinError.textContent = 'No se pudo conectar al servidor. Inténtalo de nuevo.';
  }
});

socket.on('chat:history', (history) => {
  if (!Array.isArray(history)) return;
  elements.messages.replaceChildren();
  elements.intro.hidden = history.length > 0;
  for (const message of history) appendMessage(message, false);
  scrollToLatest(false);
});
socket.on('chat:message', (message) => appendMessage(message));
socket.on('chat:system', appendSystem);
socket.on('users:update', renderUsers);

function updateTyping() {
  const names = [...remoteTyping.values()];
  if (!names.length) elements.typingLabel.textContent = '';
  else if (names.length === 1) elements.typingLabel.textContent = `✎ ${names[0]} está escribiendo…`;
  else elements.typingLabel.textContent = `✎ ${names.slice(0, 2).join(' y ')} están escribiendo…`;
}

socket.on('chat:typing', (event) => {
  if (!event || !event.id) return;
  if (event.isTyping) remoteTyping.set(event.id, event.username);
  else remoteTyping.delete(event.id);
  updateTyping();
});

function stopTyping() {
  clearTimeout(typingTimeout);
  if (joined) socket.emit('chat:typing', false);
}

elements.input.addEventListener('input', () => {
  updateComposer();
  if (joined) {
    socket.emit('chat:typing', Boolean(elements.input.value.trim()));
    clearTimeout(typingTimeout);
    typingTimeout = setTimeout(stopTyping, 1100);
  }
});

elements.input.addEventListener('keydown', (event) => {
  if (event.key === 'Enter' && !event.shiftKey && !event.isComposing) {
    event.preventDefault();
    elements.form.requestSubmit();
  }
});

elements.form.addEventListener('submit', (event) => {
  event.preventDefault();
  const text = elements.input.value.trim();
  if (!joined || !text) return;
  socket.emit('chat:send', text, (reply) => {
    if (!reply?.ok) {
      showToast(reply?.error || 'No fue posible enviar el mensaje.');
      return;
    }
    // Borrar solo cuando el servidor haya confirmado recepción.
    if (elements.input.value.trim() === text) elements.input.value = '';
    stopTyping();
    updateComposer();
    elements.input.focus();
  });
});

function closeSidebar() {
  elements.sidebar.classList.remove('open');
  elements.mobileOverlay.hidden = true;
}
elements.menuButton.addEventListener('click', () => {
  const opening = !elements.sidebar.classList.contains('open');
  elements.sidebar.classList.toggle('open', opening);
  elements.mobileOverlay.hidden = !opening;
});
elements.mobileOverlay.addEventListener('click', closeSidebar);

elements.inviteButton.addEventListener('click', async () => {
  try {
    await navigator.clipboard.writeText(window.location.href);
    showToast('¡Enlace del chat copiado!');
  } catch {
    showToast('Comparte la dirección que aparece en tu navegador.');
  }
});

updateComposer();
