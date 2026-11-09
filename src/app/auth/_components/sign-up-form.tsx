"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { type FormEvent, useEffect, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckIcon, Eye, EyeOff, XIcon } from "lucide-react";
import { AppleMark, GoogleMark, SocialButton } from "@/components/socials";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { authClient } from "@/lib/auth-client";
import {
  cn,
  getStrengthColor,
  getStrengthText,
  passwordRequirements,
} from "@/lib/utils";
import { useTRPC } from "@/trpc/client";
import toast from "react-hot-toast";
import { useAuthError } from "./auth-toaster";

function LoadingSignUp() {
  return (
    <main className="flex min-h-svh items-center justify-center bg-[#fcfbfa] px-6">
      <p role="status" className="text-sm text-zinc-500">
        Checking your account…
      </p>
    </main>
  );
}

export function SignUpForm({
  invitationToken = null,
}: {
  invitationToken?: string | null;
}) {
  const router = useRouter();
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const sessionRedirect = useQuery(
    trpc.auth.signInRedirect.queryOptions(undefined, {
      staleTime: 0,
      retry: false,
      refetchOnWindowFocus: false,
    }),
  );
  const invitation = useQuery(
    trpc.auth.validateInvitation.queryOptions(
      { token: invitationToken ?? "" },
      { enabled: Boolean(invitationToken), retry: false },
    ),
  );
  const registerGuest = useMutation(
    trpc.auth.registerGuest.mutationOptions({ retry: false }),
  );
  const acceptInvitation = useMutation(
    trpc.auth.acceptInvitation.mutationOptions({ retry: false }),
  );
  const [showPassword, setShowPassword] = useState(false);
  const [password, setPassword] = useState("");
  const createdEmail = useRef<string | null>(null);
  const invitationData = invitation.data?.valid ? invitation.data : null;
  const invitationError =
    invitationToken && invitation.isError
      ? invitation.error.message
      : invitationToken && invitation.data && !invitation.data.valid
        ? invitation.data.reason === "expired"
          ? "Invitation expired."
          : "Invitation invalid."
        : null;
  useAuthError(invitationError, "auth-invitation", invitation.errorUpdatedAt);
  useAuthError(sessionRedirect.error?.message, "auth-session", sessionRedirect.errorUpdatedAt);
  const passwordStrength = passwordRequirements.map((requirement) => ({
    text: requirement.text,
    met: requirement.regex.test(password),
  }));
  const strengthScore = passwordStrength.filter(
    (requirement) => requirement.met,
  ).length;
  const strengthPercent = Math.round(
    (strengthScore / passwordRequirements.length) * 100,
  );

  useEffect(() => {
    if (sessionRedirect.data?.redirectTo)
      router.replace(sessionRedirect.data.redirectTo);
  }, [router, sessionRedirect.data?.redirectTo]);

  const signUp = useMutation({
    retry: false,
    mutationFn: async (input: {
      firstName: string;
      lastName: string;
      email: string;
      password: string;
      username: string;
    }) => {
      if (createdEmail.current !== input.email) {
        const result = await authClient.signUp.email({
          email: input.email,
          password: input.password,
          name: `${input.firstName} ${input.lastName}`.trim(),
        });
        if (result.error)
          throw new Error(result.error.message ?? "Unable to create account.");
        createdEmail.current = input.email;
      }
      if (invitationToken) {
        return acceptInvitation.mutateAsync({
          token: invitationToken,
          firstName: input.firstName,
          lastName: input.lastName,
          username: input.username || undefined,
        });
      }
      return registerGuest.mutateAsync({
        firstName: input.firstName,
        lastName: input.lastName,
      });
    },
    onError: (error) => { toast.error(error.message); },
    onSuccess: async (result) => {
      toast.success(invitationToken ? "Staff account created successfully." : "Your Alrio account has been created.");
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: trpc.auth.session.queryKey(),
        }),
        queryClient.invalidateQueries({
          queryKey: trpc.auth.profile.queryKey(),
        }),
      ]);
      router.replace(result.redirectTo);
      router.refresh();
    },
  });
  const socialSignUp = useMutation({
    retry: false,
    onError: (error) => { toast.error(error.message); },
    mutationFn: async (provider: "google" | "apple") => {
      const result = await authClient.signIn.social({
        provider,
        callbackURL: "/auth/sign-up/complete",
      });
      if (result.error)
        throw new Error(
          result.error.message ?? "Unable to continue with this provider.",
        );
    },
  });
  const isSubmitting = signUp.isPending || socialSignUp.isPending;

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isSubmitting || invitationError || (invitationToken && !invitationData))
      return;
    socialSignUp.reset();
    const data = new FormData(event.currentTarget);
    const passwordValue = String(data.get("password") ?? "");
    if (
      !passwordRequirements.every((requirement) =>
        requirement.regex.test(passwordValue),
      )
    ) {
      toast.error("Please meet all the password requirements.");
      return;
    }
    signUp.mutate({
      firstName: String(data.get("firstName") ?? "").trim(),
      lastName: String(data.get("lastName") ?? "").trim(),
      email: String(data.get("email") ?? "")
        .trim()
        .toLowerCase(),
      password: passwordValue,
      username: String(data.get("username") ?? "").trim(),
    });
  }

  function handleSocialSignUp(provider: "google" | "apple") {
    if (isSubmitting) return;
    signUp.reset();
    socialSignUp.mutate(provider);
  }

  if (sessionRedirect.isPending || sessionRedirect.data?.redirectTo)
    return <LoadingSignUp />;
  if (sessionRedirect.isError) {
    return (
      <main className="flex min-h-svh items-center justify-center bg-[#fcfbfa] px-6">
        <div className="max-w-sm space-y-4 text-center">
          <h1 className="text-xl font-medium">Unable to check your account</h1>
          <Button
            onClick={() => void sessionRedirect.refetch()}
            disabled={sessionRedirect.isFetching}
          >
            Try again
          </Button>
          <Link href="/" className="block text-sm underline">
            Back to Alrio
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-svh bg-[#fcfbfa]">
      <div className="relative grid min-h-svh lg:grid-cols-[52%_48%]">
        <div className="flex min-w-0 flex-col justify-center px-5 py-10 sm:px-10 lg:px-12 lg:py-14 xl:px-20">
          <div className="mx-auto w-full max-w-lg">
            <div className="mb-8">
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
              <h1 className="mt-6 text-2xl font-medium tracking-tight text-muted-foreground">
                {invitationToken
                  ? "Create your staff account"
                  : "Create your Alrio account"}
              </h1>
              <p className="mt-1 text-2xl font-medium tracking-tight text-zinc-900">
                {invitationToken
                  ? "Accept your invitation to join the team."
                  : "Your next resort escape starts here."}
              </p>
            </div>
            {!invitationToken && (
              <>
                <div className="grid grid-cols-2 gap-2">
                  <SocialButton
                    icon={<GoogleMark />}
                    disabled={isSubmitting}
                    onClick={() => handleSocialSignUp("google")}
                  >
                    Google
                  </SocialButton>
                  <SocialButton
                    icon={<AppleMark />}
                    disabled={isSubmitting}
                    onClick={() => handleSocialSignUp("apple")}
                  >
                    Apple
                  </SocialButton>
                </div>
                <div className="my-6 flex items-center gap-4">
                  <div className="h-px flex-1 bg-zinc-200" />
                  <span className="text-xs font-medium text-zinc-500">OR</span>
                  <div className="h-px flex-1 bg-zinc-200" />
                </div>
              </>
            )}
            <form
              onSubmit={handleSubmit}
              aria-busy={isSubmitting}
              className="space-y-4"
            >
              <fieldset
                disabled={
                  isSubmitting || Boolean(invitationToken && !invitationData)
                }
                className="min-w-0 space-y-4 disabled:opacity-60"
              >
                <legend className="sr-only">Account details</legend>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label htmlFor="firstName">First name</Label>
                    <Input
                      id="firstName"
                      name="firstName"
                      required
                      maxLength={100}
                      autoComplete="given-name"
                      placeholder="Your first name"
                      className="h-11 rounded-md border-zinc-300 bg-transparent px-3"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="lastName">Last name</Label>
                    <Input
                      id="lastName"
                      name="lastName"
                      required
                      maxLength={100}
                      autoComplete="family-name"
                      placeholder="Your last name"
                      className="h-11 rounded-md border-zinc-300 bg-transparent px-3"
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="email">Email address</Label>
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    required
                    autoComplete="email"
                    placeholder="Enter your email address"
                    readOnly={Boolean(invitationToken)}
                    {...(invitationToken
                      ? { value: invitationData?.email ?? "" }
                      : {})}
                    className="h-11 rounded-md border-zinc-300 bg-transparent px-3"
                  />
                </div>
                {invitationToken && (
                  <div className="space-y-1.5">
                    <Label htmlFor="username">Username (optional)</Label>
                    <Input
                      id="username"
                      name="username"
                      autoComplete="username"
                      placeholder="Choose a username"
                      className="h-11 rounded-md border-zinc-300 bg-transparent px-3"
                    />
                  </div>
                )}
                <div className="space-y-1.5">
                  <Label htmlFor="password">Password</Label>
                  <div className="relative">
                    <Input
                      id="password"
                      name="password"
                      required
                      minLength={8}
                      type={showPassword ? "text" : "password"}
                      autoComplete="new-password"
                      placeholder="Create a password"
                      value={password}
                      onChange={(event) => setPassword(event.target.value)}
                      className="h-11 rounded-md border-zinc-300 bg-transparent px-3 pr-12 [&::-ms-reveal]:hidden [&::-ms-clear]:hidden"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((value) => !value)}
                      aria-label={
                        showPassword ? "Hide password" : "Show password"
                      }
                      aria-pressed={showPassword}
                      className="absolute right-1 top-1/2 flex size-10 -translate-y-1/2 cursor-pointer items-center justify-center rounded-md text-zinc-400 hover:text-zinc-600 focus-visible:outline-2 focus-visible:outline-offset-1"
                    >
                      {showPassword ? (
                        <EyeOff className="size-4" />
                      ) : (
                        <Eye className="size-4" />
                      )}
                    </button>
                  </div>
                  {password && (
                    <div className="space-y-2 pt-2">
                      <div
                        className="h-1 w-full overflow-hidden rounded-full bg-zinc-200"
                        role="progressbar"
                        aria-label="Password strength"
                        aria-valuemin={0}
                        aria-valuemax={100}
                        aria-valuenow={strengthPercent}
                      >
                        <div
                          className={cn(
                            "h-full rounded-full transition-all",
                            getStrengthColor(strengthScore),
                          )}
                          style={{ width: `${strengthPercent}%` }}
                        />
                      </div>
                      <p className="text-xs text-zinc-500">
                        {getStrengthText(strengthScore)}. Must contain:
                      </p>
                      <ul className="space-y-1">
                        {passwordStrength.map((requirement) => (
                          <li
                            key={requirement.text}
                            className="flex items-center gap-1.5 text-xs"
                          >
                            {requirement.met ? (
                              <CheckIcon
                                className="size-3.5 text-green-700"
                                aria-hidden="true"
                              />
                            ) : (
                              <XIcon
                                className="size-3.5 text-zinc-400"
                                aria-hidden="true"
                              />
                            )}
                            <span
                              className={
                                requirement.met
                                  ? "text-green-700"
                                  : "text-zinc-500"
                              }
                            >
                              {requirement.text}
                              <span className="sr-only">
                                {requirement.met ? " — met" : " — not met"}
                              </span>
                            </span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </fieldset>
              {invitationToken && invitation.isPending && (
                <p role="status" className="text-sm text-zinc-500">
                  Checking your invitation…
                </p>
              )}
              <Button
                type="submit"
                className="h-11 w-full rounded-md"
                disabled={
                  isSubmitting || Boolean(invitationToken && !invitationData)
                }
              >
                {signUp.isPending
                  ? "Creating account…"
                  : socialSignUp.isPending
                    ? "Redirecting…"
                    : "Create account"}
              </Button>
            </form>
            <p className="mt-5 text-center text-xs text-zinc-500 sm:text-sm">
              By continuing, you agree to the{" "}
              <Link
                href="/terms"
                className="underline underline-offset-2 hover:text-zinc-900"
              >
                Terms of Service
              </Link>{" "}
              and{" "}
              <Link
                href="/privacy-policy"
                className="underline underline-offset-2 hover:text-zinc-900"
              >
                Privacy policy
              </Link>
              .
            </p>
            <p className="mt-8 text-center text-sm text-zinc-500">
              Already have an account?{" "}
              <Link
                href="/auth/sign-in"
                className="font-semibold text-black hover:underline"
              >
                Sign in
              </Link>
            </p>
          </div>
        </div>

        <aside
          aria-hidden="true"
          className="pointer-events-none relative hidden min-h-svh overflow-hidden lg:block"
        >
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
