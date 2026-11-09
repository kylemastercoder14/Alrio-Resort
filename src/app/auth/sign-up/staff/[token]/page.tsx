import { SignUpForm } from "@/app/auth/_components/sign-up-form";

export default async function Page({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  return <SignUpForm invitationToken={token} />;
}
