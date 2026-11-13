import { formatMoney, type Order, type Settings } from "@hv/core";

/**
 * Order alerts (PLAN.md): confirmation email to the customer, email alert to her.
 * Push notifications to her phone arrive with the dashboard (IMPLEMENTATION.md 1.27).
 */
export interface Notifier {
  orderPaid(order: Order, settings: Settings): Promise<void>;
}

export class LogNotifier implements Notifier {
  constructor(private readonly log: (msg: string, extra?: Record<string, unknown>) => void) {}
  async orderPaid(order: Order) {
    this.log("order paid (email not configured)", { number: order.number });
  }
}

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);

function itemsTable(order: Order): string {
  const rows = order.items
    .map(
      (i) =>
        `<tr><td style="padding:6px 0">${esc(i.title)} · ${esc(i.variantLabel)} × ${i.qty}</td><td style="padding:6px 0;text-align:right">${formatMoney({ ...i.unitPrice, amount: i.unitPrice.amount * i.qty })}</td></tr>`,
    )
    .join("");
  return `<table width="100%" style="border-collapse:collapse;font:15px/1.5 system-ui,sans-serif">${rows}
<tr><td style="padding:6px 0">Delivery (${esc(order.delivery.zone)})</td><td style="text-align:right">${formatMoney(order.totals.delivery)}</td></tr>
<tr><td style="padding:10px 0;font-weight:700">Total</td><td style="text-align:right;font-weight:700">${formatMoney(order.totals.total)}</td></tr></table>`;
}

export class ResendNotifier implements Notifier {
  constructor(
    private readonly apiKey: string,
    private readonly from: string,
    private readonly storefrontOrigin: string,
    private readonly fetchImpl: typeof fetch = fetch,
  ) {}

  private async send(to: string[], subject: string, html: string) {
    if (to.length === 0) return;
    const res = await this.fetchImpl("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${this.apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from: this.from, to, subject, html }),
    });
    if (!res.ok) throw new Error(`Resend ${res.status}: ${await res.text()}`);
  }

  async orderPaid(order: Order, settings: Settings) {
    const trackUrl = `${this.storefrontOrigin}/track?number=${encodeURIComponent(order.number)}&email=${encodeURIComponent(order.customer.email)}`;
    const customerHtml = `<div style="font:16px/1.6 system-ui,sans-serif;color:#0A0A0A;max-width:560px">
<p>Hi ${esc(order.customer.name)},</p>
<p>Thank you for your order <strong>${esc(order.number)}</strong>. Your payment is confirmed and we're getting it ready.</p>
${itemsTable(order)}
<p>Delivering to: ${esc(order.delivery.address)}</p>
<p><a href="${trackUrl}" style="color:#0A0A0A">Track your order</a></p>
<p>Harries Vogue</p></div>`;
    const flagged = order.flags?.length ? `<p style="color:#B42318"><strong>Needs attention:</strong> ${esc(order.flags.join(", "))}</p>` : "";
    const ownerHtml = `<div style="font:16px/1.6 system-ui,sans-serif;color:#0A0A0A;max-width:560px">
<p><strong>New paid order ${esc(order.number)}</strong> — ${formatMoney(order.totals.total)}</p>${flagged}
<p>${esc(order.customer.name)} · ${esc(order.customer.phone)} · ${esc(order.customer.email)}<br>${esc(order.delivery.zone)}: ${esc(order.delivery.address)}</p>
${itemsTable(order)}</div>`;
    const results = await Promise.allSettled([
      this.send([order.customer.email], `Order ${order.number} confirmed — Harries Vogue`, customerHtml),
      this.send(settings.notificationTargets.emails, `New order ${order.number} · ${formatMoney(order.totals.total)}`, ownerHtml),
    ]);
    const failed = results.filter((r) => r.status === "rejected");
    if (failed.length) throw new Error(`Email failed: ${failed.map((f) => String((f as PromiseRejectedResult).reason)).join("; ")}`);
  }
}
