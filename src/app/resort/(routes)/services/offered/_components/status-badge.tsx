import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { SERVICE_STATUS_STYLE, type OfferedServiceStatus } from "./data";

export function ServiceStatusBadge({ status }: { status: OfferedServiceStatus }) {
  return (
    <Badge
      variant="outline"
      className={cn("rounded-full px-3 py-0.5 text-xs", SERVICE_STATUS_STYLE[status])}
    >
      {status}
    </Badge>
  );
}
