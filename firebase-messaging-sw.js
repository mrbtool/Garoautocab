importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-messaging-compat.js');

// 1. Initialize Firebase in the Service Worker
firebase.initializeApp({
  apiKey: "AIzaSyCdHRVDb7x_QDujZLmH4uuE2tqLOD5eziE", // Your actual config
  authDomain: "achik-travel.firebaseapp.com",
  projectId: "achik-travel",
  storageBucket: "achik-travel.firebasestorage.app",
  messagingSenderId: "463823387447",
  appId: "1:463823387447:web:332f1f3dba246f0ecb78b2"
});

const messaging = firebase.messaging();

// 2. Handle Background Messages
messaging.onBackgroundMessage((payload) => {
  console.log('[firebase-messaging-sw.js] Received background message ', payload);
  
  const notificationTitle = payload.notification.title;
  const notificationOptions = {
    body: payload.notification.body,
    icon: '/icon-192.png', // Ensure you have this icon
    data: payload.data
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});

// 3. Handle Notification Click
self.addEventListener('notificationclick', function(event) {
  event.notification.close();

  // Open the app when clicked
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(windowClients => {
      // Check if app is already open
      for (let client of windowClients) {
        if (client.url.includes('your-website-url') && 'focus' in client) {
          return client.focus();
        }
      }
      // If not open, open a new window
      if (clients.openWindow) {
        const urlToOpen = event.notification.data.link || '/'; 
        return clients.openWindow(urlToOpen);
      }
    })
  );
});
