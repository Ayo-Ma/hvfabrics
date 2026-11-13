import { useState } from "react";
import type { AdminRole } from "@hv/core";
import lockup from "../../../../assets/brand/logo/hv-lockup-horizontal.svg?raw";
import { Button } from "../components/ui";
import { sendReset, signIn, signInDev, signOut, type AuthState } from "../lib/auth";
import { DEV_SIGN_IN, FIREBASE_READY } from "../lib/config";

/** Sign in: email and password (Firebase Auth). In local development without Firebase, a role picker. */
export function Login({ state }: { state: Extract<AuthState, { status: "signed-out" | "denied" }> }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(state.status === "signed-out" ? (state.error ?? null) : null);

  return (
    <main className="flex min-h-dvh items-center justify-center px-4 py-10">
      <div className="w-full max-w-[380px]">
        <span className="block w-[220px] text-text [&_svg]:h-auto [&_svg]:w-full [&_svg]:fill-current" dangerouslySetInnerHTML={{ __html: lockup }} />
        <h1 className="mt-8">Shop dashboard</h1>

        {state.status === "denied" ? (
          <div className="mt-4">
            <p role="alert" className="text-[15px]">
              {state.message}. Ask the owner to give this account access, then sign in again.
            </p>
            <Button className="mt-4" onClick={() => void signOut()}>
              Use another account
            </Button>
          </div>
        ) : FIREBASE_READY ? (
          <form
            className="mt-6 grid gap-4"
            onSubmit={async (e) => {
              e.preventDefault();
              setBusy(true);
              setMessage(await signIn(email, password));
              setBusy(false);
            }}
          >
            <label>
              <span className="label">Email</span>
              <input className="field h-11" type="email" autoComplete="username" required value={email} onChange={(e) => setEmail(e.target.value)} />
            </label>
            <label>
              <span className="label">Password</span>
              <input className="field h-11" type="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} />
            </label>
            {message ? (
              <p role="alert" className="text-sm text-neg">
                {message}
              </p>
            ) : null}
            <Button type="submit" tone="primary" size="lg" disabled={busy}>
              {busy ? "Signing in…" : "Sign in"}
            </Button>
            <button
              type="button"
              className="justify-self-start text-sm font-medium underline-offset-4 hover:underline"
              onClick={async () => setMessage(email ? await sendReset(email) : "Enter your email first, then tap Forgot password.")}
            >
              Forgot password
            </button>
          </form>
        ) : DEV_SIGN_IN ? (
          <div className="mt-6">
            <p className="text-[15px] leading-[22px]">Firebase isn't connected yet. Pick a role to try the dashboard with sample data.</p>
            <div className="mt-4 grid gap-2">
              {(["owner", "manager", "packer"] as AdminRole[]).map((r, i) => (
                <Button key={r} tone={i === 0 ? "primary" : "secondary"} size="lg" onClick={() => void signInDev(r)} className="capitalize">
                  Continue as {r}
                </Button>
              ))}
            </div>
            {message ? <p className="mt-4 text-sm text-neg">{message}</p> : null}
          </div>
        ) : (
          <p role="alert" className="mt-4 text-[15px]">
            {message ?? "Sign-in isn't set up yet."}
          </p>
        )}
      </div>
    </main>
  );
}
