export const FULL_PERMISSION = "*" as const;

export type ResortPermission = string;

export function hasResortPermission(
  permissions: readonly string[] | null | undefined,
  permission: ResortPermission,
) {
  return Boolean(
    permissions?.includes(FULL_PERMISSION) || permissions?.includes(permission),
  );
}

export function hasAnyResortPermission(
  permissions: readonly string[] | null | undefined,
  permissionIds: readonly ResortPermission[],
) {
  return (
    permissions?.includes(FULL_PERMISSION) ||
    permissionIds.some((permission) => permissions?.includes(permission))
  );
}

export function getResortRoutePermission(pathname: string) {
  const path = pathname.replace(/\/$/, "");

  if (path === "/resort/dashboard") return "dashboard.view";
  if (path.startsWith("/resort/access/users")) return "usersRoles.view";
  if (path.startsWith("/resort/access/roles")) return "usersRoles.permissions.manage";
  if (path.startsWith("/resort/access/departments")) return "departments.view";
  if (path.startsWith("/resort/guests")) return "guestExperience.profiles.manage";
  if (path.startsWith("/resort/reservations/new")) return "reservations.create";
  if (path.startsWith("/resort/reservations")) return "reservations.view";
  if (path.startsWith("/resort/services/rooms")) return "rooms.view";
  if (path.startsWith("/resort/services/amenities")) return "amenities.view";
  if (path.startsWith("/resort/services")) return "services.view";
  if (path.startsWith("/resort/leads")) return "leads.view";
  if (path.startsWith("/resort/invoices")) return "invoices.view";
  if (path.startsWith("/resort/finance/export")) return "finance.export";
  if (path.startsWith("/resort/finance/cash-flow")) return "finance.cashFlow.view";
  if (path.startsWith("/resort/finance/money-status")) return "finance.moneyStatus.view";
  if (path.startsWith("/resort/finance/receipts")) return "finance.receipts.manage";
  if (path.startsWith("/resort/finance/revenue-expenses")) return "finance.revenueExpenses.view";
  if (path.startsWith("/resort/payroll-history")) return null;
  if (path.startsWith("/resort/hr/generate-payroll")) return "payroll.view";
  if (path.startsWith("/resort/hr/staff-records")) return "hr.staffRecords.view";
  if (path.startsWith("/resort/hr/timekeeping")) return "hr.timekeeping.view";
  if (path.startsWith("/resort/hr/scheduling")) return "hr.scheduling.manage";
  if (path.startsWith("/resort/hr/leave-requests")) return "hr.leaveRequests.view";
  if (path.startsWith("/resort/hr/ot-undertime")) return "hr.otUndertime.view";
  if (path.startsWith("/resort/hr")) return "hr.staffRecords.view";
  if (path.startsWith("/resort/operations/reception")) return "operations.reception.manage";
  if (path.startsWith("/resort/operations/housekeeping")) return "operations.housekeeping.manage";
  if (path.startsWith("/resort/operations/maintenance")) return "operations.maintenance.manage";
  if (path.startsWith("/resort/operations/laundry")) return "operations.laundry.manage";
  if (path.startsWith("/resort/operations/inventory")) return "operations.inventory.manage";
  if (path.startsWith("/resort/analytics")) return "analytics.reports.view";
  if (path.startsWith("/resort/settings/branding")) return "settings.branding.manage";
  if (path.startsWith("/resort/settings/developer")) return "settings.developer.manage";
  if (path.startsWith("/resort/settings")) return "settings.developer.manage";

  return null;
}

export function canAccessResortPath(
  permissions: readonly string[] | null | undefined,
  pathname: string,
) {
  const permission = getResortRoutePermission(pathname);

  return !permission || hasResortPermission(permissions, permission);
}
