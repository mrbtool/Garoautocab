// firebase-messaging-sw.js
importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-messaging-compat.js');

// 1. Initialize Firebase in the Service Worker (Use your config)
firebase.initializeApp({
  apiKey: "AIzaSyCdHRVDb7x_QDujZLmH4uuE2tqLOD5eziE",
  authDomain: "achik-travel.firebaseapp.com",
  projectId: "achik-travel",
  storageBucket: "achik-travel.firebasestorage.app",
  messagingSenderId: "463823387447",
  appId: "1:463823387447:web:332f1f3dba246f0ecb78b2",
  measurementId: "G-KB51NKQYTP"
});

// 2. Retrieve Messaging Instance
const messaging = firebase.messaging();

// 3. Handle Background Messages
messaging.onBackgroundMessage((payload) => {
  console.log('[firebase-messaging-sw.js] Received background message ', payload);
  
  const notificationTitle = payload.notification.title;
  const notificationOptions = {
    body: payload.notification.body,
    icon: '/garo.png' // Ensure this path is correct
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});
