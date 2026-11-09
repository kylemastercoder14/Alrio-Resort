import { redirect } from "next/navigation";

export default function LegacyCheckoutPage() {
  redirect("/search?booking=whole-resort-only");
}
