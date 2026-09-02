const CACHE='mickleton-v2';
const ASSETS=['./','./index.html','./styles.css','./app.js','./config.js','./manifest.webmanifest','./assets/hero-site.webp','./assets/caravan-front.webp','./assets/caravan-side.webp','./assets/wine-deck.webp','./assets/deck-view.webp','./assets/local-cow.webp','./assets/favicon.svg'];

self.addEventListener('install',event=>{
  self.skipWaiting();
  event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(ASSETS)));
});

self.addEventListener('activate',event=>{
  event.waitUntil((async()=>{
    const keys=await caches.keys();
    await Promise.all(keys.filter(key=>key!==CACHE).map(key=>caches.delete(key)));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch',event=>{
  if(event.request.method!=='GET') return;
  event.respondWith((async()=>{
    try {
      const fresh=await fetch(event.request);
      const cache=await caches.open(CACHE);
      cache.put(event.request,fresh.clone());
      return fresh;
    } catch(err) {
      return (await caches.match(event.request)) || (await caches.match('./index.html'));
    }
  })());
});
