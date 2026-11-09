import { ResortBreadcrumb } from "@/components/resort/resort-breadcrumb";
import { Button } from "@/components/ui/button";
import { IconPlus } from "@tabler/icons-react";
import Link from "next/link";
import { InviteUserDialog } from "./_components/invite-user-dialog";
import { Kpi } from "./_components/kpi";
import { MoreActions } from "./_components/more-actions";
import { UserRoleTable } from "./_components/table";

const Page = () => {
  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <ResortBreadcrumb />
        <div className="flex items-center gap-3">
          <MoreActions />
          <InviteUserDialog />
          <Button
            size="xs"
            asChild
          >
            <Link href="/resort/access/users/create">
              <IconPlus className="size-4" />Add user
            </Link>
          </Button>
        </div>
      </div>
      <Kpi />
      <UserRoleTable />
    </div>
  );
};

export default Page;
