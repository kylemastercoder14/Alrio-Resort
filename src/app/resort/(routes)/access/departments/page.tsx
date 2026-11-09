import Link from "next/link";
import { IconPlus } from "@tabler/icons-react";

import { ResortBreadcrumb } from "@/components/resort/resort-breadcrumb";
import { Button } from "@/components/ui/button";
import { DepartmentKpi } from "./_components/kpi";
import { MoreActions } from "./_components/more-actions";
import { DepartmentTable } from "./_components/table";

const Page = () => {
  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <ResortBreadcrumb />
        <div className="flex items-center gap-3">
          <MoreActions />
          <Button size="xs" asChild>
            <Link href="/resort/access/departments/create">
              <IconPlus className="size-4" />
              Add department
            </Link>
          </Button>
        </div>
      </div>
      <DepartmentKpi />
      <DepartmentTable />
    </div>
  );
};

export default Page;
