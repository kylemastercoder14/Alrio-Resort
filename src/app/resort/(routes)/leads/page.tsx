"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  CalendarDays,
  CheckCircle2,
  CircleDollarSign,
  ExternalLink,
  Flame,
  Info,
  Loader2,
  MessageCircle,
  MoreVertical,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  Send,
  Snowflake,
  ThermometerSun,
  Trash2,
  UserRoundCheck,
} from "lucide-react";
import toast from "react-hot-toast";

import { KpiGrid, type KpiGridItem } from "@/components/reusable/kpi-grid";
import { ResortBreadcrumb } from "@/components/resort/resort-breadcrumb";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { useTRPC } from "@/trpc/client";

type LeadStage = "INTAKE" | "QUALIFIED" | "PAYMENT_DONE" | "CONVERTED";
type LeadTemperature = "Hot" | "Warm" | "Cold" | "No date";
type LeadRow = {
  channel: "Messenger";
  createdAt: string;
  guestName: string;
  id: string;
  inquiry: string;
  lastMessage: string;
  lastMessageAt: string | null;
  messages: Array<{
    direction: "INBOUND" | "OUTBOUND";
    id: string;
    sentAt: string;
    text: string;
  }>;
  pageId: string | null;
  profilePictureUrl: string | null;
  psid: string;
  source: string;
  stage: LeadStage;
  targetDate: string | null;
  reservation: {
    checkIn: string;
    checkOut: string;
    id: string;
    roomLabel: string;
    status: string;
  } | null;
  reservationId: string | null;
};

type LeadFormState = {
  guestName: string;
  id?: string;
  inquiry: string;
  lastMessage: string;
  source: string;
  stage: LeadStage;
  targetDate: string;
};

const STAGES: Array<{ label: string; value: LeadStage }> = [
  { label: "Intake", value: "INTAKE" },
  { label: "Qualified", value: "QUALIFIED" },
  { label: "Payment Done", value: "PAYMENT_DONE" },
  { label: "Converted", value: "CONVERTED" },
];

const STAGE_TOOLTIPS: Record<LeadStage, string> = {
  INTAKE:
    "Leads that might be new or recently interacted with your Page. Evaluate first before moving them forward.",
  QUALIFIED:
    "Leads with strong booking interest, clear dates, guest count, or package intent. Good prospects for follow-up.",
  PAYMENT_DONE:
    "Leads that sent deposit, payment proof, or payment confirmation. Verify payment before conversion.",
  CONVERTED:
    "Leads that agreed to a sale or booking, made a deposit, or were moved into reservation workflow.",
};

const DEFAULT_FORM: LeadFormState = {
  guestName: "",
  inquiry: "",
  lastMessage: "",
  source: "Organic",
  stage: "INTAKE",
  targetDate: "",
};

const TEMP_STYLES: Record<LeadTemperature, string> = {
  Hot: "border-black bg-black text-white",
  Warm: "border-zinc-200 bg-zinc-100 text-zinc-900",
  Cold: "border-zinc-200 bg-white text-zinc-600",
  "No date": "border-zinc-200 bg-white text-zinc-500",
};

const TEMP_ICONS: Record<LeadTemperature, React.ReactNode> = {
  Hot: <Flame className="size-3.5" />,
  Warm: <ThermometerSun className="size-3.5" />,
  Cold: <Snowflake className="size-3.5" />,
  "No date": <CalendarDays className="size-3.5" />,
};
const MESSENGER_BADGE_ICON_URL =
  "https://static.xx.fbcdn.net/rsrc.php/yN/r/qHP-btEdMOl.svg?_nc_eui2=AeGUaBDkQ4KjXJbD1rykzIBW6XrqcTxXAKHpeupxPFcAoTLVQ2tdEHcBnoYXTVDJfRGetfehagoeSlD3ddYZvZOM";

export default function LeadsPage() {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const [connectOpen, setConnectOpen] = useState(false);
  const [diagnosticsOpen, setDiagnosticsOpen] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [conversationOpen, setConversationOpen] = useState(false);
  const [deleteLead, setDeleteLead] = useState<LeadRow | null>(null);
  const [convertLead, setConvertLead] = useState<LeadRow | null>(null);
  const [selectedLead, setSelectedLead] = useState<LeadRow | null>(null);
  const [form, setForm] = useState<LeadFormState>(DEFAULT_FORM);
  const [lastSyncError, setLastSyncError] = useState<string | null>(null);
  const [lastSyncResult, setLastSyncResult] = useState<{
    conversations: number;
    messages: number;
    syncedAt: string;
  } | null>(null);
  const [replyText, setReplyText] = useState("");
  const [search, setSearch] = useState("");
  const [stageFilter, setStageFilter] = useState<LeadStage | "ALL">("ALL");
  const backgroundSyncInFlight = useRef(false);

  const integration = useQuery({
    ...trpc.resort.leads.integration.queryOptions(),
  });
  const diagnostics = useQuery({
    ...trpc.resort.leads.diagnostics.queryOptions(undefined, {
      enabled: diagnosticsOpen,
    }),
  });
  const leads = useQuery({
    ...trpc.resort.leads.list.queryOptions(),
    refetchInterval: 10_000,
  });
  const rows = useMemo(() => (leads.data ?? []) as LeadRow[], [leads.data]);

  const invalidateLeads = async () => {
    await queryClient.invalidateQueries(trpc.resort.leads.list.queryFilter());
  };

  const connectMessenger = useMutation(
    trpc.resort.leads.connectMessenger.mutationOptions({
      onSuccess: async (connectedPage) => {
        await queryClient.invalidateQueries(
          trpc.resort.leads.integration.queryFilter(),
        );
        setConnectOpen(false);
        toast.success(`${connectedPage.pageName} connected.`);
      },
      onError: (error) => toast.error(error.message),
    }),
  );

  const syncInbox = useMutation(
    trpc.resort.leads.syncMessengerInbox.mutationOptions({
      onSuccess: async (result) => {
        setLastSyncError(null);
        setLastSyncResult({
          ...result,
          syncedAt: new Date().toISOString(),
        });
        await invalidateLeads();
        if (diagnosticsOpen) {
          await queryClient.invalidateQueries(
            trpc.resort.leads.diagnostics.queryFilter(),
          );
        }
      },
      onError: (error) => {
        setLastSyncError(error.message);
      },
    }),
  );

  useEffect(() => {
    if (!integration.data?.connected) {
      return;
    }

    const syncInBackground = () => {
      if (backgroundSyncInFlight.current) {
        return;
      }

      backgroundSyncInFlight.current = true;
      syncInbox.mutate(undefined, {
        onSettled: () => {
          backgroundSyncInFlight.current = false;
        },
      });
    };

    syncInBackground();
    const intervalId = window.setInterval(syncInBackground, 10_000);

    return () => window.clearInterval(intervalId);
  }, [integration.data?.connected, syncInbox]);

  const saveLead = useMutation(
    trpc.resort.leads.save.mutationOptions({
      onSuccess: async () => {
        await invalidateLeads();
        setFormOpen(false);
        setForm(DEFAULT_FORM);
        toast.success("Lead saved.");
      },
      onError: (error) => toast.error(error.message),
    }),
  );

  const updateStage = useMutation(
    trpc.resort.leads.updateStage.mutationOptions({
      onSuccess: async () => {
        await invalidateLeads();
        toast.success("Lead stage updated.");
      },
      onError: (error) => toast.error(error.message),
    }),
  );

  const sendReply = useMutation(
    trpc.resort.leads.sendReply.mutationOptions({
      onSuccess: async () => {
        await invalidateLeads();
        setReplyText("");
        toast.success("Messenger reply sent.");
      },
      onError: (error) => toast.error(error.message),
    }),
  );

  const deleteLeadMutation = useMutation(
    trpc.resort.leads.delete.mutationOptions({
      onSuccess: async () => {
        await invalidateLeads();
        setDeleteLead(null);
        toast.success("Lead deleted.");
      },
      onError: (error) => toast.error(error.message),
    }),
  );
  const convertToReservation = useMutation(
    trpc.resort.leads.convertToReservation.mutationOptions({
      onSuccess: async () => {
        await Promise.all([
          invalidateLeads(),
          queryClient.invalidateQueries(trpc.resort.reservations.list.queryFilter()),
          queryClient.invalidateQueries(trpc.resort.invoices.list.queryFilter()),
        ]);
        setConvertLead(null);
        toast.success("Lead converted to reservation.");
      },
      onError: (error) => toast.error(error.message),
    }),
  );

  const filteredRows = useMemo(() => {
    const needle = search.trim().toLowerCase();

    return rows.filter((lead) => {
      const matchesStage = stageFilter === "ALL" || lead.stage === stageFilter;
      const matchesSearch =
        !needle ||
        [lead.guestName, lead.inquiry, lead.lastMessage, lead.source, lead.psid]
          .join(" ")
          .toLowerCase()
          .includes(needle);

      return matchesStage && matchesSearch;
    });
  }, [rows, search, stageFilter]);

  const stageGroups = useMemo(
    () =>
      STAGES.map((stage) => ({
        leads: filteredRows.filter((lead) => lead.stage === stage.value),
        stage,
      })),
    [filteredRows],
  );
  const hotLeads = rows.filter((lead) => getLeadTemperature(lead) === "Hot");
  const warmLeads = rows.filter((lead) => getLeadTemperature(lead) === "Warm");
  const convertedLeads = rows.filter((lead) => lead.stage === "CONVERTED");

  const kpiItems = useMemo<KpiGridItem[]>(
    () => [
      {
        title: "Messenger leads",
        value: String(rows.length),
        note: "Synced inquiry pipeline",
        icon: <MessageCircle className="size-4" />,
      },
      {
        title: "Hot",
        value: String(hotLeads.length),
        note: "Within 10 days",
        icon: <Flame className="size-4" />,
      },
      {
        title: "Warm",
        value: String(warmLeads.length),
        note: "10-30 days out",
        icon: <ThermometerSun className="size-4" />,
      },
      {
        title: "Converted",
        value: String(convertedLeads.length),
        note: "Moved to booking flow",
        icon: <UserRoundCheck className="size-4" />,
      },
    ],
    [convertedLeads.length, hotLeads.length, rows.length, warmLeads.length],
  );

  const openNewLead = () => {
    setForm(DEFAULT_FORM);
    setFormOpen(true);
  };

  const openEditLead = (lead: LeadRow) => {
    setForm({
      guestName: lead.guestName,
      id: lead.id,
      inquiry: lead.inquiry === "Messenger inquiry" ? "" : lead.inquiry,
      lastMessage: lead.lastMessage === "--" ? "" : lead.lastMessage,
      source: lead.source,
      stage: lead.stage,
      targetDate: lead.targetDate ? lead.targetDate.slice(0, 10) : "",
    });
    setFormOpen(true);
  };

  const openConversation = (lead: LeadRow) => {
    setSelectedLead(lead);
    setConversationOpen(true);
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <ResortBreadcrumb />
        <div className="flex items-center gap-2">
          <Button
            size="xs"
            variant="outline"
            onClick={() => setDiagnosticsOpen(true)}
          >
            <RefreshCw className="size-4" />
            Diagnostics
          </Button>
          <Button
            size="xs"
            variant="outline"
            onClick={() => setConnectOpen(true)}
          >
            <Send className="size-4" />
            {integration.data?.connected
              ? "Messenger connected"
              : "Connect Messenger"}
          </Button>
          <Button size="xs" onClick={openNewLead}>
            <Plus className="size-4" />
            New lead
          </Button>
        </div>
      </div>

      <KpiGrid
        columnsClassName="sm:grid-cols-2 xl:grid-cols-4"
        items={kpiItems}
      />

      <Card className="rounded-xl pt-0! border-zinc-200 bg-white">
        <div className="flex flex-wrap items-center gap-3 border-b border-zinc-200 p-4">
          <Select
            value={stageFilter}
            onValueChange={(value) =>
              setStageFilter(value as LeadStage | "ALL")
            }
          >
            <SelectTrigger className="rounded-lg min-w-36 border-zinc-200 bg-white px-3 text-sm shadow-xs">
              <SelectValue placeholder="All" />
            </SelectTrigger>
            <SelectContent align="start">
              <SelectItem value="ALL">All</SelectItem>
              {STAGES.map((stage) => (
                <SelectItem key={stage.value} value={stage.value}>
                  {stage.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="relative min-w-64 flex-1">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-zinc-500" />
            <Input
              className="rounded-lg pl-9"
              placeholder="Search lead, message, source, or PSID"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </div>
          <Badge className="rounded-md border-zinc-200 bg-zinc-100 text-zinc-900">
            {leads.isPending ? "Loading" : `${filteredRows.length} shown`}
          </Badge>
        </div>

        {leads.error ? (
          <div className="border-b border-red-100 bg-red-50 p-4 text-sm font-medium text-red-700">
            {leads.error.message}
          </div>
        ) : null}

        <TooltipProvider>
          <div className="grid gap-4 overflow-x-auto p-4 pt-0! xl:grid-cols-4">
            {stageGroups.map((group) => (
              <LeadColumn
                key={group.stage.value}
                leads={group.leads}
                onDelete={setDeleteLead}
                onEdit={openEditLead}
                onOpen={openConversation}
                onStageChange={(lead, stage) =>
                  updateStage.mutate({ id: lead.id, stage })
                }
                onConvert={setConvertLead}
                stage={group.stage}
              />
            ))}
          </div>
        </TooltipProvider>
      </Card>

      <Card className="rounded-xl border-zinc-200 bg-white p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-bold text-zinc-950">
              Lead temperature rules
            </h2>
            <p className="mt-1 text-sm text-zinc-500">
              Booking target date controls priority: Hot 0-10 days, Warm 10-30
              days, Cold 30+ days.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <TemperaturePill count={hotLeads.length} temperature="Hot" />
            <TemperaturePill count={warmLeads.length} temperature="Warm" />
            <TemperaturePill
              count={
                rows.filter((lead) => getLeadTemperature(lead) === "Cold")
                  .length
              }
              temperature="Cold"
            />
          </div>
        </div>
      </Card>

      <ConnectMessengerDialog
        connected={Boolean(integration.data?.connected)}
        isConnecting={connectMessenger.isPending}
        onConnect={() => connectMessenger.mutate()}
        onOpenChange={setConnectOpen}
        open={connectOpen}
        pageCandidate={integration.data?.pageCandidate ?? null}
      />

      <LeadDiagnosticsSheet
        diagnostics={diagnostics.data}
        error={diagnostics.error?.message ?? lastSyncError}
        isLoading={diagnostics.isLoading}
        isSyncing={syncInbox.isPending}
        lastSyncResult={lastSyncResult}
        leadCount={rows.length}
        onOpenChange={setDiagnosticsOpen}
        onRefresh={() => diagnostics.refetch()}
        onSync={() => syncInbox.mutate()}
        open={diagnosticsOpen}
      />

      <LeadFormSheet
        form={form}
        isSaving={saveLead.isPending}
        onChange={setForm}
        onOpenChange={setFormOpen}
        onSave={() => saveLead.mutate(form)}
        open={formOpen}
      />
      <ConvertLeadSheet
        isSaving={convertToReservation.isPending}
        lead={convertLead}
        onOpenChange={(open) => setConvertLead(open ? convertLead : null)}
        onSave={(input) => convertToReservation.mutate(input)}
      />

      <ConversationSheet
        isSending={sendReply.isPending}
        lead={selectedLead}
        onOpenChange={setConversationOpen}
        onReply={() => {
          if (selectedLead) {
            sendReply.mutate({ id: selectedLead.id, text: replyText });
          }
        }}
        open={conversationOpen}
        replyText={replyText}
        setReplyText={setReplyText}
      />

      <AlertDialog
        open={Boolean(deleteLead)}
        onOpenChange={() => setDeleteLead(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete lead?</AlertDialogTitle>
            <AlertDialogDescription>
              This removes lead and saved message history from Alrio Private Resort.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={() => {
                if (deleteLead)
                  deleteLeadMutation.mutate({ id: deleteLead.id });
              }}
            >
              Delete lead
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function ConnectMessengerDialog({
  connected,
  isConnecting,
  onConnect,
  onOpenChange,
  open,
  pageCandidate,
}: {
  connected: boolean;
  isConnecting: boolean;
  onConnect: () => void;
  onOpenChange: (open: boolean) => void;
  open: boolean;
  pageCandidate: {
    pageId: string;
    pageName: string;
    webhookUrl: string;
  } | null;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Connect Messenger</DialogTitle>
          <DialogDescription>
            Select Facebook Page that syncs Messenger inquiries into Leads
            Pipeline.
          </DialogDescription>
        </DialogHeader>

        <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-4">
          <p className="text-xs font-bold uppercase text-zinc-500">
            Available Facebook Pages
          </p>
          {pageCandidate ? (
            <div className="mt-3 flex items-start justify-between gap-4 rounded-lg border border-zinc-200 bg-white p-4">
              <div className="min-w-0">
                <p className="font-bold text-zinc-950">
                  {pageCandidate.pageName}
                </p>
                <p className="mt-1 text-xs text-zinc-500">
                  Page ID: {pageCandidate.pageId}
                </p>
                <p className="mt-2 line-clamp-2 text-xs text-zinc-500">
                  Webhook: {pageCandidate.webhookUrl || "--"}
                </p>
              </div>
              {connected ? (
                <Badge className="rounded-md border-black bg-black text-white">
                  <CheckCircle2 className="size-3.5" />
                  Connected
                </Badge>
              ) : (
                <Badge className="rounded-md border-zinc-200 bg-zinc-100 text-zinc-900">
                  Ready
                </Badge>
              )}
            </div>
          ) : (
            <div className="mt-3 rounded-lg border border-dashed border-zinc-300 bg-white p-4 text-sm text-zinc-500">
              No page configured. Add `META_PAGE_ID` and
              `META_PAGE_ACCESS_TOKEN` in `.env`.
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            type="button"
            onClick={() =>
              window.open("https://developers.facebook.com/apps", "_blank")
            }
          >
            <ExternalLink className="size-4" />
            Meta apps
          </Button>
          <Button
            type="button"
            disabled={!pageCandidate || isConnecting || connected}
            onClick={onConnect}
          >
            <Send className="size-4" />
            {connected
              ? "Connected"
              : isConnecting
                ? "Connecting..."
                : "Connect page"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function LeadDiagnosticsSheet({
  diagnostics,
  error,
  isLoading,
  isSyncing,
  lastSyncResult,
  leadCount,
  onOpenChange,
  onRefresh,
  onSync,
  open,
}: {
  diagnostics:
    | {
        checks: string[];
        healthy: boolean;
        issues: string[];
        leadCount: number;
        recentMessages: Array<{
          direction: "INBOUND" | "OUTBOUND";
          guestName: string;
          id: string;
          sentAt: string;
          stage: LeadStage;
          text: string;
        }>;
        stageCounts: Array<{ count: number; stage: LeadStage }>;
        warnings: string[];
      }
    | undefined;
  error: string | null;
  isLoading: boolean;
  isSyncing: boolean;
  lastSyncResult: {
    conversations: number;
    messages: number;
    syncedAt: string;
  } | null;
  leadCount: number;
  onOpenChange: (open: boolean) => void;
  onRefresh: () => void;
  onSync: () => void;
  open: boolean;
}) {
  const status = diagnostics?.healthy ? "Healthy" : "Needs attention";
  const stageCounts = new Map(
    diagnostics?.stageCounts.map((item) => [item.stage, item.count]) ?? [],
  );

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="gap-0 overflow-hidden bg-white p-0 text-zinc-950 max-w-2xl!">
        <SheetHeader className="border-b border-zinc-200 bg-white px-4 py-4">
          <SheetTitle className="text-left text-base">
            Messenger diagnostics
          </SheetTitle>
          <SheetDescription className="text-left">
            Sync health, local counts, and latest saved messages.
          </SheetDescription>
        </SheetHeader>

        <div className="flex-1 space-y-4 overflow-y-auto bg-zinc-50 p-4">
          <div className="rounded-xl border border-zinc-200 bg-white p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-bold uppercase text-zinc-500">
                  Status
                </p>
                <p className="mt-1 text-xl font-bold text-zinc-950">
                  {isLoading ? "Checking..." : status}
                </p>
              </div>
              <Badge
                className={cn(
                  "rounded-md",
                  diagnostics?.healthy
                    ? "border-zinc-200 bg-zinc-100 text-zinc-900"
                    : "border-red-200 bg-red-50 text-red-700",
                )}
              >
                {diagnostics?.healthy ? "OK" : "Check"}
              </Badge>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-3">
              <DiagnosticStat label="Rows on screen" value={leadCount} />
              <DiagnosticStat
                label="Rows in database"
                value={diagnostics?.leadCount ?? leadCount}
              />
            </div>
            {lastSyncResult ? (
              <p className="mt-3 text-xs text-zinc-500">
                Last sync: {lastSyncResult.conversations} conversations,{" "}
                {lastSyncResult.messages} messages at{" "}
                {formatMessengerDate(lastSyncResult.syncedAt)}
              </p>
            ) : (
              <p className="mt-3 text-xs text-zinc-500">
                No sync result captured in this browser session yet.
              </p>
            )}
          </div>

          {error ? (
            <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-medium text-red-700">
              {error}
            </div>
          ) : null}

          <div className="rounded-xl border border-zinc-200 bg-white p-4">
            <p className="text-sm font-bold text-zinc-950">Pipeline counts</p>
            <div className="mt-3 grid grid-cols-2 gap-2">
              {STAGES.map((stage) => (
                <DiagnosticStat
                  key={stage.value}
                  label={stage.label}
                  value={stageCounts.get(stage.value) ?? 0}
                />
              ))}
            </div>
          </div>

          <DiagnosticList title="Checks" items={diagnostics?.checks ?? []} />
          <DiagnosticList
            title="Warnings"
            items={diagnostics?.warnings ?? []}
            tone="warning"
          />
          <DiagnosticList
            title="Issues"
            items={diagnostics?.issues ?? []}
            tone="danger"
          />

          <div className="rounded-xl border border-zinc-200 bg-white p-4">
            <p className="text-sm font-bold text-zinc-950">
              Latest saved messages
            </p>
            <div className="mt-3 space-y-3">
              {diagnostics?.recentMessages.length ? (
                diagnostics.recentMessages.map((message) => (
                  <div
                    key={message.id}
                    className="rounded-lg border border-zinc-100 bg-zinc-50 p-3"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <p className="min-w-0 truncate text-sm font-bold text-zinc-950">
                        {message.guestName}
                      </p>
                      <Badge className="rounded-md border-zinc-200 bg-white text-zinc-700">
                        {message.direction}
                      </Badge>
                    </div>
                    <p className="mt-2 line-clamp-2 text-xs text-zinc-600">
                      {message.text}
                    </p>
                    <p className="mt-2 text-[11px] font-medium text-zinc-500">
                      {STAGES.find((stage) => stage.value === message.stage)?.label ??
                        message.stage}{" "}
                      - {formatMessengerDate(message.sentAt)}
                    </p>
                  </div>
                ))
              ) : (
                <p className="text-sm text-zinc-500">No saved messages yet.</p>
              )}
            </div>
          </div>
        </div>

        <SheetFooter className="border-t border-zinc-200 bg-white p-3">
          <div className="flex w-full gap-2">
            <Button
              className="flex-1"
              variant="outline"
              type="button"
              onClick={onRefresh}
            >
              <RefreshCw className="size-4" />
              Refresh
            </Button>
            <Button
              className="flex-1"
              disabled={isSyncing}
              type="button"
              onClick={onSync}
            >
              {isSyncing ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Send className="size-4" />
              )}
              {isSyncing ? "Syncing..." : "Run sync"}
            </Button>
          </div>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

function DiagnosticStat({
  label,
  value,
}: {
  label: string;
  value: number | string;
}) {
  return (
    <div className="rounded-lg border border-zinc-100 bg-zinc-50 p-3">
      <p className="text-xs font-medium text-zinc-500">{label}</p>
      <p className="mt-1 text-lg font-bold text-zinc-950">{value}</p>
    </div>
  );
}

function DiagnosticList({
  items,
  title,
  tone = "default",
}: {
  items: string[];
  title: string;
  tone?: "danger" | "default" | "warning";
}) {
  const toneClass =
    tone === "danger"
      ? "border-red-200 bg-red-50 text-red-700"
      : tone === "warning"
        ? "border-amber-200 bg-amber-50 text-amber-800"
        : "border-zinc-200 bg-white text-zinc-700";

  return (
    <div className={cn("rounded-xl border p-4", toneClass)}>
      <p className="text-sm font-bold">{title}</p>
      {items.length ? (
        <ul className="mt-3 space-y-2 text-sm">
          {items.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      ) : (
        <p className="mt-3 text-sm">None.</p>
      )}
    </div>
  );
}

function LeadColumn({
  leads,
  onConvert,
  onDelete,
  onEdit,
  onOpen,
  onStageChange,
  stage,
}: {
  leads: LeadRow[];
  onConvert: (lead: LeadRow) => void;
  onDelete: (lead: LeadRow) => void;
  onEdit: (lead: LeadRow) => void;
  onOpen: (lead: LeadRow) => void;
  onStageChange: (lead: LeadRow, stage: LeadStage) => void;
  stage: { label: string; value: LeadStage };
}) {
  return (
    <section className="flex max-h-190 min-w-72 flex-col overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-xs">
      <div className="flex items-center justify-between gap-3 border-b border-zinc-200 p-4">
        <div className="flex items-center gap-2">
          <h2 className="text-base font-bold text-zinc-950">{stage.label}</h2>
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                className="text-zinc-500 transition hover:text-zinc-950"
                aria-label={`About ${stage.label} leads`}
              >
                <Info className="size-4" />
              </button>
            </TooltipTrigger>
            <TooltipContent
              align="start"
              arrowClassName="bg-transparent! fill-transparent!"
              className="block max-w-80 rounded-lg bg-white p-4 text-left text-sm text-zinc-700 shadow-lg ring-1 ring-zinc-200"
              side="top"
            >
              <p className="font-bold text-zinc-950">
                About {stage.label} leads
              </p>
              <p className="mt-2 leading-6">{STAGE_TOOLTIPS[stage.value]}</p>
            </TooltipContent>
          </Tooltip>
          <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs font-bold text-zinc-700">
            {leads.length}
          </span>
        </div>
      </div>

      <div className="min-h-155 flex-1 space-y-3 overflow-y-auto bg-zinc-50/70 p-3">
        {leads.length === 0 ? (
          <div className="rounded-lg border border-dashed border-zinc-300 bg-white p-4 text-sm text-zinc-500">
            No leads in {stage.label}.
          </div>
        ) : (
          leads.map((lead) => (
            <LeadCard
              key={lead.id}
              lead={lead}
              onConvert={onConvert}
              onDelete={onDelete}
              onEdit={onEdit}
              onOpen={onOpen}
              onStageChange={onStageChange}
            />
          ))
        )}
      </div>
    </section>
  );
}

function LeadCard({
  lead,
  onConvert,
  onDelete,
  onEdit,
  onOpen,
  onStageChange,
}: {
  lead: LeadRow;
  onConvert: (lead: LeadRow) => void;
  onDelete: (lead: LeadRow) => void;
  onEdit: (lead: LeadRow) => void;
  onOpen: (lead: LeadRow) => void;
  onStageChange: (lead: LeadRow, stage: LeadStage) => void;
}) {
  const temperature = getLeadTemperature(lead);
  const days = getDaysUntil(lead.targetDate);

  return (
    <Card className="gap-3 rounded-lg border-zinc-200 bg-white p-3 shadow-xs">
      <div className="flex items-start gap-3">
        <LeadAvatar name={lead.guestName} src={lead.profilePictureUrl} />
        <button
          className="min-w-0 flex-1 text-left"
          type="button"
          onClick={() => onOpen(lead)}
        >
          <p className="truncate text-sm font-bold text-zinc-950">
            {lead.guestName}
          </p>
          <p className="mt-1 truncate text-xs font-medium text-zinc-500">
            {lead.inquiry}
          </p>
        </button>
        <LeadActions
          lead={lead}
          onConvert={onConvert}
          onDelete={onDelete}
          onEdit={onEdit}
          onOpen={onOpen}
          onStageChange={onStageChange}
        />
      </div>

      <div className="flex flex-wrap gap-2">
        <Badge className="rounded-md border-zinc-200 bg-zinc-100 text-zinc-900">
          {lead.source}
        </Badge>
        <Badge className={cn("rounded-md", TEMP_STYLES[temperature])}>
          {TEMP_ICONS[temperature]}
          {temperature}
        </Badge>
      </div>

      <p className="line-clamp-2 text-xs text-zinc-500">{lead.lastMessage}</p>
      {lead.reservation ? (
        <Button asChild size="xs" variant="outline">
          <Link href="/resort/reservations/calendar">
            <CalendarDays className="size-4" />
            {lead.reservation.roomLabel}
          </Link>
        </Button>
      ) : null}

      <div className="flex items-center justify-between gap-3 border-t border-zinc-100 pt-3 text-xs">
        <span className="inline-flex items-center gap-1 font-semibold text-zinc-600">
          <CalendarDays className="size-3.5" />
          {lead.targetDate ? formatLeadDate(lead.targetDate) : "No date"}
        </span>
        <span className="font-bold text-zinc-950">
          {lead.targetDate ? (days <= 0 ? "Due now" : `${days}d out`) : "--"}
        </span>
      </div>
    </Card>
  );
}

function LeadActions({
  lead,
  onConvert,
  onDelete,
  onEdit,
  onOpen,
  onStageChange,
}: {
  lead: LeadRow;
  onConvert: (lead: LeadRow) => void;
  onDelete: (lead: LeadRow) => void;
  onEdit: (lead: LeadRow) => void;
  onOpen: (lead: LeadRow) => void;
  onStageChange: (lead: LeadRow, stage: LeadStage) => void;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button size="icon-xs" variant="ghost">
          <MoreVertical className="size-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-52">
        <DropdownMenuItem onClick={() => onOpen(lead)}>
          <MessageCircle className="size-4" />
          Open conversation
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => onEdit(lead)}>
          <Pencil className="size-4" />
          Edit details
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => onStageChange(lead, "QUALIFIED")}>
          <UserRoundCheck className="size-4" />
          Mark qualified
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => onStageChange(lead, "PAYMENT_DONE")}>
          <CircleDollarSign className="size-4" />
          Mark payment done
        </DropdownMenuItem>
        <DropdownMenuItem
          disabled={Boolean(lead.reservationId)}
          onClick={() => onConvert(lead)}
        >
          <CheckCircle2 className="size-4" />
          Convert to booking
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          className="text-red-600 focus:text-red-600"
          onClick={() => onDelete(lead)}
        >
          <Trash2 className="size-4" />
          Delete lead
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function ConvertLeadSheet({
  isSaving,
  lead,
  onOpenChange,
  onSave,
}: {
  isSaving: boolean;
  lead: LeadRow | null;
  onOpenChange: (open: boolean) => void;
  onSave: (input: {
    adults: number;
    checkIn: string;
    checkOut: string;
    children: number;
    deposit: string;
    leadId: string;
    notes: string;
    paymentMethod: string;
    rate: string;
    status: "Confirmed";
    totalAmount: string;
  }) => void;
}) {
  const defaultCheckIn = lead?.targetDate?.slice(0, 10) ?? toDateInput(new Date());
  const defaultCheckOutDate = new Date(`${defaultCheckIn}T00:00:00`);
  defaultCheckOutDate.setDate(defaultCheckOutDate.getDate() + 1);
  const [values, setValues] = useState({
    adults: 1,
    checkIn: defaultCheckIn,
    checkOut: toDateInput(defaultCheckOutDate),
    children: 0,
    deposit: "",
    notes: "",
    paymentMethod: "Cash",
    rate: "",
  });
  const nights = getNights(values.checkIn, values.checkOut);
  const rateAmount = parseMoney(values.rate);
  const totalAmount = Math.max(rateAmount * nights, 0);
  const canSave = Boolean(lead && values.checkIn && values.checkOut && rateAmount > 0) && nights > 0 && !isSaving;

  useEffect(() => {
    if (!lead) return;

    const checkIn = lead.targetDate?.slice(0, 10) ?? toDateInput(new Date());
    const checkOutDate = new Date(`${checkIn}T00:00:00`);
    checkOutDate.setDate(checkOutDate.getDate() + 1);
    queueMicrotask(() =>
      setValues((current) => ({
        ...current,
        checkIn,
        checkOut: toDateInput(checkOutDate),
        notes: lead.lastMessage === "--" ? "" : lead.lastMessage,
      })),
    );
  }, [lead]);

  function submit() {
    if (!lead) return;

    if (rateAmount <= 0) {
      toast.error("A nightly resort rate is required.");
      return;
    }

    if (nights < 1) {
      toast.error("Check-out must be after check-in.");
      return;
    }

    onSave({
      adults: values.adults,
      checkIn: values.checkIn,
      checkOut: values.checkOut,
      children: values.children,
      deposit: values.deposit,
      leadId: lead.id,
      notes: values.notes,
      paymentMethod: values.paymentMethod,
      rate: String(rateAmount || values.rate),
      status: "Confirmed",
      totalAmount: String(totalAmount),
    });
  }

  return (
    <Sheet open={Boolean(lead)} onOpenChange={onOpenChange}>
      <SheetContent className="max-w-2xl!">
        <SheetHeader className="border-b border-zinc-200">
          <SheetTitle>Convert lead to booking</SheetTitle>
          <SheetDescription>
            Create reservation from lead details and keep them linked.
          </SheetDescription>
        </SheetHeader>

        <div className="flex-1 space-y-4 overflow-y-auto px-4">
          <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-3 text-sm">
            <p className="font-bold text-zinc-950">{lead?.guestName ?? "Lead"}</p>
            <p className="mt-1 text-xs font-medium text-zinc-500">
              {lead?.inquiry ?? "No inquiry"}
            </p>
          </div>

          <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-3 text-sm text-zinc-600">
            This conversion reserves the whole Alrio Private Resort. Rooms,
            amenities, packages, and services remain informational inclusions.
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Check-in">
              <Input
                className="rounded-lg"
                type="date"
                value={values.checkIn}
                onChange={(event) =>
                  setValues((current) => ({ ...current, checkIn: event.target.value }))
                }
              />
            </Field>
            <Field label="Check-out">
              <Input
                className="rounded-lg"
                type="date"
                value={values.checkOut}
                onChange={(event) =>
                  setValues((current) => ({ ...current, checkOut: event.target.value }))
                }
              />
            </Field>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Adults">
              <Input
                className="rounded-lg"
                min={1}
                type="number"
                value={values.adults}
                onChange={(event) =>
                  setValues((current) => ({ ...current, adults: Number(event.target.value) }))
                }
              />
            </Field>
            <Field label="Children">
              <Input
                className="rounded-lg"
                min={0}
                type="number"
                value={values.children}
                onChange={(event) =>
                  setValues((current) => ({ ...current, children: Number(event.target.value) }))
                }
              />
            </Field>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Whole-resort rate per night">
              <Input
                className="rounded-lg"
                value={values.rate}
                onChange={(event) =>
                  setValues((current) => ({ ...current, rate: event.target.value }))
                }
              />
            </Field>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Deposit">
              <Input
                className="rounded-lg"
                value={values.deposit}
                onChange={(event) =>
                  setValues((current) => ({ ...current, deposit: event.target.value }))
                }
              />
            </Field>
          </div>

          <Field label="Notes">
            <Textarea
              className="min-h-24 rounded-lg"
              value={values.notes}
              onChange={(event) =>
                setValues((current) => ({ ...current, notes: event.target.value }))
              }
            />
          </Field>

          <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-3">
            <p className="text-xs font-bold uppercase text-zinc-500">Booking total</p>
            <p className="mt-1 text-2xl font-bold text-zinc-950">
              {formatPeso(totalAmount)}
            </p>
            <p className="mt-1 text-xs font-medium text-zinc-500">
              {Math.max(nights, 0)} night{nights === 1 ? "" : "s"}
            </p>
          </div>
        </div>

        <SheetFooter className="border-t border-zinc-200">
          <Button disabled={!canSave} onClick={submit}>
            {isSaving ? "Converting..." : "Create booking"}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

function LeadFormSheet({
  form,
  isSaving,
  onChange,
  onOpenChange,
  onSave,
  open,
}: {
  form: LeadFormState;
  isSaving: boolean;
  onChange: (form: LeadFormState) => void;
  onOpenChange: (open: boolean) => void;
  onSave: () => void;
  open: boolean;
}) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-xl">
        <SheetHeader className="border-b border-zinc-200">
          <SheetTitle>{form.id ? "Edit lead" : "New lead"}</SheetTitle>
          <SheetDescription>
            Manage guest inquiry, pipeline stage, and target booking date.
          </SheetDescription>
        </SheetHeader>

        <div className="flex-1 space-y-4 overflow-y-auto px-4">
          <Field label="Guest name">
            <Input
              className="rounded-lg"
              value={form.guestName}
              onChange={(event) =>
                onChange({ ...form, guestName: event.target.value })
              }
            />
          </Field>
          <Field label="Inquiry">
            <Input
              className="rounded-lg"
              value={form.inquiry}
              onChange={(event) =>
                onChange({ ...form, inquiry: event.target.value })
              }
            />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Source">
              <select
                className="h-9 w-full rounded-lg border border-zinc-200 bg-white px-3 text-sm shadow-xs outline-none"
                value={form.source}
                onChange={(event) =>
                  onChange({ ...form, source: event.target.value })
                }
              >
                <option>Organic</option>
                <option>Paid</option>
                <option>Messenger</option>
                <option>Referral</option>
              </select>
            </Field>
            <Field label="Stage">
              <select
                className="h-9 w-full rounded-lg border border-zinc-200 bg-white px-3 text-sm shadow-xs outline-none"
                value={form.stage}
                onChange={(event) =>
                  onChange({ ...form, stage: event.target.value as LeadStage })
                }
              >
                {STAGES.map((stage) => (
                  <option key={stage.value} value={stage.value}>
                    {stage.label}
                  </option>
                ))}
              </select>
            </Field>
          </div>
          <Field label="Target booking date">
            <Input
              className="rounded-lg"
              type="date"
              value={form.targetDate}
              onChange={(event) =>
                onChange({ ...form, targetDate: event.target.value })
              }
            />
          </Field>
          <Field label="Latest note">
            <Textarea
              className="min-h-28 rounded-lg"
              value={form.lastMessage}
              onChange={(event) =>
                onChange({ ...form, lastMessage: event.target.value })
              }
            />
          </Field>
        </div>

        <SheetFooter className="border-t border-zinc-200">
          <Button disabled={isSaving} onClick={onSave}>
            {isSaving ? "Saving..." : "Save lead"}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

function ConversationSheet({
  isSending,
  lead,
  onOpenChange,
  onReply,
  open,
  replyText,
  setReplyText,
}: {
  isSending: boolean;
  lead: LeadRow | null;
  onOpenChange: (open: boolean) => void;
  onReply: () => void;
  open: boolean;
  replyText: string;
  setReplyText: (value: string) => void;
}) {
  const messages = [...(lead?.messages ?? [])].sort(
    (a, b) => new Date(a.sentAt).getTime() - new Date(b.sentAt).getTime(),
  );

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="gap-0 overflow-hidden bg-white p-0 text-zinc-950 max-w-2xl!">
        <SheetHeader className="border-b border-zinc-200 bg-white px-4 py-4">
          <div className="flex items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-3">
              <LeadAvatar
                className="size-12"
                name={lead?.guestName ?? "Messenger guest"}
                src={lead?.profilePictureUrl}
              />
              <div className="min-w-0">
                <SheetTitle className="truncate text-left text-base text-zinc-950">
                  {lead?.guestName ?? "Conversation"}
                </SheetTitle>
                <SheetDescription className="truncate text-left text-xs text-zinc-500">
                  {lead?.lastMessageAt
                    ? `Active ${formatMessengerDate(lead.lastMessageAt)}`
                    : lead?.psid.startsWith("manual:")
                      ? "Manual lead"
                      : `Messenger PSID: ${lead?.psid ?? "--"}`}
                </SheetDescription>
              </div>
            </div>
          </div>
        </SheetHeader>

        <div className="flex-1 space-y-4 overflow-y-auto bg-zinc-50 px-4 py-5">
          {messages.length === 0 ? (
            <div className="rounded-xl border border-dashed border-zinc-300 bg-white p-4 text-sm text-zinc-500">
              No saved messages.
            </div>
          ) : (
            messages.map((message) => (
              <div
                key={message.id}
                className={cn(
                  "flex items-end gap-2",
                  message.direction === "OUTBOUND"
                    ? "justify-end"
                    : "justify-start",
                )}
              >
                {message.direction === "INBOUND" ? (
                  <LeadAvatar
                    className="size-7"
                    name={lead?.guestName ?? "Messenger guest"}
                    src={lead?.profilePictureUrl}
                  />
                ) : null}
                <div
                  className={cn(
                    "max-w-[78%] rounded-3xl px-4 py-2 text-sm leading-relaxed shadow-sm",
                    message.direction === "OUTBOUND"
                      ? "bg-black text-white"
                      : "border border-zinc-200 bg-white text-zinc-900",
                  )}
                >
                  <p>{message.text}</p>
                  <p
                    className={cn(
                      "mt-1 text-[11px]",
                      message.direction === "OUTBOUND"
                        ? "text-white/70"
                        : "text-zinc-500",
                    )}
                  >
                    {formatMessengerDate(message.sentAt)}
                  </p>
                </div>
              </div>
            ))
          )}
        </div>

        <SheetFooter className="border-t border-zinc-200 bg-white p-3">
          <div className="flex w-full items-end gap-2">
            <Textarea
              className="max-h-32 min-h-11 resize-none rounded-full border-zinc-200 bg-zinc-50 px-4 py-3 text-zinc-950 shadow-none placeholder:text-zinc-400 focus-visible:ring-1 focus-visible:ring-zinc-300"
              disabled={!lead || lead.psid.startsWith("manual:")}
              placeholder={
                lead?.psid.startsWith("manual:")
                  ? "Manual lead cannot receive Messenger replies."
                  : "Aa"
              }
              value={replyText}
              onChange={(event) => setReplyText(event.target.value)}
            />
            <Button
              className="size-11 shrink-0 rounded-full bg-black p-0 text-white hover:bg-zinc-800"
              disabled={
                isSending ||
                !lead ||
                lead.psid.startsWith("manual:") ||
                !replyText.trim()
              }
              onClick={onReply}
              type="button"
            >
              <Send className="size-4" />
            </Button>
          </div>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

function Field({
  children,
  label,
}: {
  children: React.ReactNode;
  label: string;
}) {
  return (
    <label className="grid gap-2 text-sm font-medium text-zinc-950">
      {label}
      {children}
    </label>
  );
}

function LeadAvatar({
  className,
  name,
  src,
}: {
  className?: string;
  name: string;
  src?: string | null;
}) {
  const initials = name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");

  return (
    <div
      className={cn(
        "relative size-11 shrink-0 rounded-full bg-zinc-200",
        className,
      )}
    >
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img alt="" className="size-full rounded-full object-cover" src={src} />
      ) : (
        <div className="flex size-full items-center justify-center rounded-full bg-linear-to-br from-zinc-100 to-zinc-300 text-sm font-bold text-zinc-700">
          {initials || "MG"}
        </div>
      )}
      <span className="absolute -bottom-0.5 -right-0.5 flex size-5 items-center justify-center overflow-hidden rounded-full border-2 border-white bg-white">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          alt=""
          className="size-full object-cover"
          src={MESSENGER_BADGE_ICON_URL}
        />
      </span>
    </div>
  );
}

function TemperaturePill({
  count,
  temperature,
}: {
  count: number;
  temperature: LeadTemperature;
}) {
  return (
    <Badge className={cn("rounded-md", TEMP_STYLES[temperature])}>
      {TEMP_ICONS[temperature]}
      {temperature}: {count}
    </Badge>
  );
}

function getLeadTemperature(lead: LeadRow): LeadTemperature {
  if (!lead.targetDate) return "No date";

  const days = getDaysUntil(lead.targetDate);

  if (days <= 10) return "Hot";
  if (days <= 30) return "Warm";
  return "Cold";
}

function getNights(checkIn: string, checkOut: string) {
  const start = new Date(`${checkIn}T00:00:00`);
  const end = new Date(`${checkOut}T00:00:00`);
  const nights = Math.ceil((end.getTime() - start.getTime()) / 86_400_000);

  return Number.isFinite(nights) ? nights : 0;
}

function parseMoney(value: string) {
  const amount = Number(String(value).replace(/[^\d.-]/g, ""));
  return Number.isFinite(amount) ? amount : 0;
}

function formatPeso(value: number) {
  return `\u20b1${value.toLocaleString("en-PH", {
    maximumFractionDigits: 2,
  })}`;
}

function toDateInput(date: Date) {
  return date.toISOString().slice(0, 10);
}

function getDaysUntil(date: string | null) {
  if (!date) return 0;

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(date);
  target.setHours(0, 0, 0, 0);
  const dayMs = 1000 * 60 * 60 * 24;

  return Math.ceil((target.getTime() - today.getTime()) / dayMs);
}

function formatLeadDate(date: string) {
  return new Date(date).toLocaleDateString("en-US", {
    day: "numeric",
    month: "short",
  });
}

function formatMessengerDate(date: string) {
  return new Date(date).toLocaleString("en-US", {
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    month: "short",
  });
}
