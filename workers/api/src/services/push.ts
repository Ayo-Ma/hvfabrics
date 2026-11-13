import { formatMoney, type Order } from "@hv/core";

/**
 * Push alerts to her phone (PLAN.md: "a push notification within 10 seconds of payment").
 * Sent through Firebase Cloud Messaging's HTTP v1 API with the Worker's service account.
 * Messages are data-only: the dashboard's service worker draws the notification itself,
 * so it looks the same on every browser and opens the right order when tapped.
 */

export interface PushMessage {
  title: string;
  body: string;
  /** Dashboard path opened when the notification is tapped. */
  url: string;
  /** Same tag replaces an earlier notification instead of stacking. */
  tag: string;
}

export interface Pusher {
  /** Sends to every token; returns the tokens FCM says are dead, so they can be removed. */
  send(tokens: readonly string[], message: PushMessage): Promise<{ sent: number; dead: string[] }>;
}

export function orderPaidPush(order: Order): PushMessage {
  // Lines, not units: 5 yards of one lace is one thing to pack.
  const items = order.items.length;
  const flagged = order.flags?.length ? " · needs attention" : "";
  return {
    title: `New order ${order.number} · ${formatMoney(order.totals.total)}`,
    body: `${order.customer.name} · ${items} ${items === 1 ? "item" : "items"} · ${order.delivery.zone}${flagged}`,
    url: `/orders/${order.id}`,
    tag: `order-${order.id}`,
  };
}

export class FcmPusher implements Pusher {
  constructor(
    private readonly projectId: string,
    private readonly auth: { accessToken(): Promise<string> },
    private readonly fetchImpl: typeof fetch = fetch,
  ) {}

  async send(tokens: readonly string[], message: PushMessage) {
    if (tokens.length === 0) return { sent: 0, dead: [] };
    const bearer = await this.auth.accessToken();
    const url = `https://fcm.googleapis.com/v1/projects/${encodeURIComponent(this.projectId)}/messages:send`;
    const results = await Promise.all(
      tokens.map(async (token) => {
        const res = await this.fetchImpl(url, {
          method: "POST",
          headers: { Authorization: `Bearer ${bearer}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            message: {
              token,
              data: { title: message.title, body: message.body, url: message.url, tag: message.tag },
              // High urgency so Android wakes the phone; an alert older than an hour is no use.
              webpush: { headers: { Urgency: "high", TTL: "3600" } },
            },
          }),
        });
        if (res.ok) return { token, ok: true, dead: false };
        const text = await res.text();
        // 404 UNREGISTERED / 400 INVALID_ARGUMENT on the token: the browser unsubscribed.
        const dead = res.status === 404 || (res.status === 400 && /UNREGISTERED|registration token/i.test(text));
        if (!dead) throw new Error(`FCM ${res.status}: ${text}`);
        return { token, ok: false, dead: true };
      }),
    );
    return { sent: results.filter((r) => r.ok).length, dead: results.filter((r) => r.dead).map((r) => r.token) };
  }
}
