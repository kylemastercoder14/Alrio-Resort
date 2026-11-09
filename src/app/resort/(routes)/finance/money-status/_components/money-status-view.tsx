"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import {
  AlertCircle,
  ChevronRight,
  CreditCard,
  FileText,
  Landmark,
  ReceiptText,
  Wallet,
  WalletCards,
} from "lucide-react";
import {
  IconBellFilled,
  IconBuildingBank,
  IconCashBanknote,
  IconCoin,
  IconWallet,
} from "@tabler/icons-react";

import { KpiGrid, type KpiGridItem } from "@/components/reusable/kpi-grid";
import { ResortBreadcrumb } from "@/components/resort/resort-breadcrumb";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { useTRPC } from "@/trpc/client";

const ACCOUNT_ICONS = {
  "Cash drawer": IconCashBanknote,
  "E-wallet": IconWallet,
  "Operating bank": IconBuildingBank,
  "Petty cash": IconCoin,
} as const;

export function MoneyStatusView() {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const [reconcileOpen, setReconcileOpen] = useState(false);
  const [reconcileAccount, setReconcileAccount] = useState<AccountName>("Operating bank");
  const [countedBalance, setCountedBalance] = useState("");
  const [reconcileNotes, setReconcileNotes] = useState("");
  const financeEntries = useQuery({
    ...trpc.resort.financeEntries.list.queryOptions(),
    retry: false,
  });
  const invoices = useQuery({
    ...trpc.resort.invoices.list.queryOptions(),
    retry: false,
  });
  const isLoading = financeEntries.isPending || invoices.isPending;
  const totals = useMemo(() => {
    const entries = financeEntries.data ?? [];
    const invoiceRows = invoices.data ?? [];
    const balances: Record<AccountName, number> = {
      "Operating bank": 0,
      "Cash drawer": 0,
      "E-wallet": 0,
      "Petty cash": 0,
    };

    entries
      .filter((entry) => entry.status === "Cleared")
      .forEach((entry) => {
        const account = getFinanceAccount(entry);
        const amount = parseMoney(entry.amount);
        balances[account] += entry.type === "Revenue" ? amount : -amount;
      });
    const pendingExpenses = entries
      .filter((entry) => entry.type === "Expense" && entry.status === "Pending")
      .reduce((total, entry) => total + parseMoney(entry.amount), 0);
    const receivables = invoiceRows
      .filter((invoice) => !["Paid", "Void"].includes(invoice.status))
      .reduce((total, invoice) => total + parseMoney(invoice.balanceDue), 0);
    const openDueThisWeek = invoiceRows
      .filter((invoice) => !["Paid", "Void"].includes(invoice.status))
      .filter((invoice) => isWithinDays(invoice.dueDate, 7))
      .reduce((total, invoice) => total + parseMoney(invoice.balanceDue), 0);
    const bankBalance = balances["Operating bank"];
    const cashDrawer = balances["Cash drawer"];
    const eWallet = balances["E-wallet"];
    const pettyCash = balances["Petty cash"];
    const cashOnHand = bankBalance + cashDrawer + eWallet + pettyCash;
    const watchlist = [
      pettyCash < 5000,
      openDueThisWeek > 0,
      pendingExpenses > 0,
    ].filter(Boolean).length;

    return {
      bankBalance,
      cashDrawer,
      cashOnHand,
      eWallet,
      openDueThisWeek,
      pendingExpenses,
      pettyCash,
      receivables,
      watchlist,
    };
  }, [financeEntries.data, invoices.data]);
  const saveReconciliation = useMutation(
    trpc.resort.financeEntries.save.mutationOptions({
      onSuccess: async () => {
        await queryClient.invalidateQueries(trpc.resort.financeEntries.list.queryFilter());
        toast.success("Account balance reconciled.");
        setReconcileOpen(false);
        setCountedBalance("");
        setReconcileNotes("");
      },
      onError: (error) => toast.error(error.message),
    }),
  );
  const value = (content: React.ReactNode) =>
    isLoading ? <Skeleton className="h-8 w-24" /> : content;
  const kpiItems: KpiGridItem[] = [
    {
      title: "Cash on hand",
      value: value(formatPeso(String(totals.cashOnHand))),
      note: "Available operating cash",
      icon: <Wallet className="size-4" />,
    },
    {
      title: "Bank balance",
      value: value(formatPeso(String(totals.bankBalance))),
      note: "Estimated operating bank",
      icon: <Landmark className="size-4" />,
    },
    {
      title: "Receivables",
      value: value(formatPeso(String(totals.receivables))),
      note: "Open invoices",
      icon: <CreditCard className="size-4" />,
    },
    {
      title: "Watchlist",
      value: value(totals.watchlist),
      note: "Needs attention",
      icon: <AlertCircle className="size-4" />,
    },
  ];
  const accounts = [
    ["Operating bank", "Cleared bank movements", formatPeso(String(totals.bankBalance)), getHealthLabel(totals.bankBalance, 10000)],
    ["Cash drawer", "Cleared cash movements", formatPeso(String(totals.cashDrawer)), "Count today"],
    ["E-wallet", "Wallet and QR movements", formatPeso(String(totals.eWallet)), getHealthLabel(totals.eWallet, 3000)],
    ["Petty cash", "Petty-cash movements", formatPeso(String(totals.pettyCash)), getHealthLabel(totals.pettyCash, 5000)],
  ] as const;
  const attentionItems = [
    {
      icon: WalletCards,
      iconClassName: "bg-zinc-100 text-zinc-950",
      title: totals.pettyCash < 5000 ? "Petty cash is below threshold" : "Petty cash is healthy",
      value: `Current balance: ${formatPeso(String(totals.pettyCash))}`,
      valueClassName: "text-zinc-950",
      href: "/resort/finance/revenue-expenses/create",
    },
    {
      icon: FileText,
      iconClassName: "bg-zinc-100 text-zinc-950",
      title: "Open invoices due this week",
      value: `Total amount: ${formatPeso(String(totals.openDueThisWeek))}`,
      valueClassName: "text-zinc-950",
      href: "/resort/invoices/reminders",
    },
    {
      icon: CreditCard,
      iconClassName: "bg-zinc-100 text-zinc-950",
      title: "Pending expense review",
      value: totals.pendingExpenses
        ? `Pending amount: ${formatPeso(String(totals.pendingExpenses))}`
        : "No pending expenses",
      valueClassName: totals.pendingExpenses ? "text-zinc-950" : "text-zinc-500",
      href: "/resort/finance/revenue-expenses",
    },
  ] as const;
  const overview = buildCashOverview(totals);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <ResortBreadcrumb />
        <Button variant="outline" size="xs" onClick={() => setReconcileOpen(true)}>Reconcile</Button>
      </div>
      <KpiGrid columnsClassName="sm:grid-cols-2 xl:grid-cols-4" items={kpiItems} />
      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_340px]">
        <div className="space-y-5">
          <Card className="gap-0 overflow-hidden rounded-xl h-fit border-zinc-200 bg-white p-0">
            <div className="border-b border-zinc-200 px-5 py-4">
              <h2 className="text-base font-bold text-[#303030]">Money accounts</h2>
              <p className="mt-1 text-sm text-zinc-500">Bank, cash, and wallet balances.</p>
            </div>
            {accounts.map(([name, detail, amount, status]) => {
              const Icon = ACCOUNT_ICONS[name as keyof typeof ACCOUNT_ICONS];

              return (
                <div key={name} className="flex items-center justify-between gap-4 border-b border-zinc-200 px-5 py-4 last:border-b-0">
                  <div className="flex items-center gap-3">
                    <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-2 text-zinc-600"><Icon className="size-4" /></div>
                    <div><p className="font-bold text-zinc-950">{name}</p><p className="text-xs font-medium text-zinc-500">{detail}</p></div>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-zinc-950">{isLoading ? <Skeleton className="h-5 w-20" /> : amount}</p>
                    <Badge variant="secondary">{status}</Badge>
                  </div>
                </div>
              );
            })}
          </Card>
          <Card className="rounded-xl bg-accent p-5">
            <div className="flex items-start gap-3">
              <AlertCircle className="mt-0.75 size-4 shrink-0" />
              <div>
                <h3 className="text-sm font-semibold">Daily money check reminder</h3>
                <p className="mt-1 text-xs font-medium text-muted-foreground">
                  Reconcile cash drawer and petty cash before closing shift.
                  Balances are calculated from cleared finance entries. Use
                  Reconcile to record a counted-balance adjustment with an audit trail.
                </p>
              </div>
            </div>
          </Card>
        </div>
        <Card className="gap-4 rounded-2xl border-zinc-200 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <IconBellFilled className="size-4" />
            <h2 className="text-base font-bold text-[#303030]">Attention</h2>
          </div>
          <div className="space-y-3">
            {attentionItems.map((item) => {
              const Icon = item.icon;

              return (
                <Link
                  key={item.title}
                  href={item.href}
                  className="flex w-full items-center gap-3 rounded-xl border border-zinc-200 bg-white p-3 text-left shadow-xs transition hover:bg-zinc-50"
                >
                  <span className={`flex size-9 shrink-0 items-center justify-center rounded-lg ${item.iconClassName}`}>
                    <Icon className="size-4" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-bold text-zinc-900">{item.title}</span>
                    <span className="block truncate text-xs font-semibold">
                      <span className={item.valueClassName}>{isLoading ? "Loading..." : item.value}</span>
                    </span>
                  </span>
                  <ChevronRight className="size-4 shrink-0 text-zinc-500" />
                </Link>
              );
            })}
          </div>

          <div className="rounded-xl border border-zinc-200 p-4">
            <div className="flex items-center gap-1">
              <h3 className="text-sm font-bold text-zinc-950">Cash overview</h3>
              <span className="text-xs font-semibold text-zinc-500">(This month)</span>
            </div>
            <div className="mt-5 grid grid-cols-[120px_minmax(0,1fr)] items-center gap-5">
              <div
                className="relative size-28 rounded-full"
                style={{ background: overview.conicGradient }}
              >
                <div className="absolute inset-8 rounded-full bg-white" />
              </div>
              <div className="space-y-3">
                {overview.items.map((item) => (
                  <div key={item.label} className="grid grid-cols-[12px_minmax(0,1fr)_auto] items-center gap-2 text-xs">
                    <span className={`size-2 rounded-full ${item.color}`} />
                    <span className="truncate font-semibold text-zinc-500">{item.label}</span>
                    <span className="font-bold text-zinc-900">{item.value}</span>
                  </div>
                ))}
              </div>
            </div>
            <Button asChild variant="outline" size="xs" className="mt-5 w-full">
              <Link href="/resort/finance/cash-flow">
              <ReceiptText className="size-4" />
              View financial report
              </Link>
            </Button>
          </div>
        </Card>
      </div>
      <Dialog open={reconcileOpen} onOpenChange={setReconcileOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Reconcile money account</DialogTitle>
            <DialogDescription>
              Enter the verified balance. Alrio will record the difference as a
              cleared adjustment so the change remains traceable.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Account</Label>
              <Select value={reconcileAccount} onValueChange={(value) => setReconcileAccount(value as AccountName)}>
                <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.keys(ACCOUNT_ICONS).map((account) => <SelectItem key={account} value={account}>{account}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="counted-balance">Verified balance</Label>
              <Input id="counted-balance" inputMode="decimal" placeholder="0.00" value={countedBalance} onChange={(event) => setCountedBalance(event.target.value)} />
              <p className="text-xs text-muted-foreground">Current recorded balance: {formatPeso(String(getAccountBalance(totals, reconcileAccount)))}</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="reconcile-notes">Notes</Label>
              <Textarea id="reconcile-notes" placeholder="Cash count reference, bank statement date, or reason for adjustment" value={reconcileNotes} onChange={(event) => setReconcileNotes(event.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setReconcileOpen(false)}>Cancel</Button>
            <Button
              disabled={saveReconciliation.isPending || countedBalance.trim() === ""}
              onClick={() => {
                const normalizedBalance = countedBalance
                  .replace(/,/g, "")
                  .replace(/[^\d.-]/g, "");
                const target = Number(normalizedBalance);
                if (normalizedBalance === "" || !Number.isFinite(target)) {
                  toast.error("Enter a valid verified balance.");
                  return;
                }
                const difference = target - getAccountBalance(totals, reconcileAccount);
                if (Math.abs(difference) < 0.005) {
                  toast.success("The account already matches the verified balance.");
                  setReconcileOpen(false);
                  return;
                }
                saveReconciliation.mutate({
                  amount: Math.abs(difference).toFixed(2),
                  category: `${reconcileAccount} reconciliation`,
                  department: "Finance",
                  description: `Reconciliation adjustment for ${reconcileAccount}`,
                  entryDate: new Date().toISOString().slice(0, 10),
                  notes: reconcileNotes || `Verified balance: ${formatPeso(String(target))}`,
                  source: "Manual entry",
                  status: "Cleared",
                  type: difference > 0 ? "Revenue" : "Expense",
                });
              }}
            >
              {saveReconciliation.isPending ? "Saving..." : "Save reconciliation"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function buildCashOverview(totals: {
  bankBalance: number;
  cashDrawer: number;
  cashOnHand: number;
  eWallet: number;
  receivables: number;
}) {
  const cash = Math.max(totals.cashDrawer, 0);
  const bank = Math.max(totals.bankBalance, 0);
  const receivables = Math.max(totals.receivables, 0);
  const other = Math.max(totals.eWallet, 0);
  const total = cash + bank + receivables + other || 1;
  const cashPct = Math.round((cash / total) * 100);
  const bankPct = Math.round((bank / total) * 100);
  const receivablePct = Math.round((receivables / total) * 100);
  const otherPct = Math.max(0, 100 - cashPct - bankPct - receivablePct);
  const bankEnd = cashPct + bankPct;
  const receivableEnd = bankEnd + receivablePct;

  return {
    conicGradient: `conic-gradient(#000000 0 ${cashPct}%,#3f3f46 ${cashPct}% ${bankEnd}%,#a1a1aa ${bankEnd}% ${receivableEnd}%,#e4e4e7 ${receivableEnd}% 100%)`,
    items: [
      { color: "bg-black", label: "Cash on hand", value: `${cashPct}%` },
      { color: "bg-zinc-700", label: "Bank balance", value: `${bankPct}%` },
      { color: "bg-zinc-400", label: "Receivables", value: `${receivablePct}%` },
      { color: "bg-zinc-200", label: "Other", value: `${otherPct}%` },
    ],
  };
}

function getHealthLabel(amount: number, threshold: number) {
  if (amount < 0) return "Deficit";
  if (amount === 0) return "No balance";
  if (amount < threshold) return "Low";
  return "Healthy";
}

type AccountName = keyof typeof ACCOUNT_ICONS;

function getFinanceAccount(entry: { category: string; description: string; notes?: string | null }): AccountName {
  const text = `${entry.category} ${entry.description} ${entry.notes ?? ""}`.toLowerCase();
  if (text.includes("petty cash")) return "Petty cash";
  if (text.includes("cash drawer") || /\bcash\b/.test(text)) return "Cash drawer";
  if (["e-wallet", "wallet", "gcash", "maya", "qrph", "qr ph"].some((value) => text.includes(value))) return "E-wallet";
  return "Operating bank";
}

function getAccountBalance(totals: { bankBalance: number; cashDrawer: number; eWallet: number; pettyCash: number }, account: AccountName) {
  if (account === "Cash drawer") return totals.cashDrawer;
  if (account === "E-wallet") return totals.eWallet;
  if (account === "Petty cash") return totals.pettyCash;
  return totals.bankBalance;
}

function isWithinDays(value: Date | string, days: number) {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return false;

  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const future = new Date(now);
  future.setDate(future.getDate() + days);

  return date.getTime() >= now.getTime() && date.getTime() <= future.getTime();
}

function parseMoney(value: string) {
  const amount = Number(String(value).replace(/[^\d.-]/g, ""));
  return Number.isFinite(amount) ? amount : 0;
}

function formatPeso(value: string) {
  const amount = parseMoney(value);
  return `\u20b1${amount.toLocaleString("en-PH", { maximumFractionDigits: 2 })}`;
}
