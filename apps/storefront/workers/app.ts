import { createRequestHandler } from "react-router";

declare module "react-router" {
  export interface AppLoadContext {
    cloudflare: { env: Env; ctx: ExecutionContext };
  }
}

const requestHandler = createRequestHandler(
  () => import("virtual:react-router/server-build"),
  import.meta.env.MODE,
);

const PHOTO = /^\/images\/products\/[0-9a-f-]{36}\/(400|800|1200|2000)\.(avif|webp)$/;

/**
 * Product photos on the shop's own address. A photo from another origin makes a phone on 4G open
 * a second secure connection before the largest image on the page can load (it was the LCP on
 * product and listing pages). The shop fetches it from the API over the service binding and keeps
 * it in Cloudflare's edge cache; photos never change (a new upload gets a new id).
 */
async function photo(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
  const cache = (caches as unknown as { default: Cache }).default;
  const hit = await cache.match(request);
  if (hit) return hit;
  const path = new URL(request.url).pathname;
  const binding = (env as Env & { API?: Fetcher }).API;
  const upstream = binding ? await binding.fetch(`${env.API_URL}${path}`) : await fetch(`${env.API_URL}${path}`);
  if (!upstream.ok) return new Response("Not found", { status: 404 });
  const res = new Response(upstream.body, {
    headers: {
      "Content-Type": upstream.headers.get("Content-Type") ?? "application/octet-stream",
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
  ctx.waitUntil(cache.put(request, res.clone()));
  return res;
}

/** On every response: HTTPS only, no MIME sniffing, no framing by other sites, no stray browser features. */
const SECURITY_HEADERS: Record<string, string> = {
  "Strict-Transport-Security": "max-age=31536000; includeSubDomains",
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "DENY",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "Permissions-Policy": "camera=(), microphone=(), geolocation=(), payment=(self \"https://checkout.paystack.com\")",
  "Cross-Origin-Opener-Policy": "same-origin-allow-popups",
};

function secured(res: Response): Response {
  const out = new Response(res.body, res);
  for (const [k, v] of Object.entries(SECURITY_HEADERS)) if (!out.headers.has(k)) out.headers.set(k, v);
  return out;
}

export default {
  async fetch(request, env, ctx) {
    const { pathname } = new URL(request.url);
    if (request.method === "GET" && PHOTO.test(pathname)) return secured(await photo(request, env, ctx));
    return secured(await requestHandler(request, { cloudflare: { env, ctx } }));
  },
} satisfies ExportedHandler<Env>;
