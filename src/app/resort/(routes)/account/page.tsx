"use client";

import { useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  IconCamera,
  IconMail,
  IconPencil,
  IconSettingsFilled,
  IconShieldCheck,
  IconUser,
} from "@tabler/icons-react";
import toast from "react-hot-toast";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useUploadThing } from "@/lib/uploadthing";
import { useTRPC } from "@/trpc/client";

const rowClass =
  "flex min-w-0 items-center gap-3 rounded-lg border border-border px-3 py-2.5 text-left text-sm";

export default function ResortAccountPage() {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const account = useQuery(trpc.auth.account.queryOptions());
  const profile = useQuery(trpc.auth.profile.queryOptions());
  const photoInput = useRef<HTMLInputElement>(null);
  const [nameEditorOpen, setNameEditorOpen] = useState(false);

  async function refreshIdentity(message: string) {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: trpc.auth.account.queryKey() }),
      queryClient.invalidateQueries({ queryKey: trpc.auth.session.queryKey() }),
    ]);
    toast.success(message);
  }

  const save = useMutation(
    trpc.auth.updateAccount.mutationOptions({
      onSuccess: async () => {
        setNameEditorOpen(false);
        await refreshIdentity("Your name has been updated.");
      },
      onError: (error) => toast.error(error.message),
    }),
  );
  const remove = useMutation(
    trpc.auth.removeAvatar.mutationOptions({
      onSuccess: () => refreshIdentity("Your profile photo has been removed."),
      onError: (error) => toast.error(error.message),
    }),
  );
  const { startUpload, isUploading } = useUploadThing("avatarUploader", {
    onClientUploadComplete: () =>
      refreshIdentity("Your profile photo has been saved."),
    onUploadError: (error) => {
      toast.error(error.message);
    },
  });

  if (account.isError || profile.isError) {
    return (
      <div className="space-y-3 p-6" role="alert">
        <p>Unable to load your account settings.</p>
        <Button
          variant="outline"
          onClick={() => {
            void account.refetch();
            void profile.refetch();
          }}
        >
          Try again
        </Button>
      </div>
    );
  }
  if (!account.data || !profile.data)
    return (
      <p className="p-6" role="status">
        Loading account settings…
      </p>
    );

  const { firstName, lastName, email, image } = account.data;
  const name = [firstName, lastName].filter(Boolean).join(" ") || "Resort team";
  const initials =
    `${firstName.trim().charAt(0)}${lastName.trim().charAt(0)}`.toUpperCase() ||
    "R";

  return (
    <section className="space-y-5">
      <h1 className="flex items-center gap-2 text-sm font-semibold tracking-tight">
        <IconSettingsFilled className="size-4 shrink-0" aria-hidden="true" />
        Account settings
      </h1>
      <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]">
        <Card size="sm">
          <CardHeader>
            <CardTitle>Profile photo</CardTitle>
            <CardDescription>
              Shown next to your name in the workspace.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col items-center gap-2 pt-2">
            <div className="relative mb-5 w-full max-w-28 sm:max-w-32">
              <Avatar className="aspect-square h-auto w-full rounded-full">
                {image && (
                  <AvatarImage src={image} alt="" className="object-cover" />
                )}
                <AvatarFallback className="bg-zinc-700 text-3xl font-semibold text-white">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <Button
                variant="outline"
                size="sm"
                className="absolute -bottom-4 left-1/2 h-8 -translate-x-1/2 rounded-full border-0 bg-white px-4 text-zinc-900 shadow-lg hover:bg-zinc-50"
                aria-label={
                  isUploading
                    ? "Uploading profile photo"
                    : image
                      ? "Edit profile photo"
                      : "Add profile photo"
                }
                disabled={isUploading || remove.isPending}
                onClick={() => photoInput.current?.click()}
              >
                <IconCamera className="size-4" aria-hidden="true" />
                {isUploading ? "Uploading…" : image ? "Edit" : "Add"}
              </Button>
              <Input
                ref={photoInput}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
                aria-label="Upload profile photo"
                onChange={(event) => {
                  const file = event.currentTarget.files?.[0];
                  event.currentTarget.value = "";
                  if (!file) return;
                  if (
                    !["image/jpeg", "image/png", "image/webp"].includes(
                      file.type,
                    ) ||
                    file.size > 4 * 1024 * 1024
                  ) {
                    toast.error("Choose a JPG, PNG, or WebP photo up to 4 MB.");
                    return;
                  }
                  void startUpload([file]);
                }}
              />
            </div>
            {image && (
              <Button
                variant="ghost"
                size="xs"
                disabled={isUploading || remove.isPending}
                onClick={() => remove.mutate()}
              >
                Remove photo
              </Button>
            )}
          </CardContent>
        </Card>

        <Card size="sm">
          <CardHeader>
            <CardTitle>Account details</CardTitle>
            <CardDescription>
              Your identity and role in the resort workspace.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <Dialog open={nameEditorOpen} onOpenChange={setNameEditorOpen}>
              <DialogTrigger asChild>
                <button
                  type="button"
                  className={`${rowClass} w-full hover:bg-accent`}
                >
                  <IconUser className="size-4 shrink-0" aria-hidden="true" />
                  <span className="min-w-0 flex-1">
                    <span className="block font-medium">Full name</span>
                    <span className="block wrap-break-word text-sm text-zinc-500">
                      {name}
                    </span>
                  </span>
                  <IconPencil
                    className="size-4 shrink-0 text-muted-foreground"
                    aria-hidden="true"
                  />
                </button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Edit your name</DialogTitle>
                  <DialogDescription>
                    This name appears in the resort workspace.
                  </DialogDescription>
                </DialogHeader>
                <form
                  className="space-y-5"
                  onSubmit={(event) => {
                    event.preventDefault();
                    const data = new FormData(event.currentTarget);
                    save.mutate({
                      firstName: String(data.get("firstName") ?? ""),
                      lastName: String(data.get("lastName") ?? ""),
                    });
                  }}
                >
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="resort-first-name">First name</Label>
                      <Input
                        id="resort-first-name"
                        name="firstName"
                        defaultValue={firstName}
                        required
                        maxLength={100}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="resort-last-name">Last name</Label>
                      <Input
                        id="resort-last-name"
                        name="lastName"
                        defaultValue={lastName}
                        required
                        maxLength={100}
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <DialogClose asChild>
                      <Button type="button" variant="outline">
                        Cancel
                      </Button>
                    </DialogClose>
                    <Button type="submit" disabled={save.isPending}>
                      {save.isPending ? "Saving…" : "Save changes"}
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
            <div className={rowClass}>
              <IconMail className="size-4 shrink-0" aria-hidden="true" />
              <div className="min-w-0">
                <p className="font-medium">Sign-in email</p>
                <p className="break-all text-sm text-zinc-500">{email}</p>
              </div>
            </div>
            <div className={rowClass}>
              <IconShieldCheck className="size-4 shrink-0" aria-hidden="true" />
              <div className="min-w-0">
                <p className="font-medium">Workspace role</p>
                <p className="wrap-break-word text-sm text-zinc-500">
                  {profile.data.role}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </section>
  );
}
