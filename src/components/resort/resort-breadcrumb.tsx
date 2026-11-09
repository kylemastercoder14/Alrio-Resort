"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  IconActivity,
  IconAdFilled,
  IconAdjustmentsHorizontalFilled,
  IconBowlSpoonFilled,
  IconBuildingBroadcastTowerFilled,
  IconCalendarFilled,
  IconChartPieFilled,
  IconChevronRight,
  IconClockHour3Filled,
  IconCodeCircle2Filled,
  IconCreditCardFilled,
  IconFidgetSpinnerFilled,
  IconFileInvoiceFilled,
  IconHomeFilled,
  IconLayoutDashboard,
  IconLayoutDashboardFilled,
  IconReceiptFilled,
  IconSettingsFilled,
  IconShieldCheckFilled,
  IconSparkles2Filled,
  IconUserFilled,
  IconUsersGroup,
} from "@tabler/icons-react";

import { RESORT_NAVIGATION_DATA } from "@/constants/resort-navigation";

type ResortNavItem = (typeof RESORT_NAVIGATION_DATA)[number];
type ResortNavChild = NonNullable<
  Extract<ResortNavItem, { children: readonly unknown[] }>["children"]
>[number];
type BreadcrumbMatch = {
  child?: ResortNavChild;
  href: string;
  parent: ResortNavItem;
};

const ICONS = {
  House: IconHomeFilled,
  LayoutDashboard: IconLayoutDashboardFilled,
  Flame: IconFidgetSpinnerFilled,
  FileText: IconFileInvoiceFilled,
  User: IconUserFilled,
  Users: IconUsersGroup,
  Wrench: IconAdjustmentsHorizontalFilled,
  UtensilsCrossed: IconBowlSpoonFilled,
  Globe: IconCodeCircle2Filled,
  Megaphone: IconAdFilled,
  Sparkles: IconSparkles2Filled,
  Clock3: IconClockHour3Filled,
  CalendarClock: IconCalendarFilled,
  CreditCard: IconCreditCardFilled,
  Landmark: IconBuildingBroadcastTowerFilled,
  ReceiptText: IconReceiptFilled,
  BarChart3: IconChartPieFilled,
  ShieldCheck: IconShieldCheckFilled,
  Activity: IconActivity,
  Settings: IconSettingsFilled,
} as const;

export function ResortBreadcrumb() {
  const pathname = usePathname();
  const match = getBreadcrumbMatch(pathname);

  if (!match) {
    return null;
  }

  const Icon = ICONS[match.parent.icon as keyof typeof ICONS] ?? IconLayoutDashboard;
  const parentContent = (
    <>
      <Icon className="size-4 shrink-0" strokeWidth={1.8} />
      <span className="truncate">{match.parent.label}</span>
    </>
  );
  const parentClassName =
    "inline-flex min-w-0 items-center gap-2 text-sm font-semibold tracking-tight text-[#303030]";

  return (
    <nav aria-label="Breadcrumb" className="flex items-center gap-2">
      {match.child ? (
        <span className={parentClassName}>{parentContent}</span>
      ) : (
        <Link href={toResortHref(match.parent.href)} className={parentClassName}>
          {parentContent}
        </Link>
      )}
      {match.child ? (
        <>
          <IconChevronRight className="size-4 shrink-0 text-[#8a8a8a]" />
          <Link
            href={toResortHref(match.child.href)}
            aria-current="page"
            className="truncate text-sm font-semibold tracking-tight text-[#303030]"
          >
            {match.child.label}
          </Link>
        </>
      ) : null}
    </nav>
  );
}

function getBreadcrumbMatch(pathname: string) {
  const currentPath = normalizeResortPath(pathname);
  const matches: BreadcrumbMatch[] = [];

  RESORT_NAVIGATION_DATA.forEach((parent) => {
    const children = "children" in parent ? parent.children : undefined;
    const childMatch = children
      ?.filter(
        (child) =>
          currentPath === normalizeResortPath(child.href) ||
          currentPath.startsWith(`${normalizeResortPath(child.href)}/`),
      )
      .sort((a, b) => b.href.length - a.href.length)[0];

    if (childMatch) {
      matches.push({ parent, child: childMatch, href: childMatch.href });
      return;
    }

    const parentHref = normalizeResortPath(parent.href);
    if (currentPath === parentHref || currentPath.startsWith(`${parentHref}/`)) {
      matches.push({ parent, href: parent.href });
    }
  });

  return matches.sort((a, b) => b.href.length - a.href.length)[0];
}

function normalizeResortPath(href: string) {
  return href.replace(/^\/admin/, "/resort").replace(/\/$/, "");
}

function toResortHref(href: string) {
  return href.replace(/^\/admin/, "/resort");
}
