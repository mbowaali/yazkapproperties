import { notFound } from "next/navigation";
import EmployeeModule, { type EmployeeField } from "@/components/employee/EmployeeModule";
import EmployeeReports from "@/components/employee/EmployeeReports";

type ModuleDefinition = {
  title: string; table: string; permission: string; description: string; orderBy: string;
  canCreate?: boolean; canEdit?: boolean; requestReplies?: boolean; receiptActions?: boolean; fields: EmployeeField[];
};

const MODULES: Record<string, ModuleDefinition> = {
  transactions: { title: "Transactions", table: "transactions", permission: "view_transactions", description: "Tenant rent and payment records.", orderBy: "date", canCreate: true, canEdit: true, fields: [
    { key: "date", label: "Date", type: "date", required: true, defaultValue: "today" },
    { key: "tenant_name", label: "Tenant", required: true },
    { key: "amount", label: "Amount", type: "number", currency: true, required: true },
    { key: "type", label: "Type", type: "select", options: ["rent", "deposit", "refund", "other"], defaultValue: "rent" },
    { key: "method", label: "Method", type: "select", options: ["Cash", "Cheque", "Bank Transfer", "Credit Card", "Online"] },
    { key: "status", label: "Status", type: "select", options: ["Paid", "Pending", "Overdue", "Partial"], defaultValue: "Paid" },
    { key: "note", label: "Note", type: "textarea", hideInTable: true },
  ] },
  expenses: { title: "Expenses", table: "expenses", permission: "view_expenses", description: "Operating expenses and receipt references.", orderBy: "date", canCreate: true, canEdit: true, fields: [
    { key: "date", label: "Date", type: "date", defaultValue: "today" }, { key: "category", label: "Category", type: "select", options: ["Utilities", "Maintenance", "Supplies", "Equipment", "Legal", "Staff", "Other"], defaultValue: "Other" },
    { key: "description", label: "Description" }, { key: "amount", label: "Amount", type: "number", currency: true, required: true },
    { key: "method", label: "Method", type: "select", options: ["Cash", "Bank Transfer", "Cheque", "Credit Card", "Card"] }, { key: "receipt_no", label: "Receipt no." },
    { key: "notes", label: "Notes", type: "textarea", hideInTable: true },
  ] },
  invoices: { title: "Invoices", table: "invoices", permission: "view_invoices", description: "Invoice amounts, due dates and payment status.", orderBy: "due_date", canCreate: true, canEdit: true, fields: [
    { key: "invoice_no", label: "Invoice no.", required: true }, { key: "total", label: "Total", type: "number", currency: true, required: true },
    { key: "due_date", label: "Due date", type: "date" }, { key: "status", label: "Status", type: "select", options: ["pending", "paid", "overdue"], defaultValue: "pending" },
  ] },
  tenants: { title: "Tenants", table: "tenants", permission: "view_tenants", description: "Tenant roster and unit assignments.", orderBy: "full_name", canCreate: true, canEdit: true, fields: [
    { key: "code", label: "Code", required: true }, { key: "full_name", label: "Full name", required: true }, { key: "phone", label: "Phone" },
    { key: "email", label: "Email" }, { key: "unit_label", label: "Unit" }, { key: "entry_date", label: "Entry date", type: "date" },
    { key: "monthly_rent", label: "Monthly rent", type: "number", currency: true }, { key: "status", label: "Status", type: "select", options: ["active", "exited"], defaultValue: "active" },
  ] },
  units: { title: "Units", table: "units", permission: "view_units", description: "Unit occupancy and maintenance status.", orderBy: "label", canCreate: true, canEdit: true, fields: [
    { key: "label", label: "Unit", required: true }, { key: "type", label: "Type", required: true }, { key: "rent", label: "Rent", type: "number", currency: true },
    { key: "status", label: "Status", type: "select", options: ["vacant", "occupied", "maintenance"], defaultValue: "vacant" }, { key: "notes", label: "Notes", type: "textarea", hideInTable: true },
  ] },
  maintenance: { title: "Maintenance", table: "maintenance_requests", permission: "view_maintenance", description: "Reported maintenance and repair work.", orderBy: "reported_date", canCreate: true, canEdit: true, fields: [
    { key: "unit_label", label: "Unit" }, { key: "tenant_name", label: "Tenant" }, { key: "issue", label: "Issue", required: true },
    { key: "priority", label: "Priority", type: "select", options: ["low", "medium", "high", "urgent"], defaultValue: "medium" },
    { key: "status", label: "Status", type: "select", options: ["open", "in-progress", "done"], defaultValue: "open" }, { key: "reported_date", label: "Reported", type: "date", defaultValue: "today" },
  ] },
  requests: { title: "Tenant Requests", table: "tenant_requests", permission: "view_requests", description: "Review tenant maintenance and service requests.", orderBy: "created_at", requestReplies: true, fields: [
    { key: "subject", label: "Subject" }, { key: "message", label: "Message", type: "textarea" }, { key: "status", label: "Status" }, { key: "admin_reply", label: "Latest reply" }, { key: "created_at", label: "Created" },
  ] },
  receipts: { title: "Receipts", table: "receipts", permission: "view_receipts", description: "Review payment evidence submitted by tenants.", orderBy: "created_at", receiptActions: true, fields: [
    { key: "tenant_name", label: "Tenant" }, { key: "receipt_no", label: "Receipt no." }, { key: "amount", label: "Amount", type: "number", currency: true },
    { key: "payment_date", label: "Payment date", type: "date" }, { key: "payment_method", label: "Method" }, { key: "status", label: "Status" },
  ] },
  announcements: { title: "Announcements", table: "announcements", permission: "manage_announcements", description: "Post messages visible to tenants.", orderBy: "created_at", canCreate: true, canEdit: true, fields: [
    { key: "title", label: "Title", required: true }, { key: "body", label: "Message", type: "textarea" }, { key: "active", label: "Visible to tenants", type: "checkbox", defaultValue: true },
  ] },
  events: { title: "News & Events", table: "tenant_events", permission: "manage_events", description: "Post tenant news, notices and events.", orderBy: "event_date", canCreate: true, canEdit: true, fields: [
    { key: "title", label: "Title", required: true }, { key: "body", label: "Details", type: "textarea" }, { key: "event_date", label: "Date", type: "date" },
    { key: "type", label: "Type", type: "select", options: ["news", "event", "reminder", "notice"], defaultValue: "news" }, { key: "active", label: "Visible", type: "checkbox", defaultValue: true },
  ] },
  laundry: { title: "Laundry Collections", table: "laundry_collections", permission: "manage_laundry", description: "Monthly shared-machine coin count at AED 3 per coin.", orderBy: "collection_month", canCreate: true, canEdit: true, fields: [
    { key: "collection_month", label: "Month", type: "month", required: true }, { key: "coin_count", label: "Coins collected", type: "number", required: true },
    { key: "total_amount", label: "Total (AED)", type: "number", currency: true, hideInTable: true }, { key: "collected_by", label: "Collected by" }, { key: "notes", label: "Notes", type: "textarea", hideInTable: true },
  ] },
  assets: { title: "Assets", table: "assets", permission: "manage_assets", description: "Track equipment and property assets.", orderBy: "name", canCreate: true, canEdit: true, fields: [
    { key: "name", label: "Asset", required: true }, { key: "category", label: "Category" }, { key: "location", label: "Location" },
    { key: "purchase_date", label: "Purchase date", type: "date" }, { key: "value", label: "Value", type: "number", currency: true },
    { key: "condition", label: "Condition", type: "select", options: ["good", "fair", "poor", "broken"] },
  ] },
  deposits: { title: "Deposits", table: "deposits", permission: "view_deposits", description: "Security deposit balances and refund status.", orderBy: "held_since", fields: [
    { key: "tenant_name", label: "Tenant" }, { key: "unit_label", label: "Unit" }, { key: "amount", label: "Amount", type: "number", currency: true },
    { key: "status", label: "Status" }, { key: "held_since", label: "Held since", type: "date" }, { key: "refund_date", label: "Refund date", type: "date" },
  ] },
};

export default function EmployeeSectionPage({ params }: { params: { section: string } }) {
  if (params.section === "reports") return <EmployeeReports />;
  const module = MODULES[params.section];
  if (!module) notFound();
  return <EmployeeModule module={module} />;
}