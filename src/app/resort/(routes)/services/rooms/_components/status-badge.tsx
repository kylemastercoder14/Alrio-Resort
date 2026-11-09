import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { ROOM_STATUS_STYLE, type RoomStatus } from "./data";

export function RoomStatusBadge({ status }: { status: RoomStatus }) {
  return (
    <Badge className={cn(ROOM_STATUS_STYLE[status])} variant="outline">
      {status}
    </Badge>
  );
}
