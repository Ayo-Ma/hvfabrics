import { type RouteConfig, index, route } from "@react-router/dev/routes";

export default [
  index("routes/home.tsx"),
  route("fabrics", "routes/line.tsx", { id: "line-fabric" }),
  route("ankara", "routes/line.tsx", { id: "line-ankara" }),
  // Lingerie became Ankara (2026-11-26): old links and bookmarks land on Ankara.
  route("lingerie", "routes/moved.tsx", { id: "moved-lingerie" }),
  route("ready-to-wear", "routes/line.tsx", { id: "line-rtw" }),
  route("p/:slug", "routes/product.tsx"),
  route("search", "routes/search.tsx"),
  route("checkout", "routes/checkout.tsx"),
  route("order/:number", "routes/order.tsx"),
  route("track", "routes/track.tsx"),
  route("about", "routes/about.tsx"),
  route("policies/:name", "routes/policy.tsx"),
  route("*", "routes/not-found.tsx"),
] satisfies RouteConfig;
