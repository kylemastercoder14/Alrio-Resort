"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ShieldX } from "lucide-react";
import toast from "react-hot-toast";

import { Button } from "@/components/ui/button";
import { authClient } from "@/lib/auth-client";

export default function SuspendedStaffPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const logout = useMutation({
    mutationFn: async () => {
      const result = await authClient.signOut();

      if (result.error) {
        throw new Error(result.error.message ?? "Unable to sign out.");
      }
    },
    onSuccess: () => {
      queryClient.clear();
      router.replace("/auth/sign-in");
      router.refresh();
    },
    onError: (error) => toast.error(error.message),
  });

  return (
    <main className="flex min-h-svh items-center justify-center bg-[#fcfbfa] px-6 py-12">
      <div className="w-full max-w-md text-center">
        <Link
          href="/"
          aria-label="Alrio Private Resort home"
          className="mx-auto block w-fit"
        >
          <Image
            src="/favicon.png"
            alt=""
            width={52}
            height={52}
            className="size-12 object-contain"
            priority
          />
        </Link>
        <div className="mx-auto mt-8 flex size-12 items-center justify-center rounded-full bg-destructive/10 text-destructive">
          <ShieldX className="size-6" aria-hidden="true" />
        </div>
        <h1 className="mt-5 text-2xl font-semibold tracking-tight text-zinc-950">
          Staff access suspended
        </h1>
        <p className="mt-3 text-sm leading-6 text-zinc-600">
          Your Alrio workspace access is currently suspended. Contact a resort
          administrator if you believe this should be restored.
        </p>
        <div className="mt-7 flex flex-col justify-center gap-2 sm:flex-row">
          <Button
            variant="outline"
            onClick={() => {
              router.replace("/resort/dashboard");
              router.refresh();
            }}
          >
            Try again
          </Button>
          <Button
            disabled={logout.isPending}
            onClick={() => logout.mutate()}
          >
            {logout.isPending ? "Signing out..." : "Sign out"}
          </Button>
        </div>
      </div>
    </main>
  );
}
