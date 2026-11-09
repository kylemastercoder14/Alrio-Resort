import { ResortBreadcrumb } from "@/components/resort/resort-breadcrumb";
import { GuestKpi } from "./_components/guest-kpi";
import { GuestTable } from "./_components/guest-table";

export default function GuestsPage() {
  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <ResortBreadcrumb />
      </div>
      <GuestKpi />
      <GuestTable />
    </div>
  );
}
