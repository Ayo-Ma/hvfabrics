/**
 * Calls the API Worker. In production the storefront reaches it through a service binding
 * (`API`): Cloudflare blocks one Worker from fetching another over its workers.dev URL on the
 * same account (error 1042), and the binding is also faster (no public network hop).
 * Locally there's no binding, so it falls back to fetch on API_URL.
 */
export function apiFetch(env: Env, path: string, init?: RequestInit): Promise<Response> {
  const url = `${env.API_URL}${path}`;
  const binding = (env as Env & { API?: Fetcher }).API;
  return binding ? binding.fetch(url, init) : fetch(url, init);
}
