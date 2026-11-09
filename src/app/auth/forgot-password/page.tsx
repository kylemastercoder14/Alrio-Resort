"use client";

import { type FormEvent } from "react";
import toast from "react-hot-toast";
import { useMutation } from "@tanstack/react-query";
import { AuthRecoveryLayout } from "@/app/auth/_components/auth-recovery-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { authClient } from "@/lib/auth-client";

export default function Page() {
  const requestReset = useMutation({
    retry: false,
    onError: (error) => { toast.error(error.message); },
    onSuccess: () => { toast.success("If an account exists for that email, a reset link has been sent. Check your inbox and spam folder."); },
    mutationFn: async (email: string) => {
      // Better Auth owns reset tokens, request limits, and email enumeration protection.
      const result = await authClient.requestPasswordReset({
        email,
        redirectTo: `${window.location.origin}/auth/reset-password`,
      });
      if (result.error) throw new Error("Unable to request a reset link. Please try again later.");
    },
  });

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (requestReset.isPending) return;
    const form = new FormData(event.currentTarget);
    requestReset.mutate(String(form.get("email") ?? "").trim().toLowerCase());
  }

  return (
    <AuthRecoveryLayout title="Forgot your password?" description="Enter the email address linked to your Alrio account and we’ll send you a reset link.">
      {requestReset.isSuccess ? (
        <div role="status" className="space-y-3 rounded-xl border border-zinc-200 bg-white p-5 text-sm leading-6">
          <h2 className="font-medium text-zinc-900">Check your inbox</h2>
          <p className="text-zinc-500">If an account exists for that email, you’ll receive a password reset link. Check your spam folder too.</p>
          <Button variant="outline" onClick={() => requestReset.reset()}>Try another email</Button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-5" aria-busy={requestReset.isPending}>
          <div className="space-y-1.5">
            <Label htmlFor="email">Email address</Label>
            <Input id="email" name="email" type="email" required autoComplete="email" placeholder="Enter your email address" disabled={requestReset.isPending} className="h-11 rounded-md border-zinc-300 bg-transparent px-3" />
          </div>
          <Button type="submit" disabled={requestReset.isPending} className="h-11 w-full rounded-md">{requestReset.isPending ? "Sending link…" : "Send reset link"}</Button>
        </form>
      )}
    </AuthRecoveryLayout>
  );
}
