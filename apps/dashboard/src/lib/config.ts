/** Public client settings (they ship in the app). Secrets never live here. */
const env = import.meta.env;

export const API_URL = (env.VITE_API_URL as string | undefined)?.replace(/\/$/, "") || "http://localhost:8787";

/** Product photos are served by the API Worker from R2. */
export const IMAGE_BASE = `${API_URL}/images`;

export const FIREBASE = {
  apiKey: env.VITE_FIREBASE_API_KEY as string | undefined,
  authDomain: env.VITE_FIREBASE_AUTH_DOMAIN as string | undefined,
  projectId: env.VITE_FIREBASE_PROJECT_ID as string | undefined,
  messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID as string | undefined,
  appId: env.VITE_FIREBASE_APP_ID as string | undefined,
};

export const FCM_VAPID_KEY = (env.VITE_FCM_VAPID_KEY as string | undefined) || "";

/** Firebase is configured: real sign-in. Otherwise, in development only, dev roles. */
export const FIREBASE_READY = Boolean(FIREBASE.apiKey && FIREBASE.projectId && FIREBASE.appId);
export const DEV_SIGN_IN = !FIREBASE_READY && env.DEV;

/** Her shops are in Ilorin and Abeokuta (West Africa Time, as Lagos); screens show the viewer's own zone. */
export const TIME_ZONE = Intl.DateTimeFormat().resolvedOptions().timeZone || "Africa/Lagos";
