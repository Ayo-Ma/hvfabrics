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

export default {
  fetch(request, env, ctx) {
    const { pathname } = new URL(request.url);
    if (request.method === "GET" && PHOTO.test(pathname)) return photo(request, env, ctx);
    return requestHandler(request, { cloudflare: { env, ctx } });
  },
} satisfies ExportedHandler<Env>;
