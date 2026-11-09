"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useQuery } from "@tanstack/react-query";

import { Button } from "@/components/ui/button";
import { canAccessResortPath } from "@/lib/resort-permissions";
import { useTRPC } from "@/trpc/client";

export function ResortPermissionGuard({
  children,
}: {
  children: React.ReactNode;
}) {
  const trpc = useTRPC();
  const pathname = usePathname();
  const profile = useQuery({
    ...trpc.auth.profile.queryOptions(),
    retry: false,
  });

  if (profile.isLoading) {
    return null;
  }

  if (!canAccessResortPath(profile.data?.permissions, pathname)) {
    return (
      <div className="flex min-h-[calc(100dvh-8rem)] items-center justify-center">
        <div className="max-w-sm rounded-xl border border-zinc-200 bg-white p-6 text-center shadow-xs">
          <h1 className="text-lg font-bold text-zinc-950">Access unavailable</h1>
          <p className="mt-2 text-sm text-zinc-500">
            Your workspace role does not include permission for this page.
          </p>
          <Button asChild className="mt-5" size="sm">
            <Link href="/resort/dashboard">Go to dashboard</Link>
          </Button>
        </div>
      </div>
    );
  }

  return children;
}
