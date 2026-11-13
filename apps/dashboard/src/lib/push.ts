import { api } from "./api";
import { FCM_VAPID_KEY, FIREBASE_READY } from "./config";
import { firebaseMessaging } from "./firebase";

/** Order alerts on this phone: permission → FCM token → registered with the API. */

const TOKEN_KEY = "hv-push-token";

export type PushStatus = "unsupported" | "needs-install" | "blocked" | "off" | "on" | "not-configured";

function stored(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

const isIos = () => /iPad|iPhone|iPod/.test(navigator.userAgent);
const standalone = () => window.matchMedia("(display-mode: standalone)").matches;

export function pushStatus(): PushStatus {
  if (!("serviceWorker" in navigator) || !("Notification" in window)) {
    // iPhones only allow web push once the app is added to the Home Screen.
    return isIos() && !standalone() ? "needs-install" : "unsupported";
  }
  if (Notification.permission === "denied") return "blocked";
  if (!FIREBASE_READY || !FCM_VAPID_KEY) return "not-configured";
  return Notification.permission === "granted" && stored() ? "on" : "off";
}

export function registerServiceWorker() {
  if ("serviceWorker" in navigator && import.meta.env.PROD) {
    void navigator.serviceWorker.register("/sw.js");
  }
}

export async function enablePush(): Promise<PushStatus> {
  const before = pushStatus();
  if (before === "unsupported" || before === "needs-install" || before === "not-configured") return before;
  const permission = await Notification.requestPermission();
  if (permission !== "granted") return permission === "denied" ? "blocked" : "off";
  const fm = await firebaseMessaging();
  if (!fm) return "unsupported";
  const registration = await navigator.serviceWorker.register("/sw.js");
  await navigator.serviceWorker.ready;
  const token = await fm.mod.getToken(fm.messaging, { vapidKey: FCM_VAPID_KEY, serviceWorkerRegistration: registration });
  await api("/admin/push/tokens", { body: { token } });
  try {
    localStorage.setItem(TOKEN_KEY, token);
  } catch {
    /* alerts still work; this phone just won't remember it's on */
  }
  return "on";
}

export async function disablePush(): Promise<PushStatus> {
  const token = stored();
  if (token) {
    await api("/admin/push/tokens", { method: "DELETE", body: { token } }).catch(() => undefined);
    const fm = await firebaseMessaging().catch(() => null);
    await fm?.mod.deleteToken(fm.messaging).catch(() => undefined);
  }
  try {
    localStorage.removeItem(TOKEN_KEY);
  } catch {
    /* ignore */
  }
  return pushStatus();
}

export function sendTestPush() {
  return api<{ sent: number; devices: number }>("/admin/push/test", { body: {} });
}
