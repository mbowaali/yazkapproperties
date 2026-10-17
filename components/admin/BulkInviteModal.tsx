"use client";
import { useEffect, useState } from "react";

interface TenantOption {
  id: number;
  full_name: string;
  email: string | null;
  phone: string | null;
  status: string | null;
}

interface BulkInviteModalProps {
  tenantIds: number[];
  onClose: () => void;
  onSuccess: () => void;
}

type Channel = "email" | "sms" | "whatsapp" | "both";

export default function BulkInviteModal({ tenantIds, onClose, onSuccess }: BulkInviteModalProps) {
  const [channel, setChannel] = useState<Channel>("email");
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<{ sent: number; skipped: number; results: Array<{ status: string; emailSent?: boolean; smsSent?: boolean; whatsappSent?: boolean; reason?: string }> } | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Tenant list synced from the database
  const [tenants, setTenants] = useState<TenantOption[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [tenantsLoading, setTenantsLoading] = useState(true);

  // Selected tenant IDs (starts with pre-selected from the table)
  const [selectedIds, setSelectedIds] = useState<number[]>(tenantIds);

  useEffect(() => {
    setSelectedIds(tenantIds);
  }, [tenantIds]);

  // Load all existing tenants from the database on open
  useEffect(() => {
    setTenantsLoading(true);
    fetch("/api/admin/tenants/search")
      .then((res) => res.json())
      .then((data) => {
        setTenants(data.tenants || []);
        setTenantsLoading(false);
      })
      .catch(() => {
        setTenants([]);
        setTenantsLoading(false);
      });
  }, []);

  const filteredTenants = tenants.filter((t) => {
    const q = searchQuery.toLowerCase();
    return (
      t.full_name.toLowerCase().includes(q) ||
      (t.email ?? "").toLowerCase().includes(q) ||
      (t.phone ?? "").toLowerCase().includes(q)
    );
  });

  const toggleSelection = (id: number) => {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const isSelected = (id: number) => selectedIds.includes(id);

  const selectAllVisible = () => {
    setSelectedIds([...new Set([...selectedIds, ...filteredTenants.map((t) => t.id)])]);
  };

  const deselectAllVisible = () => {
    const visibleIds = new Set(filteredTenants.map((t) => t.id));
    setSelectedIds(selectedIds.filter((id) => !visibleIds.has(id)));
  };

  const sendInvites = async () => {
    if (selectedIds.length === 0) {
      setError("Please select at least one tenant to invite.");
      return;
    }
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/admin/tenants/bulk-invite", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          tenantIds: selectedIds,
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

  const channelLabel = (c: Channel) => {
    switch (c) {
      case "email": return "📧 Email Only";
      case "sms": return "📱 SMS Only";
      case "whatsapp": return "💬 WhatsApp Only";
      case "both": return "📧 + 📱 + 💬 All Channels";
    }
  };

  const channelDesc = (c: Channel) => {
    switch (c) {
      case "email": return "Send invites via email only";
      case "sms": return "Send invites via SMS text message";
      case "whatsapp": return "Send invites via WhatsApp message";
      case "both": return "Send invites via email, SMS, and WhatsApp";
    }
  };

  const allVisibleSelected = filteredTenants.length > 0 && filteredTenants.every((t) => isSelected(t.id));

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full mx-2 max-h-[90vh] flex flex-col overflow-hidden">
        <div className="p-6 border-b border-slate-200">
          <h2 className="text-xl font-bold text-slate-900 mb-1">Send Account Invites</h2>
          <p className="text-slate-600 text-sm">
            Select existing tenants from the database and send them account setup invites by email or WhatsApp.
          </p>
        </div>

        <div className="p-6 overflow-y-auto flex-1">
          {/* Channel selection */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-slate-700 mb-3">Communication Channel</label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {["email", "sms", "whatsapp", "both"].map((c) => (
                <label
                  key={c}
                  className={`flex items-center gap-3 p-3 border rounded-lg cursor-pointer transition-colors ${
                    channel === c
                      ? "border-blue-500 bg-blue-50"
                      : "border-slate-200 hover:bg-slate-50"
                  }`}
                >
                  <input
                    type="radio"
                    name="channel"
                    value={c}
                    checked={channel === c}
                    onChange={() => setChannel(c as Channel)}
                    className="h-4 w-4 text-blue-600 shrink-0"
                  />
                  <div>
                    <p className="font-medium text-slate-900">{channelLabel(c as Channel)}</p>
                    <p className="text-xs text-slate-500">{channelDesc(c as Channel)}</p>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* Tenant list synced from database */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <label className="text-sm font-medium text-slate-700">Select Tenants</label>
                <span className="text-xs text-slate-500">({selectedIds.length} selected)</span>
              </div>
              {filteredTenants.length > 0 && (
                <div className="flex gap-2">
                  <button
                    onClick={deselectAllVisible}
                    className="text-xs text-slate-500 hover:text-slate-700 underline"
                  >
                    Deselect all visible
                  </button>
                  <button
                    onClick={selectAllVisible}
                    className={`text-xs font-medium rounded px-2 py-1 ${
                      allVisibleSelected ? "bg-blue-100 text-blue-700" : "bg-slate-100 text-slate-700"
                    }`}
                  >
                    {allVisibleSelected ? "Selected" : "Select all visible"}
                  </button>
                </div>
              )}
            </div>

            <div className="relative mb-3">
              <input
                type="text"
                placeholder="Search by name, email, or phone…"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full input pl-9"
              />
              <div className="absolute left-3 top-1/2 -mt-2 text-slate-400">🔍</div>
            </div>

            {tenantsLoading && (
              <div className="h-48 flex items-center justify-center text-slate-500 text-sm">
                Loading tenants from database…
              </div>
            )}

            {!tenantsLoading && filteredTenants.length === 0 && (
              <div className="h-48 flex items-center justify-center text-slate-500 text-sm">
                No tenants found matching your search.
              </div>
            )}

            {!tenantsLoading && filteredTenants.length > 0 && (
              <div className="border border-slate-200 rounded-lg max-h-96 overflow-y-auto bg-white">
                {filteredTenants.map((t) => (
                  <button
                    key={t.id}
                    onClick={() => toggleSelection(t.id)}
                    className={`w-full flex items-center justify-between p-3 text-left border-b border-slate-50 hover:bg-slate-50 last:border-b-0 ${
                      isSelected(t.id) ? "bg-blue-50 border-blue-100" : ""
                    }`}
                  >
                    <div className="flex-1">
                      <p className="font-medium text-slate-900">{t.full_name}</p>
                      <p className="text-xs text-slate-500 truncate max-w-xs">
                        ID: {t.id} · {t.email ?? t.phone ?? "No contact info"}
                        {t.status ? ` · ${t.status}` : ""}
                      </p>
                    </div>
                    <span className={`text-xs font-medium rounded-full px-2 py-0.5 ${
                      isSelected(t.id)
                        ? "bg-blue-100 text-blue-700"
                        : "bg-slate-100 text-slate-500"
                    }`}>
                      {isSelected(t.id) ? "Selected" : "Add"}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {selectedIds.length > 0 && (
            <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-100">
              <p className="text-sm text-blue-800 font-medium">
                {selectedIds.length} tenant{selectedIds.length !== 1 ? "s" : ""} selected for invite
              </p>
            </div>
          )}

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
              {error}
            </div>
          )}

          {result && (
            <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm">
              ✅ Successfully sent {result.sent} invite{result.sent !== 1 ? "s" : ""}!{' '}
              {result.skipped > 0 && `${result.skipped} skipped (already have active invites).`}
              {result.results.filter((r) => r.status === "failed").length > 0 && (
                <div className="mt-2 text-red-600 text-sm">
                  ⚠️ {result.results.filter((r) => r.status === "failed").length} invite{result.results.filter((r) => r.status === "failed").length !== 1 ? "s" : ""} failed to send.
                </div>
              )}
            </div>
          )}
        </div>

        <div className="p-6 border-t border-slate-200 bg-slate-50 flex gap-3 justify-end">
          <button
            onClick={onClose}
            disabled={isLoading || !!result}
            className="px-4 py-2 border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-200 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={sendInvites}
            disabled={isLoading || !!result || selectedIds.length === 0}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            {isLoading ? "Sending…" : "Send Invites"}
          </button>
        </div>
      </div>
    </div>
  );
}
