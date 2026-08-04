import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { resolveBaseUrl } from './api.ts';
import { toWsUrl } from './websocket.ts';
import fs from 'node:fs';
import path from 'node:path';

describe('URL Configuration & WebSocket Conversion', () => {
  it('returns default local base URL when environment variable is omitted or undefined', () => {
    assert.equal(resolveBaseUrl(undefined), 'http://127.0.0.1:8000');
  });

  it('returns default local base URL when environment variable is empty or whitespace', () => {
    assert.equal(resolveBaseUrl(''), 'http://127.0.0.1:8000');
    assert.equal(resolveBaseUrl('   '), 'http://127.0.0.1:8000');
  });

  it('uses configured production URL when VITE_API_BASE_URL is set', () => {
    assert.equal(
      resolveBaseUrl('https://mendicot-backend.onrender.com'),
      'https://mendicot-backend.onrender.com',
    );
  });

  it('strips trailing slashes from configured base URL', () => {
    assert.equal(
      resolveBaseUrl('https://mendicot-backend.onrender.com/'),
      'https://mendicot-backend.onrender.com',
    );
    assert.equal(
      resolveBaseUrl('https://mendicot-backend.onrender.com///'),
      'https://mendicot-backend.onrender.com',
    );
  });

  it('trims surrounding whitespace from configured base URL', () => {
    assert.equal(
      resolveBaseUrl('  https://mendicot-backend.onrender.com/  '),
      'https://mendicot-backend.onrender.com',
    );
  });

  it('converts HTTP URL to WS WebSocket URL', () => {
    assert.equal(toWsUrl('http://127.0.0.1:8000'), 'ws://127.0.0.1:8000');
  });

  it('converts HTTPS URL to WSS WebSocket URL', () => {
    assert.equal(
      toWsUrl('https://mendicot-backend.onrender.com'),
      'wss://mendicot-backend.onrender.com',
    );
    assert.equal(
      toWsUrl('https://mendicot-backend.onrender.com/'),
      'wss://mendicot-backend.onrender.com',
    );
  });

  it('preserves existing WS and WSS protocols', () => {
    assert.equal(toWsUrl('ws://127.0.0.1:8000'), 'ws://127.0.0.1:8000');
    assert.equal(toWsUrl('wss://backend.com'), 'wss://backend.com');
  });

  it('throws an explicit error for unsupported schemes', () => {
    assert.throws(
      () => toWsUrl('ftp://invalid-scheme.com'),
      /Unsupported API URL scheme for WebSocket conversion/,
    );
  });

  it('verifies safe query parameter encoding for WebSocket connection string', () => {
    const roomId = 'ROOM 123#';
    const token = 'token&special=1';
    const wsBase = toWsUrl('https://mendicot-backend.onrender.com');
    const url = `${wsBase}/ws/rooms/${encodeURIComponent(roomId)}?token=${encodeURIComponent(token)}`;

    assert.equal(
      url,
      'wss://mendicot-backend.onrender.com/ws/rooms/ROOM%20123%23?token=token%26special%3D1',
    );
  });

  it('confirms index.html uses valid inline SVG favicon without broken /vite.svg', () => {
    const htmlPath = path.resolve(process.cwd(), 'index.html');
    const htmlContent = fs.readFileSync(htmlPath, 'utf8');

    assert.ok(!htmlContent.includes('href="/vite.svg"'), 'index.html must not contain broken /vite.svg link');
    assert.ok(htmlContent.includes('data:image/svg+xml'), 'index.html must contain inline SVG favicon');
  });
});
