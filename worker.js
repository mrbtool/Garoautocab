export default {
  async fetch(request, env) {
    // --- 1. CORS CONFIGURATION (CRITICAL FOR WEB APPS) ---
    const corsHeaders = {
      "Access-Control-Allow-Origin": "*", // Allow any domain (or change to your specific domain)
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    };

    // Handle Preflight (Browser checks if it's allowed to connect)
    if (request.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders });
    }

    if (request.method !== "POST") {
      return new Response("Method not allowed", { status: 405, headers: corsHeaders });
    }

    try {
      const payload = await request.json();
      const { driverToken, title, body, tripId } = payload;

      if (!driverToken) {
        return new Response(JSON.stringify({ error: "Missing driverToken" }), { 
          status: 400, 
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        });
      }

      // --- 2. GET GOOGLE OAUTH TOKEN ---
      // This function generates a JWT locally and exchanges it for an Access Token
      const accessToken = await getGoogleAuthToken(env);

      // --- 3. SEND TO FCM V1 API ---
      const fcmUrl = `https://fcm.googleapis.com/v1/projects/${env.FIREBASE_PROJECT_ID}/messages:send`;
      
      const fcmResponse = await fetch(fcmUrl, {
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
              click_action: "FLUTTER_NOTIFICATION_CLICK"
            },
            webpush: {
              headers: {
                Urgency: "high"
              },
              fcm_options: {
                link: "https://your-app-url.com" // Update this if you have a hosted URL
              }
            }
          }
        })
      });

      const fcmData = await fcmResponse.json();

      return new Response(JSON.stringify(fcmData), { 
        status: fcmResponse.ok ? 200 : 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      });

    } catch (err) {
      return new Response(JSON.stringify({ error: err.message, stack: err.stack }), { 
        status: 500, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      });
    }
  }
};

// --- HELPER: Generate Google OAuth Token (Raw Crypto) ---
async function getGoogleAuthToken(env) {
  // 1. Get Env Variables
  const pem = env.FIREBASE_PRIVATE_KEY;
  const clientEmail = env.FIREBASE_CLIENT_EMAIL;

  if (!pem || !clientEmail) throw new Error("Missing FIREBASE_PRIVATE_KEY or FIREBASE_CLIENT_EMAIL in Worker Variables");

  // 2. Clean Key (Remove Headers & Newlines)
  const binaryDerString = atob(
    pem
      .replace(/-----BEGIN PRIVATE KEY-----/, "")
      .replace(/-----END PRIVATE KEY-----/, "")
      .replace(/\\n/g, "") // Handle escaped newlines
      .replace(/\s/g, "")  // Handle actual newlines/spaces
  );

  // 3. Convert to ArrayBuffer
  const binaryDer = new Uint8Array(binaryDerString.length);
  for (let i = 0; i < binaryDerString.length; i++) {
    binaryDer[i] = binaryDerString.charCodeAt(i);
  }

  // 4. Import Key for Signing
  const key = await crypto.subtle.importKey(
    "pkcs8",
    binaryDer.buffer,
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"]
  );

  // 5. Create JWT Claims
  const now = Math.floor(Date.now() / 1000);
  const header = { alg: "RS256", typ: "JWT" };
  const claim = {
    iss: clientEmail,
    scope: "https://www.googleapis.com/auth/firebase.messaging",
    aud: "https://oauth2.googleapis.com/token",
    exp: now + 3600,
    iat: now,
  };

  // 6. Encode & Sign
  const objectToBase64url = (obj) => btoa(JSON.stringify(obj)).replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
  const encodedHeader = objectToBase64url(header);
  const encodedClaim = objectToBase64url(claim);

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

  // 7. Exchange JWT for Google Access Token
  const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: jwt,
    }),
  });

  const tokenData = await tokenResponse.json();
  if (!tokenData.access_token) throw new Error("Failed to get Google Access Token: " + JSON.stringify(tokenData));
  
  return tokenData.access_token;
}
