'use strict';

/** Pruebas reales del servidor usando dos clientes Socket.IO. */
const test = require('node:test');
const assert = require('node:assert/strict');
const { io: createClient } = require('socket.io-client');
const { createChatServer, normalizeUsername } = require('../server');

async function setup() {
  const { server, io } = createChatServer();
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const url = `http://127.0.0.1:${server.address().port}`;
  const clients = [];
  const connect = () => {
    const client = createClient(url, { transports: ['websocket'], reconnection: false });
    clients.push(client);
    return new Promise((resolve, reject) => {
      client.once('connect', () => resolve(client));
      client.once('connect_error', reject);
    });
  };
  const close = async () => {
    clients.forEach((client) => client.disconnect());
    await new Promise((resolve) => io.close(resolve));
  };
  return { url, connect, close };
}

function eventOnce(socket, name) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`Evento no recibido: ${name}`)), 2000);
    socket.once(name, (data) => {
      clearTimeout(timer);
      resolve(data);
    });
  });
}

function emitAck(socket, name, data) {
  return new Promise((resolve) => socket.emit(name, data, resolve));
}

test('El servidor HTTP sirve la interfaz y responde al estado de salud', async (t) => {
  const fixture = await setup();
  t.after(fixture.close);
  const page = await fetch(fixture.url);
  assert.equal(page.status, 200);
  assert.match(await page.text(), /NEXO/);
  const health = await (await fetch(`${fixture.url}/health`)).json();
  assert.deepEqual(health, { status: 'ok', online: 0 });
  const unknown = await fetch(`${fixture.url}/server.js`);
  assert.equal(unknown.status, 404);
});

test('Dos usuarios envían y reciben mensajes de inmediato', async (t) => {
  const fixture = await setup();
  t.after(fixture.close);
  const [alice, bob] = await Promise.all([fixture.connect(), fixture.connect()]);
  assert.equal((await emitAck(alice, 'user:join', 'Ana')).ok, true);
  const usersEvent = eventOnce(alice, 'users:update');
  assert.equal((await emitAck(bob, 'user:join', 'Luis')).ok, true);
  assert.equal((await usersEvent).length, 2);
  const incomingToBob = eventOnce(bob, 'chat:message');
  const echoToAlice = eventOnce(alice, 'chat:message');
  const acknowledgment = await emitAck(alice, 'chat:send', '¡Hola, Luis!');
  assert.equal(acknowledgment.ok, true);
  assert.equal((await incomingToBob).text, '¡Hola, Luis!');
  assert.equal((await echoToAlice).username, 'Ana');
});

test('Se valida ingreso y tamaño de mensajes, y se conserva historial en memoria', async (t) => {
  const fixture = await setup();
  t.after(fixture.close);
  const client = await fixture.connect();
  assert.equal((await emitAck(client, 'user:join', 'a')).ok, false);
  assert.equal((await emitAck(client, 'chat:send', 'Hola')).ok, false);
  assert.equal((await emitAck(client, 'user:join', 'Carla')).ok, true);
  assert.equal((await emitAck(client, 'chat:send', ' ')).ok, false);
  assert.equal((await emitAck(client, 'chat:send', 'x'.repeat(501))).ok, false);
  assert.equal((await emitAck(client, 'chat:send', 'Mensaje válido')).ok, true);
  const another = await fixture.connect();
  const historyEvent = eventOnce(another, 'chat:history');
  await emitAck(another, 'user:join', 'Pedro');
  const history = await historyEvent;
  assert.equal(history.length, 1);
  assert.equal(history[0].text, 'Mensaje válido');
});

test('El indicador de escritura se transmite entre clientes', async (t) => {
  const fixture = await setup();
  t.after(fixture.close);
  const [ana, luis] = await Promise.all([fixture.connect(), fixture.connect()]);
  await emitAck(ana, 'user:join', 'Ana');
  await emitAck(luis, 'user:join', 'Luis');
  const typingEvent = eventOnce(luis, 'chat:typing');
  ana.emit('chat:typing', true);
  const typing = await typingEvent;
  assert.equal(typing.username, 'Ana');
  assert.equal(typing.isTyping, true);
});

test('Los nombres se normalizan sin alterar texto Unicode', () => {
  assert.equal(normalizeUsername('  María   José  '), 'María José');
  assert.equal(normalizeUsername({ foo: 1 }), '');
});
