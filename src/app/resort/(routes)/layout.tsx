import { redirect } from "next/navigation";
import { ResortHeader } from "@/components/resort/resort-header";
import { ResortPermissionGuard } from "@/components/resort/resort-permission-guard";
import { ResortSidebar } from "@/components/resort/resort-sidebar";
import { getSignInRedirect } from "@/lib/sign-in-redirect";
import { getCurrentAppUser } from "@/lib/current-app-user";

export default async function ResortRoutesLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const { appUser } = await getCurrentAppUser();

  if (!appUser) {
    redirect("/auth/sign-in");
  }

  if (!appUser.resortProfile && !appUser.staffProfile) redirect("/");
  if (appUser.staffProfile?.status === "SUSPENDED") {
    redirect("/auth/suspended");
  }
  const destination = await getSignInRedirect(appUser.authUserId);
  if (destination !== "/resort/dashboard") redirect(destination ?? "/auth/sign-in");

  return (
    <div className="fixed inset-0 overflow-hidden bg-[#0b0b0b] text-[#303030]">
      <ResortHeader />
      <div className="flex h-[calc(100dvh-4.25rem)] min-h-0 overflow-hidden rounded-tl-2xl bg-[#F1F1F1]">
        <ResortSidebar />
        <main className="h-full min-h-0 min-w-0 flex-1 overflow-y-auto overflow-x-hidden bg-[#F1F1F1] p-3 sm:p-5">
          <ResortPermissionGuard>{children}</ResortPermissionGuard>
        </main>
      </div>
    </div>
  );
}
