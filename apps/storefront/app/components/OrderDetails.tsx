import { formatMoney, unitLabel } from "@hv/core";
import type { PublicOrder } from "~/lib/api.server";

const STATUS: Record<PublicOrder["status"], string> = {
  pending: "Waiting for payment",
  paid: "Paid — we're getting it ready",
  packed: "Packed",
  shipped: "On its way",
  delivered: "Delivered",
  cancelled: "Cancelled",
};

const STEPS: PublicOrder["status"][] = ["paid", "packed", "shipped", "delivered"];

export function OrderDetails({ order }: { order: PublicOrder }) {
  const reached = STEPS.indexOf(order.status);
  return (
    <div className="mx-auto max-w-2xl">
      <p className="text-lg">
        Order <span className="tabular font-semibold">{order.number}</span> · {STATUS[order.status]}
      </p>
      {order.status !== "cancelled" && order.status !== "pending" && (
        <ol className="mt-6 grid grid-cols-4 gap-1" aria-label="Order progress">
          {STEPS.map((s, i) => (
            <li key={s} aria-current={i === reached ? "step" : undefined}>
              <span className={`block h-2 ${i <= reached ? "bg-yellow" : "bg-grey-200"}`} />
              <span className={`mt-2 block text-[13px] ${i <= reached ? "font-semibold text-ink" : "text-grey-600"}`}>
                {STATUS[s].split(" —")[0]}
              </span>
            </li>
          ))}
        </ol>
      )}
      <ul className="mt-8 space-y-3">
        {order.items.map((i, n) => (
          <li key={n} className="flex justify-between gap-4 text-base">
            <span>
              {i.title} <span className="text-grey-600">· {i.variantLabel} · {i.qty}</span>
            </span>
            <span className="tabular">{formatMoney({ ...i.unitPrice, amount: i.unitPrice.amount * i.qty })}</span>
          </li>
        ))}
      </ul>
      <dl className="mt-6 space-y-2 bg-grey-50 p-5 text-base">
        <div className="flex justify-between">
          <dt>Subtotal</dt>
          <dd className="tabular">{formatMoney(order.totals.subtotal)}</dd>
        </div>
        <div className="flex justify-between">
          <dt>Delivery ({order.deliveryZone})</dt>
          <dd className="tabular">{formatMoney(order.totals.delivery)}</dd>
        </div>
        <div className="flex justify-between text-lg font-semibold">
          <dt>Total</dt>
          <dd className="tabular">{formatMoney(order.totals.total)}</dd>
        </div>
      </dl>
    </div>
  );
}

export { unitLabel };
