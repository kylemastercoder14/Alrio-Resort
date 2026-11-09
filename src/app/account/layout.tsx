import type { ReactNode } from "react";
import { LandingHeader } from "@/app/_components/landing-header";
import { LandingFooter } from "@/app/_components/landing-footer";

export default function Layout({ children }: { children: ReactNode }) {
  return (
    <>
      <LandingHeader />
      {children}
      <LandingFooter />
    </>
  );
}
