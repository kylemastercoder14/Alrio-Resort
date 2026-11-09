import { redirect } from "next/navigation";
import { SignUpForm } from "@/app/auth/_components/sign-up-form";

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ invitationToken?: string | string[] }>;
}) {
  // Preserve links issued before staff registration had its own pathname.
  const params = await searchParams;
  const token = (
    Array.isArray(params.invitationToken)
      ? params.invitationToken[0]
      : params.invitationToken
  )?.trim();
  if (token) redirect(`/auth/sign-up/staff/${encodeURIComponent(token)}`);
  return <SignUpForm />;
}
