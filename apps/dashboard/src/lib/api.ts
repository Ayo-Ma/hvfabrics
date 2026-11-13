import { API_URL } from "./config";

export class ApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
    readonly data: Record<string, unknown> = {},
  ) {
    super(message);
    this.name = "ApiError";
  }
}

type TokenSource = () => Promise<string | null>;
let tokenSource: TokenSource = async () => null;

/** Set by the auth layer; every API call asks it for a fresh ID token. */
export function setTokenSource(fn: TokenSource) {
  tokenSource = fn;
}

export async function api<T>(path: string, init: { method?: string; body?: unknown; raw?: BodyInit; contentType?: string } = {}): Promise<T> {
  const token = await tokenSource();
  const headers: Record<string, string> = {};
  if (token) headers.Authorization = `Bearer ${token}`;
  if (init.body !== undefined) headers["Content-Type"] = "application/json";
  if (init.contentType) headers["Content-Type"] = init.contentType;

  let res: Response;
  try {
    res = await fetch(`${API_URL}${path}`, {
      method: init.method ?? (init.body !== undefined || init.raw ? "POST" : "GET"),
      headers,
      body: init.raw ?? (init.body !== undefined ? JSON.stringify(init.body) : undefined),
    });
  } catch {
    throw new ApiError(0, "No connection. Check your data or Wi-Fi and try again.");
  }
  const text = await res.text();
  let data: Record<string, unknown>;
  try {
    data = text ? (JSON.parse(text) as Record<string, unknown>) : {};
  } catch {
    data = {};
  }
  if (!res.ok) {
    const message = typeof data.message === "string" ? data.message : `Something went wrong (${res.status})`;
    throw new ApiError(res.status, message, data);
  }
  return data as T;
}
