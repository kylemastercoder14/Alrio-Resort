"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  closestCenter,
  DndContext,
  type DragEndEvent,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical } from "lucide-react";
import toast from "react-hot-toast";

import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { useTRPC } from "@/trpc/client";

type SortAmenity = {
  category: string;
  icon: string;
  id: string;
  name: string;
  sortOrder: number;
};

export function AmenitySortOrder() {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const amenities = useQuery({
    ...trpc.resort.amenities.list.queryOptions(),
    retry: false,
  });
  const [localItems, setLocalItems] = useState<SortAmenity[] | null>(null);
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );
  const reorderAmenities = useMutation(
    trpc.resort.amenities.reorder.mutationOptions({
      onSuccess: async () => {
        await queryClient.invalidateQueries(
          trpc.resort.amenities.list.queryFilter(),
        );
        setLocalItems(null);
        toast.success("Amenity sort order saved.");
      },
      onError: (error) => {
        setLocalItems(null);
        toast.error(error.message);
      },
    }),
  );
  const queryItems = useMemo(
    () =>
      (amenities.data ?? []).map((amenity) => ({
        category: amenity.category,
        icon: amenity.icon,
        id: amenity.id,
        name: amenity.name,
        sortOrder: amenity.sortOrder,
      })),
    [amenities.data],
  );
  const items = localItems ?? queryItems;

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;

    if (!over || active.id === over.id) {
      return;
    }

    setLocalItems((currentItems) => {
      const current = currentItems ?? queryItems;
      const oldIndex = current.findIndex((item) => item.id === active.id);
      const newIndex = current.findIndex((item) => item.id === over.id);

      if (oldIndex === -1 || newIndex === -1) {
        return current;
      }

      const nextItems = arrayMove(current, oldIndex, newIndex);

      reorderAmenities.mutate({
        items: nextItems.map((item, index) => ({
          id: item.id,
          sortOrder: index + 1,
        })),
      });

      return nextItems.map((item, index) => ({
        ...item,
        sortOrder: index + 1,
      }));
    });
  }

  return (
    <Card className="gap-4 rounded-xl border-zinc-200 bg-white p-4">
      <div>
        <h2 className="text-sm font-bold text-zinc-950">Sort order</h2>
        <p className="mt-1 text-xs font-medium text-zinc-500">
          Drag amenities to control guest-facing display order.
        </p>
      </div>

      {amenities.isPending ? (
        <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <Skeleton key={index} className="h-14 w-full rounded-lg" />
          ))}
        </div>
      ) : items.length ? (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={items.map((item) => item.id)}
            strategy={verticalListSortingStrategy}
          >
            <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-4">
              {items.map((item) => (
                <SortableAmenityItem
                  key={item.id}
                  item={item}
                  disabled={reorderAmenities.isPending}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      ) : (
        <p className="rounded-lg border border-dashed border-zinc-200 p-4 text-sm text-zinc-500">
          Create amenities to manage display order.
        </p>
      )}
    </Card>
  );
}

function SortableAmenityItem({
  disabled,
  item,
}: {
  disabled: boolean;
  item: SortAmenity;
}) {
  const {
    attributes,
    isDragging,
    listeners,
    setNodeRef,
    transform,
    transition,
  } = useSortable({
    disabled,
    id: item.id,
  });

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
      }}
      className={cn(
        "flex items-center gap-3 rounded-lg border border-zinc-200 bg-white p-3 shadow-xs",
        isDragging && "z-10 opacity-80 shadow-lg",
      )}
    >
      <button
        type="button"
        className="cursor-grab rounded-md p-1 text-zinc-500 hover:bg-zinc-100 active:cursor-grabbing"
        {...attributes}
        {...listeners}
      >
        <GripVertical className="size-4" />
      </button>
      <span className="flex size-8 items-center justify-center rounded-lg bg-zinc-100 text-lg">
        {item.icon}
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-bold text-zinc-950">{item.name}</p>
        <p className="truncate text-xs font-medium text-zinc-500">
          {item.category}
        </p>
      </div>
      <span className="text-xs font-bold text-zinc-500">#{item.sortOrder}</span>
    </div>
  );
}
