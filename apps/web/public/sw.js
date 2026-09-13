const CACHE = "manisa-static-v2";
self.addEventListener("install", (event) => event.waitUntil(caches.open(CACHE).then((cache) => cache.add("/offline.html"))));
self.addEventListener("activate", (event) => event.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key))))));
self.addEventListener("fetch", (event) => {
  if (event.request.mode !== "navigate") return;
  event.respondWith(fetch(event.request).catch(() => caches.match("/offline.html")));
});
self.addEventListener("push", (event) => {
  let payload = {};
  try { payload = event.data?.json() ?? {}; } catch { payload = { body: event.data?.text() ?? "You have a new notification." }; }
  event.waitUntil(self.registration.showNotification("Manisa", {
    body: payload.body || payload.title || "You have a new notification.",
    icon: "/icon-192.png",
    badge: "/favicon-32.png",
    tag: payload.tag || "manisa-notification",
    data: { url: typeof payload.url === "string" && payload.url.startsWith("/") && !payload.url.startsWith("//") ? payload.url : "/report" },
  }));
});
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const path = event.notification.data?.url || "/report";
  const destination = new URL(path, self.location.origin).href;
  event.waitUntil(clients.matchAll({ type: "window", includeUncontrolled: true }).then((windows) => {
    const existing = windows.find((client) => new URL(client.url).origin === self.location.origin);
    return existing ? existing.navigate(destination).then(() => existing.focus()) : clients.openWindow(destination);
  }));
});
