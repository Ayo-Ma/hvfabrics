import type { AppLoadContext, EntryContext } from "react-router";
import { ServerRouter } from "react-router";
import { isbot } from "isbot";
import { renderToReadableStream } from "react-dom/server";
import { NonceContext } from "./lib/nonce";

/**
 * Content-Security-Policy with a fresh nonce per page: scripts run only if the server put them
 * there. Plus: no framing by other sites (clickjacking), forms only to us and Paystack, no plugins.
 * Applied in production; the dev server injects its own scripts for hot reload.
 */
function csp(nonce: string, apiUrl: string): string {
  const api = apiUrl.startsWith("http") ? ` ${new URL(apiUrl).origin}` : "";
  return [
    "default-src 'self'",
    `script-src 'nonce-${nonce}' 'strict-dynamic'`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob:",
    "font-src 'self' data:", // the ₦ glyph subset is small enough that the build inlines it
    `connect-src 'self'${api}`,
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self' https://checkout.paystack.com",
    "object-src 'none'",
    "upgrade-insecure-requests",
  ].join("; ");
}

export default async function handleRequest(
  request: Request,
  responseStatusCode: number,
  responseHeaders: Headers,
  routerContext: EntryContext,
  loadContext: AppLoadContext,
) {
  const env = loadContext.cloudflare.env;
  const production = env.ENVIRONMENT === "production";
  const nonce = production ? btoa(String.fromCharCode(...crypto.getRandomValues(new Uint8Array(16)))) : "";
  let shellRendered = false;
  const userAgent = request.headers.get("user-agent");

  const body = await renderToReadableStream(
    <NonceContext.Provider value={nonce}>
      <ServerRouter context={routerContext} url={request.url} nonce={nonce || undefined} />
    </NonceContext.Provider>,
    {
      ...(nonce ? { nonce } : {}),
      onError(error: unknown) {
      responseStatusCode = 500;
        if (shellRendered) console.error(error);
      },
    },
  );
  shellRendered = true;

  if ((userAgent && isbot(userAgent)) || routerContext.isSpaMode) {
    await body.allReady;
  }

  responseHeaders.set("Content-Type", "text/html");
  responseHeaders.set("X-Content-Type-Options", "nosniff");
  responseHeaders.set("Referrer-Policy", "strict-origin-when-cross-origin");
  if (production) responseHeaders.set("Content-Security-Policy", csp(nonce, env.API_URL));
  return new Response(body, { headers: responseHeaders, status: responseStatusCode });
}
