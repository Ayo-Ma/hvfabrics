import { createContext, useContext } from "react";

/**
 * Per-request script nonce for the Content-Security-Policy (entry.server.tsx). Only scripts that
 * carry it may run, so an injected <script> is refused by the browser. On the client the value is
 * empty: browsers hide nonce attributes from script after load, and hydration ignores it.
 */
export const NonceContext = createContext("");
export const useNonce = () => useContext(NonceContext);
