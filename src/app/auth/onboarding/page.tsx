import { redirect } from "next/navigation";
import { getAppRedirectPath } from "@/lib/auth-redirect";
import { getCurrentAppUser } from "@/lib/current-app-user";
import { OnboardingView } from "./_components/onboarding-view";

export default async function Page() {
  const { appUser } = await getCurrentAppUser();

  if (!appUser) {
    redirect("/auth/sign-in");
  }

  if (appUser.role !== "TENANT") {
    redirect(
      getAppRedirectPath({
        role: appUser.role,
        tenantOnboardingStatus: appUser.tenantProfile?.onboardingStatus ?? null,
      }),
    );
  }

  const tenantOnboardingStatus =
    appUser.tenantProfile?.onboardingStatus ?? null;

  if (
    tenantOnboardingStatus !== "PENDING" &&
    tenantOnboardingStatus !== "IN_PROGRESS"
  ) {
    redirect(
      getAppRedirectPath({
        role: appUser.role,
        tenantOnboardingStatus,
      }),
    );
  }

  return <OnboardingView />;
}
