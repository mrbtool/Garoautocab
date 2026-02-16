export default {
  async fetch(request, env) {
    if (request.method !== "POST") return new Response("Method not allowed", { status: 405 });

    try {
      const payload = await request.json();
      const { driverToken, title, body, tripId } = payload;

      if (!driverToken) return new Response("Missing driverToken", { status: 400 });

      // 1. Get Google OAuth 2.0 Token
      const accessToken = await getGoogleAuthToken(env);

      // 2. Send Notification via FCM v1 API
      const fcmResponse = await fetch(
        `https://fcm.googleapis.com/v1/projects/${env.FIREBASE_PROJECT_ID}/messages:send`,
        {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            message: {
              token: driverToken,
              notification: {
                title: title || "New Trip Booking!",
                body: body || "A passenger has booked your trip.",
              },
              data: {
                tripId: tripId || "",
                click_action: "FLUTTER_NOTIFICATION_CLICK" // Standard key, useful for web too
              },
              webpush: {
                fcm_options: {
                  link: `https://your-website.com/trip/${tripId}` // Opens when clicked
                }
              }
            }
          })
        }
      );

      const fcmData = await fcmResponse.json();
      return new Response(JSON.stringify(fcmData), { headers: { "Content-Type": "application/json" } });

    } catch (err) {
      return new Response(JSON.stringify({ error: err.message }), { status: 500 });
    }
  }
};

// --- HELPER: Generate Google OAuth Token (Raw Crypto) ---
async function getGoogleAuthToken(env) {
  const pem = env.FIREBASE_PRIVATE_KEY;
  const clientEmail = env.FIREBASE_CLIENT_EMAIL;
  
  // Clean the private key string
  const binaryDerString = atob(pem.replace(/-----(BEGIN|END) PRIVATE KEY-----/g, "").replace(/\s/g, ""));
  const binaryDer = new Uint8Array(binaryDerString.length);
  for (let i = 0; i < binaryDerString.length; i++) {
    binaryDer[i] = binaryDerString.charCodeAt(i);
  }

  const key = await crypto.subtle.importKey(
    "pkcs8",
    binaryDer.buffer,
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"]
  );

  const header = { alg: "RS256", typ: "JWT" };
  const now = Math.floor(Date.now() / 1000);
  const claim = {
    iss: clientEmail,
    scope: "https://www.googleapis.com/auth/firebase.messaging",
    aud: "https://oauth2.googleapis.com/token",
    exp: now + 3600,
    iat: now,
  };

  const encodedHeader = btoa(JSON.stringify(header)).replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
  const encodedClaim = btoa(JSON.stringify(claim)).replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");

  const signature = await crypto.subtle.sign(
    "RSASSA-PKCS1-v1_5",
    key,
    new TextEncoder().encode(`${encodedHeader}.${encodedClaim}`)
  );

  const encodedSignature = btoa(String.fromCharCode(...new Uint8Array(signature)))
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");

  const jwt = `${encodedHeader}.${encodedClaim}.${encodedSignature}`;

  // Exchange JWT for Access Token
  const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: jwt,
    }),
  });

  const tokenData = await tokenResponse.json();
  return tokenData.access_token;
}
