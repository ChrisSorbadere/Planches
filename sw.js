// Service worker "réseau d'abord" pour le shell : l'appli se met toujours à jour.
const CACHE='planches-v6';
const ASSETS=['./','./index.html','./manifest.json','./icon.svg','./planches.json'];

self.addEventListener('install',e=>{
  self.skipWaiting();
  e.waitUntil(caches.open(CACHE).then(c=>c.addAll(ASSETS)).catch(()=>{}));
});
self.addEventListener('activate',e=>{
  e.waitUntil(
    caches.keys().then(ks=>Promise.all(ks.filter(k=>k!==CACHE).map(k=>caches.delete(k))))
      .then(()=>self.clients.claim())
  );
});
self.addEventListener('fetch',e=>{
  const req=e.request;
  if(req.method!=='GET') return;
  const u=new URL(req.url);
  // Requêtes externes (Firebase, Google Drive, polices) : ne pas intercepter.
  if(u.origin!==location.origin) return;
  // HTML / navigation / catalogue : réseau d'abord, cache en secours hors-ligne.
  const dynamic = req.mode==='navigate' || u.pathname.endsWith('/')
                || u.pathname.endsWith('.html') || u.pathname.endsWith('planches.json');
  if(dynamic){
    e.respondWith(
      fetch(req).then(r=>{ const cp=r.clone(); caches.open(CACHE).then(c=>c.put(req,cp)); return r; })
                .catch(()=>caches.match(req).then(r=>r||caches.match('./index.html')))
    );
    return;
  }
  // Autres fichiers locaux (icône, manifest) : cache d'abord.
  e.respondWith(caches.match(req).then(r=>r||fetch(req)));
});
