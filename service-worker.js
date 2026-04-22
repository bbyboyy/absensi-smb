self.addEventListener('install', (event) => {
  console.log('Service Worker Installed');
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  console.log('Service Worker Activated');
  event.waitUntil(self.clients.claim());
});

self.addEventListener("push", event => {
  console.log("PUSH EVENT TRIGGERED");

  let data = { 
    title: "Test", 
    body: "No payload" 
  };

  try {
    if (event.data) {
      data = event.data.json();
    }
  } catch (err) {
    console.warn("Bukan JSON, fallback ke text");
    data.body = event.data.text();
  }

  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: "/icon/icon-192.png"
    })
  );
});

self.addEventListener("notificationclick", event => {
  event.notification.close();

  event.waitUntil(
    clients.openWindow("/dashboard.html")
  );
});