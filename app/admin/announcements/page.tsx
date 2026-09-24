"use client";
import AdminTable from "@/components/admin/AdminTable";

export default function AnnouncementsPage() {
  return (
    <AdminTable
      table="announcements"
      title="📢 Announcements"
      subtitle="Active announcements are visible to signed-in tenants"
      itemLabel="announcement"
      orderBy="created_at"
      fields={[
        { key: "title", label: "Title", required: true, placeholder: "e.g. Water shutdown on Friday" },
        { key: "body", label: "Message", type: "textarea", placeholder: "Details tenants should know…" },
        { key: "active", label: "Active", type: "checkbox", defaultValue: true },
      ]}
    />
  );
}
