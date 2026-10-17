"use client";
import { useState } from "react";

interface BulkInviteModalProps {
  tenantIds: number[];
  onClose: () => void;
  onSuccess: () => void;
}

export default function BulkInviteModal({ tenantIds, onClose, onSuccess }: BulkInviteModalProps) {
  const [channel, setChannel] = useState<"email" | "sms" | "both">("email");
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<{ sent: number; skipped: number; results: Array<{ status: string; emailSent?: boolean; smsSent?: boolean; reason?: string }> } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const sendInvites = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await fetch("/api/admin/tenants/bulk-invite", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          tenantIds,
          channel,
        }),
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || "Failed to send invites");
      }

      setResult({
        sent: data.sent,
        skipped: data.skipped,
        results: data.results || [],
      });
      
      setTimeout(() => {
        onSuccess();
      }, 3000);
      
    } catch (err) {
      setError(err instanceof Error ? err.message : "An unknown error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 p-6">
        <h2 className="text-xl font-bold mb-4">Send Bulk Account Invites</h2>
        <p className="text-slate-600 mb-6">
          You're about to send account setup invites to {tenantIds.length} selected tenant{tenantIds.length !== 1 ? 's' : ''}.
        </p>

        <div className="mb-6">
          <label className="block text-sm font-medium text-slate-700 mb-2">
            Communication Channel
          </label>
          <div className="space-y-2">
            <label className="flex items-center gap-3 p-3 border rounded-lg cursor-pointer hover:bg-slate-50">
              <input
                type="radio"
                name="channel"
                value="email"
                checked={channel === "email"}
                onChange={(e) => setChannel(e.target.value as "email")}
                className="h-4 w-4 text-blue-600"
              />
              <div>
                <p className="font-medium">📧 Email Only</p>
                <p className="text-xs text-slate-500">Send invites via email only</p>
              </div>
            </label>
            
            <label className="flex items-center gap-3 p-3 border rounded-lg cursor-pointer hover:bg-slate-50">
              <input
                type="radio"
                name="channel"
                value="sms"
                checked={channel === "sms"}
                onChange={(e) => setChannel(e.target.value as "sms")}
                className="h-4 w-4 text-blue-600"
              />
              <div>
                <p className="font-medium">📱 SMS Only</p>
                <p className="text-xs text-slate-500">Send invites via SMS text message</p>
              </div>
            </label>
            
            <label className="flex items-center gap-3 p-3 border rounded-lg cursor-pointer hover:bg-slate-50">
              <input
                type="radio"
                name="channel"
                value="both"
                checked={channel === "both"}
                onChange={(e) => setChannel(e.target.value as "both")}
                className="h-4 w-4 text-blue-600"
              />
              <div>
                <p className="font-medium">📧 + 📱 Both Channels</p>
                <p className="text-xs text-slate-500">Send invites via both email and SMS</p>
              </div>
            </label>
          </div>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
            {error}
          </div>
        )}

        {result && (
          <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm">
            ✅ Successfully sent {result.sent} invites! {result.skipped > 0 && `${result.skipped} skipped (already have active invites).`}
            {result.results.filter(r => r.status === "failed").length > 0 && (
              <div className="mt-2 text-red-600">
                ⚠️ {result.results.filter(r => r.status === "failed").length} invites failed to send.
                Check server logs for details.
              </div>
            )}
          </div>
        )}

        <div className="flex gap-3 justify-end">
          <button
            onClick={onClose}
            disabled={isLoading}
            className="px-4 py-2 border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-50 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={sendInvites}
            disabled={isLoading || !!result}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            {isLoading ? "Sending..." : "Send Invites"}
          </button>
        </div>
      </div>
    </div>
  );
}