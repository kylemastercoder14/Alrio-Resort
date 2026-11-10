"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Database, KeyRound, RefreshCcw, Save, ShieldAlert } from "lucide-react";
import { useMemo, useState } from "react";
import toast from "react-hot-toast";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { BOOTSTRAP_ENVIRONMENT_SETTINGS } from "@/lib/runtime-settings-definitions";
import { useTRPC } from "@/trpc/client";

type Setting = { category: string; configured: boolean; description?: string; key: string; label: string; secret?: boolean; source: "database" | "environment" | "missing" };

export function DeveloperSettingsView() {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const settingsQuery = useQuery(trpc.resort.developerSettings.list.queryOptions());
  const save = useMutation(trpc.resort.developerSettings.save.mutationOptions({
    onSuccess: async (result) => {
      setDrafts({});
      await queryClient.invalidateQueries({ queryKey: trpc.resort.developerSettings.list.queryKey() });
      toast.success(`${result.updated} developer setting${result.updated === 1 ? "" : "s"} saved.`);
    },
    onError: (error) => toast.error(error.message),
  }));
  const groups = useMemo(() => ((settingsQuery.data ?? []) as Setting[]).reduce<Record<string, Setting[]>>((all, setting) => { (all[setting.category] ??= []).push(setting); return all; }, {}), [settingsQuery.data]);
  const dirtyKeys = Object.keys(drafts);

  return <div className="mx-auto w-full max-w-6xl space-y-5 pb-10">
    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between"><div><p className="text-sm font-medium text-muted-foreground">Resort settings</p><h1 className="text-2xl font-semibold tracking-tight">Developer settings</h1><p className="mt-1 max-w-3xl text-sm text-muted-foreground">Securely store runtime integration settings. Saved values are encrypted at rest and override environment fallbacks.</p></div><Button onClick={() => dirtyKeys.length ? save.mutate({ settings: dirtyKeys.map((key) => ({ key, value: drafts[key] ?? "" })) }) : toast("Enter a value before saving.")} disabled={save.isPending} className="shrink-0"><Save /> {save.isPending ? "Saving…" : "Save changes"}</Button></div>
    <div className="rounded-xl border border-amber-300/60 bg-amber-50 p-4 text-sm text-amber-950"><div className="flex gap-3"><ShieldAlert className="mt-0.5 size-5 shrink-0" /><div><p className="font-semibold">Restricted operational access</p><p className="mt-1 text-amber-900/80">Secrets are never returned to the browser after saving. Rotate any credential that was previously shared.</p></div></div></div>
    {settingsQuery.isLoading ? <div className="rounded-xl border bg-card p-8 text-sm text-muted-foreground">Loading developer settings…</div> : null}
    {Object.entries(groups).map(([category, settings]) => <section key={category} className="rounded-xl border bg-card"><div className="flex items-center gap-2 px-5 py-4"><KeyRound className="size-5 text-muted-foreground" /><h2 className="font-semibold">{category}</h2></div><Separator /><div className="grid gap-x-6 gap-y-5 p-5 md:grid-cols-2">{settings.map((setting) => { const hasDraft = Object.hasOwn(drafts, setting.key); return <div key={setting.key} className="space-y-2"><div className="flex min-h-5 items-center justify-between gap-2"><Label htmlFor={setting.key}>{setting.label}</Label><SettingStatus setting={setting} /></div><Input id={setting.key} type={setting.secret ? "password" : "text"} value={drafts[setting.key] ?? ""} placeholder={hasDraft ? "" : setting.configured ? "Saved value is hidden" : "Not configured"} onChange={(event) => setDrafts((current) => ({ ...current, [setting.key]: event.target.value }))} /><div className="flex min-h-5 items-start justify-between gap-3 text-xs text-muted-foreground"><span>{setting.description ?? `Fallback: ${setting.source === "environment" ? "environment variable" : "not set"}.`}</span>{setting.source === "database" ? <button type="button" className="inline-flex shrink-0 items-center gap-1 font-medium text-foreground underline-offset-4 hover:underline" onClick={() => setDrafts((current) => ({ ...current, [setting.key]: "" }))}><RefreshCcw className="size-3" /> Reset</button> : null}</div></div>; })}</div></section>)}
    <section className="rounded-xl border bg-card"><div className="flex items-center gap-2 px-5 py-4"><Database className="size-5 text-muted-foreground" /><h2 className="font-semibold">Bootstrap environment</h2></div><Separator /><div className="divide-y">{BOOTSTRAP_ENVIRONMENT_SETTINGS.map((setting) => <div key={setting.env} className="grid gap-1 px-5 py-4 sm:grid-cols-[minmax(12rem,0.35fr)_1fr]"><p className="font-medium">{setting.label}<span className="mt-1 block font-mono text-xs font-normal text-muted-foreground">{setting.env}</span></p><p className="text-sm text-muted-foreground">{setting.reason}</p></div>)}</div></section>
  </div>;
}

function SettingStatus({ setting }: { setting: Setting }) { if (setting.source === "database") return <Badge variant="secondary">Database</Badge>; if (setting.source === "environment") return <Badge variant="outline">Environment fallback</Badge>; return <Badge variant="destructive">Missing</Badge>; }
