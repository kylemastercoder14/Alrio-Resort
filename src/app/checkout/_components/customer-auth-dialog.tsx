"use client";

import Image from "next/image";
import { type FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation } from "@tanstack/react-query";
import { Eye, EyeOff } from "lucide-react";

import { AppleMark, GoogleMark } from "@/components/socials";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { authClient } from "@/lib/auth-client";
import { useTRPC } from "@/trpc/client";

type AuthMode = "sign-in" | "sign-up";

export function CustomerAuthDialog() {
  const router = useRouter();
  const trpc = useTRPC();
  const registerGuest = useMutation(trpc.auth.registerGuest.mutationOptions());
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [mode, setMode] = useState<AuthMode>("sign-in");
  const [showEmailForm, setShowEmailForm] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [isSocialSubmitting, setIsSocialSubmitting] = useState(false);
  const isSubmitting =
    isSigningIn || registerGuest.isPending || isSocialSubmitting;

  function handleEmailContinue(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setShowEmailForm(true);
  }

  async function handlePasswordSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    const formData = new FormData(event.currentTarget);
    const password = String(formData.get("password") ?? "");

    if (mode === "sign-in") {
      setIsSigningIn(true);
      const result = await authClient.signIn.email({
        email,
        password,
      });
      setIsSigningIn(false);

      if (result.error) {
        setError(result.error.message ?? "Unable to sign in.");
        return;
      }

      setOpen(false);
      router.replace("/");
      router.refresh();
      return;
    }

    const signUpResult = await authClient.signUp.email({
      email,
      password,
      name: email.split("@")[0] || email,
    });

    if (signUpResult.error) {
      setError(signUpResult.error.message ?? "Unable to create account.");
      return;
    }

    try {
      const result = await registerGuest.mutateAsync({});
      router.replace(result.redirectTo);
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "Unable to finish customer account.",
      );
      return;
    }

    setOpen(false);
    router.refresh();
  }

  async function handleSocialSignIn(provider: "google" | "apple") {
    setError(null);
    setIsSocialSubmitting(true);

    const result = await authClient.signIn.social({
      provider,
      callbackURL: mode === "sign-up" ? "/auth/sign-up/complete" : "/auth/sign-in/complete",
    });

    setIsSocialSubmitting(false);

    if (result.error) {
      setError(result.error.message ?? `Unable to continue with ${provider}.`);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="h-13 rounded-2xl bg-sky-600 px-5 text-sm font-semibold hover:bg-sky-700">
          Continue
        </Button>
      </DialogTrigger>
      <DialogContent className="gap-0 rounded-[2rem] p-0 sm:max-w-xl">
        <DialogHeader className="sr-only">
          <DialogTitle>Log in or sign up</DialogTitle>
          <DialogDescription>
            Use a client account to continue booking this resort stay.
          </DialogDescription>
        </DialogHeader>

        <div className="px-8 py-10">
          <div className="flex flex-col items-center text-center">
            <Image
              src="/main/logo-light.png"
              alt="Alrio Private Resort"
              width={56}
              height={56}
              className="h-12 w-auto"
              priority
            />
            <h2 className="mt-6 text-3xl font-semibold tracking-tight">
              Log in or sign up
            </h2>
          </div>

          {!showEmailForm ? (
            <form onSubmit={handleEmailContinue} className="mt-8 space-y-4">
              <Input
                name="email"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="Email address"
                required
                className="h-15 rounded-full border-zinc-500 px-5 text-lg"
              />
              <p className="text-xs text-zinc-600">
                We will use your email to send confirmation code and continue your booking and send
                reservation updates.{" "}
                <a href="#" className="font-semibold text-zinc-950 underline">
                  Privacy Policy
                </a>
              </p>
              <Button
                type="submit"
                className="h-13 w-full rounded-full bg-sky-600 text-lg font-semibold hover:bg-sky-700"
              >
                Continue
              </Button>
            </form>
          ) : (
            <form onSubmit={handlePasswordSubmit} className="mt-8 space-y-4">
              <div className="rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-left">
                <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
                  Email
                </p>
                <p className="mt-1 text-base text-zinc-950">{email}</p>
              </div>
              <div className="grid grid-cols-2 rounded-full bg-zinc-100 p-1 text-sm font-semibold">
                <button
                  type="button"
                  onClick={() => {
                    setMode("sign-in");
                    setError(null);
                  }}
                  className={
                    mode === "sign-in"
                      ? "h-10 rounded-full bg-white text-zinc-950 shadow-sm"
                      : "h-10 rounded-full text-zinc-600"
                  }
                >
                  Sign in
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setMode("sign-up");
                    setError(null);
                  }}
                  className={
                    mode === "sign-up"
                      ? "h-10 rounded-full bg-white text-zinc-950 shadow-sm"
                      : "h-10 rounded-full text-zinc-600"
                  }
                >
                  Sign up
                </button>
              </div>
              <div className="relative">
                <Input
                  name="password"
                  type={showPassword ? "text" : "password"}
                  placeholder={
                    mode === "sign-in"
                      ? "Enter your password"
                      : "Create a password"
                  }
                  required
                  className="h-15 rounded-2xl border-zinc-300 px-5 pr-12 text-base"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((value) => !value)}
                  className="absolute inset-y-0 right-0 grid w-12 place-items-center text-zinc-400 hover:text-zinc-700"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? (
                    <EyeOff className="size-4" />
                  ) : (
                    <Eye className="size-4" />
                  )}
                </button>
              </div>
              <FormError error={error} />
              <Button
                type="submit"
                disabled={isSubmitting}
                className="h-15 w-full rounded-2xl bg-sky-600 text-lg font-semibold hover:bg-sky-700"
              >
                {isSubmitting
                  ? "Please wait..."
                  : mode === "sign-in"
                    ? "Sign in and continue"
                    : "Create account"}
              </Button>
              <button
                type="button"
                onClick={() => {
                  setShowEmailForm(false);
                  setError(null);
                }}
                className="w-full text-sm font-semibold text-zinc-600 underline"
              >
                Use another email
              </button>
            </form>
          )}

          <div className="my-8 flex items-center gap-4">
            <div className="h-px flex-1 bg-zinc-200" />
            <span className="text-sm text-zinc-600">or</span>
            <div className="h-px flex-1 bg-zinc-200" />
          </div>

          <div className="flex justify-center gap-4">
            <SocialIconButton
              label="Continue with Google"
              disabled={isSubmitting}
              onClick={() => void handleSocialSignIn("google")}
            >
              <GoogleMark className="size-5" />
            </SocialIconButton>
            <SocialIconButton
              label="Continue with Apple"
              disabled={isSubmitting}
              onClick={() => void handleSocialSignIn("apple")}
            >
              <AppleMark className="size-5" />
            </SocialIconButton>
          </div>

          <FormError error={!showEmailForm ? error : null} />
        </div>
      </DialogContent>
    </Dialog>
  );
}

function SocialIconButton({
  label,
  disabled,
  onClick,
  children,
}: {
  label: string;
  disabled?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className="grid size-15 place-items-center rounded-2xl border border-zinc-200 bg-white text-zinc-950 transition hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-60"
    >
      {children}
    </button>
  );
}

function FormError({ error }: { error: string | null }) {
  if (!error) return null;

  return (
    <p className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
      {error}
    </p>
  );
}
