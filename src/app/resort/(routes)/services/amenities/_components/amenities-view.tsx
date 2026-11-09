import Link from "next/link";
import { Plus } from "lucide-react";

import { ResortBreadcrumb } from "@/components/resort/resort-breadcrumb";
import { Button } from "@/components/ui/button";
import { AmenityKpi } from "./kpi";
import { MoreActions } from "./more-actions";
import { AmenitySortOrder } from "./sort-order";
import { AmenityTable } from "./table";

export function AmenitiesView() {
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <ResortBreadcrumb />
        <div className="flex items-center gap-2">
          <MoreActions />
          <Button size="xs" asChild>
            <Link href="/resort/services/amenities/create">
              <Plus className="size-4" />
              Add amenity
            </Link>
          </Button>
        </div>
      </div>

      <AmenityKpi />
      <AmenitySortOrder />
      <AmenityTable />
    </div>
  );
}
