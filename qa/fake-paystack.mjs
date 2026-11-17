/* global process, console, fetch, URL */
/**
 * A local stand-in for Paystack, used only by the end-to-end test.
 *
 * Why: Paystack's hosted checkout sits behind a bot check, so no automated browser can pay on
 * it (and it shouldn't try). This plays Paystack's part faithfully instead:
 *   POST /transaction/initialize  → a payment page on this server
 *   GET  /pay/:ref                → "Pay (test)" button
 *   POST /pay/:ref                → sends the webhook, signed exactly as Paystack signs it
 *                                   (HMAC SHA-512 of the raw body with the secret key),
 *                                   then redirects to the shop's callback with ?reference=
 *   GET  /transaction/verify/:ref → the transaction's real amount and status
 * The real Paystack test mode is checked separately: live checkout reaches a real Paystack page.
 */
import { createHmac } from "node:crypto";
import { createServer } from "node:http";

const PORT = Number(process.env.FAKE_PAYSTACK_PORT ?? 8799);
const SECRET = process.env.FAKE_PAYSTACK_SECRET ?? "sk_test_e2e_not_a_real_key";
const API = process.env.API_URL ?? "http://localhost:8787";
const tx = new Map();

const json = (res, code, body) => {
  res.writeHead(code, { "Content-Type": "application/json" });
  res.end(JSON.stringify(body));
};
const read = (req) => new Promise((r) => {
  let s = "";
  req.on("data", (d) => (s += d)).on("end", () => r(s));
});

createServer(async (req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);
  if (req.headers.authorization && req.headers.authorization !== `Bearer ${SECRET}`) {
    return json(res, 401, { status: false, message: "Invalid key" });
  }
  if (req.method === "POST" && url.pathname === "/transaction/initialize") {
    const b = JSON.parse(await read(req));
    tx.set(b.reference, { ...b, status: "abandoned" });
    return json(res, 200, {
      status: true,
      data: { authorization_url: `http://localhost:${PORT}/pay/${b.reference}`, access_code: "e2e", reference: b.reference },
    });
  }
  const verify = url.pathname.match(/^\/transaction\/verify\/(.+)$/);
  if (req.method === "GET" && verify) {
    const t = tx.get(decodeURIComponent(verify[1]));
    if (!t) return json(res, 404, { status: false, message: "Transaction reference not found" });
    return json(res, 200, {
      status: true,
      data: { reference: t.reference, status: t.status, amount: t.amount, currency: t.currency, paid_at: t.paid_at ?? null },
    });
  }
  const pay = url.pathname.match(/^\/pay\/(.+)$/);
  if (pay) {
    const t = tx.get(decodeURIComponent(pay[1]));
    if (!t) return json(res, 404, { message: "unknown" });
    if (req.method === "GET") {
      res.writeHead(200, { "Content-Type": "text/html" });
      return res.end(`<!doctype html><title>Test payment</title><h1>Test payment</h1><p>₦${(t.amount / 100).toLocaleString()}</p>
<form method="post"><button>Pay (test)</button></form>`);
    }
    t.status = "success";
    t.paid_at = new Date().toISOString();
    const body = JSON.stringify({ event: "charge.success", data: { reference: t.reference, status: "success", amount: t.amount, currency: t.currency } });
    const sig = createHmac("sha512", SECRET).update(body).digest("hex");
    const hook = await fetch(`${API}/paystack/webhook`, { method: "POST", headers: { "x-paystack-signature": sig, "Content-Type": "application/json" }, body });
    console.log(`webhook ${t.reference} → ${hook.status}`);
    res.writeHead(302, { Location: `${t.callback_url}?reference=${t.reference}&trxref=${t.reference}` });
    return res.end();
  }
  json(res, 404, { message: "Not found" });
}).listen(PORT, () => console.log(`fake Paystack on ${PORT}`));
