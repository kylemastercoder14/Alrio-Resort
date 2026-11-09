"use client";

import { useRouter } from "next/navigation";
import { type ChangeEvent, useEffect, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  IconBed,
  IconCalendarHeart,
  IconCamera,
  IconClock,
  IconCoffee,
  IconHeart,
  IconLanguage,
  IconMapPin,
  IconMusic,
  IconNotes,
  IconConfetti,
  IconPlus,
  IconSwimming,
  IconToolsKitchen2,
  IconUsers,
  IconX,
} from "@tabler/icons-react";
import toast from "react-hot-toast";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogClose,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { useTRPC } from "@/trpc/client";
import { type GuestProfile } from "@/lib/guest-profile";
import { cn } from "@/lib/utils";
import { useUploadThing } from "@/lib/uploadthing";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { LocationDialog, profileSelectClass } from "./_components/location-dialog";

type DetailKey = Exclude<
  keyof GuestProfile,
  "about" | "interests" | "plans" | "showPlans" | "homeLocation"
>;
const details: { key: DetailKey; label: string; icon: typeof IconHeart }[] = [
  { key: "stayStyle", label: "Your ideal Alrio stay", icon: IconBed },
  {
    key: "visitOccasion",
    label: "What brings you to Alrio",
    icon: IconCalendarHeart,
  },
  { key: "groupType", label: "Who you’re visiting with", icon: IconUsers },
  {
    key: "favoriteActivity",
    label: "Your favorite resort activity",
    icon: IconSwimming,
  },
  {
    key: "preferredSchedule",
    label: "Your preferred time to unwind",
    icon: IconClock,
  },
  {
    key: "diningPreference",
    label: "How you like to dine",
    icon: IconToolsKitchen2,
  },
  {
    key: "celebrationStyle",
    label: "Your celebration plans",
    icon: IconConfetti,
  },
  {
    key: "relaxationStyle",
    label: "Your kind of relaxation",
    icon: IconCoffee,
  },
  { key: "musicPreference", label: "Music for your getaway", icon: IconMusic },
  { key: "languages", label: "Your preferred language", icon: IconLanguage },
  {
    key: "specialRequests",
    label: "Details you’d like us to know",
    icon: IconNotes,
  },
  { key: "location", label: "Where I live", icon: IconMapPin },
];
const detailHints: Record<DetailKey, string> = {
  stayStyle:
    "A daytime dip or an overnight retreat? Tell us how you like to enjoy Alrio.",
  visitOccasion:
    "Share the reason for your visit, whether it’s a family catch-up or a well-earned break.",
  groupType:
    "Tell us a little about your group, from a trip for two to a gathering with friends.",
  favoriteActivity:
    "What do you look forward to at the resort? A swim, shared meals, or simply slowing down?",
  preferredSchedule:
    "Early mornings or relaxed evenings? Let us know when you enjoy taking a break.",
  diningPreference:
    "Describe the meals and dining moments you enjoy sharing during a getaway.",
  celebrationStyle:
    "Have a special occasion in mind? Tell us what you’re looking forward to celebrating.",
  relaxationStyle:
    "Describe what helps you switch off and feel at ease during a resort stay.",
  musicPreference: "Share the sounds or music that suit your ideal getaway.",
  languages:
    "Let us know which language you’re most comfortable using with our team.",
  specialRequests:
    "Leave a helpful preference for your stay. Contact us directly to confirm any arrangements.",
  location:
    "Which city or province will you be traveling from? An exact address isn’t needed.",
};
const preferredTimes = [
  "Early morning (6–9 AM)",
  "Morning (9 AM–12 PM)",
  "Afternoon (12–5 PM)",
  "Evening (5–9 PM)",
  "Flexible",
];
const interestOptions = [
  "Pool time",
  "Family bonding",
  "Outdoor meals",
  "Photography",
  "Shared meals",
  "Music",
  "Evening swims",
  "Quiet mornings",
  "Reading",
  "Group games",
  "Celebrations",
  "Relaxation",
];
const alrioPlans = [
  {
    name: "Poolside break" as const,
    icon: IconSwimming,
    description: "Make room for a refreshing swim.",
  },
  {
    name: "Overnight escape" as const,
    icon: IconBed,
    description: "Slow down and stay a little longer.",
  },
  {
    name: "Family gathering" as const,
    icon: IconUsers,
    description: "Bring your favorite people together.",
  },
  {
    name: "Special celebration" as const,
    icon: IconConfetti,
    description: "Turn an occasion into a shared memory.",
  },
];
type Account = {
  firstName: string;
  lastName: string;
  email: string;
  image: string | null;
  guestProfile: GuestProfile;
};
type Editor = DetailKey | "about" | "name" | "interests" | "plans" | null;

export default function Page() {
  const router = useRouter();
  const trpc = useTRPC();
  const account = useQuery(
    trpc.auth.account.queryOptions(undefined, { retry: false }),
  );
  const unauthorized = account.error?.data?.code === "UNAUTHORIZED";
  useEffect(() => {
    if (unauthorized) router.replace("/auth/sign-in");
  }, [router, unauthorized]);

  if (account.isPending || unauthorized) {
    return (
      <main className="flex min-h-[70svh] items-center justify-center pt-28">
        <p role="status" className="text-sm text-zinc-500">
          Loading your profile…
        </p>
      </main>
    );
  }
  if (account.isError) {
    return (
      <main className="mx-auto min-h-[70svh] max-w-lg space-y-5 px-6 pt-40">
        <h1 className="text-2xl font-medium">Unable to load your profile</h1>
        <p role="alert">{account.error.message}</p>
        <Button onClick={() => void account.refetch()}>Try again</Button>
      </main>
    );
  }
  return <ProfileEditor account={account.data} />;
}

function ProfileEditor({ account }: { account: Account }) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const [profile, setProfile] = useState(account.guestProfile);
  const [firstName, setFirstName] = useState(account.firstName);
  const [lastName, setLastName] = useState(account.lastName);
  const [image, setImage] = useState(account.image);
  const [editor, setEditor] = useState<Editor>(null);
  const [text, setText] = useState("");
  const [editFirst, setEditFirst] = useState("");
  const [editLast, setEditLast] = useState("");
  const [selectedInterests, setSelectedInterests] = useState<string[]>([]);
  const [processingImage, setProcessingImage] = useState(false);
  const upload = useRef<HTMLInputElement>(null);
  const save = useMutation(
    trpc.auth.updateAccount.mutationOptions({
      onSuccess: async () => {
        await Promise.all([
          queryClient.invalidateQueries({
            queryKey: trpc.auth.account.queryKey(),
          }),
          queryClient.invalidateQueries({
            queryKey: trpc.auth.session.queryKey(),
          }),
        ]);
        toast.success("Your profile has been saved.");
      },
      onError: (error) => {
        toast.error(error.message);
      },
    }),
  );
  async function refreshPhoto(photo: string | null) {
    setImage(photo);
    queryClient.setQueryData(trpc.auth.account.queryKey(), (current) =>
      current ? { ...current, image: photo } : current,
    );
    queryClient.setQueryData(trpc.auth.session.queryKey(), (current) =>
      current?.user
        ? { ...current, user: { ...current.user, image: photo } }
        : current,
    );
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: trpc.auth.account.queryKey() }),
      queryClient.invalidateQueries({ queryKey: trpc.auth.session.queryKey() }),
    ]);
  }
  const { startUpload } = useUploadThing("avatarUploader", {
    onClientUploadComplete: async (files) => {
      const photo = files[0]?.serverData?.url;
      if (!photo) {
        toast.error("Unable to confirm your saved photo. Please try again.", {
          id: "avatar-upload",
        });
        return;
      }
      await refreshPhoto(photo);
      toast.success("Your profile photo has been saved.", {
        id: "avatar-upload",
      });
    },
    onUploadError: () => {
      toast.error("Unable to upload your photo. Please try again.", {
        id: "avatar-upload",
      });
    },
  });
  const removeAvatar = useMutation(
    trpc.auth.removeAvatar.mutationOptions({
      onSuccess: async () => {
        await refreshPhoto(null);
        toast.success("Your profile photo has been removed.");
      },
      onError: (error) => {
        toast.error(error.message);
      },
    }),
  );
  const name = [firstName, lastName].filter(Boolean).join(" ") || "Guest";
  const initials =
    `${firstName.trim().charAt(0)}${lastName.trim().charAt(0)}`.toUpperCase() ||
    "G";

  function openEditor(key: Exclude<Editor, null>) {
    setText(
      key === "about"
        ? profile.about
        : key in profile
          ? String(profile[key as DetailKey])
          : "",
    );
    setEditFirst(firstName);
    setEditLast(lastName);
    setSelectedInterests(key === "plans" ? profile.plans : profile.interests);
    setEditor(key);
  }
  function applyEdit() {
    if (!editor) return;
    if (editor === "name") {
      if (!editFirst.trim() || !editLast.trim()) {
        toast.error("Please enter your first and last name.");
        return;
      }
      setFirstName(editFirst.trim());
      setLastName(editLast.trim());
    } else if (editor === "interests") {
      setProfile((current) => ({ ...current, interests: selectedInterests }));
    } else if (editor === "plans") {
      setProfile((current) => ({
        ...current,
        plans: alrioPlans
          .filter((plan) => selectedInterests.includes(plan.name))
          .map((plan) => plan.name),
      }));
    } else {
      setProfile((current) => ({ ...current, [editor]: text.trim() }));
    }
    setEditor(null);
  }
  async function changePhoto(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file || processingImage) return;
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      toast.error("Choose a JPG, PNG, or WebP photo.");
      return;
    }
    if (file.size > 4 * 1024 * 1024) {
      toast.error("Choose a photo smaller than 4 MB.");
      return;
    }
    setProcessingImage(true);
    try {
      await startUpload([file]);
    } catch {
      toast.error("Unable to upload your photo. Please try again.", {
        id: "avatar-upload",
      });
    } finally {
      setProcessingImage(false);
    }
  }

  return (
    <main className="bg-white pt-(--landing-header-height,5rem) text-zinc-900">
      <div className="mx-auto grid max-w-360 gap-12 px-6 pb-20 pt-12 sm:px-10 lg:grid-cols-[320px_minmax(0,1fr)] lg:gap-24 lg:px-14 lg:pt-20">
        <aside className="self-start lg:sticky lg:top-[calc(var(--landing-header-height,5rem)+3rem)]">
          <div className="mx-auto flex max-w-xs flex-col items-center text-center">
            <div className="relative mb-7">
              <Avatar className="size-44 sm:size-56 lg:size-60">
                {image && (
                  <AvatarImage
                    src={image}
                    alt={name}
                    className="object-cover"
                  />
                )}
                <AvatarFallback className="bg-zinc-700 text-[64px] font-medium text-white sm:text-[88px] lg:text-[96px]">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <Button
                variant="outline"
                disabled={
                  processingImage || save.isPending || removeAvatar.isPending
                }
                onClick={() => upload.current?.click()}
                className="absolute -bottom-4 left-1/2 h-10 -translate-x-1/2 gap-2 rounded-full border-0 bg-white px-5 text-base shadow-lg hover:bg-zinc-50"
              >
                <IconCamera className="size-4" />
                {processingImage ? "Uploading…" : image ? "Edit" : "Add"}
              </Button>
              <Input
                ref={upload}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={changePhoto}
                className="hidden"
                aria-label="Upload profile photo"
              />
            </div>
            <Button
              variant="link"
              onClick={() => openEditor("name")}
              className="h-auto text-lg font-medium text-zinc-900"
            >
              {name}
            </Button>
            <p className="mt-1 max-w-full break-all text-sm text-zinc-500">
              {account.email}
            </p>
            {image && (
              <Button
                variant="link"
                size="sm"
                onClick={() => removeAvatar.mutate()}
                disabled={
                  processingImage || save.isPending || removeAvatar.isPending
                }
                className="mt-1 text-zinc-500"
              >
                {removeAvatar.isPending ? "Removing…" : "Remove photo"}
              </Button>
            )}
          </div>
        </aside>

        <div className="min-w-0">
          <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
            My profile
          </h1>
          <p className="mt-7 max-w-3xl text-base leading-7 text-zinc-500">
            A little about you, a stay that feels like yours. Save your
            preferences and getaway ideas for your next visit to Alrio Private
            Resort.
          </p>
          <div className="mt-7 grid gap-x-14 sm:grid-cols-2">
            {details.map(({ key, label, icon: Icon }) => (
              <button
                key={key}
                type="button"
                onClick={() => openEditor(key)}
                className="flex min-h-20 min-w-0 items-center gap-4 cursor-pointer rounded-xl border-b border-zinc-200 px-4 py-5 text-left transition-colors hover:border-transparent hover:bg-accent focus-visible:border-transparent focus-visible:bg-accent focus-visible:outline-2 focus-visible:outline-offset-4"
              >
                <Icon
                  className="size-6 shrink-0"
                  strokeWidth={2}
                  aria-hidden="true"
                />
                <span className="min-w-0">
                  <span
                    className={cn(
                      "block text-lg",
                      profile[key] ? "text-zinc-900" : "text-zinc-500",
                    )}
                  >
                    {profile[key] || label}
                  </span>
                  {profile[key] && (
                    <span className="mt-1 block text-xs text-zinc-500">
                      {label}
                    </span>
                  )}
                </span>
              </button>
            ))}
          </div>

          <section className="border-b border-zinc-200 py-12">
            <h2 className="text-2xl font-semibold tracking-tight">
              A note for your stay
            </h2>
            <button
              type="button"
              onClick={() => openEditor("about")}
              className="mt-7 block w-full rounded-xl border border-dashed border-zinc-400 p-5 text-left hover:bg-accent focus-visible:outline-2 focus-visible:outline-offset-4"
            >
              <span className="block whitespace-pre-wrap text-base leading-7 text-zinc-500">
                {profile.about ||
                  "Tell us what makes a getaway feel right for you—quiet mornings, time with family, or a reason to celebrate."}
              </span>
              <span className="mt-1 block text-base font-medium underline underline-offset-4">
                {profile.about ? "Update your note" : "Add a personal note"}
              </span>
            </button>
          </section>

          <section className="border-b border-zinc-200 py-12">
            <div className="flex items-start justify-between gap-6">
              <div>
                <h2 className="text-2xl font-semibold tracking-tight">
                  Your next Alrio escape
                </h2>
                <p className="mt-1 text-sm leading-6 text-zinc-500">
                  Keep a few getaway ideas ready for your next visit. Dates and
                  inclusions are confirmed when you reserve.
                </p>
              </div>
              <Switch
                checked={profile.showPlans}
                onCheckedChange={(checked) =>
                  setProfile((current) => ({ ...current, showPlans: checked }))
                }
                aria-label="Include getaway ideas in my profile"
                className="mt-1"
              />
            </div>
            <div
              className={cn(
                "mt-8 grid grid-cols-2 gap-4",
                !profile.showPlans && "opacity-40",
              )}
            >
              {alrioPlans.map(({ name: planName, icon: Icon, description }) => (
                <div
                  key={planName}
                  className={cn(
                    "rounded-2xl border p-5",
                    profile.plans.includes(planName) && profile.showPlans
                      ? "border-zinc-700 bg-accent"
                      : "border-zinc-200",
                  )}
                >
                  <Icon className="mb-4 size-7 text-zinc-700" stroke={1.5} />
                  <h3 className="text-sm font-medium">{planName}</h3>
                  <p className="mt-2 text-xs leading-5 text-zinc-500">
                    {description}
                  </p>
                </div>
              ))}
            </div>
            <Button
              variant="secondary"
              disabled={!profile.showPlans}
              onClick={() => openEditor("plans")}
              className="mt-8 h-12 rounded-lg px-6"
            >
              Choose your getaway ideas
            </Button>
          </section>

          <section className="border-b border-zinc-200 py-12">
            <h2 className="text-2xl font-semibold tracking-tight">
              Little things you enjoy
            </h2>
            <p className="mt-1 text-sm leading-6 text-zinc-500">
              Add the things you enjoy, from a poolside afternoon to a family
              celebration.
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              {profile.interests.length
                ? profile.interests.map((interest) => (
                    <Badge
                      key={interest}
                      variant="secondary"
                      className="rounded-full px-5 py-5 text-base font-normal"
                    >
                      {interest}
                    </Badge>
                  ))
                : [0, 1, 2].map((index) => (
                    <Button
                      key={index}
                      variant="outline"
                      aria-label="Choose a getaway favorite"
                      onClick={() => openEditor("interests")}
                      className="h-11 w-24 rounded-full border-dashed border-zinc-400 bg-transparent text-zinc-500 shadow-none"
                    >
                      <IconPlus className="size-5" />
                    </Button>
                  ))}
            </div>
            <Button
              variant="secondary"
              onClick={() => openEditor("interests")}
              className="mt-8 h-12 rounded-lg px-6"
            >
              {profile.interests.length
                ? "Update your favorites"
                : "Choose your favorites"}
            </Button>
          </section>
        </div>
      </div>

      <div className="sticky bottom-0 z-1150 border-t border-zinc-200 bg-white/95 px-6 py-4 backdrop-blur-sm sm:px-10">
        <div className="mx-auto flex max-w-332 justify-end">
          <Button
            disabled={
              save.isPending || processingImage || removeAvatar.isPending
            }
            onClick={() =>
              save.mutate({ firstName, lastName, guestProfile: profile })
            }
            className="h-12 rounded-lg px-7 text-base"
          >
            {save.isPending ? "Saving…" : "Save profile"}
          </Button>
        </div>
      </div>

      <Dialog
        open={editor !== null && editor !== "location"}
        onOpenChange={(open) => {
          if (!open) setEditor(null);
        }}
      >
        <DialogContent
          showCloseButton={false}
          className="flex max-h-[90svh] flex-col gap-0 overflow-hidden rounded-[2rem] p-0 sm:max-w-177.5 sm:rounded-[2.5rem]"
        >
          <DialogClose asChild>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              aria-label="Close dialog"
              className="absolute left-5 top-5 rounded-full sm:left-6 sm:top-6"
            >
              <IconX className="size-5" />
            </Button>
          </DialogClose>
          <DialogHeader className="shrink-0 gap-2 px-6 pb-8 pt-20 text-left sm:px-8">
            <DialogTitle className="text-2xl font-semibold tracking-tighter">
              {editor === "name"
                ? "Your name"
                : editor === "about"
                  ? "A note for your stay"
                  : editor === "interests"
                    ? "Little things you enjoy"
                    : editor === "plans"
                      ? "Plan your kind of escape"
                      : details.find((field) => field.key === editor)?.label}
            </DialogTitle>
            <DialogDescription className="text-base text-zinc-500">
              {editor === "interests"
                ? "Choose up to 10 things that make a getaway memorable for you."
                : editor === "plans"
                  ? "Select the experiences you’d like to plan for a future visit."
                  : editor === "name"
                    ? "Use the name you’d like our Alrio team to know you by."
                    : editor === "about"
                      ? "Share the little things that make a resort stay feel special to you."
                      : editor
                        ? detailHints[editor]
                        : ""}
            </DialogDescription>
          </DialogHeader>
          <form
            onSubmit={(event) => {
              event.preventDefault();
              applyEdit();
            }}
            className="flex min-h-0 flex-1 flex-col"
          >
            <div className="min-h-0 space-y-5 overflow-y-auto overscroll-contain px-6 pb-9 sm:px-8">
              {editor === "name" ? (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="profile-first">First name</Label>
                    <Input
                      id="profile-first"
                      value={editFirst}
                      onChange={(event) => setEditFirst(event.target.value)}
                      required
                      maxLength={100}
                      autoComplete="given-name"
                      minLength={1}
                      aria-describedby="profile-first-count"
                      className="h-14 rounded-xl border-zinc-400 px-4 text-base shadow-none"
                    />
                    <CharacterCount
                      id="profile-first-count"
                      value={editFirst}
                      limit={100}
                      minimum={1}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="profile-last">Last name</Label>
                    <Input
                      id="profile-last"
                      value={editLast}
                      onChange={(event) => setEditLast(event.target.value)}
                      required
                      maxLength={100}
                      autoComplete="family-name"
                      minLength={1}
                      aria-describedby="profile-last-count"
                      className="h-14 rounded-xl border-zinc-400 px-4 text-base shadow-none"
                    />
                    <CharacterCount
                      id="profile-last-count"
                      value={editLast}
                      limit={100}
                      minimum={1}
                    />
                  </div>
                </>
              ) : editor === "plans" ? (
                <div className="grid gap-3">
                  {alrioPlans.map((plan) => (
                    <Button
                      key={plan.name}
                      type="button"
                      variant={
                        selectedInterests.includes(plan.name)
                          ? "default"
                          : "outline"
                      }
                      aria-pressed={selectedInterests.includes(plan.name)}
                      className="h-auto justify-start gap-3 rounded-xl px-5 py-4 text-base"
                      onClick={() =>
                        setSelectedInterests((current) =>
                          current.includes(plan.name)
                            ? current.filter((item) => item !== plan.name)
                            : [...current, plan.name],
                        )
                      }
                    >
                      <plan.icon className="size-5" />
                      {plan.name}
                    </Button>
                  ))}
                </div>
              ) : editor === "interests" ? (
                <div className="flex flex-wrap gap-2">
                  {[...new Set([...interestOptions, ...profile.interests])].map(
                    (interest) => (
                      <Button
                        key={interest}
                        type="button"
                        variant={
                          selectedInterests.includes(interest)
                            ? "default"
                            : "outline"
                        }
                        aria-pressed={selectedInterests.includes(interest)}
                        className="h-12 rounded-full px-5 text-base"
                        onClick={() =>
                          setSelectedInterests((current) =>
                            current.includes(interest)
                              ? current.filter((item) => item !== interest)
                              : current.length < 10
                                ? [...current, interest]
                                : current,
                          )
                        }
                      >
                        {interest}
                      </Button>
                    ),
                  )}
                </div>
              ) : editor === "preferredSchedule" ? (
                <div className="space-y-3 mt-1">
                  <Label htmlFor="preferred-time" className="sr-only">Preferred time</Label>
                  <Select value={text || "no-preference"} onValueChange={(value) => setText(value === "no-preference" ? "" : value)}>
                    <SelectTrigger id="preferred-time" className={profileSelectClass}>
                      <SelectValue placeholder="Choose your preferred time" />
                    </SelectTrigger>
                    <SelectContent position="popper">
                      <SelectItem value="no-preference">No preference</SelectItem>
                      {text && !preferredTimes.includes(text) && <SelectItem value={text}>{text}</SelectItem>}
                      {preferredTimes.map((time) => <SelectItem key={time} value={time}>{time}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <p className="text-sm text-zinc-500">This preference does not set or confirm your check-in time.</p>
                </div>
              ) : (
                <div className="space-y-2 mt-1">
                  <Label htmlFor="profile-detail" className="sr-only">
                    {editor === "about"
                      ? "Your personal note"
                      : "Your preference"}
                  </Label>
                  {editor === "about" ? (
                    <Textarea
                      id="profile-detail"
                      value={text}
                      onChange={(event) => setText(event.target.value)}
                      rows={5}
                      maxLength={1000}
                      placeholder="What would make your next Alrio stay memorable?"
                      aria-describedby="profile-detail-count"
                      className="min-h-35 resize-y rounded-xl border-zinc-400 px-4 py-4 text-base shadow-none md:text-lg"
                    />
                  ) : (
                    <Input
                      id="profile-detail"
                      value={text}
                      onChange={(event) => setText(event.target.value)}
                      maxLength={150}
                      placeholder={
                        editor
                          ? details.find((field) => field.key === editor)?.label
                          : ""
                      }
                      aria-describedby="profile-detail-count"
                      className="h-14 rounded-xl border-zinc-400 px-4 text-lg! shadow-none sm:h-16"
                    />
                  )}
                  <CharacterCount
                    id="profile-detail-count"
                    value={text}
                    limit={editor === "about" ? 1000 : 150}
                  />
                </div>
              )}
              {(editor === "interests" || editor === "plans") && (
                <p
                  className="text-right text-sm text-zinc-500"
                  aria-live="polite"
                >
                  <strong className="font-semibold">
                    {selectedInterests.length}
                  </strong>{" "}
                  of {editor === "plans" ? 4 : 10} selected
                </p>
              )}
            </div>
            <div className="flex shrink-0 items-center justify-end gap-5 border-t border-zinc-200 px-6 py-5 sm:px-8">
              <Button
                type="submit"
                className="h-12 min-w-28 rounded-xl px-5 text-base sm:min-w-35"
              >
                Save changes
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
      {editor === "location" && (
        <LocationDialog
          initial={profile.homeLocation}
          onClose={() => setEditor(null)}
          onSave={(location) => {
            setProfile((current) => ({
              ...current,
              homeLocation: location,
              location: [location.cityName, location.provinceName ?? location.regionName].join(", ").slice(0, 150),
            }));
            setEditor(null);
          }}
        />
      )}
    </main>
  );
}

function CharacterCount({
  id,
  value,
  limit,
  minimum = 0,
}: {
  id: string;
  value: string;
  limit: number;
  minimum?: number;
}) {
  return (
    <div
      id={id}
      className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 pt-1 text-xs text-zinc-500 sm:text-sm"
    >
      <span>
        {minimum
          ? `Minimum ${minimum} character${minimum === 1 ? "" : "s"}`
          : "Optional"}{" "}
        · maximum {limit}
      </span>
      <span aria-live="polite" aria-atomic="true">
        <strong className="font-semibold">
          {Math.max(0, limit - value.length)}
        </strong>{" "}
        characters available
      </span>
    </div>
  );
}
