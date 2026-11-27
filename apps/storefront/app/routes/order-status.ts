import type { Route } from "./+types/order-status";
import { apiConnected, lookupOrder } from "~/lib/api.server";

/**
 * GET /order/<number>/status?reference=<ref> → { order } for the order page's quiet check.
 * Never an error page: a failed lookup answers { order: null } and the page simply asks again later.
 */
export async function loader({ params, request, context }: Route.LoaderArgs) {
  const env = context.cloudflare.env;
  const reference = new URL(request.url).searchParams.get("reference");
  const order = apiConnected(env) && reference ? await lookupOrder(env, params.number, { reference }).catch(() => null) : null;
  return Response.json({ order }, { headers: { "Cache-Control": "no-store" } });
}
