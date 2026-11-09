import { TRPCError } from "@trpc/server";
import { redirect } from "next/navigation";
import { getServerCaller } from "@/trpc/server";

export default async function Page() {
  let destination: string;
  try {
    const caller = await getServerCaller();
    const result = await caller.auth.resolveRedirect();
    destination = result.redirectTo;
  } catch (error) {
    if (!(error instanceof TRPCError) || !["UNAUTHORIZED", "FORBIDDEN"].includes(error.code)) throw error;
    destination = "/auth/sign-in";
  }
  // Keep redirect outside the catch: Next.js implements it by throwing.
  redirect(destination);
}
