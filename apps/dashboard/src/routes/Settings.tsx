import { useState, useSyncExternalStore, type ReactNode } from "react";
import { BellIcon } from "@hv/ui/icons";
import { Button, PageHeader, Panel, Pill, showToast } from "../components/ui";
import { ApiError } from "../lib/api";
import { signOut, useMe } from "../lib/auth";
import { seedSampleOrders } from "../lib/data";
import { disablePush, enablePush, pushStatus, sendTestPush, type PushStatus } from "../lib/push";

/** Settings — this phone's order alerts, the account, and (in development) sample orders. */

const STATUS_TEXT: Record<PushStatus, { pill: ReactNode; text: string }> = {
  on: { pill: <Pill tone="pos">On</Pill>, text: "This phone gets an alert the moment an order is paid." },
  off: { pill: <Pill>Off</Pill>, text: "Turn on to get an alert on this phone the moment an order is paid." },
  blocked: { pill: <Pill tone="neg">Blocked</Pill>, text: "Alerts are blocked for this site. Allow notifications in the browser's site settings, then come back." },
  "needs-install": {
    pill: <Pill tone="warn">Install first</Pill>,
    text: "On iPhone, alerts work once the dashboard is on the Home Screen: tap Share, then Add to Home Screen, and open it from there.",
  },
  unsupported: { pill: <Pill>Not available</Pill>, text: "This browser can't receive alerts. Use Chrome on Android, or the dashboard installed on an iPhone." },
  "not-configured": { pill: <Pill>Not set up</Pill>, text: "Alerts need the Firebase project and its Web Push key. They'll work once those are added." },
};

// Permission can change in browser settings while the app is open; re-read on focus.
function subscribe(cb: () => void) {
  window.addEventListener("focus", cb);
  return () => window.removeEventListener("focus", cb);
}

export function Settings() {
  const me = useMe();
  const live = useSyncExternalStore(subscribe, pushStatus, () => "off" as PushStatus);
  const [override, setOverride] = useState<PushStatus | null>(null);
  const status = override ?? live;
  const [busy, setBusy] = useState(false);

  const run = async (fn: () => Promise<PushStatus>) => {
    setBusy(true);
    try {
      setOverride(await fn());
    } catch (e) {
      showToast(e instanceof ApiError ? e.message : "Couldn't change alerts. Try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <PageHeader title="Settings" />
      <div className="grid max-w-[880px] gap-4">
        <Panel title="Order alerts on this phone" action={STATUS_TEXT[status].pill}>
          <div className="grid gap-5 md:grid-cols-[1fr_300px] md:items-start">
            <div>
              <p className="text-[15px] leading-[22px]">{STATUS_TEXT[status].text}</p>
              <div className="mt-4 flex flex-wrap gap-2">
                {status === "off" ? (
                  <Button tone="primary" disabled={busy} onClick={() => void run(enablePush)}>
                    <BellIcon size={16} /> Turn on alerts
                  </Button>
                ) : null}
                {status === "on" ? (
                  <>
                    <Button
                      disabled={busy}
                      onClick={async () => {
                        try {
                          const r = await sendTestPush();
                          showToast(`Test sent to ${r.devices} ${r.devices === 1 ? "phone" : "phones"}.`);
                        } catch (e) {
                          showToast(e instanceof ApiError ? e.message : "Couldn't send a test.");
                        }
                      }}
                    >
                      Send a test alert
                    </Button>
                    <Button tone="text" disabled={busy} onClick={() => void run(disablePush)}>
                      Turn off on this phone
                    </Button>
                  </>
                ) : null}
              </div>
            </div>
            {/* What the setting produces: the alert as it arrives. */}
            <figure aria-label="How an alert looks" className="rounded-[14px] border border-line bg-raised p-3">
              <div className="flex gap-3 rounded-[10px] bg-surface p-3 shadow-[0_1px_3px_rgba(0,0,0,0.06)]">
                <img src="/icon-192.png" alt="" width={36} height={36} className="h-9 w-9 flex-none rounded-[8px]" />
                <div className="min-w-0 text-[13px] leading-[18px]">
                  <p className="font-bold">New order HV-7K3M9Q · ₦60,000</p>
                  <p className="text-muted">Customer name · 2 items · Lagos</p>
                </div>
              </div>
              <figcaption className="mt-2 px-1 text-xs text-muted">Tap it to open the order.</figcaption>
            </figure>
          </div>
        </Panel>

        <Panel title="Account">
          <dl className="grid grid-cols-[100px_1fr] gap-y-2 text-sm">
            <dt className="text-muted">Signed in as</dt>
            <dd className="truncate">{me.email ?? me.uid}</dd>
            <dt className="text-muted">Role</dt>
            <dd className="capitalize">{me.role}</dd>
          </dl>
          <Button className="mt-4" onClick={() => void signOut()}>
            Sign out
          </Button>
        </Panel>

        {me.sampleData ? (
          <Panel title="Development" meta="Placeholder data only">
            <p className="text-sm text-muted">Adds eight paid sample orders across New, Packed and Sent, through the real stock path. Not available once Firebase is connected.</p>
            <Button
              className="mt-4"
              onClick={async () => {
                const r = await seedSampleOrders();
                showToast(`${r.created} sample orders added.`);
              }}
            >
              Add sample orders
            </Button>
          </Panel>
        ) : null}
      </div>
    </>
  );
}
