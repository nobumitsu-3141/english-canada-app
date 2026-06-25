/* Service worker — offline cache.
   content (html/js): network-first (更新が即反映、オフラインはキャッシュ)
   assets (svg/png) : cache-first
   cross-origin (Firebase同期): 触らない */
const CACHE = "engca-cache-v8";
const CORE = ["./","index.html","app.js?v=10","content.js?v=10","deck.js?v=10","manifest.webmanifest","icon.svg","icon-192.png","icon-512.png"];
self.addEventListener("install", e => { e.waitUntil(caches.open(CACHE).then(c=>c.addAll(CORE).catch(()=>{})).then(()=>self.skipWaiting())); });
self.addEventListener("activate", e => { e.waitUntil(caches.keys().then(ks=>Promise.all(ks.filter(k=>k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim())); });
self.addEventListener("fetch", e => {
  const req=e.request; if(req.method!=="GET")return;
  const url=new URL(req.url); if(url.origin!==location.origin)return;
  const isContent = url.pathname.endsWith("/") || /\.(html|js)(\?|$)/.test(url.pathname);
  if(isContent){
    e.respondWith(fetch(req).then(res=>{const cp=res.clone();caches.open(CACHE).then(c=>c.put(req,cp));return res;}).catch(()=>caches.match(req)));
  }else{
    e.respondWith(caches.match(req).then(c=>c||fetch(req).then(res=>{const cp=res.clone();caches.open(CACHE).then(ch=>ch.put(req,cp));return res;})));
  }
});
