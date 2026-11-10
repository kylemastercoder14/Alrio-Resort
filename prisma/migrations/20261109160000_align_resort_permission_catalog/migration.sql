-- Remove retired SaaS, marketing, dining, and AI-growth permissions from
-- existing Alrio resort roles. Full-access roles keep the wildcard permission.
UPDATE "resort_access_role" AS role
SET "permissions" = COALESCE(
  (
    SELECT array_agg(permission ORDER BY position)
    FROM unnest(role."permissions") WITH ORDINALITY AS item(permission, position)
    WHERE permission = ANY (
      ARRAY[
        '*',
        'dashboard.view',
        'usersRoles.view', 'usersRoles.create', 'usersRoles.update', 'usersRoles.delete', 'usersRoles.permissions.manage',
        'departments.view', 'departments.manage',
        'reservations.view', 'reservations.create', 'reservations.update',
        'guestExperience.profiles.manage',
        'leads.view', 'leads.assign', 'leads.convert',
        'invoices.view', 'invoices.create', 'invoices.reminders.send',
        'finance.revenueExpenses.view', 'finance.cashFlow.view', 'finance.moneyStatus.view', 'finance.receipts.manage', 'finance.export',
        'hr.staffRecords.view', 'hr.staffRecords.manage',
        'hr.timekeeping.view', 'hr.timekeeping.manage',
        'hr.scheduling.manage',
        'hr.leaveRequests.view', 'hr.leaveRequests.manage',
        'hr.otUndertime.view', 'hr.otUndertime.manage',
        'payroll.view', 'payroll.manage',
        'operations.reception.manage', 'operations.housekeeping.manage', 'operations.maintenance.manage',
        'operations.laundry.manage', 'operations.inventory.manage',
        'services.view', 'services.manage', 'rooms.view', 'rooms.manage', 'amenities.view', 'amenities.manage',
        'analytics.reports.view', 'settings.developer.manage'
      ]::TEXT[]
    )
  ),
  ARRAY[]::TEXT[]
);
