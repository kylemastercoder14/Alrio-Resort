import { initTRPC } from "@trpc/server";
import { TRPCError } from "@trpc/server";
import superjson from "superjson";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { FULL_PERMISSION, hasAnyResortPermission, hasResortPermission } from "@/lib/resort-permissions";
import {
  safelyRecordStaffActivityForAuthUser,
  STAFF_ACTIVITY_ACTIONS,
} from "@/lib/staff-activity";

export const createTRPCContext = async (opts: { headers: Headers }) => {
  return {
    headers: opts.headers,
    session: await auth.api.getSession({
      headers: opts.headers,
    }),
  };
};

const t = initTRPC
  .context<Awaited<ReturnType<typeof createTRPCContext>>>()
  .create({
    transformer: superjson,
  });

const permissionMiddleware = t.middleware(async ({ ctx, path, type, next }) => {
  const permission = getResortProcedurePermission(path, type);

  if (!permission) return next();

  const authUser = ctx.session?.user;

  if (!authUser?.id) {
    throw new TRPCError({
      code: "UNAUTHORIZED",
      message: "Sign in required.",
    });
  }

  const appUser = await prisma.appUser.findUnique({
    where: {
      authUserId: authUser.id,
    },
    include: {
      resortProfile: {
        select: {
          id: true,
        },
      },
      staffProfile: {
        include: {
          accessRole: true,
        },
      },
    },
  });
  const permissions =
    appUser?.resortProfile
      ? [FULL_PERMISSION]
      : appUser?.staffProfile
        ? appUser.staffProfile?.accessRole?.permissions ??
          []
        : [];

  const permitted = Array.isArray(permission)
    ? hasAnyResortPermission(permissions, permission)
    : hasResortPermission(permissions, permission);

  if (!permitted) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "You do not have permission to perform this action.",
    });
  }

  return next();
});

const activityMiddleware = t.middleware(async ({ ctx, path, type, next }) => {
  const result = await next();
  const authUserId = ctx.session?.user?.id;

  if (
    result.ok &&
    authUserId &&
    type === "mutation" &&
    path.startsWith("resort.") &&
    !path.startsWith("resort.usersRoles.")
  ) {
    const activity = describeResortMutation(path);

    await safelyRecordStaffActivityForAuthUser(authUserId, {
      action: STAFF_ACTIVITY_ACTIONS.workspaceAction,
      title: activity.title,
      detail: activity.detail,
      actorAuthUserId: authUserId,
      metadata: { procedure: path },
    });
  }

  return result;
});

export const createTRPCRouter = t.router;
export const createCallerFactory = t.createCallerFactory;
export const baseProcedure = t.procedure
  .use(permissionMiddleware)
  .use(activityMiddleware);

function describeResortMutation(path: string) {
  const parts = path.split(".");
  const area = parts.at(-2) ?? "workspace";
  const action = parts.at(-1) ?? "update";
  const areaLabel = area
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/^./, (character) => character.toUpperCase());

  const knownActions: Record<string, string> = {
    clockIn: "Clocked in",
    clockOut: "Clocked out",
    create: `Created ${areaLabel.toLowerCase()} record`,
    delete: `Deleted ${areaLabel.toLowerCase()} record`,
    save: `Updated ${areaLabel.toLowerCase()}`,
    send: `Sent ${areaLabel.toLowerCase()}`,
    update: `Updated ${areaLabel.toLowerCase()}`,
    updateFlag: `Updated ${areaLabel.toLowerCase()} flag`,
    updateStatus: `Updated ${areaLabel.toLowerCase()} status`,
  };
  const title = knownActions[action] ?? `${areaLabel} action completed`;

  return {
    title,
    detail: `${title} in the Alrio staff workspace.`,
  };
}

function getResortProcedurePermission(path: string, type: "query" | "mutation" | "subscription") {
  if (!path.startsWith("resort.")) return null;

  const action = path.split(".").at(-1) ?? "";
  const isWrite = type === "mutation";

  if (path.startsWith("resort.notifications.")) return null;
  if (path.startsWith("resort.developerSettings.")) return "settings.developer.manage";
  if (path.startsWith("resort.analytics.")) return "analytics.reports.view";
  if (path.startsWith("resort.accessRoles.")) {
    return isWrite ? "usersRoles.permissions.manage" : "usersRoles.view";
  }
  if (path.startsWith("resort.usersRoles.")) {
    if (action === "invite") return "usersRoles.create";
    if (action === "delete") return "usersRoles.delete";
    if (action === "suspend") return "usersRoles.update";
    if (action === "save") return "usersRoles.update";
    return "usersRoles.view";
  }
  if (path.startsWith("resort.departments.")) {
    return isWrite ? "departments.manage" : "departments.view";
  }
  if (path.startsWith("resort.guests.")) {
    return "guestExperience.profiles.manage";
  }
  if (path.startsWith("resort.staffRecords.")) {
    return isWrite ? "hr.staffRecords.manage" : "hr.staffRecords.view";
  }
  if (path.startsWith("resort.timekeeping.")) {
    return action === "updateFlag"
      ? "hr.timekeeping.manage"
      : "hr.timekeeping.view";
  }
  if (path.startsWith("resort.scheduling.")) return "hr.scheduling.manage";
  if (path.startsWith("resort.leaveRequests.")) {
    return action === "updateStatus"
      ? "hr.leaveRequests.manage"
      : "hr.leaveRequests.view";
  }
  if (path.startsWith("resort.otUndertime.")) {
    return action === "updateStatus"
      ? "hr.otUndertime.manage"
      : "hr.otUndertime.view";
  }
  if (path.startsWith("resort.payroll.")) {
    if (action === "myHistory") return null;
    return isWrite || action === "preview" ? "payroll.manage" : "payroll.view";
  }
  if (path.startsWith("resort.rooms.")) return isWrite ? "rooms.manage" : "rooms.view";
  if (path.startsWith("resort.amenities.")) return isWrite ? "amenities.manage" : "amenities.view";
  if (path.startsWith("resort.services.")) return isWrite ? "services.manage" : "services.view";
  if (path.startsWith("resort.packages.")) return isWrite ? "services.manage" : "services.view";
  if (path.startsWith("resort.invoices.")) {
    if (action === "sendReminder" || action === "updateReminderCadence") {
      return "invoices.reminders.send";
    }
    return isWrite
      ? "invoices.create"
      : [
          "invoices.view",
          "finance.revenueExpenses.view",
          "finance.cashFlow.view",
          "finance.moneyStatus.view",
        ];
  }
  if (path.startsWith("resort.financeEntries.")) {
    return isWrite
      ? "finance.receipts.manage"
      : [
          "finance.revenueExpenses.view",
          "finance.cashFlow.view",
          "finance.moneyStatus.view",
          "finance.receipts.manage",
        ];
  }
  if (path.startsWith("resort.transactionExports.")) return "finance.export";
  if (path.startsWith("resort.reservations.")) {
    if (action === "create" || action === "save") return "reservations.create";
    if (action === "updateStatus" || action === "recordPayment") {
      return "reservations.update";
    }
    return "reservations.view";
  }
  if (path.startsWith("resort.reception.")) return "operations.reception.manage";
  if (path.startsWith("resort.maintenance.")) return "operations.maintenance.manage";
  if (path.startsWith("resort.laundry.")) return "operations.laundry.manage";
  if (path.startsWith("resort.inventory.")) return "operations.inventory.manage";
  if (path.startsWith("resort.housekeeping.")) return "operations.housekeeping.manage";
  if (path.startsWith("resort.leads.")) {
    if (action === "convertToReservation") return "leads.convert";
    return isWrite ? "leads.assign" : "leads.view";
  }

  return null;
}
