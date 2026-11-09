"use client";

import { useState } from "react";
import Link from "next/link";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Edit, Eye, EyeOff, MoreVertical, Trash2 } from "lucide-react";
import toast from "react-hot-toast";

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
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { useTRPC } from "@/trpc/client";
import { type RoomStatus } from "./data";

type RoomRowActionsProps = {
  className?: string;
  room: {
    id: string;
    name: string;
    status: RoomStatus;
  };
  triggerClassName?: string;
};

export function RoomRowActions({
  className,
  room,
  triggerClassName,
}: RoomRowActionsProps) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [statusOpen, setStatusOpen] = useState(false);
  const isAvailable = room.status === "Available";
  const nextStatus: RoomStatus = isAvailable ? "Out of Service" : "Available";
  const detailsHref = `/resort/services/rooms/${room.id}`;
  const updateRoomStatus = useMutation(
    trpc.resort.rooms.updateStatus.mutationOptions({
      onSuccess: async () => {
        await queryClient.invalidateQueries(trpc.resort.rooms.list.queryFilter());
        toast.success("Room status updated.");
      },
      onError: (error) => {
        toast.error(error.message);
      },
    }),
  );
  const deleteRoom = useMutation(
    trpc.resort.rooms.delete.mutationOptions({
      onSuccess: async () => {
        await queryClient.invalidateQueries(trpc.resort.rooms.list.queryFilter());
        toast.success("Room deleted.");
      },
      onError: (error) => {
        toast.error(error.message);
      },
    }),
  );

  return (
    <div className={cn("flex justify-end", className)}>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            aria-label={`Open actions for ${room.name}`}
            className={cn("size-8", triggerClassName)}
          >
            <MoreVertical className="size-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-52">
          <DropdownMenuItem asChild>
            <Link href={detailsHref}>
              <Edit className="size-4" />
              Edit details
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem
            disabled={updateRoomStatus.isPending}
            onSelect={(event) => {
              event.preventDefault();
              setStatusOpen(true);
            }}
          >
            {isAvailable ? (
              <EyeOff className="size-4" />
            ) : (
              <Eye className="size-4" />
            )}
            {isAvailable ? "Mark out of service" : "Mark available"}
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            variant="destructive"
            disabled={deleteRoom.isPending}
            onSelect={(event) => {
              event.preventDefault();
              setDeleteOpen(true);
            }}
          >
            <Trash2 className="size-4" />
            Delete room
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <AlertDialog open={statusOpen} onOpenChange={setStatusOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {isAvailable ? "Mark room out of service?" : "Mark room available?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              Room {room.name} will be marked as {nextStatus.toLowerCase()}.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel size="sm">Cancel</AlertDialogCancel>
            <AlertDialogAction
              size="sm"
              disabled={updateRoomStatus.isPending}
              onClick={() =>
                updateRoomStatus.mutate({
                  id: room.id,
                  status: nextStatus,
                })
              }
            >
              {updateRoomStatus.isPending ? "Saving..." : nextStatus}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete room?</AlertDialogTitle>
            <AlertDialogDescription>
              This removes Room {room.name} and its gallery records.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel size="sm">Cancel</AlertDialogCancel>
            <AlertDialogAction
              size="sm"
              disabled={deleteRoom.isPending}
              onClick={() => deleteRoom.mutate({ id: room.id })}
            >
              {deleteRoom.isPending ? "Deleting..." : "Delete room"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
