// Realserve Measure: keep the app on the device so it opens with no signal. The page comes from the network when it answers in time.
const C = "rsm-app";
const WAIT = 3000; // on one bar of signal, open the kept page rather than sit on a blank screen. The update banner still finds a newer release.
const KEEP = ["fonts/plex-sans-400.woff2", "fonts/plex-sans-500.woff2", "fonts/plex-sans-600.woff2", "fonts/plex-sans-700.woff2", "fonts/plex-mono-500.woff2", "fonts/plex-mono-600.woff2", "pdfjs/pdf.min.js", "pdfjs/pdf.worker.min.js"];
self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(C).then((c) => c.add("./").then(() => Promise.all(KEEP.map((u) => c.add(u).catch(() => {}))))).then(() => self.skipWaiting()).catch(() => self.skipWaiting()));
});
self.addEventListener("activate", (e) => { e.waitUntil(self.clients.claim()); });
function page(e) {
  return caches.match("./").then((kept) => {
    const net = fetch(e.request.url, { cache: "no-cache", credentials: "same-origin" }).then((res) => { // ask the site every time, not the browser's copy: GitHub Pages lets browsers keep a page 10 minutes
      if (res.ok) { const cp = res.clone(); e.waitUntil(caches.open(C).then((c) => c.put("./", cp))); return res; }
      return kept || res;
    });
    if (!kept) return net.catch(() => Response.error());
    return Promise.race([net.catch(() => kept), new Promise((ok) => setTimeout(() => ok(kept), WAIT))]);
  });
}
self.addEventListener("fetch", (e) => {
  const r = e.request, u = new URL(r.url);
  if (r.method !== "GET" || u.origin !== location.origin) return;
  if (u.pathname.startsWith("/api/") || u.pathname.endsWith("version.json") || u.pathname.endsWith("sw.js")) return;
  if (u.pathname.startsWith("/pdfjs/") || u.pathname.startsWith("/fonts/")) { e.respondWith(caches.open(C).then((c) => c.match(r).then((m) => m || fetch(r).then((res) => { if (res.ok) c.put(r, res.clone()); return res; })))); return; } // kept once fetched
  if (r.mode === "navigate" || u.pathname === "/" || u.pathname.endsWith(".html")) e.respondWith(page(e));
});
