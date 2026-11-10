'use strict';

/**
 * NEXO Chat - Servidor HTTP + Socket.IO.
 *
 * El módulo HTTP nativo sirve los archivos públicos, y Socket.IO permite
 * la comunicación bidireccional por eventos con todos los navegadores.
 * No se necesita Express ni una base de datos para esta actividad.
 */
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { Server } = require('socket.io');

const PUBLIC_DIR = path.join(__dirname, 'public');
const MAX_MESSAGE_LENGTH = 500;
const MAX_USERNAME_LENGTH = 24;
const MAX_HISTORY = 50;

// Lista explícita de archivos para no permitir acceso a archivos privados.
const PUBLIC_FILES = {
  '/': { file: 'index.html', type: 'text/html; charset=utf-8' },
  '/index.html': { file: 'index.html', type: 'text/html; charset=utf-8' },
  '/styles.css': { file: 'styles.css', type: 'text/css; charset=utf-8' },
  '/app.js': { file: 'app.js', type: 'application/javascript; charset=utf-8' },
};

function normalizeUsername(value) {
  if (typeof value !== 'string') return '';
  return value.replace(/\s+/g, ' ').trim().slice(0, MAX_USERNAME_LENGTH);
}

function createChatServer() {
  // Las estructuras se guardan en memoria. Se reinician al apagar el servidor.
  const users = new Map();
  const messageHistory = [];

  const server = http.createServer((req, res) => {
    let pathname;
    try {
      pathname = new URL(req.url, 'http://localhost').pathname;
    } catch {
      res.writeHead(400).end('Solicitud incorrecta');
      return;
    }

    if (req.method === 'GET' && pathname === '/health') {
      res.writeHead(200, {
        'Content-Type': 'application/json; charset=utf-8',
        'Cache-Control': 'no-store',
      });
      res.end(JSON.stringify({ status: 'ok', online: users.size }));
      return;
    }

    const asset = PUBLIC_FILES[pathname];
    if (req.method !== 'GET' || !asset) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('No encontrado');
      return;
    }

    const assetPath = path.join(PUBLIC_DIR, asset.file);
    res.writeHead(200, {
      'Content-Type': asset.type,
      'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff',
      'Referrer-Policy': 'no-referrer',
      'Content-Security-Policy': "default-src 'self'; script-src 'self'; style-src 'self'; connect-src 'self' ws: wss:; img-src 'self' data:; object-src 'none'; base-uri 'none'",
    });
    const stream = fs.createReadStream(assetPath);
    stream.on('error', () => res.destroy());
    stream.pipe(res);
  });

  const io = new Server(server, {
    // Socket.IO distribuye su script del cliente desde /socket.io/socket.io.js.
    serveClient: true,
    maxHttpBufferSize: 20_000,
  });

  function broadcastUsers() {
    const onlineUsers = [...users].map(([id, username]) => ({ id, username }));
    onlineUsers.sort((a, b) => a.username.localeCompare(b.username, 'es'));
    io.emit('users:update', onlineUsers);
  }

  function broadcastNotice(text) {
    io.emit('chat:system', { text, timestamp: new Date().toISOString() });
  }

  io.on('connection', (socket) => {
    socket.on('user:join', (name, acknowledge) => {
      const username = normalizeUsername(name);
      if (username.length < 2) {
        if (typeof acknowledge === 'function') {
          acknowledge({ ok: false, error: 'Escribe un nombre de 2 a 24 caracteres.' });
        }
        return;
      }

      // Una reconexión puede registrarse; dos altas en el mismo socket no.
      if (users.has(socket.id)) {
        if (typeof acknowledge === 'function') {
          acknowledge({ ok: true, id: socket.id, username: users.get(socket.id) });
        }
        return;
      }

      users.set(socket.id, username);
      socket.emit('chat:history', messageHistory);
      if (typeof acknowledge === 'function') {
        acknowledge({ ok: true, id: socket.id, username });
      }
      broadcastUsers();
      broadcastNotice(`${username} se ha unido a la conversación`);
    });

    socket.on('chat:send', (payload, acknowledge) => {
      const username = users.get(socket.id);
      const text = typeof payload === 'string' ? payload.trim() : '';
      const respond = typeof acknowledge === 'function' ? acknowledge : () => {};

      if (!username) {
        respond({ ok: false, error: 'Debes ingresar al chat antes de escribir.' });
        return;
      }
      if (!text || text.length > MAX_MESSAGE_LENGTH) {
        respond({ ok: false, error: `Envía un mensaje de 1 a ${MAX_MESSAGE_LENGTH} caracteres.` });
        return;
      }

      const message = {
        id: crypto.randomUUID(),
        senderId: socket.id,
        username,
        text,
        timestamp: new Date().toISOString(),
      };

      messageHistory.push(message);
      if (messageHistory.length > MAX_HISTORY) messageHistory.shift();

      // Difunde el mensaje a todos, incluido el emisor: una sola fuente de verdad.
      io.emit('chat:message', message);
      respond({ ok: true, id: message.id });
    });

    socket.on('chat:typing', (typing) => {
      const username = users.get(socket.id);
      if (!username || typeof typing !== 'boolean') return;
      socket.broadcast.emit('chat:typing', {
        id: socket.id,
        username,
        isTyping: typing,
      });
    });

    socket.on('disconnect', () => {
      const username = users.get(socket.id);
      if (!username) return;
      users.delete(socket.id);
      socket.broadcast.emit('chat:typing', {
        id: socket.id,
        username,
        isTyping: false,
      });
      broadcastUsers();
      broadcastNotice(`${username} ha salido de la conversación`);
    });
  });

  return { server, io };
}

if (require.main === module) {
  const port = Number(process.env.PORT) || 3000;
  const { server } = createChatServer();
  server.listen(port, '0.0.0.0', () => {
    console.log(`\n  NEXO Chat disponible en http://localhost:${port}\n  Presiona Ctrl+C para detener el servidor.\n`);
  });
}

module.exports = { createChatServer, normalizeUsername };
