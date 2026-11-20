import { useSyncExternalStore } from "react";
import type { AdminRole } from "@hv/core";
import { ApiError, api, setTokenSource } from "./api";
import { DEV_SIGN_IN, FIREBASE_READY } from "./config";
import { firebaseAuth } from "./firebase";

export interface Me {
  uid: string;
  email?: string;
  role: AdminRole;
  can: { orders: boolean; products: boolean; takings: boolean; refunds?: boolean; payments?: boolean };
  /** The API is serving placeholder data (local development). */
  sampleData: boolean;
}

export type AuthState =
  | { status: "loading" }
  | { status: "signed-out"; error?: string }
  | { status: "denied"; message: string; email?: string }
  | { status: "signed-in"; me: Me };

const DEV_KEY = "hv-dev-role";

let state: AuthState = { status: "loading" };
const listeners = new Set<() => void>();
function set(next: AuthState) {
  state = next;
  for (const l of listeners) l();
}

function readDevRole(): AdminRole | null {
  try {
    const r = localStorage.getItem(DEV_KEY);
    return r === "owner" || r === "manager" || r === "packer" ? r : null;
  } catch {
    return null;
  }
}

async function loadMe() {
  try {
    set({ status: "signed-in", me: await api<Me>("/admin/me") });
  } catch (e) {
    if (e instanceof ApiError && e.status === 403) set({ status: "denied", message: e.message });
    else if (e instanceof ApiError && e.status === 401) set({ status: "signed-out", error: e.message });
    else set({ status: "signed-out", error: e instanceof Error ? e.message : "Couldn't reach the shop's server." });
  }
}

let started = false;
/** Called once at start-up. */
export function startAuth() {
  if (started) return;
  started = true;
  if (FIREBASE_READY) {
    void firebaseAuth().then(({ auth, mod }) => {
      setTokenSource(async () => (auth.currentUser ? auth.currentUser.getIdToken() : null));
      mod.onIdTokenChanged(auth, (user) => {
        if (!user) set({ status: "signed-out" });
        else if (state.status !== "signed-in") void loadMe();
      });
    });
    return;
  }
  if (DEV_SIGN_IN) {
    // Development only: ?devRole=owner signs in straight away (for screenshots and tests).
    const fromUrl = new URLSearchParams(location.search).get("devRole");
    if (fromUrl === "owner" || fromUrl === "manager" || fromUrl === "packer") {
      try {
        localStorage.setItem(DEV_KEY, fromUrl);
      } catch {
        /* ignore */
      }
    }
    setTokenSource(async () => {
      const r = readDevRole();
      return r ? `dev:${r}` : null;
    });
    if (readDevRole()) void loadMe();
    else set({ status: "signed-out" });
    return;
  }
  set({ status: "signed-out", error: "Sign-in isn't set up yet (Firebase settings missing)." });
}

export async function signIn(email: string, password: string): Promise<string | null> {
  const { auth, mod } = await firebaseAuth();
  try {
    await mod.signInWithEmailAndPassword(auth, email.trim(), password);
    await loadMe();
    return null;
  } catch (e) {
    const code = (e as { code?: string }).code ?? "";
    if (/invalid-credential|wrong-password|user-not-found|invalid-email/.test(code)) return "That email and password don't match.";
    if (/password-does-not-meet-requirements/.test(code)) {
      return "Your password needs updating: tap Forgot password and set a new one with at least 12 characters, including a capital letter, a small letter and a number.";
    }
    if (/user-disabled/.test(code)) return "This account has been switched off. Ask the owner.";
    if (/too-many-requests/.test(code)) return "Too many tries. Wait a few minutes, or reset your password.";
    if (/network/.test(code)) return "No connection. Check your data or Wi-Fi.";
    return "Couldn't sign in. Please try again.";
  }
}

export async function sendReset(email: string): Promise<string> {
  const { auth, mod } = await firebaseAuth();
  try {
    await mod.sendPasswordResetEmail(auth, email.trim());
  } catch {
    /* Same answer either way, so the form can't be used to find accounts. */
  }
  return "If that email has an account, a reset link is on its way.";
}

export async function signInDev(role: AdminRole) {
  try {
    localStorage.setItem(DEV_KEY, role);
  } catch {
    /* private mode: the session lasts until reload */
  }
  setTokenSource(async () => `dev:${role}`);
  await loadMe();
}

export async function signOut() {
  if (FIREBASE_READY) {
    const { auth, mod } = await firebaseAuth();
    await mod.signOut(auth);
  } else {
    try {
      localStorage.removeItem(DEV_KEY);
    } catch {
      /* ignore */
    }
    setTokenSource(async () => null);
  }
  set({ status: "signed-out" });
}

export function useAuth(): AuthState {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    () => state,
    () => state,
  );
}

export function useMe(): Me {
  const s = useAuth();
  if (s.status !== "signed-in") throw new Error("useMe outside a signed-in screen");
  return s.me;
}
