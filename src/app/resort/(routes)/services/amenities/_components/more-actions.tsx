"use client";

import { useQuery } from "@tanstack/react-query";

import { MoreActions as ReusableMoreActions } from "@/components/reusable/more-actions";
import { useTRPC } from "@/trpc/client";

export function MoreActions() {
  const trpc = useTRPC();
  const amenities = useQuery({
    ...trpc.resort.amenities.list.queryOptions(),
    retry: false,
  });
  const exportRows = (amenities.data ?? []).map((amenity) => ({
    appliesTo: amenity.appliesTo,
    category: amenity.category,
    chargeable: amenity.chargeable ? "Yes" : "No",
    code: amenity.code,
    description: amenity.description,
    featured: amenity.featured ? "Yes" : "No",
    fee: amenity.chargeable
      ? `${formatPesoFee(amenity.feeAmount)} ${amenity.feeUnit}`
      : "--",
    icon: amenity.icon,
    id: amenity.id,
    name: amenity.name,
    showOnBookingPage: amenity.showOnBookingPage ? "Yes" : "No",
    sortOrder: amenity.sortOrder,
    status: amenity.status,
  }));

  return (
    <ReusableMoreActions
      columns={[
        { header: "Amenity", key: "name" },
        { header: "Code", key: "code" },
        { header: "Icon", key: "icon" },
        { header: "Category", key: "category" },
        { header: "Applies To", key: "appliesTo" },
        { header: "Chargeable", key: "chargeable" },
        { header: "Fee", key: "fee" },
        { header: "Booking Visible", key: "showOnBookingPage" },
        { header: "Featured", key: "featured" },
        { header: "Sort Order", key: "sortOrder" },
        { header: "Status", key: "status" },
        { header: "Description", key: "description" },
      ]}
      data={exportRows}
      filename="amenities"
      title="Amenities"
    />
  );
}

function formatPesoFee(value: string) {
  const amount = Number(value);

  if (!Number.isFinite(amount)) {
    return value ? `₱${value}` : "--";
  }

  return `₱${amount.toLocaleString("en-PH")}`;
}
