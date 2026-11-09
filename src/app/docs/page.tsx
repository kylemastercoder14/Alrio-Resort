"use client";

import Link from "next/link";
import Image from "next/image";
import { useState } from "react";
import {
  ArrowRight,
  BookOpen,
  CheckCircle2,
  ChevronRight,
  ClipboardList,
  FileText,
  History,
  List,
  Menu,
  Search,
  Sparkles,
  X,
} from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Kbd } from "@/components/ui/kbd";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/components/ui/input-group";

type Section = {
  id: string;
  label: string;
  eyebrow: string;
  title: string;
  description: string;
};

export const sections: Section[] = [
  {
    id: "getting-started",
    label: "Getting started",
    eyebrow: "Start here",
    title: "Your first day with Alrio operations",
    description:
      "A friendly, step-by-step tour for owners, managers, and staff.",
  },
  {
    id: "authentication",
    label: "Sign in & access",
    eyebrow: "Account basics",
    title: "Sign in, invite people, and stay secure",
    description:
      "Everything you need to enter the right workspace with the right permissions.",
  },
  {
    id: "workspace",
    label: "Workspace setup",
    eyebrow: "Foundation",
    title: "Set up your resort workspace",
    description:
      "Configure resort details, create departments, and prepare for bookings.",
  },
  {
    id: "reservations",
    label: "Reservations",
    eyebrow: "Bookings",
    title: "Manage reservations without guesswork",
    description:
      "Search availability, create bookings, check guests in, and close the stay.",
  },
  {
    id: "rooms-services",
    label: "Rooms & services",
    eyebrow: "Inventory",
    title: "Publish rooms, amenities, packages, and services",
    description: "Keep your public inventory accurate and your team aligned.",
  },
  {
    id: "operations",
    label: "Daily operations",
    eyebrow: "Front desk",
    title: "Run the property day by day",
    description:
      "Reception, housekeeping, maintenance, laundry, and inventory in one place.",
  },
  {
    id: "finance",
    label: "Finance",
    eyebrow: "Money",
    title: "Invoices, payments, and exports",
    description:
      "Understand balances, collect payments, and keep an audit-friendly paper trail.",
  },
  {
    id: "people",
    label: "People & payroll",
    eyebrow: "Team",
    title: "Coordinate staff and payroll",
    description:
      "Invite staff, schedule shifts, approve leave, and prepare payroll.",
  },
  {
    id: "integrations",
    label: "Integrations",
    eyebrow: "Connected tools",
    title: "Connect UploadThing, PayMongo, and Messenger",
    description:
      "What each integration does, what it needs, and how to troubleshoot it.",
  },
  {
    id: "troubleshooting",
    label: "Troubleshooting",
    eyebrow: "Help",
    title: "When something does not look right",
    description: "Simple checks that solve the most common problems first.",
  },
];

const changelog = [
  {
    date: "October 29, 2026",
    version: "2026.10.29",
    items: [
      "Added a searchable Documentation and Changelog hub.",
      "Improved Operations workflows for housekeeping, damage reports, maintenance, laundry, and inventory.",
      "Added PayMongo hosted checkout and verified one-time reservation payments.",
    ],
  },
  {
    date: "October 28, 2026",
    version: "2026.10.28",
    items: [
      "Improved responsive landing and search layouts.",
      "Added resort-aware header navigation and clearer empty states.",
      "Expanded test coverage documentation for reservations, finance, HR, and operations.",
    ],
  },
];

const sidebarGroups = [
  {
    label: "Getting Started",
    links: [
      { label: "Introduction", id: "getting-started" },
      { label: "Sign in & access", id: "authentication" },
      { label: "Authentication", id: "authentication" },
      { label: "User management", id: "people" },
      { label: "Session management", id: "authentication" },
      { label: "Workspace setup", id: "workspace" },
    ],
  },
  {
    label: "Bookings",
    links: [
      { label: "Reservations", id: "reservations" },
      { label: "Reservation calendar", id: "reservations" },
      { label: "Checkout", id: "finance" },
    ],
  },
  {
    label: "Property",
    links: [
      { label: "Rooms & services", id: "rooms-services" },
      { label: "Amenities & packages", id: "rooms-services" },
      { label: "Public resort page", id: "getting-started" },
    ],
  },
  {
    label: "Operations",
    links: [
      { label: "Reception", id: "operations" },
      { label: "Housekeeping", id: "operations" },
      { label: "Maintenance", id: "operations" },
      { label: "Laundry", id: "operations" },
      { label: "Inventory", id: "operations" },
    ],
  },
  {
    label: "Finance & Reports",
    links: [
      { label: "Invoices", id: "finance" },
      { label: "Revenue & expenses", id: "finance" },
      { label: "Analytics", id: "finance" },
      { label: "Exports & receipts", id: "finance" },
    ],
  },
  {
    label: "People",
    links: [
      { label: "Users, roles & departments", id: "people" },
      { label: "Timekeeping & scheduling", id: "people" },
      { label: "Leave & payroll", id: "people" },
    ],
  },
  {
    label: "Integrations & Help",
    links: [
      { label: "UploadThing & PayMongo", id: "integrations" },
      { label: "Messenger", id: "integrations" },
      { label: "Troubleshooting", id: "troubleshooting" },
    ],
  },
  {
    label: "Account & Security",
    links: [
      { label: "Roles & permissions", id: "people" },
      { label: "Resort isolation", id: "people" },
      { label: "Privacy & data safety", id: "troubleshooting" },
    ],
  },
  {
    label: "Resources",
    links: [
      { label: "Release notes", id: "troubleshooting" },
      { label: "Test cases", id: "troubleshooting" },
      { label: "Contact support", id: "troubleshooting" },
    ],
  },
];

function Callout({
  children,
  tone = "blue",
}: {
  children: React.ReactNode;
  tone?: "blue" | "green" | "amber";
}) {
  const styles = {
    blue: "border-blue-200 bg-blue-50 text-blue-950",
    green: "border-emerald-200 bg-emerald-50 text-emerald-950",
    amber: "border-amber-200 bg-amber-50 text-amber-950",
  };
  return (
    <div
      className={`my-6 rounded-xl border px-4 py-3 text-sm leading-6 ${styles[tone]}`}
    >
      <div className="flex gap-3">
        <Sparkles className="mt-1 size-4 shrink-0" /> <div>{children}</div>
      </div>
    </div>
  );
}

function Step({
  number,
  title,
  children,
}: {
  number: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex gap-4">
      <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-foreground text-sm font-bold text-white">
        {number}
      </div>
      <div>
        <h3 className="font-semibold text-slate-950">{title}</h3>
        <div className="mt-1 text-sm leading-6 text-slate-600">{children}</div>
      </div>
    </div>
  );
}

export function Article({ section }: { section: Section }) {
  return (
    <article
      id={section.id}
      className="scroll-mt-28 border-b border-slate-200 pb-14 pt-12 last:border-0"
    >
      <p className="text-sm font-semibold uppercase tracking-[0.16em] text-foreground">
        {section.eyebrow}
      </p>
      <h2 className="mt-2 text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">
        {section.title}
      </h2>
      <p className="mt-3 max-w-2xl text-lg leading-8 text-slate-600">
        {section.description}
      </p>

      {section.id === "getting-started" && (
        <>
          <Callout>
            The Alrio management system is easiest to learn in this order:{" "}
            <strong>
              set up your workspace → publish rooms → create a reservation →
              operate the stay → collect payment
            </strong>
            .
          </Callout>
          <div className="space-y-6">
            <Step number="1" title="Open the app">
              Open the Alrio Private Resort website. Guests use the public landing page;
              owners and staff use the Sign in button.
            </Step>
            <Step number="2" title="Check resort details">
              Keep property details and contact information current through
              the resort settings.
            </Step>
            <Step number="3" title="Add your foundation">
              Create departments, roles, rooms, amenities, services, and
              packages. Start with one real room if you are learning.
            </Step>
            <Step number="4" title="Run a practice booking">
              Create a reservation with a future date, check the guest in, add a
              charge if needed, then complete checkout.
            </Step>
          </div>
          <h3 className="mt-10 text-xl font-bold text-slate-950">
            The three areas you will use most
          </h3>
          <div className="mt-4 grid gap-4 sm:grid-cols-3">
            <div className="rounded-xl border p-4">
              <BookOpen className="size-5 text-foreground" />
              <h4 className="mt-3 font-semibold">Public site</h4>
              <p className="mt-1 text-sm leading-6 text-slate-600">
                Where guests discover rooms and submit bookings.
              </p>
            </div>
            <div className="rounded-xl border p-4">
              <ClipboardList className="size-5 text-foreground" />
              <h4 className="mt-3 font-semibold">Workspace</h4>
              <p className="mt-1 text-sm leading-6 text-slate-600">
                Where your team manages the resort.
              </p>
            </div>
            <div className="rounded-xl border p-4">
              <FileText className="size-5 text-foreground" />
              <h4 className="mt-3 font-semibold">Reports</h4>
              <p className="mt-1 text-sm leading-6 text-slate-600">
                Where owners review performance and money.
              </p>
            </div>
          </div>
        </>
      )}
      {section.id === "authentication" && (
        <>
          <h3 className="mt-10 text-xl font-bold">Sign in</h3>
          <p className="mt-3 leading-7 text-slate-600">
            Choose <strong>Sign in</strong>, enter your email or username and
            password, then submit. A resort owner goes to the resort workspace.
            Staff see only the modules their role allows.
          </p>
          <Callout tone="green">
            <strong>Good to know:</strong> Seeing the public landing page after
            sign-in does not mean your session disappeared. Use the account menu
            to return to your workspace.
          </Callout>
          <h3 className="mt-8 text-xl font-bold">Invite a staff member</h3>
          <ol className="mt-4 list-decimal space-y-2 pl-6 text-slate-600">
            <li>
              Open <strong>Workspace Access → Users</strong>.
            </li>
            <li>
              Select <strong>Invite user</strong>, enter the email, role, and
              department.
            </li>
            <li>
              Send the invitation and copy the link only through a trusted
              channel.
            </li>
            <li>
              The invitee opens the link, creates or confirms their account, and
              lands in the assigned workspace.
            </li>
          </ol>
          <h3 className="mt-8 text-xl font-bold">If access is denied</h3>
          <p className="mt-3 leading-7 text-slate-600">
            Ask an owner to check the user status, role permissions, department
            assignment, and account status. Do not try
            to bypass permissions by editing the URL.
          </p>
        </>
      )}
      {section.id === "workspace" && (
        <>
          <h3 className="mt-10 text-xl font-bold">Recommended setup order</h3>
          <div className="mt-5 space-y-5">
            <Step number="1" title="Departments">
              Create Front desk, Housekeeping, Maintenance, and any department
              your resort actually uses.
            </Step>
            <Step number="2" title="Roles">
              Give each role only the permissions it needs. Keep owner/admin
              permissions limited.
            </Step>
            <Step number="3" title="Rooms">
              Add a room code, name, capacity, rate, amenities, and photos.
              Save, refresh, and confirm it appears.
            </Step>
            <Step number="4" title="Services and packages">
              Add airport transfers, activities, meal packages, and other
              chargeable offerings.
            </Step>
          </div>
          <Callout tone="amber">
            If staff access is pending, ask the resort administrator to check
            the invitation and account status.
          </Callout>
        </>
      )}
      {section.id === "reservations" && (
        <>
          <h3 className="mt-10 text-xl font-bold">Create a reservation</h3>
          <ol className="mt-4 list-decimal space-y-2 pl-6 text-slate-600">
            <li>
              Open <strong>Reservations → Create Booking</strong>.
            </li>
            <li>
              Choose check-in and check-out dates. Check-out must be after
              check-in.
            </li>
            <li>
              Select a guest, room, and offering. Confirm the guest count fits
              capacity.
            </li>
            <li>Review the nightly rate, fees, discount, and total.</li>
            <li>
              Save once. A booking reference appears after the reservation is
              created.
            </li>
          </ol>
          <h3 className="mt-8 text-xl font-bold">Check in and check out</h3>
          <p className="mt-3 leading-7 text-slate-600">
            Use <strong>Operations → Reception</strong> to search by guest,
            booking reference, or room. Select <strong>Check in</strong> when
            the guest arrives. At departure, review the folio, record payment if
            applicable, and choose <strong>Complete checkout</strong>.
          </p>
          <Callout>
            Never create a second booking to “fix” a typo. Edit the existing
            reservation or cancel it with a clear note.
          </Callout>
        </>
      )}
      {section.id === "rooms-services" && (
        <>
          <h3 className="mt-10 text-xl font-bold">
            Publish a room like a guest would expect
          </h3>
          <p className="mt-3 leading-7 text-slate-600">
            Use a clear name, an accurate capacity, a nightly rate, a complete
            amenity list, and bright photos. The first photo should show the
            room at a glance. Preview the saved record after refreshing.
          </p>
          <h3 className="mt-8 text-xl font-bold">Keep availability honest</h3>
          <p className="mt-3 leading-7 text-slate-600">
            Change a room to maintenance or out-of-service when it cannot be
            sold. Housekeeping status and reservation availability are separate
            signals: update both when the physical room changes.
          </p>
          <div className="mt-5 rounded-xl bg-slate-950 p-5 text-sm leading-6 text-slate-100">
            <p className="font-semibold text-white">Publishing checklist</p>
            <p className="mt-2 text-slate-300">
              Name ✓ Capacity ✓ Rate ✓ Amenities ✓ Photos ✓ Active status ✓
              Online visibility ✓
            </p>
          </div>
        </>
      )}
      {section.id === "operations" && (
        <>
          <h3 className="mt-10 text-xl font-bold">The daily operating loop</h3>
          <div className="mt-5 space-y-5">
            <Step number="1" title="Reception">
              Look up arrivals, check guests in, record requests, and leave a
              shift note for the next person.
            </Step>
            <Step number="2" title="Housekeeping">
              Move rooms through occupied, dirty, and clean. Add a verification
              note or photo before marking ready.
            </Step>
            <Step number="3" title="Maintenance">
              Forward issues, assign or complete the request, and confirm the
              source room is updated.
            </Step>
            <Step number="4" title="Laundry">
              Record intake, due time, priority, and status transitions until
              items are returned.
            </Step>
            <Step number="5" title="Inventory">
              Use stock-in and stock-out movements. Never force a stock-out
              above the available quantity.
            </Step>
          </div>
          <Callout tone="green">
            When a workflow changes a physical room or a guest balance, refresh
            the page and verify the card, KPI, and related module all agree.
          </Callout>
        </>
      )}
      {section.id === "finance" && (
        <>
          <h3 className="mt-10 text-xl font-bold">Invoice workflow</h3>
          <ol className="mt-4 list-decimal space-y-2 pl-6 text-slate-600">
            <li>Create or open the guest invoice.</li>
            <li>
              Add only chargeable line items. Confirm quantities, tax, subtotal,
              total, and balance.
            </li>
            <li>
              Save the invoice once, then record payment using the correct
              method.
            </li>
            <li>
              Verify the invoice status, guest balance, finance entry, and
              receipt.
            </li>
            <li>Use Finance → Export for a CSV, PDF, TXT, or XLSX copy.</li>
          </ol>
          <h3 className="mt-8 text-xl font-bold">Safe finance habits</h3>
          <p className="mt-3 leading-7 text-slate-600">
            Do not mark an invoice paid before the full payment is recorded. Use
            a void or adjustment for corrections so the audit trail remains
            understandable.
          </p>
        </>
      )}
      {section.id === "people" && (
        <>
          <h3 className="mt-10 text-xl font-bold">Staff and payroll flow</h3>
          <p className="mt-3 leading-7 text-slate-600">
            Start with Staff Records, then assign departments and roles. Staff
            clock in and out from Timekeeping. Managers maintain Scheduling,
            approve Leave and OT/Undertime, and review the payroll preview
            before generating a run.
          </p>
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <div className="rounded-xl border p-4">
              <h4 className="font-semibold">Manager checklist</h4>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                Review attendance → approve requests → confirm included staff →
                preview deductions → save payroll run.
              </p>
            </div>
            <div className="rounded-xl border p-4">
              <h4 className="font-semibold">Staff checklist</h4>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                Clock in → clock out → submit leave/OT → check your own payroll
                history.
              </p>
            </div>
          </div>
        </>
      )}
      {section.id === "integrations" && (
        <>
          <h3 className="mt-10 text-xl font-bold">UploadThing</h3>
          <p className="mt-3 leading-7 text-slate-600">
            UploadThing stores room images and receipts for the platform. Room
            images allow up to 8 files at 4 MB each. Receipts allow one image up
            to 4 MB or one PDF up to 8 MB. Wait for the success message before
            saving.
          </p>
          <h3 className="mt-8 text-xl font-bold">PayMongo</h3>
          <p className="mt-3 leading-7 text-slate-600">
            PayMongo provides secure hosted checkout for one-time Alrio
            reservation and invoice payments. Payment links are created on the
            server, while signed webhook events confirm successful payments.
            Never paste a PayMongo secret into a browser form.
          </p>
          <h3 className="mt-8 text-xl font-bold">Messenger</h3>
          <p className="mt-3 leading-7 text-slate-600">
            Connect only a test page while learning. Use diagnostics and sync
            status before sending a reply. A missing or expired Meta token
            should be fixed in the integration owner account.
          </p>
          <Callout tone="amber">
            Integration keys belong in environment secrets, not in
            documentation, screenshots, tickets, or chat messages.
          </Callout>
        </>
      )}
      {section.id === "troubleshooting" && (
        <>
          <h3 className="mt-10 text-xl font-bold">The fastest first checks</h3>
          <ul className="mt-4 list-disc space-y-2 pl-6 text-slate-600">
            <li>Refresh once and confirm you are in the intended resort.</li>
            <li>Check the account menu for your role and workspace.</li>
            <li>
              Look for an empty-state explanation rather than assuming data was
              deleted.
            </li>
            <li>
              Confirm required fields, date order, capacity, and status before
              saving.
            </li>
            <li>
              If a save succeeded, revisit the module and search for the record.
            </li>
            <li>
              For integration problems, check configuration, token expiry, and
              provider mode (sandbox vs production).
            </li>
          </ul>
          <h3 className="mt-8 text-xl font-bold">
            Contact an administrator with useful details
          </h3>
          <p className="mt-3 leading-7 text-slate-600">
            Include the workspace, page, action, approximate time, record
            reference, and the exact safe error message. Never include
            passwords, API keys, access tokens, or full payment details.
          </p>
        </>
      )}
    </article>
  );
}

export default function DocsPage() {
  const [tab, setTab] = useState<"docs" | "changelog">("docs");
  const [query, setQuery] = useState("");
  const [mobileOpen, setMobileOpen] = useState(false);
  const [activeLink, setActiveLink] = useState("Getting Started:Introduction");
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({
    "Getting Started": true,
  });

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-30 border-b bg-background">
        <div className="flex h-16 items-center justify-between px-5 lg:px-10">
          <Link
            href="/"
            className="flex items-center gap-2 text-lg font-bold tracking-tight"
          >
            <Image
              src="/main/logo-light.png"
              alt="Alrio Private Resort"
              width={24}
              height={24}
              className="size-6 object-contain"
            />
            Alrio Private Resort{" "}
            <Badge variant="secondary" className="text-xs">
              Docs v.1.0.4
            </Badge>
          </Link>
          <div className="hidden flex-1 max-w-2xl mx-auto items-center justify-center gap-2 px-6 md:flex">
            <InputGroup>
              <InputGroupAddon>
                <Search className="size-4" />
                <span className="sr-only">Search</span>
              </InputGroupAddon>
              <InputGroupInput
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search documentation..."
                aria-label="Search documentation"
                className="[&::-webkit-search-cancel-button]:appearance-none [&::-webkit-search-decoration]:appearance-none [&::-webkit-search-results-button]:appearance-none [&::-webkit-search-results-decoration]:appearance-none"
              />
              <InputGroupAddon align="inline-end">
                <Kbd>Ctrl K</Kbd>
              </InputGroupAddon>
            </InputGroup>

            <Button
              type="button"
              onClick={() => document.getElementById("docs-search")?.focus()}
              size="sm"
            >
              Ask AI
            </Button>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/" className={buttonVariants({ size: "sm" })}>
              Dashboard <ArrowRight className="size-4" />
            </Link>
            <button
              onClick={() => setMobileOpen(!mobileOpen)}
              className="rounded-lg p-2 hover:bg-slate-100 lg:hidden"
              aria-label="Toggle navigation"
            >
              {mobileOpen ? (
                <X className="size-5" />
              ) : (
                <Menu className="size-5" />
              )}
            </button>
          </div>
        </div>
        <div className="flex gap-8 px-5 lg:px-10">
          <button
            onClick={() => setTab("docs")}
            className={`flex cursor-pointer items-center gap-2 border-b-2 py-4 text-sm font-medium ${tab === "docs" ? "border-foreground text-foreground" : "border-transparent text-muted-foreground hover:text-foreground"}`}
          >
            <FileText className="size-4" />
            Documentation
          </button>
          <button
            onClick={() => setTab("changelog")}
            className={`flex cursor-pointer items-center gap-2 border-b-2 py-4 text-sm font-medium ${tab === "changelog" ? "border-foreground text-foreground" : "border-transparent text-muted-foreground hover:text-foreground"}`}
          >
            <History className="size-4" />
            Changelog
          </button>
        </div>
      </header>
      {tab === "docs" ? (
        <div className="flex gap-10 px-5 lg:px-10">
          <aside
            className={`${mobileOpen ? "block" : "hidden"} fixed inset-x-0 top-28.25 z-20 max-h-[calc(100vh-113px)] overflow-y-auto border-b bg-background p-5 lg:sticky lg:top-28 lg:mb-8 lg:block lg:h-[calc(100vh-8.5rem)] lg:w-72 lg:shrink-0 lg:border-0 lg:bg-transparent lg:p-0 lg:pt-6`}
          >
            <div className="flex h-full min-h-0 flex-col rounded-2xl border bg-background p-2.5 shadow-md">
              <ScrollArea className="min-h-0 flex-1 space-y-2 px-1 pb-4">
                {sidebarGroups.map((group) => {
                  const links = group.links.filter(
                    (link) =>
                      !query ||
                      link.label.toLowerCase().includes(query.toLowerCase()),
                  );
                  if (!links.length) return null;
                  return (
                    <Collapsible
                      key={group.label}
                      open={Boolean(query) || Boolean(openGroups[group.label])}
                      onOpenChange={(open) =>
                        setOpenGroups((current) => ({
                          ...current,
                          [group.label]: open,
                        }))
                      }
                    >
                      <CollapsibleTrigger className="group cursor-pointer flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-left text-sm text-muted-foreground font-medium hover:bg-muted hover:text-foreground">
                        {group.label}
                        <ChevronRight className="ml-auto size-4 transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
                      </CollapsibleTrigger>
                      <CollapsibleContent className="ml-3 space-y-0.5 border-l border-border pb-1 pl-3 pt-1">
                        {links.map((link) => (
                          <a
                            key={`${link.id}-${link.label}`}
                            href={`/docs/${link.id}`}
                            onClick={() => {
                              setActiveLink(`${group.label}:${link.label}`);
                              setMobileOpen(false);
                            }}
                            className={`group relative -ml-6 flex items-center justify-between rounded-md pl-9 pr-3 py-2 text-sm hover:bg-muted hover:text-foreground ${activeLink === `${group.label}:${link.label}` && !query ? "font-semibold text-foreground before:absolute before:inset-y-0 before:left-3 before:w-px before:bg-black before:content-[''] bg-muted" : "text-muted-foreground"}`}
                          >
                            <span>{link.label}</span>
                          </a>
                        ))}
                      </CollapsibleContent>
                    </Collapsible>
                  );
                })}
              </ScrollArea>
              <p className="shrink-0 border p-3 mt-2 rounded-lg shadow-xs text-xs">
                <span className="flex items-center gap-2">
                  <Image
                    src="https://pipsporetech.com/_next/image?url=%2Flogo-transparent.png&w=64&q=75"
                    alt="PiP Spore Technologies"
                    width={24}
                    height={24}
                    className="size-5.5 object-contain"
                  />
                  <span className="font-semibold text-muted-foreground">
                    Powered by PiP Spore Technologies
                  </span>
                </span>
              </p>
            </div>
          </aside>
          <main className="min-w-0 flex-1 pb-20">
            <div className="border-b border-slate-200 py-14">
              <p className="text-sm font-semibold uppercase tracking-[0.16em] text-foreground">
                Alrio operations manual
              </p>
              <h1 className="mt-3 max-w-3xl text-4xl font-bold tracking-tight text-slate-950 sm:text-5xl">
                Everything you need to run your resort, explained simply.
              </h1>
              <p className="mt-5 max-w-2xl text-lg leading-8 text-slate-600">
                Follow the steps, copy the checklists, and use the examples.
                This guide assumes you are brand new to the Alrio management system.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <a
                  href="#getting-started"
                  className="inline-flex items-center gap-2 rounded-lg bg-foreground px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700"
                >
                  Start the tour <ArrowRight className="size-4" />
                </a>
                <a
                  href="#troubleshooting"
                  className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Troubleshooting
                </a>
              </div>
            </div>
            {sections.map((section) => (
              <Article key={section.id} section={section} />
            ))}
          </main>
          <aside className="hidden w-56 shrink-0 xl:block">
            <div className="sticky top-28 pt-14 text-sm text-muted-foreground">
              <div className="flex items-center gap-2 font-semibold uppercase tracking-wide">
                <List className="size-4" />
                On this page
              </div>
              <nav className="mt-4 space-y-1" aria-label="On this page">
                <a
                  href="#getting-started"
                  className="block rounded-lg bg-muted px-3 py-2 text-foreground"
                >
                  Overview
                </a>
                {sections.slice(1).map((section) => (
                  <a
                    key={section.id}
                    href={`#${section.id}`}
                    className="block rounded-lg px-3 py-2 hover:bg-muted hover:text-foreground"
                  >
                    {section.label}
                  </a>
                ))}
              </nav>
            </div>
          </aside>
        </div>
      ) : (
        <main className="mx-auto max-w-4xl px-5 pb-24 pt-14 lg:px-8">
          <p className="text-sm font-semibold uppercase tracking-[0.16em] text-foreground">
            Product history
          </p>
          <h1 className="mt-3 text-4xl font-bold tracking-tight text-slate-950">
            Changelog
          </h1>
          <p className="mt-4 max-w-2xl text-lg leading-8 text-slate-600">
            A plain-language record of improvements, fixes, and new workflows in
            the Alrio management system.
          </p>
          <div className="mt-12 space-y-10">
            {changelog.map((entry) => (
              <section
                key={entry.version}
                className="relative border-l-2 border-blue-100 pl-7"
              >
                <span className="absolute -left-2.25 top-1 size-4 rounded-full border-4 border-white bg-foreground" />
                <div className="flex flex-wrap items-center gap-3">
                  <h2 className="text-2xl font-bold text-slate-950">
                    {entry.version}
                  </h2>
                  <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">
                    {entry.date}
                  </span>
                </div>
                <ul className="mt-4 space-y-3 text-slate-600">
                  {entry.items.map((item) => (
                    <li key={item} className="flex gap-2">
                      <CheckCircle2 className="mt-1 size-4 shrink-0 text-emerald-500" />
                      {item}
                    </li>
                  ))}
                </ul>
              </section>
            ))}
          </div>
        </main>
      )}
    </div>
  );
}
