"use client";

import Link from "next/link";
import toast from "react-hot-toast";
import { useAuthError } from "@/app/auth/_components/auth-toaster";
import { type FormEvent, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Eye, EyeOff } from "lucide-react";
import { AuthRecoveryLayout } from "@/app/auth/_components/auth-recovery-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { authClient } from "@/lib/auth-client";
import { passwordRequirements } from "@/lib/utils";

export function ResetPasswordForm({ token, invalid }: { token: string | null; invalid: boolean }) {
  const queryClient = useQueryClient();
  const [showPassword, setShowPassword] = useState(false);
  useAuthError(!token || invalid ? "This reset link is missing, invalid, or expired." : null, "auth-reset-link");
  const reset = useMutation({
    retry: false,
    mutationFn: async (newPassword: string) => {
      if (!token) throw new Error("Request a new reset link to continue.");
      const result = await authClient.resetPassword({ token, newPassword });
      if (result.error) throw new Error("Unable to reset your password. The link may have expired or already been used. Request a new link and try again.");
    },
    onError: (error) => { toast.error(error.message); },
    onSuccess: () => {
      queryClient.clear();
      toast.success("Your password has been updated. Sign in with your new password.");
    },
  });

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (reset.isPending) return;
    const password = String(new FormData(event.currentTarget).get("password") ?? "");
    if (!passwordRequirements.every((requirement) => requirement.regex.test(password))) {
      toast.error("Use at least 8 characters, one uppercase letter, and one number.");
      return;
    }
    reset.mutate(password);
  }

  return (
    <AuthRecoveryLayout title="Reset your password" description="Choose a new password for your Alrio account.">
      {reset.isSuccess ? (
        <div role="status" className="space-y-4 rounded-xl border bg-white p-5 text-sm leading-6">
          <p>Your password has been updated. Sign in with your new password to continue.</p>
          <Button asChild className="h-11 w-full rounded-md"><Link href="/auth/sign-in">Sign in</Link></Button>
        </div>
      ) : !token || invalid ? (
        <div className="space-y-4 rounded-xl border bg-white p-5 text-sm leading-6">
          <p>Request a new password reset link to continue.</p>
          <Button asChild className="h-11 w-full rounded-md"><Link href="/auth/forgot-password">Request a new link</Link></Button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-5" aria-busy={reset.isPending}>
          <div className="space-y-1.5">
            <Label htmlFor="password">New password</Label>
            <div className="relative">
              <Input id="password" name="password" required minLength={8} maxLength={128} type={showPassword ? "text" : "password"} autoComplete="new-password" placeholder="Create a new password" disabled={reset.isPending} className="h-11 rounded-md border-zinc-300 bg-transparent px-3 pr-12 [&::-ms-reveal]:hidden [&::-ms-clear]:hidden" />
              <button type="button" disabled={reset.isPending} onClick={() => setShowPassword((value) => !value)} aria-label={showPassword ? "Hide password" : "Show password"} aria-pressed={showPassword} className="absolute right-1 top-1/2 flex size-10 -translate-y-1/2 cursor-pointer items-center justify-center rounded-md text-zinc-400 hover:text-zinc-600 focus-visible:outline-2 focus-visible:outline-offset-1">
                {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
              </button>
            </div>
            <p className="text-xs leading-5 text-zinc-500">At least 8 characters, one uppercase letter, and one number.</p>
          </div>
          <Button type="submit" disabled={reset.isPending} className="h-11 w-full rounded-md">{reset.isPending ? "Updating password…" : "Reset password"}</Button>
          <Link href="/auth/forgot-password" className="block text-center text-sm text-zinc-500 underline underline-offset-2">Request a new reset link</Link>
        </form>
      )}
    </AuthRecoveryLayout>
  );
}
