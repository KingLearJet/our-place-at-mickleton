const CACHE='mickleton-v1';
const ASSETS=['./','./index.html','./styles.css','./app.js','./config.js','./manifest.webmanifest','./assets/hero-site.webp','./assets/caravan-front.webp','./assets/caravan-side.webp','./assets/wine-deck.webp','./assets/deck-view.webp','./assets/local-cow.webp','./assets/favicon.svg'];
self.addEventListener('install',e=>e.waitUntil(caches.open(CACHE).then(c=>c.addAll(ASSETS))));
self.addEventListener('activate',e=>e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k))))));
self.addEventListener('fetch',e=>{if(e.request.method!=='GET')return;e.respondWith(caches.match(e.request).then(r=>r||fetch(e.request).then(resp=>{const copy=resp.clone();caches.open(CACHE).then(c=>c.put(e.request,copy));return resp;}).catch(()=>caches.match('./index.html'))));});
