"use client";

import { useMemo, useRef, useState, type FormEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  CheckCircle2,
  ClipboardList,
  Clock3,
  Hammer,
  Loader2,
  Plus,
  Send,
  Wrench,
} from "lucide-react";

import { KpiGrid, type KpiGridItem } from "@/components/reusable/kpi-grid";
import { ResortBreadcrumb } from "@/components/resort/resort-breadcrumb";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { useTRPC } from "@/trpc/client";
import toast from "react-hot-toast";

type RequestStatus = "Completed" | "Pending";
type RequestPriority = "Normal" | "Urgent";

type MaintenanceRequest = {
  area: string;
  code: string;
  createdAt: Date | string;
  forwardedBy: string;
  id: string;
  issue: string;
  notes: string;
  priority: RequestPriority;
  requestedAt: string;
  resolution: string;
  roomId: string;
  status: RequestStatus;
};

type RoomOption = {
  id: string;
  roomLabel: string;
};

const PRIORITY_STYLES: Record<RequestPriority, string> = {
  Normal: "border-zinc-200 bg-zinc-100 text-zinc-900",
  Urgent: "border-black bg-black text-white",
};

export function MaintenanceView() {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const createFormRef = useRef<HTMLDivElement | null>(null);
  const requestsQuery = useQuery({
    ...trpc.resort.maintenance.list.queryOptions(),
    retry: false,
  });
  const roomsQuery = useQuery({
    ...trpc.resort.rooms.list.queryOptions(),
    retry: false,
  });
  const createRequest = useMutation(
    trpc.resort.maintenance.create.mutationOptions({
      onSuccess: async () => {
        await queryClient.invalidateQueries(trpc.resort.maintenance.list.queryFilter());
        toast.success("Maintenance request forwarded.");
      },
      onError: (error) => toast.error(error.message),
    }),
  );
  const completeRequest = useMutation(
    trpc.resort.maintenance.complete.mutationOptions({
      onSuccess: async () => {
        await queryClient.invalidateQueries(trpc.resort.maintenance.list.queryFilter());
        toast.success("Maintenance request completed.");
      },
      onError: (error) => toast.error(error.message),
    }),
  );
  const requests = useMemo(
    () => (requestsQuery.data ?? []) as MaintenanceRequest[],
    [requestsQuery.data],
  );
  const roomOptions = useMemo(
    () =>
      (roomsQuery.data ?? []).map((room) => ({
        id: room.id,
        roomLabel: `${room.code} - ${room.name}`,
      })),
    [roomsQuery.data],
  );

  const pendingRequests = requests.filter((request) => request.status === "Pending");
  const completedRequests = requests.filter(
    (request) => request.status === "Completed",
  );

  const kpiItems = useMemo<KpiGridItem[]>(
    () => [
      {
        title: "Pending",
        value: String(pendingRequests.length),
        note: "Waiting for maintenance",
        icon: <Clock3 className="size-4" />,
      },
      {
        title: "Completed",
        value: String(completedRequests.length),
        note: "Resolved today",
        icon: <CheckCircle2 className="size-4" />,
      },
      {
        title: "From reception",
        value: String(requests.length),
        note: "Forwarded requests",
        icon: <Send className="size-4" />,
      },
      {
        title: "Urgent",
        value: String(
          pendingRequests.filter((request) => request.priority === "Urgent").length,
        ),
        note: "Needs immediate action",
        icon: <Wrench className="size-4" />,
      },
    ],
    [completedRequests.length, pendingRequests, requests.length],
  );

  function markDone(id: string) {
    completeRequest.mutate({
      id,
      resolution: "Marked done by maintenance.",
    });
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <ResortBreadcrumb />
        <Button
          onClick={() =>
            createFormRef.current?.scrollIntoView({
              behavior: "smooth",
              block: "start",
            })
          }
          size="xs"
        >
          <Plus className="size-4" />
          New request
        </Button>
      </div>

      <KpiGrid columnsClassName="sm:grid-cols-2 xl:grid-cols-4" items={kpiItems} />

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_370px]">
        <Card className="gap-0! overflow-hidden rounded-xl border-zinc-200 bg-white p-0!">
          <div className="flex items-center justify-between gap-3 border-b border-zinc-200 px-5 py-4">
            <div>
              <h1 className="text-base font-bold text-zinc-950">
                Request queue
              </h1>
              <p className="mt-1 text-sm text-zinc-500">
                Reception forwards, maintenance resolves.
              </p>
            </div>
            <Button size="xs" variant="outline">
              Today
            </Button>
          </div>

          <div className="grid min-h-155 divide-y divide-zinc-200 lg:grid-cols-2 lg:divide-x lg:divide-y-0">
            <RequestColumn
              actionLabel="Mark done"
              actionPending={completeRequest.isPending}
              requests={pendingRequests}
              status="Pending"
              onMarkDone={markDone}
            />
            <RequestColumn requests={completedRequests} status="Completed" />
          </div>
        </Card>

        <aside className="space-y-5">
          <div ref={createFormRef}>
            <ReceptionForwardCard
              isPending={createRequest.isPending}
              onSubmit={(input) => createRequest.mutate(input)}
              rooms={roomOptions}
            />
          </div>
          <ResolutionSummaryCard requests={completedRequests} />
        </aside>
      </div>
    </div>
  );
}

function RequestColumn({
  actionLabel,
  actionPending,
  onMarkDone,
  requests,
  status,
}: {
  actionLabel?: string;
  actionPending?: boolean;
  onMarkDone?: (id: string) => void;
  requests: MaintenanceRequest[];
  status: RequestStatus;
}) {
  return (
    <section className="bg-zinc-50/50 p-4">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Badge
            className={cn(
              "rounded-md",
              status === "Pending"
                ? "border-black bg-black text-white"
                : "border-zinc-200 bg-zinc-100 text-zinc-900",
            )}
            variant="outline"
          >
            {status}
          </Badge>
          <span className="text-xs font-bold text-zinc-500">
            {requests.length}
          </span>
        </div>
      </div>

      <div className="space-y-3">
        {requests.map((request) => (
          <RequestCard
            actionLabel={actionLabel}
            actionPending={actionPending}
            key={request.id}
            request={request}
            onMarkDone={onMarkDone}
          />
        ))}
      </div>
    </section>
  );
}

function RequestCard({
  actionLabel,
  actionPending,
  onMarkDone,
  request,
}: {
  actionLabel?: string;
  actionPending?: boolean;
  onMarkDone?: (id: string) => void;
  request: MaintenanceRequest;
}) {
  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-4 shadow-xs">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="font-bold text-zinc-950">{request.code}</h2>
            <Badge
              className={cn("rounded-md", PRIORITY_STYLES[request.priority])}
              variant="outline"
            >
              {request.priority}
            </Badge>
          </div>
          <p className="mt-2 text-sm font-semibold text-zinc-900">
            {request.issue}
          </p>
        </div>
        <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-2 text-zinc-600">
          <Hammer className="size-4" />
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3 text-xs">
        <Detail label="Area" value={request.area} />
        <Detail label="Forwarded by" value={request.forwardedBy} />
        <Detail label="Requested" value={request.requestedAt} />
        <Detail label="Status" value={request.status} />
      </div>

      {request.resolution ? (
        <div className="mt-4 rounded-lg border border-zinc-200 bg-zinc-50 p-3 text-sm font-medium text-zinc-700">
          {request.resolution}
        </div>
      ) : null}

      {actionLabel && onMarkDone ? (
        <Button
          className="mt-4 w-full"
          disabled={actionPending}
          onClick={() => onMarkDone(request.id)}
          type="button"
        >
          {actionPending ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <CheckCircle2 className="size-4" />
          )}
          {actionLabel}
        </Button>
      ) : null}
    </div>
  );
}

function ReceptionForwardCard({
  isPending,
  onSubmit,
  rooms,
}: {
  isPending: boolean;
  onSubmit: (input: {
    area: string;
    issue: string;
    notes?: string;
    priority: RequestPriority;
    roomId?: string;
  }) => void;
  rooms: RoomOption[];
}) {
  const [area, setArea] = useState("");
  const [issue, setIssue] = useState("");
  const [notes, setNotes] = useState("");
  const [priority, setPriority] = useState<RequestPriority>("Normal");
  const [roomId, setRoomId] = useState("custom");

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!area.trim()) {
      toast.error("Room or area is required.");
      return;
    }

    if (!issue.trim()) {
      toast.error("Issue title is required.");
      return;
    }

    onSubmit({
      area,
      issue,
      notes,
      priority,
      roomId: roomId === "custom" ? undefined : roomId,
    });
    setArea("");
    setIssue("");
    setNotes("");
    setPriority("Normal");
    setRoomId("custom");
  }

  return (
    <Card className="gap-4 rounded-xl border-zinc-200 bg-white p-5">
      <div className="flex items-start gap-3">
        <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-2 text-zinc-700">
          <Send className="size-4" />
        </div>
        <div>
          <h2 className="text-base font-bold text-zinc-950">
            Forward from reception
          </h2>
          <p className="mt-1 text-sm text-zinc-500">
            Replace verbal handoff with a tracked request.
          </p>
        </div>
      </div>

      <form className="grid gap-3" onSubmit={handleSubmit}>
        <div className="space-y-2">
          <Label>Room / area</Label>
          <Select
            onValueChange={(value) => {
              setRoomId(value);
              const selectedRoom = rooms.find((room) => room.id === value);
              if (selectedRoom) {
                setArea(selectedRoom.roomLabel);
              }
            }}
            value={roomId}
          >
            <SelectTrigger className="h-10 w-full rounded-lg">
              <SelectValue placeholder="Select room or area" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="custom">Custom area</SelectItem>
              {rooms.map((room) => (
                <SelectItem key={room.id} value={room.id}>
                  {room.roomLabel}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Area</Label>
          <Input
            className="rounded-lg"
            onChange={(event) => setArea(event.target.value)}
            placeholder="Lobby, pool area, or selected room"
            value={area}
          />
        </div>
        <div className="space-y-2">
          <Label>Issue title</Label>
          <Input
            className="rounded-lg"
            onChange={(event) => setIssue(event.target.value)}
            placeholder="Aircon not cooling"
            value={issue}
          />
        </div>
        <div className="space-y-2">
          <Label>Priority</Label>
          <Select
            onValueChange={(value) => setPriority(value as RequestPriority)}
            value={priority}
          >
            <SelectTrigger className="h-10 w-full rounded-lg">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Normal">Normal</SelectItem>
              <SelectItem value="Urgent">Urgent</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Notes</Label>
          <Textarea
            className="min-h-24 rounded-lg"
            onChange={(event) => setNotes(event.target.value)}
            placeholder="Guest impact, access instruction, observed issue..."
            value={notes}
          />
        </div>

      <Button className="w-full" disabled={isPending} type="submit">
        {isPending ? (
          <Loader2 className="size-4 animate-spin" />
        ) : (
          <ClipboardList className="size-4" />
        )}
        Forward request
      </Button>
      </form>
    </Card>
  );
}

function ResolutionSummaryCard({
  requests,
}: {
  requests: MaintenanceRequest[];
}) {
  return (
    <Card className="gap-4 rounded-xl border-zinc-200 bg-white p-5">
      <div>
        <h2 className="text-base font-bold text-zinc-950">Resolution log</h2>
        <p className="mt-1 text-sm text-zinc-500">
          Simple completion record. Threads deferred.
        </p>
      </div>

      <div className="space-y-3">
        {requests.slice(0, 3).map((request) => (
          <div
            className="flex items-start gap-3 rounded-xl border border-zinc-200 p-3"
            key={request.id}
          >
            <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-2 text-zinc-700">
              <CheckCircle2 className="size-4" />
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-bold text-zinc-950">
                {request.area}
              </p>
              <p className="mt-1 text-xs font-medium text-zinc-500">
                {request.resolution ?? "Marked complete."}
              </p>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="font-bold uppercase text-zinc-500">{label}</p>
      <p className="mt-1 font-semibold text-zinc-900">{value}</p>
    </div>
  );
}
