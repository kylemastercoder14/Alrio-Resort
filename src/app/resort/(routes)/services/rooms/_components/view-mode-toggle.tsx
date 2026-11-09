import { Grid2X2, List } from "lucide-react";

import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { type ViewMode } from "./data";

export function ViewModeToggle({
  onChange,
  value,
}: {
  onChange: (value: ViewMode) => void;
  value: ViewMode;
}) {
  return (
    <ToggleGroup
      type="single"
      value={value}
      onValueChange={(nextValue) => {
        if (nextValue === "table" || nextValue === "grid") {
          onChange(nextValue);
        }
      }}
      variant="outline"
      size="sm"
      spacing={0}
      className="h-9"
    >
      <ToggleGroupItem
        value="table"
        aria-label="Show table list"
        className="size-9 p-0"
      >
        <List className="size-4" />
      </ToggleGroupItem>
      <ToggleGroupItem
        value="grid"
        aria-label="Show grid cards"
        className="size-9 p-0"
      >
        <Grid2X2 className="size-4" />
      </ToggleGroupItem>
    </ToggleGroup>
  );
}
