// All available employee permissions — single source of truth
export const ALL_PERMISSIONS = [
  { key: "view_transactions",    label: "View Transactions",      group: "Finance" },
  { key: "manage_transactions",  label: "Add/Edit Transactions",  group: "Finance" },
  { key: "view_expenses",        label: "View Expenses",          group: "Finance" },
  { key: "manage_expenses",      label: "Add/Edit Expenses",      group: "Finance" },
  { key: "view_invoices",        label: "View Invoices",          group: "Finance" },
  { key: "manage_invoices",      label: "Add/Edit Invoices",      group: "Finance" },
  { key: "view_tenants",         label: "View Tenants",           group: "Tenants" },
  { key: "manage_tenants",       label: "Add/Edit Tenants",       group: "Tenants" },
  { key: "view_units",           label: "View Units",             group: "Tenants" },
  { key: "manage_units",         label: "Add/Edit Units",         group: "Tenants" },
  { key: "view_maintenance",     label: "View Maintenance",       group: "Operations" },
  { key: "manage_maintenance",   label: "Update Maintenance",     group: "Operations" },
  { key: "view_requests",        label: "View Tenant Requests",   group: "Operations" },
  { key: "reply_requests",       label: "Reply to Requests",      group: "Operations" },
  { key: "view_receipts",        label: "View Receipts",          group: "Operations" },
  { key: "approve_receipts",     label: "Approve Receipts",       group: "Operations" },
  { key: "manage_announcements", label: "Post Announcements",     group: "Communications" },
  { key: "manage_events",        label: "Post News & Events",     group: "Communications" },
  { key: "view_reports",         label: "View Reports",           group: "Reports" },
  { key: "view_deposits",        label: "View Deposits",          group: "Finance" },
  { key: "manage_laundry",       label: "Manage Laundry",         group: "Operations" },
  { key: "manage_assets",        label: "Manage Assets",          group: "Operations" },
] as const;

export type Permission = typeof ALL_PERMISSIONS[number]["key"];

export const EMPLOYEE_TABLE_PERMISSIONS: Record<string, { view: Permission; manage?: Permission }> = {
  transactions: { view: "view_transactions", manage: "manage_transactions" },
  expenses: { view: "view_expenses", manage: "manage_expenses" },
  invoices: { view: "view_invoices", manage: "manage_invoices" },
  tenants: { view: "view_tenants", manage: "manage_tenants" },
  tenancies: { view: "view_tenants", manage: "manage_tenants" },
  units: { view: "view_units", manage: "manage_units" },
  maintenance_requests: { view: "view_maintenance", manage: "manage_maintenance" },
  tenant_requests: { view: "view_requests", manage: "reply_requests" },
  receipts: { view: "view_receipts", manage: "approve_receipts" },
  announcements: { view: "manage_announcements", manage: "manage_announcements" },
  tenant_events: { view: "manage_events", manage: "manage_events" },
  deposits: { view: "view_deposits" },
  assets: { view: "manage_assets", manage: "manage_assets" },
  laundry_collections: { view: "manage_laundry", manage: "manage_laundry" },
  laundry_usage: { view: "manage_laundry", manage: "manage_laundry" },
  landlord_payments: { view: "view_reports" },
};

export function employeeCanReadTable(table: string, permissions: string[]) {
  const rule = EMPLOYEE_TABLE_PERMISSIONS[table];
  return Boolean(rule && (permissions.includes(rule.view) || (rule.manage && permissions.includes(rule.manage))));
}

export function employeeCanWriteTable(table: string, permissions: string[]) {
  const rule = EMPLOYEE_TABLE_PERMISSIONS[table];
  return Boolean(rule?.manage && permissions.includes(rule.manage));
}

export function groupPermissions() {
  const groups: Record<string, typeof ALL_PERMISSIONS[number][]> = {};
  for (const p of ALL_PERMISSIONS) {
    if (!groups[p.group]) groups[p.group] = [];
    groups[p.group].push(p);
  }
  return groups;
}
