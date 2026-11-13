import { flushSync } from "react-dom";
import { createRoot, type Root } from "react-dom/client";
import { multiply, type Order } from "@hv/core";
import printLogo from "../../../../assets/brand/logo/hv-print-mono.svg?raw";
import { api } from "./api";
import { dateTime, money, qtyText } from "./format";

/**
 * One-tap print (PLAN.md): an 80 mm thermal slip for the parcel, or an A4 invoice.
 * The sheet renders into #print-root, the page size is set for that print only,
 * and the browser's print dialog opens straight away.
 */

export type PrintFormat = "slip" | "a4";

let storeAddress: string | null = null;
async function address(): Promise<string> {
  if (storeAddress !== null) return storeAddress;
  try {
    storeAddress = (await api<{ storeAddress: string }>("/settings")).storeAddress;
  } catch {
    storeAddress = "";
  }
  return storeAddress;
}

function Logo({ width }: { width: string }) {
  return <span className="print-logo" style={{ width }} dangerouslySetInnerHTML={{ __html: printLogo }} />;
}

function Items({ order }: { order: Order }) {
  return (
    <table className="print-items">
      <thead>
        <tr>
          <th>Item</th>
          <th className="num">Qty</th>
          <th className="num">Price</th>
          <th className="num">Total</th>
        </tr>
      </thead>
      <tbody>
        {order.items.map((i) => (
          <tr key={i.variantId}>
            <td>
              {i.title}
              <br />
              <span className="print-muted">{i.variantLabel}</span>
            </td>
            <td className="num">{qtyText(i)}</td>
            <td className="num">{money(i.unitPrice)}</td>
            <td className="num">{money(multiply(i.unitPrice, i.qty))}</td>
          </tr>
        ))}
      </tbody>
      <tfoot>
        <tr>
          <td colSpan={3}>Subtotal</td>
          <td className="num">{money(order.totals.subtotal)}</td>
        </tr>
        <tr>
          <td colSpan={3}>Delivery · {order.delivery.zone}</td>
          <td className="num">{money(order.totals.delivery)}</td>
        </tr>
        <tr className="print-total">
          <td colSpan={3}>Total paid</td>
          <td className="num">{money(order.totals.total)}</td>
        </tr>
      </tfoot>
    </table>
  );
}

export function Slip({ order, storeAddress }: { order: Order; storeAddress: string }) {
  return (
    <article className="print-sheet print-slip">
      <Logo width="46mm" />
      <p className="print-number">{order.number}</p>
      <p className="print-muted">Paid {order.paidAt ? dateTime(order.paidAt) : "—"}</p>
      <section>
        <p className="print-strong">{order.customer.name}</p>
        <p>{order.customer.phone}</p>
        <p>{order.delivery.address}</p>
        <p className="print-muted">{order.delivery.zone}</p>
      </section>
      <ul className="print-lines">
        {order.items.map((i) => (
          <li key={i.variantId}>
            <span>
              <span className="print-box" aria-hidden="true" /> {i.title} · {i.variantLabel}
            </span>
            <span className="num print-strong">{qtyText(i)}</span>
          </li>
        ))}
      </ul>
      <p className="print-row print-strong">
        <span>Total paid</span>
        <span className="num">{money(order.totals.total)}</span>
      </p>
      {storeAddress ? <p className="print-muted print-from">From: {storeAddress}</p> : null}
    </article>
  );
}

export function Invoice({ order, storeAddress }: { order: Order; storeAddress: string }) {
  return (
    <article className="print-sheet print-a4">
      <header className="print-head">
        <Logo width="70mm" />
        <div className="print-head-meta">
          <p className="print-title">Invoice {order.number}</p>
          <p>Date {order.paidAt ? dateTime(order.paidAt) : dateTime(order.createdAt)}</p>
          <p>Paid through Paystack</p>
        </div>
      </header>
      <section className="print-parties">
        <div>
          <p className="print-muted">Billed and delivered to</p>
          <p className="print-strong">{order.customer.name}</p>
          <p>{order.delivery.address}</p>
          <p>
            {order.customer.phone} · {order.customer.email}
          </p>
        </div>
        {storeAddress ? (
          <div>
            <p className="print-muted">From</p>
            <p className="print-strong">Harries Vogue</p>
            <p>{storeAddress}</p>
          </div>
        ) : null}
      </section>
      <Items order={order} />
    </article>
  );
}

let root: Root | null = null;

export async function printOrder(order: Order, format: PrintFormat) {
  const host = document.getElementById("print-root");
  if (!host) return;
  const from = await address();
  root ??= createRoot(host);
  flushSync(() => root!.render(format === "slip" ? <Slip order={order} storeAddress={from} /> : <Invoice order={order} storeAddress={from} />));

  // A roll printer needs the slip's real length: measure it off-screen at 74 mm wide.
  let size = "A4";
  let margin = "16mm";
  if (format === "slip") {
    const sheet = host.firstElementChild as HTMLElement | null;
    host.style.cssText = "display:block;position:absolute;left:-10000px;top:0;width:74mm";
    const mm = sheet ? Math.ceil((sheet.getBoundingClientRect().height * 25.4) / 96) + 8 : 150;
    host.style.cssText = "";
    size = `80mm ${mm}mm`;
    margin = "3mm";
  }
  const page = document.createElement("style");
  page.textContent = `@page { size: ${size}; margin: ${margin}; }`;
  document.head.appendChild(page);
  document.documentElement.dataset.printing = format;

  await document.fonts.ready;
  const done = () => {
    page.remove();
    delete document.documentElement.dataset.printing;
    window.removeEventListener("afterprint", done);
  };
  window.addEventListener("afterprint", done);
  window.print();
}
