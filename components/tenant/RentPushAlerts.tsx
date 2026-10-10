"use client";
import { useEffect, useState } from "react";

function decodeApplicationServerKey(value: string) {
  const padded = value + "=".repeat((4 - value.length % 4) % 4);
  const decoded = atob(padded.replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from(decoded, character => character.charCodeAt(0));
}

export default function RentPushAlerts() {
  const [supported, setSupported] = useState(false);
  const [configured, setConfigured] = useState(false);
  const [publicKey, setPublicKey] = useState("");
  const [subscribed, setSubscribed] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission | "unsupported">("default");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    const available = "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
    setSupported(available);
    if (!available) { setPermission("unsupported"); return; }
    setPermission(Notification.permission);
    fetch("/api/tenant/push-subscription")
      .then(response => response.json())
      .then(async result => {
        if (!result.publicKey) return;
        setPublicKey(result.publicKey);
        setConfigured(true);
        const registration = await navigator.serviceWorker.register("/sw.js");
        const current = await registration.pushManager.getSubscription();
        setSubscribed(Boolean(current));
      })
      .catch(() => setMessage("Rent notifications are temporarily unavailable."));
  }, []);

  const enable = async () => {
    if (!publicKey || busy) return;
    setBusy(true);
    setMessage("");
    try {
      const result = await Notification.requestPermission();
      setPermission(result);
      if (result !== "granted") { setMessage("Allow notifications in your browser to receive rent reminders."); return; }
      const registration = await navigator.serviceWorker.register("/sw.js");
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: decodeApplicationServerKey(publicKey),
      });
      const response = await fetch("/api/tenant/push-subscription", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(subscription),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Could not save notification settings.");
      setSubscribed(true);
      setMessage("Rent reminders enabled on this device.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not enable notifications.");
    } finally {
      setBusy(false);
    }
  };

  const disable = async () => {
    setBusy(true);
    setMessage("");
    try {
      const registration = await navigator.serviceWorker.getRegistration("/sw.js");
      const subscription = await registration?.pushManager.getSubscription();
      if (subscription) {
        await fetch("/api/tenant/push-subscription", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ endpoint: subscription.endpoint }),
        });
        await subscription.unsubscribe();
      }
      setSubscribed(false);
      setMessage("Rent reminders disabled on this device.");
    } catch {
      setMessage("Could not update notification settings.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="flex flex-col gap-3 rounded-lg border border-sky-200 bg-sky-50/70 p-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-white text-xl" aria-hidden>🔔</span>
        <div>
          <h2 className="font-semibold text-slate-900">Rent due reminders</h2>
          <p className="mt-0.5 text-sm text-slate-600">Get a browser notification before, on, and shortly after an invoice due date.</p>
          {message && <p className="mt-1 text-xs text-slate-600" role="status">{message}</p>}
        </div>
      </div>
      {supported && configured && permission !== "denied" && (
        <button type="button" onClick={subscribed ? disable : enable} disabled={busy}
          className={subscribed ? "btn-ghost !min-h-10 !rounded-lg !px-4" : "btn-primary !min-h-10 !rounded-lg !px-4"}>
          {busy ? "Updating…" : subscribed ? "Turn off" : "Enable notifications"}
        </button>
      )}
      {!configured && supported && <span className="text-xs font-medium text-slate-500">Notifications are not configured yet.</span>}
      {permission === "denied" && <span className="text-xs font-medium text-amber-800">Notifications are blocked in this browser.</span>}
      {!supported && <span className="text-xs font-medium text-slate-500">This browser does not support push notifications.</span>}
    </section>
  );
}