import { ResetPasswordForm } from "./reset-password-form";

export default async function Page({ searchParams }: {
  searchParams: Promise<{ token?: string | string[]; error?: string | string[] }>;
}) {
  const params = await searchParams;
  return <ResetPasswordForm token={typeof params.token === "string" ? params.token : null} invalid={Boolean(params.error)} />;
}
