"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { type ComponentType, useEffect, useMemo, useState } from "react";
import {
  ArrowRight,
  Bell,
  CalendarCheck2,
  CheckCircle2,
  ClipboardCheck,
  Code2,
  Coins,
  ListFilter,
  LockKeyhole,
  LogOut,
  MessageCircle,
  Menu,
  Package,
  Search,
  Settings,
  ShieldCheck,
  Wrench,
  LayoutDashboard,
} from "lucide-react";
import toast from "react-hot-toast";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Kbd } from "@/components/ui/kbd";
import { RESORT_NAVIGATION_DATA } from "@/constants/resort-navigation";
import { authClient } from "@/lib/auth-client";
import {
  canAccessResortPath,
} from "@/lib/resort-permissions";
import { useTRPC } from "@/trpc/client";
import { ResortSidebar } from "@/components/resort/resort-sidebar";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";

type SearchItem = {
  label: string;
  href: string;
  group: string;
  parent?: string;
  locked?: boolean;
  keywords: string;
};

type AlertItem = {
  icon: ComponentType<{ className?: string }>;
  tone: string;
};

const SEARCH_ITEMS: SearchItem[] = RESORT_NAVIGATION_DATA.reduce<SearchItem[]>(
  (items, item) => {
    const group = "group" in item && item.group ? item.group : "Settings";

    if ("children" in item && item.children) {
      item.children.forEach((child) => {
        items.push({
          label: child.label,
          href: child.href,
          group,
          parent: item.label,
          locked: "locked" in child ? Boolean(child.locked) : false,
          keywords:
            `${child.label} ${item.label} ${group} ${child.href}`.toLowerCase(),
        });
      });

      return items;
    }

    items.push({
      label: item.label,
      href: item.href,
      group,
      locked: "locked" in item ? Boolean(item.locked) : false,
      keywords: `${item.label} ${group} ${item.href}`.toLowerCase(),
    });

    return items;
  },
  [],
);

const SEARCH_GROUPS = Array.from(
  new Set(SEARCH_ITEMS.map((item) => item.group)),
);

const ALERT_META = {
  reservation: {
    icon: CalendarCheck2,
    tone: "bg-accent text-black",
  },
  invoice: {
    icon: Coins,
    tone: "bg-accent text-black",
  },
  housekeeping: {
    icon: ClipboardCheck,
    tone: "bg-accent text-black",
  },
  lead: {
    icon: MessageCircle,
    tone: "bg-accent text-black",
  },
  maintenance: {
    icon: Wrench,
    tone: "bg-accent text-black",
  },
  hr: {
    icon: ShieldCheck,
    tone: "bg-accent text-black",
  },
  inventory: {
    icon: Package,
    tone: "bg-accent text-black",
  },
} satisfies Record<string, AlertItem>;

export function ResortHeader() {
  const [menuOpen, setMenuOpen] = useState(false);
  return (
    <header className="sticky top-0 z-40 flex h-17 shrink-0 items-center justify-between gap-2 bg-[#0A0A0A] px-3 text-white sm:gap-5 sm:px-6">
      <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
        <SheetTrigger asChild><Button variant="ghost" size="icon" className="shrink-0 lg:hidden" aria-label="Open resort navigation"><Menu className="size-5" /></Button></SheetTrigger>
        <SheetContent side="left" className="gap-0 bg-[#EBEBEB] p-0" onClickCapture={(event) => { if ((event.target as HTMLElement).closest("a[href]")) setMenuOpen(false); }}>
          <SheetTitle className="px-5 pb-4 pt-6">Resort navigation</SheetTitle>
          <div className="min-h-0 flex-1"><ResortSidebar mobile /></div>
        </SheetContent>
      </Sheet>
      <Link
        href="/resort/dashboard"
        aria-label="Alrio Private Resort dashboard"
        className="flex shrink-0 items-center gap-2"
      >
        <Image
          src="/favicon.png"
          alt=""
          width={36}
          height={36}
          className="size-9 object-contain"
          priority
        />
        <span className="hidden text-lg font-semibold tracking-tight sm:inline">
          Alrio Private Resort
        </span>
        <span className="hidden rounded-full border border-white/20 bg-white/10 px-2 py-0.5 text-[10px] font-medium text-white/90 sm:inline">
          BETA
        </span>
      </Link>

      <SearchDialog />

      <div className="flex shrink-0 items-center gap-3">
        <NotificationDropdown />
        <AccountAvatar />
      </div>
    </header>
  );
}

export function AccountAvatar({
  appearance = "resort",
  initialUser,
}: {
  appearance?: "resort" | "landing-light" | "landing-overlay";
  initialUser?: {
    id: string;
    name?: string | null;
    email?: string | null;
    image?: string | null;
  } | null;
}) {
  const trpc = useTRPC();
  const session = useQuery(trpc.auth.session.queryOptions());
  const user = session.data ? session.data.user : initialUser;
  if (!user) return null;
  const name = user.name?.trim() || (appearance === "resort" ? "Resort team" : "Guest");
  const avatarUrl = user.image?.trim();
  const avatar = (
    <Avatar className="size-9">
      {avatarUrl ? <AvatarImage src={avatarUrl} alt="" /> : null}
      <AvatarFallback className="bg-zinc-700 text-xs font-bold text-white">
        {getInitials(name)}
      </AvatarFallback>
    </Avatar>
  );

  if (appearance === "resort") {
    return <ResortAccountMenu name={name} email={user.email}>{avatar}</ResortAccountMenu>;
  }

  return (
    <Link
      href="/account"
      aria-label="Open account"
      title="Account"
    >
      {avatar}
    </Link>
  );
}

function ResortAccountMenu({
  name,
  email,
  children,
}: {
  name: string;
  email?: string | null;
  children: React.ReactNode;
}) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const trpc = useTRPC();
  const profile = useQuery(trpc.auth.profile.queryOptions());
  const logout = useMutation({
    mutationFn: async () => {
      const result = await authClient.signOut();
      if (result.error) throw new Error(result.error.message ?? "Unable to log out.");
    },
    onSuccess: () => {
      queryClient.clear();
      router.replace("/auth/sign-in");
      router.refresh();
    },
    onError: (error) => toast.error(error.message),
  });

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label="Open resort user menu"
          className="rounded-full focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
        >
          {children}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" sideOffset={8} className="w-60">
        <DropdownMenuLabel>
          <span className="block truncate">{name}</span>
          {email && <span className="block truncate font-normal text-muted-foreground">{email}</span>}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href="/resort/account">
            <Settings aria-hidden="true" />
            Account
          </Link>
        </DropdownMenuItem>
        {profile.data?.permissions.includes("*") || profile.data?.permissions.includes("settings.branding.manage") ? (
          <DropdownMenuItem asChild>
            <Link href="/resort/settings/branding">
              <LayoutDashboard aria-hidden="true" />
              Branding customization
            </Link>
          </DropdownMenuItem>
        ) : null}
        {profile.data?.permissions.includes("*") || profile.data?.permissions.includes("settings.developer.manage") ? (
          <DropdownMenuItem asChild>
            <Link href="/resort/settings/developer">
              <Code2 aria-hidden="true" />
              Developer settings
            </Link>
          </DropdownMenuItem>
        ) : null}
        <DropdownMenuSeparator />
        <DropdownMenuItem
          disabled={logout.isPending}
          onSelect={(event) => {
            event.preventDefault();
            logout.mutate();
          }}
        >
          <LogOut aria-hidden="true" />
          {logout.isPending ? "Logging out…" : "Log out"}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function getInitials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);

  if (parts.length === 0) return "AD";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();

  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

function NotificationDropdown() {
  const router = useRouter();
  const trpc = useTRPC();
  const notifications = useQuery({
    ...trpc.resort.notifications.list.queryOptions(),
    refetchInterval: 60_000,
  });
  const alerts = notifications.data?.alerts ?? [];
  const unreadCount = notifications.data?.unreadCount ?? 0;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="size-10 relative rounded-full text-white hover:bg-white/10 hover:text-white focus-visible:border-white/20 focus-visible:ring-white/20 aria-expanded:bg-white/10 aria-expanded:text-white data-[state=open]:bg-white/10 data-[state=open]:text-white"
        >
          <Bell className="size-5" />
          {unreadCount > 0 ? (
            <div className="bg-destructive absolute top-1.75 right-1.75 size-1.5 rounded-full" />
          ) : null}
          <span className="sr-only">{unreadCount} unread resort alerts</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className="mt-3 w-[min(30rem,calc(100vw-2rem))] rounded-xl bg-white p-4 text-zinc-900"
        sideOffset={8}
      >
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold">Alerts</h2>
            <p className="mt-0.5 text-xs text-zinc-500">
              {unreadCount} unread across resort operations
            </p>
          </div>
          <div className="flex items-center gap-3 text-zinc-400">
            <button
              aria-label="Filter alerts"
              className="rounded-md hover:bg-zinc-100 hover:text-zinc-700"
              onClick={() => toast("Alert filters coming soon.", { icon: "ℹ️" })}
              type="button"
            >
              <ListFilter className="size-4" />
            </button>
            <button
              aria-label="Refresh alerts"
              className="rounded-md hover:bg-zinc-100 hover:text-zinc-700"
              onClick={() => void notifications.refetch()}
              type="button"
            >
              <CheckCircle2 className="size-4" />
            </button>
          </div>
        </div>
        <div className="mt-4 space-y-1.5">
          {notifications.isLoading ? (
            <NotificationLoadingState />
          ) : notifications.isError ? (
            <div className="rounded-lg bg-zinc-100 px-4 py-5 text-sm font-medium text-zinc-600">
              Unable to load resort alerts.
            </div>
          ) : alerts.length === 0 ? (
            <div className="rounded-lg bg-zinc-100 px-4 py-5 text-xs font-medium text-center text-zinc-600">
              New bookings, unpaid invoices, room operations, guest messages,
              and approvals will appear here.
            </div>
          ) : (
            alerts.map((item) => {
              const meta = getAlertMeta(item.kind);
              const Icon = meta.icon;

              return (
                <button
                  className="flex w-full items-start gap-3 rounded-lg px-2.5 py-2.5 text-left transition hover:bg-zinc-100 focus-visible:bg-zinc-100 focus-visible:outline-none"
                  key={item.id}
                  onClick={() => router.push(item.href)}
                  type="button"
                >
                  <span
                    className={`mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full ${meta.tone}`}
                  >
                    <Icon className="size-4" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center justify-between gap-3">
                      <span className="truncate text-sm font-semibold text-zinc-950">
                        {item.title}
                      </span>
                      <span className="shrink-0 text-[11px] font-medium text-zinc-400">
                        {formatAlertTime(item.createdAt)}
                      </span>
                    </span>
                    <span className="mt-0.5 line-clamp-2 text-xs leading-5 text-zinc-500">
                      {item.description}
                    </span>
                  </span>
                  {item.unread ? (
                    <span className="mt-2 size-2 shrink-0 rounded-full bg-red-500" />
                  ) : null}
                </button>
              );
            })
          )}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function getAlertMeta(kind: string) {
  return ALERT_META[kind as keyof typeof ALERT_META] ?? ALERT_META.reservation;
}

function NotificationLoadingState() {
  return (
    <div className="space-y-2">
      {Array.from({ length: 3 }).map((_, index) => (
        <div
          className="flex items-center gap-3 rounded-lg px-2.5 py-2.5"
          key={index}
        >
          <div className="size-8 rounded-full bg-zinc-100" />
          <div className="min-w-0 flex-1 space-y-2">
            <div className="h-3 w-2/3 rounded-full bg-zinc-100" />
            <div className="h-2.5 w-full rounded-full bg-zinc-100" />
          </div>
        </div>
      ))}
    </div>
  );
}

function formatAlertTime(value: Date | string) {
  const date = value instanceof Date ? value : new Date(value);
  const diffMs = Date.now() - date.getTime();

  if (!Number.isFinite(diffMs) || diffMs < 0) {
    return "Now";
  }

  const minute = 60 * 1000;
  const hour = 60 * minute;
  const day = 24 * hour;

  if (diffMs < minute) {
    return "Now";
  }

  if (diffMs < hour) {
    return `${Math.floor(diffMs / minute)}m ago`;
  }

  if (diffMs < day) {
    return `${Math.floor(diffMs / hour)}h ago`;
  }

  return `${Math.floor(diffMs / day)}d ago`;
}

function SearchDialog() {
  const router = useRouter();
  const trpc = useTRPC();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [groupFilter, setGroupFilter] = useState("All");
  const profile = useQuery({
    ...trpc.auth.profile.queryOptions(),
    retry: false,
  });
  const normalizedQuery = query.trim().toLowerCase();
  const results = useMemo(() => {
    return SEARCH_ITEMS.filter((item) => {
      const matchesGroup = groupFilter === "All" || item.group === groupFilter;
      const matchesQuery =
        normalizedQuery.length === 0 || item.keywords.includes(normalizedQuery);
      const hasAccess =
        item.locked ||
        canAccessResortPath(profile.data?.permissions, item.href);

      return matchesGroup && matchesQuery && hasAccess;
    }).slice(0, 12);
  }, [groupFilter, normalizedQuery, profile.data?.permissions]);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setOpen(true);
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  function openItem(item: SearchItem) {
    if (item.locked) {
      toast(`${item.label} coming soon.`, { icon: "ℹ️" });
      return;
    }

    setOpen(false);
    setQuery("");
    setGroupFilter("All");
    router.push(item.href);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button
          className="relative cursor-pointer mx-auto hidden h-10 w-full max-w-xl items-center rounded-xl border-2 border-white/10 bg-[#282828] pl-10 pr-24 text-left text-sm font-semibold text-zinc-200 shadow-inner outline-none transition hover:border-white/20 focus-visible:border-white/30 focus-visible:ring-1 focus-visible:ring-white/20 lg:flex"
          type="button"
        >
          <Search className="absolute left-4 size-4 text-zinc-300" />
          <span>Search</span>
          <Kbd className="absolute right-9.5 top-1/2 -translate-y-1/2 bg-[#2F2F2F] px-2 py-1 text-[10px] font-semibold text-zinc-300">
            CTRL
          </Kbd>
          <Kbd className="absolute right-3 top-1/2 -translate-y-1/2 bg-[#2F2F2F] px-2 py-1 text-[10px] font-semibold text-zinc-300">
            K
          </Kbd>
        </button>
      </DialogTrigger>
      <DialogContent
        className="top-2 max-w-2xl! translate-y-0 gap-0 rounded-xl bg-white p-4"
        showCloseButton={false}
      >
        <DialogTitle className="sr-only">Search Alrio Private Resort</DialogTitle>
        <DialogDescription className="sr-only">
          Search resort modules and navigate to pages.
        </DialogDescription>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-zinc-500" />
          <input
            autoFocus
            className="h-9 w-full rounded-lg border border-zinc-500 bg-zinc-100 pl-10 pr-10 text-sm text-zinc-900 outline-none placeholder:text-zinc-500 focus:ring-1 focus:ring-black"
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search module, page, or workflow..."
            type="search"
            value={query}
          />
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          {["All", ...SEARCH_GROUPS].map((category) => (
            <button
              key={category}
              className={`rounded-full px-2.5 py-1 text-xs font-medium transition ${
                groupFilter === category
                  ? "bg-black text-white"
                  : "bg-zinc-200 text-zinc-800 hover:bg-zinc-300"
              }`}
              onClick={() => setGroupFilter(category)}
              type="button"
            >
              {category}
            </button>
          ))}
        </div>
        <div className="mt-5 max-h-105 overflow-y-auto pr-1">
          {results.length > 0 ? (
            <div className="space-y-1">
              {results.map((item) => (
                <button
                  key={`${item.href}-${item.label}`}
                  className="flex w-full items-center justify-between gap-3 rounded-lg px-3 py-2.5 text-left outline-none transition hover:bg-zinc-100 focus-visible:bg-zinc-100"
                  onClick={() => openItem(item)}
                  type="button"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="truncate text-sm font-semibold text-zinc-950">
                        {item.label}
                      </p>
                      {item.locked ? (
                        <span className="inline-flex items-center gap-1 rounded-full border border-zinc-200 bg-zinc-50 px-1.5 py-0.5 text-[10px] font-medium text-zinc-500">
                          <LockKeyhole className="size-3" />
                          Soon
                        </span>
                      ) : null}
                    </div>
                    <p className="mt-0.5 truncate text-xs text-zinc-500">
                      {item.parent ? `${item.parent} / ` : ""}
                      {item.group} · {item.href}
                    </p>
                  </div>
                  <ArrowRight className="size-4 shrink-0 text-zinc-400" />
                </button>
              ))}
            </div>
          ) : (
            <div className="mx-auto flex flex-col items-center justify-center gap-2 pb-6 pt-4 text-zinc-500">
              <Search strokeWidth={1.5} className="size-10" />
              <span className="text-sm">No matching module found.</span>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
