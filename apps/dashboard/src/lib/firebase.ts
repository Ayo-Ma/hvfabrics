import { FIREBASE } from "./config";

/**
 * Firebase loads only when it's configured, and only the parts the dashboard uses
 * (Auth for sign-in, Messaging for order alerts). Firestore is never read from the browser:
 * all data goes through the API Worker.
 */
let appPromise: Promise<import("firebase/app").FirebaseApp> | null = null;

export function firebaseApp() {
  appPromise ??= import("firebase/app").then(({ initializeApp }) =>
    initializeApp({
      apiKey: FIREBASE.apiKey,
      authDomain: FIREBASE.authDomain,
      projectId: FIREBASE.projectId,
      messagingSenderId: FIREBASE.messagingSenderId,
      appId: FIREBASE.appId,
    }),
  );
  return appPromise;
}

export async function firebaseAuth() {
  const [app, mod] = await Promise.all([firebaseApp(), import("firebase/auth")]);
  return { auth: mod.getAuth(app), mod };
}

export async function firebaseMessaging() {
  const [app, mod] = await Promise.all([firebaseApp(), import("firebase/messaging")]);
  if (!(await mod.isSupported())) return null;
  return { messaging: mod.getMessaging(app), mod };
}
