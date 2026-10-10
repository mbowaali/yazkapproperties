self.addEventListener("push", event => {
  let message = {};
  try { message = event.data ? event.data.json() : {}; } catch { message = {}; }
  event.waitUntil(self.registration.showNotification(message.title || "Yazkap rent reminder", {
    body: message.body || "You have an update in your tenant portal.",
    tag: message.tag || "yazkap-notification",
    data: { url: message.url || "/dashboard" },
    icon: "/logo.svg",
    badge: "/logo.svg",
  }));
});

self.addEventListener("notificationclick", event => {
  event.notification.close();
  const target = new URL(event.notification.data?.url || "/dashboard", self.location.origin).href;
  event.waitUntil(clients.matchAll({ type: "window", includeUncontrolled: true }).then(windows => {
    const existing = windows.find(client => client.url === target);
    return existing ? existing.focus() : clients.openWindow(target);
  }));
});