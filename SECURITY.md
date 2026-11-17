# Security

## Reporting a problem

Please report security issues privately through GitHub: **Security → Report a vulnerability** on this repository.
Don't open a public issue.

## Where data lives

| What | Where |
| --- | --- |
| Orders, customers, products, stock, settings | Google Cloud Firestore, region `africa-south1` (Johannesburg) |
| Product photos | Cloudflare R2 |
| Public catalogue cache (no customer data) | Cloudflare Workers KV |
| Payments and card data | Paystack only. Card details never touch these servers |
| Sign-in accounts for the dashboard | Firebase Authentication |
| Secrets (API keys, service account) | Cloudflare Worker secrets only. Never in this repository |

## How it's protected

- **Database:** closed to the internet by Firestore security rules. Only the API Worker reads and writes it, with a service account.
- **Dashboard:**
  - every API call needs a Firebase sign-in token whose signature, project, expiry and `admin` role are checked on the server
  - the API only accepts calls from the dashboard's own address
  - accounts can't be self-created; strong passwords are enforced
  - the dashboard can't be framed by other sites
- **Payments:**
  - Paystack webhooks are checked with HMAC SHA-512
  - every payment is re-verified with Paystack and the amount compared before an order is marked paid
  - checkout only returns shoppers to the shop's own address
- **Stock:** reserved and sold inside database transactions (tested with 20 simultaneous buyers).
- **Browsers:**
  - HTTPS only (HSTS)
  - a Content-Security-Policy on every site (the shop uses a fresh script nonce per page)
  - no MIME sniffing; no framing
- **Inputs:** every API input, webhook and upload is validated (schemas; photos checked by type, size and content).

## Checks that run automatically

| Check | When | Where |
| --- | --- | --- |
| Types, lint, unit tests, dependency audit (shipped code: no high/critical) | Every push | `.github/workflows/ci.yml` |
| End-to-end and accessibility tests | Every push | `.github/workflows/ci.yml` |
| Live attack checks: sign-in, forged tokens, CORS, webhooks, redirects, database rules, security headers | Daily and on deploy | `.github/workflows/security.yml` → `qa/security-check.mjs` |
| Live sites still work under their security policies | Daily and on deploy | `qa/live-smoke.mjs` |
| Code scanning (CodeQL, security-extended) | Every push and weekly | `.github/workflows/codeql.yml` |
| Dependency security updates | Weekly pull requests | `.github/dependabot.yml` |

Run the live checks by hand with `node qa/security-check.mjs` and `node qa/live-smoke.mjs`.
