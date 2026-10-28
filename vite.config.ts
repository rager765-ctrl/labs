import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { readdir, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'

const lightweightPwa = () => ({
  name: 'lightweight-pwa',
  apply: 'build' as const,
  async closeBundle() {
    const outputDir = resolve('dist')
    const assetNames = await readdir(resolve(outputDir, 'assets'))
    const precacheUrls = [
      '/',
      '/index.html',
      '/manifest.webmanifest',
      '/favicon.svg',
      '/pwa-icon.svg',
      ...assetNames.map((name) => `/assets/${name}`),
    ]
    const cacheName = `labattend-shell-${Date.now()}`
    const serviceWorker = `
const CACHE_NAME = ${JSON.stringify(cacheName)};
const PRECACHE_URLS = ${JSON.stringify(precacheUrls)};

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE_URLS)));
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((key) => key.startsWith('labattend-shell-') && key !== CACHE_NAME).map((key) => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  const url = new URL(request.url);
  if (request.method !== 'GET' || url.origin !== self.location.origin) return;

  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response.ok) caches.open(CACHE_NAME).then((cache) => cache.put('/index.html', response.clone()));
          return response;
        })
        .catch(async () => (await caches.match(request)) || (await caches.match('/index.html')) || Response.error())
    );
    return;
  }

  if (url.pathname.startsWith('/assets/') || url.pathname === '/manifest.webmanifest' || url.pathname.endsWith('.svg')) {
    event.respondWith(
      caches.match(request).then((cached) => cached || fetch(request).then((response) => {
        if (response.ok) caches.open(CACHE_NAME).then((cache) => cache.put(request, response.clone()));
        return response;
      }))
    );
  }
});
`
    await writeFile(resolve(outputDir, 'sw.js'), serviceWorker.trimStart(), 'utf8')
  },
})

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), lightweightPwa()],
})
