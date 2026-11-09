import Link from "next/link";
import { IconPlus } from "@tabler/icons-react";

import { ResortBreadcrumb } from "@/components/resort/resort-breadcrumb";
import { Button } from "@/components/ui/button";
import { RoleKpi } from "./_components/kpi";
import { RoleTable } from "./_components/role-table";

const Page = () => {
  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <ResortBreadcrumb />
        <Button size="xs" asChild>
          <Link href="/resort/access/roles/create">
            <IconPlus className="size-4" />
            Add role
          </Link>
        </Button>
      </div>
      <RoleKpi />
      <RoleTable />
    </div>
  );
};

export default Page;
