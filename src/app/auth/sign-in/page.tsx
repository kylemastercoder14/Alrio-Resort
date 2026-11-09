"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { type FormEvent, useEffect, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Eye, EyeOff } from "lucide-react";
import { AppleMark, GoogleMark, SocialButton } from "@/components/socials";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { authClient } from "@/lib/auth-client";
import { useTRPC } from "@/trpc/client";
import toast from "react-hot-toast";
import { useAuthError } from "@/app/auth/_components/auth-toaster";

export default function Page() {
  const router = useRouter();
  const trpc = useTRPC();
  const sessionRedirect = useQuery(trpc.auth.signInRedirect.queryOptions(undefined, {
    staleTime: 0,
    retry: false,
    refetchOnWindowFocus: false,
  }));
  useAuthError(sessionRedirect.error?.message, "auth-session", sessionRedirect.errorUpdatedAt);

  useEffect(() => {
    if (sessionRedirect.data?.redirectTo) {
      router.replace(sessionRedirect.data.redirectTo);
    }
  }, [router, sessionRedirect.data?.redirectTo]);
  const resolveSignInIdentifier = useMutation(
    trpc.auth.resolveSignInIdentifier.mutationOptions(),
  );
  const [showPassword, setShowPassword] = useState(false);
  const signIn = useMutation({
    retry: false,
    mutationFn: async ({ identifier, password }: { identifier: string; password: string }) => {
      const resolved = await resolveSignInIdentifier.mutateAsync({
        identifier,
      });
      // Better Auth owns the credential exchange and secure session cookies.
      const result = await authClient.signIn.email({ email: resolved.email, password });
      if (result.error) {
        throw new Error(result.error.code === "INVALID_EMAIL_OR_PASSWORD"
          ? "Incorrect password. Please try again or reset your password."
          : result.error.message ?? "Unable to sign in. Please try again.");
      }
    },
    onSuccess: () => {
      toast.success("Signed in successfully.");
      // A full server request guarantees the freshly-issued Better Auth cookie
      // is read before resolving the account-specific destination.
      window.location.replace("/auth/sign-in/complete");
    },
    onError: (error) => { toast.error(error.message); },
  });
  const socialSignIn = useMutation({
    retry: false,
    onError: (error) => { toast.error(error.message); },
    mutationFn: async (provider: "google" | "apple") => {
      const result = await authClient.signIn.social({ provider, callbackURL: "/auth/sign-in/complete" });
      if (result.error) throw new Error(result.error.message ?? `Unable to continue with ${provider}.`);
    },
  });
  const isSubmitting = signIn.isPending || socialSignIn.isPending;

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isSubmitting) return;
    socialSignIn.reset();
    const formData = new FormData(event.currentTarget);
    signIn.mutate({
      identifier: String(formData.get("identifier") ?? "").trim(),
      password: String(formData.get("password") ?? ""),
    });
  }

  function handleSocialSignIn(provider: "google" | "apple") {
    if (isSubmitting) return;
    signIn.reset();
    socialSignIn.mutate(provider);
  }

  if (sessionRedirect.isPending || sessionRedirect.data?.redirectTo) {
    return (
      <main className="flex min-h-svh items-center justify-center bg-[#fcfbfa] px-6" aria-busy="true">
        <p role="status" className="text-sm text-zinc-500">Checking your session…</p>
      </main>
    );
  }

  if (sessionRedirect.isError) {
    return (
      <main className="flex min-h-svh items-center justify-center bg-[#fcfbfa] px-6">
        <div className="max-w-sm space-y-4 text-center">
          <h1 className="text-xl font-medium">Unable to check your session</h1>
          <Button onClick={() => void sessionRedirect.refetch()} disabled={sessionRedirect.isFetching}>
            {sessionRedirect.isFetching ? "Checking…" : "Try again"}
          </Button>
          <Link href="/" className="block text-sm underline">Back to Alrio</Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-svh bg-[#fcfbfa]">
      <div className="relative grid min-h-svh lg:grid-cols-[52%_48%]">
        <div className="flex min-w-0 flex-col justify-center px-5 py-10 sm:px-10 lg:px-12 lg:py-14 xl:px-20">
          <div className="mx-auto w-full max-w-lg">
            <div className="mb-5">
              <div className="mb-8 flex flex-col items-start">
                <Link href="/" aria-label="Alrio Private Resort home">
                <Image
                  src="/favicon.png"
                  alt=""
                  width={56}
                  height={56}
                  className="size-11 object-contain"
                  priority
                />
                </Link>
                <h1 className="mt-6 text-2xl font-medium tracking-tight text-zinc-900 sm:text-3xl">
                  Sign in to Alrio Private Resort
                </h1>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <SocialButton
                  icon={<GoogleMark />}
                  disabled={isSubmitting}
                  onClick={() => void handleSocialSignIn("google")}
                >
                  Google
                </SocialButton>
                <SocialButton
                  icon={<AppleMark />}
                  disabled={isSubmitting}
                  onClick={() => void handleSocialSignIn("apple")}
                >
                  Apple
                </SocialButton>
              </div>

              <div className="my-6 flex items-center gap-4">
                <div className="h-px flex-1 bg-zinc-200" />
                <span className="text-xs font-medium text-zinc-500">OR</span>
                <div className="h-px flex-1 bg-zinc-200" />
              </div>

              <form onSubmit={handleSubmit} aria-busy={isSubmitting} className="space-y-4">
                <div className="space-y-1.5">
                  <Label
                    htmlFor="identifier"
                    className="text-sm font-medium text-zinc-950"
                  >
                    Email or username
                  </Label>
                  <Input
                    id="identifier"
                    name="identifier"
                    type="text"
                    placeholder="Enter your email or username"
                    className="h-11 rounded-md border-zinc-300 bg-transparent px-3"
                    autoComplete="username"
                    disabled={isSubmitting}
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label
                      htmlFor="password"
                      className="text-sm font-medium text-zinc-950"
                    >
                      Password
                    </Label>
                    <Link
                      href="/auth/forgot-password"
                      className="text-xs font-medium text-zinc-500 hover:text-zinc-950"
                    >
                      Forgot password?
                    </Link>
                  </div>
                  <div className="relative">
                    <Input
                      id="password"
                      name="password"
                      type={showPassword ? "text" : "password"}
                      placeholder="Enter your password"
                      className="h-11 rounded-md border-zinc-300 bg-transparent px-3 pr-11"
                      autoComplete="current-password"
                      disabled={isSubmitting}
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((value) => !value)}
                      className="absolute inset-y-0 right-0 flex w-10 items-center justify-center text-zinc-400 hover:text-zinc-600"
                      aria-label={
                        showPassword ? "Hide password" : "Show password"
                      }
                      aria-pressed={showPassword}
                      title={showPassword ? "Hide password" : "Show password"}
                    >
                      {showPassword ? (
                        <EyeOff className="size-4" />
                      ) : (
                        <Eye className="size-4" />
                      )}
                    </button>
                  </div>
                </div>


                <Button
                  type="submit"
                  className="h-11 w-full rounded-md"
                  disabled={isSubmitting}
                >
                  {signIn.isPending ? "Signing in..." : socialSignIn.isPending ? "Redirecting..." : "Sign in"}
                </Button>
              </form>

              <p className="mt-5 text-center text-xs leading-6 text-zinc-500 sm:text-sm">
                By continuing, you agree to the{" "}
                <Link href="https://alrioprivateresort.com/legal/terms-of-service" target="_blank" className="underline underline-offset-2 hover:text-zinc-900">
                  Terms of Service
                </Link>{" "}
                and{" "}
                <Link href="https://alrioprivateresort.com/legal/privacy-policy" target="_blank" className="underline underline-offset-2 hover:text-zinc-900">
                  Privacy policy
                </Link>.
              </p>

              <p className="mt-8 text-center text-sm text-zinc-500">
                New to Alrio?{" "}
                <Link
                  href="/auth/sign-up"
                  className="font-semibold text-black hover:underline"
                >
                  Create account
                </Link>
              </p>
            </div>
          </div>
        </div>

        <aside aria-hidden="true" className="pointer-events-none relative hidden min-h-svh overflow-hidden lg:block">
          <Image
            src="/marketing/alrio-churro-gold.png"
            alt=""
            width={1351}
            height={1164}
            sizes="(min-width: 1024px) 100vw, 1px"
            className="absolute -left-20 top-0 h-full w-auto max-w-none"
            priority
          />
          <Image
            src="/marketing/alrio-stacked-showcase.png"
            alt=""
            width={1105}
            height={1422}
            sizes="(min-width: 1600px) 65vw, 85vw"
            className="absolute top-[-4%] left-[7%] h-[112%] w-auto max-w-none"
            priority
          />
        </aside>
      </div>
    </main>
  );
}
