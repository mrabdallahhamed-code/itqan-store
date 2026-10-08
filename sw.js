// Service Worker — يجعل المتجر قابلًا للتثبيت ويسرّع فتحه
// عند أي تحديث للموقع غيّر رقم الإصدار هنا ليحصل الزوار على النسخة الجديدة
const VERSION = "itqan-v1";
const SHELL = ["/", "/index.html", "/styles.css", "/app.js", "/config.js", "/site-settings.js", "/logo.png", "/icon-192.png"];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(VERSION).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// ملفات الموقع: الشبكة أولًا (لأحدث نسخة) ثم النسخة المحفوظة عند انقطاع الإنترنت.
// طلبات قاعدة البيانات والمواقع الخارجية لا تمر من هنا إطلاقًا.
self.addEventListener("fetch", (e) => {
  const req = e.request;
  const url = new URL(req.url);
  if (req.method !== "GET" || url.origin !== location.origin || url.pathname.startsWith("/admin")) return;
  e.respondWith(
    fetch(req)
      .then((res) => {
        if (res.ok) { const copy = res.clone(); caches.open(VERSION).then((c) => c.put(req, copy)); }
        return res;
      })
      .catch(() => caches.match(req).then((r) => r || caches.match("/index.html")))
  );
});
