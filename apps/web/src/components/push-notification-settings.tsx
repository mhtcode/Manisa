"use client";

import { BellRing, BellOff } from "lucide-react";
import { useEffect, useState } from "react";

function applicationServerKey(value: string) {
  const padding = "=".repeat((4 - (value.length % 4)) % 4);
  const base64 = (value + padding).replace(/-/g, "+").replace(/_/g, "/");
  return Uint8Array.from(atob(base64), (character) => character.charCodeAt(0));
}

export function PushNotificationSettings() {
  const [supported, setSupported] = useState<boolean | null>(null);
  const [configured, setConfigured] = useState(false);
  const [publicKey, setPublicKey] = useState<string | null>(null);
  const [enabled, setEnabled] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    const available = "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
    void Promise.resolve(available).then(setSupported);
    if (!available) return;
    Promise.all([
      fetch("/api/push/subscriptions").then((response) => response.json()),
      navigator.serviceWorker.ready.then((registration) => registration.pushManager.getSubscription()),
    ]).then(([config, subscription]) => {
      setConfigured(Boolean(config.configured));
      setPublicKey(config.publicKey ?? null);
      setEnabled(Boolean(subscription));
    }).catch(() => setMessage("Could not read notification settings."));
  }, []);

  async function enable() {
    if (!publicKey) return;
    setBusy(true); setMessage("");
    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") throw new Error("Notification permission was not granted.");
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: applicationServerKey(publicKey) });
      const response = await fetch("/api/push/subscriptions", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(subscription.toJSON()) });
      if (!response.ok) throw new Error("Could not enable notifications.");
      setEnabled(true); setMessage("Notifications are enabled on this device.");
    } catch (error) { setMessage(error instanceof Error ? error.message : "Could not enable notifications."); }
    finally { setBusy(false); }
  }

  async function disable() {
    setBusy(true); setMessage("");
    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      if (subscription) {
        await fetch("/api/push/subscriptions", { method: "DELETE", headers: { "content-type": "application/json" }, body: JSON.stringify({ endpoint: subscription.endpoint }) });
        await subscription.unsubscribe();
      }
      setEnabled(false); setMessage("Notifications are disabled on this device.");
    } catch { setMessage("Could not disable notifications."); }
    finally { setBusy(false); }
  }

  return <section className="panel max-w-2xl p-5 sm:p-7">
    <span className="flex size-11 items-center justify-center rounded-xl bg-blue-500/10 text-blue-300">{enabled ? <BellRing size={20}/> : <BellOff size={20}/>}</span>
    <h2 className="mt-5 text-lg font-semibold text-slate-100">Mobile notifications</h2>
    <p className="mt-2 text-sm leading-6 text-slate-400">Receive Manisa alerts on this device. Alerts follow your role and permissions.</p>
    <button className={enabled ? "button-secondary mt-5" : "button-primary mt-5"} type="button" disabled={busy || !supported || !configured} onClick={enabled ? disable : enable}>
      {busy ? "Please wait…" : enabled ? "Disable on this device" : "Enable on this device"}
    </button>
    {supported === false ? <p className="mt-3 text-sm text-amber-300">Push notifications are not supported in this browser.</p> : null}
    {supported && !configured ? <p className="mt-3 text-sm text-amber-300">Push notification keys have not been configured yet.</p> : null}
    {message ? <p className="mt-3 text-sm text-slate-300">{message}</p> : null}
  </section>;
}
