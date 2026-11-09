"use client";

import { useQuery } from "@tanstack/react-query";

import { MoreActions as ReusableMoreActions } from "@/components/reusable/more-actions";
import { useTRPC } from "@/trpc/client";

export function MoreActions() {
  const trpc = useTRPC();
  const services = useQuery({
    ...trpc.resort.services.list.queryOptions(),
    retry: false,
  });
  const exportRows = (services.data ?? []).map((service) => ({
    baseCharge: service.baseCharge,
    billingType: service.billingType,
    bookingLeadTime: service.bookingLeadTime,
    category: service.category,
    code: service.code,
    duration: service.duration,
    provider: service.provider,
    service: service.title,
    status: service.status,
    visible: service.showOnBookingPage ? "Yes" : "No",
  }));

  return (
    <ReusableMoreActions
      columns={[
        { header: "Service", key: "service" },
        { header: "Code", key: "code" },
        { header: "Category", key: "category" },
        { header: "Provider", key: "provider" },
        { header: "Base Charge", key: "baseCharge" },
        { header: "Billing Type", key: "billingType" },
        { header: "Duration", key: "duration" },
        { header: "Lead Time", key: "bookingLeadTime" },
        { header: "Booking Visible", key: "visible" },
        { header: "Status", key: "status" },
      ]}
      data={exportRows}
      filename="services-offered"
      title="Services Offered"
    />
  );
}
