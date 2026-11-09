import Link from "next/link";
import { Plus } from "lucide-react";

import { ResortBreadcrumb } from "@/components/resort/resort-breadcrumb";
import { Button } from "@/components/ui/button";
import { ServiceKpi } from "./kpi";
import { MoreActions } from "./more-actions";
import { ServiceTable } from "./table";

export function ServicesOfferedView() {
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <ResortBreadcrumb />
        <div className="flex items-center gap-2">
          <MoreActions />
          <Button size="xs" asChild>
            <Link href="/resort/services/offered/create">
              <Plus className="size-4" />
              Add service
            </Link>
          </Button>
        </div>
      </div>

      <ServiceKpi />
      <ServiceTable />
    </div>
  );
}
