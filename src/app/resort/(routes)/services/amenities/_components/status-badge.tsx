import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { AMENITY_STATUS_STYLE, type AmenityStatus } from "./data";

export function AmenityStatusBadge({ status }: { status: AmenityStatus }) {
  return (
    <Badge
      variant="outline"
      className={cn("rounded-full px-3 py-0.5 text-xs", AMENITY_STATUS_STYLE[status])}
    >
      {status}
    </Badge>
  );
}
