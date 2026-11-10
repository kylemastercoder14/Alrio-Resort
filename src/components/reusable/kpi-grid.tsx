import type { ReactNode } from "react";

import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export type KpiGridItem = {
  icon?: ReactNode;
  note?: string;
  title: string;
  value: ReactNode;
};

export type KpiGridProps = {
  className?: string;
  columnsClassName?: string;
  items: KpiGridItem[];
};

export function KpiGrid({
  className,
  columnsClassName = "sm:grid-cols-2 xl:grid-cols-4",
  items,
}: KpiGridProps) {
  return (
    <section className={cn("grid gap-4", columnsClassName, className)}>
      {items.map((item) => (
        <Card
          key={item.title}
          className="min-h-24 min-w-0 rounded-xl border-zinc-200 bg-white px-4 py-4"
        >
          <div className="flex h-full items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="w-fit border-b border-dotted border-zinc-400 text-xs font-bold text-zinc-700">
                {item.title}
              </p>
              <div className="mt-2 wrap-break-word text-2xl font-bold tracking-tight text-zinc-950">
                {item.value}
              </div>
              {item.note ? (
                <p className="mt-1 text-xs font-medium text-zinc-500">
                  {item.note}
                </p>
              ) : null}
            </div>
            {item.icon ? (
              <div className="shrink-0 rounded-lg border border-zinc-200 bg-zinc-50 p-2 text-zinc-600">
                {item.icon}
              </div>
            ) : null}
          </div>
        </Card>
      ))}
    </section>
  );
}
