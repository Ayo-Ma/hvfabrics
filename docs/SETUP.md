# Setting up the accounts

Four accounts, in this order: **Firebase → Cloudflare → Paystack → Resend**. Then a local test, the first deploy, and getting her signed in on her phone.

Allow about 2 hours. Everything here is free except Cloudflare R2, which needs a card on file (the first 10 GB of photos are free).

## Before you start

- **Use the business's own email** (for example `harriesvogue@…`) to create every account, so the shop owns them. Add yourself as a member or admin afterwards. If she ever changes developer, nothing has to move.
- **Make a secrets folder outside this project and outside OneDrive**, for example `C:\Users\USER\hv-secrets\`. OneDrive copies everything in the project folder to the cloud, and the repo must never hold a key.
- **Never paste a secret into a chat, an email or a commit.** Secrets are anything starting `sk_`, the Firebase service-account file, and the Resend key. You type them into the terminal yourself (steps below). Public values are fine to share: the Firebase web config, the project id and your workers.dev name.
- All commands run from the project folder in a terminal: `c:\Users\USER\OneDrive\Documents\web\hv fabrics website`.
- **If a path has spaces, wrap it in double quotes**, for example `"C:/Users/USER/hv fabrics keys and rules/firebase-service-account.json"`. Otherwise the terminal splits it and the script prints its "Usage:" line.

Write each value into this checklist as you go (keep the copy with secrets in your secrets folder, not here):

| Value | Where it comes from | Secret? |
| --- | --- | --- |
| Firebase project id | Step 1.1 | No |
| Firebase web config (apiKey, authDomain, projectId, messagingSenderId, appId) | Step 1.5 | No |
| Web Push key (VAPID) | Step 1.6 | No |
| Service-account JSON file | Step 1.7 | **Yes** |
| workers.dev subdomain | Step 2.2 | No |
| KV namespace id | Step 2.4 | No |
| Paystack test secret key `sk_test_…` | Step 3.2 | **Yes** |
| Paystack test public key `pk_test_…` | Step 3.2 | No |
| Resend API key `re_…` | Step 4.2 | **Yes** |

---

## 1. Firebase (sign-in, database, order alerts)

1. **Create the project.** Go to <https://console.firebase.google.com>, sign in with the business Google account, then **Create a project**.
   - Name it `harries-vogue`. Firebase may add a suffix; the final **project id** is shown under the name. Write it down.
   - Google Analytics: **off**. The shop has its own analytics, and this avoids a cookie banner for Google.
2. **Turn on email sign-in.** Left menu **Build → Authentication → Get started → Sign-in method**.
   - Enable **Email/Password**. Leave "Email link" off.
3. **Create the database.** **Build → Firestore Database → Create database**.
   - **Edition:** Standard.
   - **Location:** choose `africa-south1 (Johannesburg)` if it's offered, otherwise `europe-west1 (Belgium)`. **This can't be changed later.**
   - **Start in production mode.** The real rules are deployed in step 5.4.
4. **Stay on the free Spark plan.** Nothing here needs Blaze.
5. **Register the dashboard as a web app.** Click the **⚙ gear → Project settings → General → Your apps**, then the **`</>` (Web)** icon.
   - Nickname: `HV dashboard`. Leave Firebase Hosting unticked (Cloudflare hosts it).
   - Copy the five values from the `firebaseConfig` it shows: `apiKey`, `authDomain`, `projectId`, `messagingSenderId`, `appId`. These are public.
6. **Create the Web Push key** (for order alerts on her phone). **⚙ gear next to Project Overview → Project settings**, then the **Cloud Messaging** *tab* along the top of that page.
   - It's a tab, not an item in the left menu. On a narrow window it may be behind the tabs' "More" arrow.
   - Direct link: `https://console.firebase.google.com/project/<project id>/settings/cloudmessaging`
   - No "Web configuration" section? Register the web app first (step 5).
   - The left-menu **Messaging** item is for marketing campaigns. You don't need it.
   - Scroll to **Web configuration → Web Push certificates → Generate key pair**.
   - Copy the long key. This is the **VAPID key**.
   - On the same page, check that **Firebase Cloud Messaging API (V1)** says *Enabled*. If it doesn't, click the ⋮ menu beside it and enable it in Google Cloud.
7. **Create the service account key** (lets the API Worker use the database and send alerts). **Project settings → Service accounts → Generate new private key → Generate key**.
   - A `.json` file downloads. **Move it straight into your secrets folder** and rename it `firebase-service-account.json`.
   - Delete it from Downloads.
   - It's the master key to the shop's data, so treat it like a bank PIN.

---

## 2. Cloudflare (hosting, catalogue cache, photo storage)

1. **Create the account.** Go to <https://dash.cloudflare.com/sign-up> and sign up with the business email. The free plan is enough.
2. **Choose the workers.dev name.** In the dashboard, open **Workers & Pages**.
   - The first time, it asks for a **workers.dev subdomain**, for example `harriesvogue`. Pick it now and write it down.
   - The three apps will live at:
     - Shop: `https://hv-storefront.<subdomain>.workers.dev`
     - Dashboard: `https://hv-dashboard.<subdomain>.workers.dev`
     - API: `https://hv-api.<subdomain>.workers.dev`

     A custom domain (for example `harriesvogue.com`) can replace these later.
3. **Turn on R2** (photo storage). In the left menu click **R2 Object Storage**, then **Purchase R2 / Add payment method**.
   - It's free up to 10 GB, but a card is required.
4. **Sign the terminal in to Cloudflare:**
   ```
   cd workers/api
   corepack pnpm exec wrangler login
   ```
   A browser tab opens. Click **Allow**. Then create the two storage spaces:
   ```
   corepack pnpm exec wrangler kv namespace create CATALOGUE
   corepack pnpm exec wrangler r2 bucket create hv-images
   ```
   The first command prints an `id`. Put that id in `workers/api/wrangler.jsonc` in **both** places that say `REPLACE_WITH_KV_NAMESPACE_ID`.
5. **Fill in the production addresses.** Use your subdomain from 2.2.
   - In `workers/api/wrangler.jsonc`, under `env.production.vars`:
     - `STOREFRONT_ORIGIN` → `https://hv-storefront.<subdomain>.workers.dev`
     - `DASHBOARD_ORIGIN` → `https://hv-dashboard.<subdomain>.workers.dev`
   - In `apps/storefront/wrangler.jsonc`, under `env.production.vars`:
     - `API_URL` → `https://hv-api.<subdomain>.workers.dev`
     - `IMAGE_BASE` → `https://hv-api.<subdomain>.workers.dev/images`

---

## 3. Paystack (payments, test mode first)

1. **Create the account.** Go to <https://dashboard.paystack.com/#/signup> and register the business (Nigeria).
   - A new account starts in **Test mode** (the toggle at the top). Stay there.
   - Going live later needs her business documents (CAC registration, ID, bank account). Start that paperwork now: it takes days.
2. **Copy the test keys.** Open **Settings → API Keys & Webhooks**.
   - Copy the **Test Secret Key** (`sk_test_…`, secret) into your secrets folder.
   - Copy the **Test Public Key** (`pk_test_…`).
3. **Set the webhook.** On the same page:
   - **Test Webhook URL:** `https://hv-api.<subdomain>.workers.dev/paystack/webhook`
   - Leave the **Test Callback URL** empty. The shop sends its own per order.
   - Click **Save changes**.

---

## 4. Resend (order emails)

1. **Create the account.** Go to <https://resend.com/signup> and sign up with the business email.
2. **Create a key.** Open **API Keys → Create API key**.
   - **Name:** `hv-api`. **Permission:** *Sending access*.
   - Copy the `re_…` key into your secrets folder. It's shown once.
3. **Until a domain is verified,** Resend only sends *to the account's own email*. So her new-order alert emails work now, but customer receipts don't.
   - Once the shop has a domain, open **Domains → Add domain**, add the DNS records it lists, and wait for *Verified*.
   - Then change `EMAIL_FROM` in `workers/api/wrangler.jsonc` (production) to `Harries Vogue <orders@yourdomain>`.

---

## 5. Connect everything and test on your computer

1. **API secrets for local testing.** Create `workers/api/.dev.vars`. It's git-ignored; copy it from `.dev.vars.example`.
   ```
   PAYSTACK_SECRET_KEY=sk_test_…
   PAYSTACK_PUBLIC_KEY=pk_test_…
   FIREBASE_PROJECT_ID=<project id>
   FIREBASE_SERVICE_ACCOUNT=<the whole JSON on one line>
   RESEND_API_KEY=re_…
   ```
   To get the JSON on one line:
   ```
   node -e "console.log(JSON.stringify(require('C:/Users/USER/hv-secrets/firebase-service-account.json')))"
   ```
   Copy the output into `.dev.vars` yourself. **The local API now uses the real Firebase database**, not samples.
2. **Dashboard settings for local testing.** Copy `apps/dashboard/.env.example` to `apps/dashboard/.env.local` and fill in:
   - the five Firebase web values from 1.5
   - the VAPID key from 1.6
   - leave `VITE_API_URL=http://localhost:8787`
3. **Create the shop settings record.** Use her email for order alerts:
   ```
   node workers/api/scripts/init-firestore.mjs C:/Users/USER/hv-secrets/firebase-service-account.json her@email.com
   ```
   Delivery zones and policies start as `[TBC]`. Replace them in **Firestore → settings → store** when she confirms them.
4. **Deploy the database rules and indexes.** One-time login, then deploy:
   ```
   cd workers/api
   npx firebase-tools login
   npx firebase-tools deploy --only firestore --project <project id>
   cd ..\..
   ```
   The last line takes you back to the project folder. The next commands start from there.
   The indexes take a few minutes to build. **Firestore → Indexes** shows them turning *Enabled*.
5. **Create her login and give it owner access.**
   - In **Authentication → Users → Add user**, enter her email and a temporary password.
   - Then run:
     ```
     node workers/api/scripts/set-admin.mjs C:/Users/USER/hv-secrets/firebase-service-account.json her@email.com owner
     ```
   - Do the same for yourself with `manager`, and for anyone packing orders with `packer`.
6. **Run it locally.** Three terminals:
   ```
   cd workers/api && corepack pnpm exec wrangler dev --port 8787
   cd apps/storefront && corepack pnpm exec react-router dev --port 5173
   cd apps/dashboard && corepack pnpm exec vite --port 5180
   ```
   Open <http://localhost:5180> and sign in with her email and password.
   - The orange "development data" banner should be gone.
   - Products start empty. Add one with a photo and set it **Live**.

---

## 6. Deploy

1. **Put the API secrets into Cloudflare** (run each line; it asks you to paste the value):
   ```
   cd workers/api
   corepack pnpm exec wrangler secret put PAYSTACK_SECRET_KEY --env production
   corepack pnpm exec wrangler secret put PAYSTACK_PUBLIC_KEY --env production
   corepack pnpm exec wrangler secret put RESEND_API_KEY --env production
   corepack pnpm exec wrangler secret put FIREBASE_PROJECT_ID --env production
   corepack pnpm exec wrangler secret put FIREBASE_SERVICE_ACCOUNT --env production < C:/Users/USER/hv-secrets/firebase-service-account.json
   ```
2. **Deploy the API:**
   ```
   corepack pnpm exec wrangler deploy --env production
   ```
   If it says Analytics Engine isn't enabled, open **Workers & Pages → Analytics Engine** in Cloudflare, enable it, and run the command again.

   Check it: `https://hv-api.<subdomain>.workers.dev/health` should show `{"ok":true}`.
3. **Deploy the storefront:**
   ```
   cd apps/storefront
   set CLOUDFLARE_ENV=production&& corepack pnpm exec react-router build && corepack pnpm exec wrangler deploy
   ```
   That's Windows `cmd` syntax. In Git Bash use `CLOUDFLARE_ENV=production corepack pnpm exec react-router build`, then the deploy.
4. **Deploy the dashboard.**
   - Copy `apps/dashboard/.env.production.example` to `.env.production.local`.
   - Fill it with the same Firebase values, and set `VITE_API_URL=https://hv-api.<subdomain>.workers.dev`.
   - Then:
     ```
     cd apps/dashboard
     corepack pnpm exec vite build && corepack pnpm exec wrangler deploy
     ```
5. **Allow the dashboard's address in Firebase.** **Authentication → Settings → Authorized domains → Add domain** → `hv-dashboard.<subdomain>.workers.dev`.

---

## 6b. Automatic deploys (Workers Builds)

After this, pushing to `main` on GitHub deploys automatically, like Vercel. Each Worker rebuilds only when its own files change, and the API's tests run inside its build: a failing test stops the deploy.

For **each** of the three Workers: Cloudflare → **Workers & Pages** → click the Worker → **Settings → Build** → **Connect** → choose GitHub → authorize Cloudflare's GitHub app for `Ayo-Ma/hvfabrics` → fill in:

| Setting | `hv-api` | `hv-storefront` | `hv-dashboard` |
| --- | --- | --- | --- |
| Branch | `main` | `main` | `main` |
| Root directory | `/` (leave empty) | `/` | `/` |
| Build command | `corepack pnpm install --frozen-lockfile && corepack pnpm --filter @hv/core test && corepack pnpm --filter @hv/api test` | `corepack pnpm install --frozen-lockfile && cd apps/storefront && CLOUDFLARE_ENV=production corepack pnpm exec react-router build` | `corepack pnpm install --frozen-lockfile && cd apps/dashboard && corepack pnpm exec vite build` |
| Deploy command | `cd workers/api && corepack pnpm exec wrangler deploy --env production` | `cd apps/storefront && corepack pnpm exec wrangler deploy` | `cd apps/dashboard && corepack pnpm exec wrangler deploy` |
| Build watch paths (include) | `workers/api/*`, `packages/core/*` | `apps/storefront/*`, `packages/*` | `apps/dashboard/*`, `packages/*` |
| Builds for non-production branches | **Off** (previews would use the live database) | Off | Off |

**`hv-dashboard` only:** under **Build → Variables and secrets**, add these as *build* variables. They are the same public values as in `apps/dashboard/.env.production.local`:
- `VITE_API_URL` = `https://hv-api.harriesvogueglobal.workers.dev`
- `VITE_FIREBASE_API_KEY`
- `VITE_FIREBASE_AUTH_DOMAIN`
- `VITE_FIREBASE_PROJECT_ID`
- `VITE_FIREBASE_MESSAGING_SENDER_ID`
- `VITE_FIREBASE_APP_ID`
- `VITE_FCM_VAPID_KEY`

The API's secrets (Paystack, Firebase service account, Resend) are already stored on the Worker from step 6.1. Don't add them here.

**Check it works:** make a tiny change (e.g. a comment in `apps/dashboard/src/main.tsx`) and push. In the Worker's **Deployments** tab a build should start and finish green. Only `hv-dashboard` rebuilds; the other two are skipped because their files didn't change.

## 7. Her phone

1. On her phone, open `https://hv-dashboard.<subdomain>.workers.dev` in **Chrome** (Android) or **Safari** (iPhone). Sign in.
2. **Install it.**
   - Android: Chrome menu ⋮ → **Add to Home screen / Install app**.
   - iPhone: **Share → Add to Home Screen**. Then open it from the Home Screen icon (on iPhone, alerts only work this way).
3. In the dashboard, go to **Settings → Turn on alerts → Allow**, then **Send a test alert**. It should arrive within a few seconds.
4. She changes her temporary password with **Forgot password** on the sign-in screen.

---

## 8. The full test (Paystack test mode)

1. On the shop (`hv-storefront…`), add the product you created to the bag and check out.
2. On the Paystack page, pay with a test card from <https://paystack.com/docs/payments/test-payments>.
   - This is test money; nothing is charged.
   - At the time of writing, the success card is `4084 0840 8408 4081`, any future expiry, CVV `408`, PIN `0000`, OTP `123456`.
3. Check:
   - the confirmation page shows the order
   - her phone gets the alert (target: within 10 seconds)
   - the order is in **Orders → New**
   - stock went down
   - the 80 mm slip and A4 invoice print
4. Tell me which of these passed. I'll then run the automated checks (Phase 1 quality gate) against the live URLs.

## Going live later (not yet)

- **Visit statistics (Analytics Engine), off since the first deploy.**
  1. Cloudflare → Workers & Pages → Analytics Engine → enable.
  2. Uncomment `analytics_engine_datasets` under `env.production`.
  3. Redeploy the API.
- The storefront reaches the API through a **service binding** (`services` in `apps/storefront/wrangler.jsonc`), because Cloudflare blocks one Worker from fetching another over workers.dev. Keep it when adding a custom domain.

- **Paystack:** finish business verification, switch to **Live mode**, and replace both keys (`wrangler secret put … --env production`) with the live ones. Set the **Live Webhook URL** to the same `/paystack/webhook` address.
- **Real content:** replace the `[TBC]` delivery zones, fees and policies; add real products and photos.
- **Domain:** add the domain in Cloudflare and attach it to the storefront and dashboard Workers. Then update `STOREFRONT_ORIGIN`, `DASHBOARD_ORIGIN`, `API_URL`, the Paystack webhook, Firebase's authorized domains and Resend.

## If something goes wrong

| Symptom | Likely cause |
| --- | --- |
| Dashboard says "This account isn't a Harries Vogue admin" | `set-admin.mjs` wasn't run for that email, or she needs to sign out and in again |
| API logs `settings/store is missing` | Step 5.3 wasn't run |
| Orders board errors with "requires an index" | Indexes are still building (step 5.4); wait a few minutes |
| Checkout says "Payments aren't configured" | `PAYSTACK_SECRET_KEY` isn't set for that environment |
| Paid in Paystack but order stays pending | Webhook URL wrong in Paystack (step 3.3); the confirmation page still re-checks, so this only delays it |
| "Turn on alerts" says Not set up | `VITE_FCM_VAPID_KEY` or the Firebase values missing from the dashboard build |
| Photo upload says storage isn't configured | R2 bucket `hv-images` missing (step 2.4) |
