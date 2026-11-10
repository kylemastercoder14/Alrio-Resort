"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ImageIcon, Plus, Save, Trash2, X } from "lucide-react";
import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { Button } from "@/components/ui/button";
import {
  Attachment,
  AttachmentContent,
  AttachmentDescription,
  AttachmentMedia,
  AttachmentTitle,
} from "@/components/ui/attachment";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { LandingBranding } from "@/lib/landing-branding";
import { UploadDropzone } from "@/lib/uploadthing";
import { useTRPC } from "@/trpc/client";

export function BrandingSettingsView() {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const brandingQuery = useQuery(trpc.resort.branding.get.queryOptions());
  const [content, setContent] = useState<LandingBranding | null>(null);
  useEffect(() => { if (brandingQuery.data) setContent(brandingQuery.data.content); }, [brandingQuery.data]);
  const save = useMutation(trpc.resort.branding.save.mutationOptions({
    onSuccess: async () => { await queryClient.invalidateQueries({ queryKey: trpc.resort.branding.get.queryKey() }); toast.success("Landing page branding saved."); },
    onError: (error) => toast.error(error.message),
  }));
  if (!content || brandingQuery.isLoading) return <div className="rounded-xl border bg-card p-8 text-sm text-muted-foreground">Loading branding settings…</div>;
  const update = <K extends keyof LandingBranding>(key: K, value: LandingBranding[K]) => setContent((current) => current ? { ...current, [key]: value } : current);

  return <div className="mx-auto w-full max-w-6xl space-y-5 pb-10">
    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between"><div><p className="text-sm font-medium text-muted-foreground">Resort settings</p><h1 className="text-2xl font-semibold tracking-tight">Branding customization</h1><p className="mt-1 max-w-3xl text-sm text-muted-foreground">Manage the public Alrio landing page. Changes to text, photos, and approved Facebook feedback publish after saving.</p></div><Button onClick={() => save.mutate(content)} disabled={save.isPending}><Save /> {save.isPending ? "Saving…" : "Save changes"}</Button></div>
    <section className="grid gap-5 rounded-xl border bg-card p-5 lg:grid-cols-2"><div className="space-y-4"><h2 className="font-semibold">Hero</h2><Field label="Discovery label" value={content.hero.eyebrow} onChange={(value) => update("hero", { ...content.hero, eyebrow: value })}/><Field label="Title" value={content.hero.title} onChange={(value) => update("hero", { ...content.hero, title: value })}/><Field label="Description" value={content.hero.description} multiline onChange={(value) => update("hero", { ...content.hero, description: value })}/><div className="grid gap-4 sm:grid-cols-2"><Field label="Primary button" value={content.hero.primaryCtaLabel} onChange={(value) => update("hero", { ...content.hero, primaryCtaLabel: value })}/><Field label="Secondary button" value={content.hero.secondaryCtaLabel} onChange={(value) => update("hero", { ...content.hero, secondaryCtaLabel: value })}/></div><Field label="Guest trust line" value={content.hero.trustLabel} onChange={(value) => update("hero", { ...content.hero, trustLabel: value })}/></div><ImageField label="Hero image" value={content.hero.imageUrl} onChange={(value) => update("hero", { ...content.hero, imageUrl: value })}/></section>
    <section className="grid gap-5 rounded-xl border bg-card p-5 lg:grid-cols-2"><div className="space-y-4"><h2 className="font-semibold">Reservation panel</h2><Field label="Title" value={content.reserve.title} onChange={(value) => update("reserve", { ...content.reserve, title: value })}/><Field label="Description" value={content.reserve.description} multiline onChange={(value) => update("reserve", { ...content.reserve, description: value })}/></div><ImageField label="Reservation panel background" value={content.reserve.imageUrl} onChange={(value) => update("reserve", { ...content.reserve, imageUrl: value })}/></section>
    <section className="rounded-xl border bg-card p-5"><h2 className="font-semibold">Amenities and gallery</h2><div className="mt-4 grid gap-4 lg:grid-cols-2"><div className="space-y-4"><Field label="Amenities eyebrow" value={content.amenities.eyebrow} onChange={(value) => update("amenities", { ...content.amenities, eyebrow: value })}/><Field label="Amenities heading" value={content.amenities.title} onChange={(value) => update("amenities", { ...content.amenities, title: value })}/><ImageField label="Amenities image" value={content.amenities.imageUrl} onChange={(value) => update("amenities", { ...content.amenities, imageUrl: value })}/></div><div className="space-y-4"><Field label="Gallery heading" value={content.gallery.title} onChange={(value) => update("gallery", { ...content.gallery, title: value })}/><Field label="Gallery description" value={content.gallery.description} multiline onChange={(value) => update("gallery", { ...content.gallery, description: value })}/><ImageCollection values={content.gallery.imageUrls} onChange={(imageUrls) => update("gallery", { ...content.gallery, imageUrls })}/></div></div></section>
    <section className="rounded-xl border bg-card p-5"><h2 className="font-semibold">Activities and experiences</h2><div className="mt-4 grid gap-4 lg:grid-cols-2"><Field label="Section label" value={content.experiences.eyebrow} onChange={(value) => update("experiences", { ...content.experiences, eyebrow: value })}/><Field label="Section heading" value={content.experiences.title} onChange={(value) => update("experiences", { ...content.experiences, title: value })}/></div><div className="mt-5 space-y-4">{content.experiences.items.map((item, index) => <div key={`${item.title}-${index}`} className="rounded-lg border p-4"><p className="mb-3 font-medium">Experience {index + 1}</p><div className="grid gap-4 sm:grid-cols-2"><Field label="Category" value={item.category} onChange={(value) => replaceExperience(content, update, index, { category: value })}/><Field label="Title" value={item.title} onChange={(value) => replaceExperience(content, update, index, { title: value })}/></div><div className="mt-4"><Field label="Description" value={item.description} multiline onChange={(value) => replaceExperience(content, update, index, { description: value })}/></div><div className="mt-4"><ImageField label="Experience image" value={item.imageUrl} onChange={(value) => replaceExperience(content, update, index, { imageUrl: value })}/></div></div>)}</div></section>
    <section className="rounded-xl border bg-card p-5"><h2 className="font-semibold">Guest feedback</h2><p className="mt-1 text-sm text-muted-foreground">Add only feedback you have permission to republish. A Facebook source link is displayed to visitors when supplied.</p><div className="mt-4 grid gap-4 lg:grid-cols-2"><Field label="Section heading" value={content.testimonials.title} onChange={(value) => update("testimonials", { ...content.testimonials, title: value })}/><ImageField label="Feedback backdrop" value={content.testimonials.imageUrl} onChange={(value) => update("testimonials", { ...content.testimonials, imageUrl: value })}/></div><div className="mt-5 space-y-4">{content.testimonials.reviews.map((review, index) => <div key={`${review.name}-${index}`} className="rounded-lg border p-4"><div className="mb-3 flex justify-between"><p className="font-medium">Feedback {index + 1}</p>{content.testimonials.reviews.length > 1 ? <Button variant="ghost" size="icon" onClick={() => update("testimonials", { ...content.testimonials, reviews: content.testimonials.reviews.filter((_, itemIndex) => itemIndex !== index) })}><Trash2 className="size-4" /></Button> : null}</div><div className="grid gap-4 sm:grid-cols-2"><Field label="Guest or group name" value={review.name} onChange={(value) => replaceReview(content, update, index, { name: value })}/><Field label="Occasion" value={review.occasion} onChange={(value) => replaceReview(content, update, index, { occasion: value })}/><Field label="Rating (1–5)" value={String(review.rating)} onChange={(value) => replaceReview(content, update, index, { rating: Math.max(1, Math.min(5, Number(value) || 1)) })}/><Field label="Facebook source URL (optional)" value={review.sourceUrl} onChange={(value) => replaceReview(content, update, index, { sourceUrl: value })}/></div><div className="mt-4"><Field label="Feedback" value={review.quote} multiline onChange={(value) => replaceReview(content, update, index, { quote: value })}/></div><div className="mt-4"><ImageField label="Guest feedback image" value={review.imageUrl} onChange={(value) => replaceReview(content, update, index, { imageUrl: value })}/></div></div>)}</div>{content.testimonials.reviews.length < 12 ? <Button className="mt-4" variant="outline" onClick={() => update("testimonials", { ...content.testimonials, reviews: [...content.testimonials.reviews, { name: "New guest feedback", occasion: "Alrio getaway", quote: "", rating: 5, imageUrl: "/amenities.jpg", sourceUrl: "" }] })}><Plus /> Add feedback</Button> : null}</section>
  </div>;
}

function replaceReview(content: LandingBranding, update: <K extends keyof LandingBranding>(key: K, value: LandingBranding[K]) => void, index: number, value: Partial<LandingBranding["testimonials"]["reviews"][number]>) { update("testimonials", { ...content.testimonials, reviews: content.testimonials.reviews.map((review, itemIndex) => itemIndex === index ? { ...review, ...value } : review) }); }
function replaceExperience(content: LandingBranding, update: <K extends keyof LandingBranding>(key: K, value: LandingBranding[K]) => void, index: number, value: Partial<LandingBranding["experiences"]["items"][number]>) { update("experiences", { ...content.experiences, items: content.experiences.items.map((item, itemIndex) => itemIndex === index ? { ...item, ...value } : item) }); }
function Field({ label, value, multiline, onChange }: { label: string; value: string; multiline?: boolean; onChange: (value: string) => void }) { return <div className="space-y-2"><Label>{label}</Label>{multiline ? <Textarea value={value} onChange={(event) => onChange(event.target.value)} /> : <Input value={value} onChange={(event) => onChange(event.target.value)} />}</div>; }
function ImageField({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const uploadToastId = `landing-branding-${label.toLowerCase().replaceAll(/[^a-z0-9]+/g, "-")}`;

  return <div className="space-y-3"><Label>{label}</Label>{value ? <div className="overflow-hidden rounded-xl border bg-zinc-50"><div className="relative aspect-video bg-muted"><img src={value} alt={`${label} preview`} className="size-full object-cover" onError={(event) => { event.currentTarget.style.display = "none"; }} /><div className="absolute inset-0 bg-linear-to-t from-black/55 via-transparent to-transparent" /><span className="absolute bottom-3 left-3 rounded-full bg-black/55 px-3 py-1.5 text-xs font-medium text-white">Current landing-page image</span><Button type="button" variant="secondary" size="icon" className="absolute right-3 top-3 size-8 shadow-sm" onClick={() => onChange("")} aria-label={`Remove ${label}`}><X className="size-4" /></Button></div></div> : <Attachment state="idle" className="min-h-28 w-full items-center justify-center border-dashed bg-zinc-50"><AttachmentMedia><ImageIcon className="size-5" /></AttachmentMedia><AttachmentContent><AttachmentTitle>No image selected yet</AttachmentTitle><AttachmentDescription>Upload an image for this landing section.</AttachmentDescription></AttachmentContent></Attachment>}<UploadDropzone endpoint="landingBrandingUploader" className="w-full" appearance={{ allowedContent: "text-xs font-medium text-zinc-500", button: "mt-2 h-8! w-full rounded-lg border border-zinc-900 bg-[linear-gradient(180deg,#3a3a3a_0%,#111_100%)] px-3 text-xs font-semibold text-white shadow-sm transition hover:brightness-110 disabled:opacity-60 data-[state=readying]:cursor-wait data-[state=uploading]:cursor-wait data-[state=uploading]:after:bg-white/20", container: "mt-1 w-full rounded-xl border border-dashed border-zinc-300 bg-zinc-50 px-4 py-5 text-center transition hover:bg-zinc-100 data-[state=uploading]:opacity-80", label: "text-sm font-semibold text-zinc-700", uploadIcon: "mx-auto size-8 text-zinc-500" }} content={{ allowedContent: "Images up to 8MB", button: uploadProgress === null ? "Upload image" : `Uploading ${uploadProgress}%`, label: "Drag and drop an image, or click to browse" }} onUploadBegin={(fileName) => { setUploadProgress(0); toast.loading(`Uploading ${fileName}...`, { id: uploadToastId }); }} onUploadProgress={(progress) => { setUploadProgress(progress); toast.loading(`Uploading image... ${progress}%`, { id: uploadToastId }); }} onClientUploadComplete={(files) => { setUploadProgress(null); const url = files[0]?.ufsUrl; if (url) onChange(url); toast.success("Image uploaded. Save changes to publish it.", { id: uploadToastId }); }} onUploadError={(error: Error) => { setUploadProgress(null); toast.error(error.message || "Image upload failed.", { id: uploadToastId }); }} /><details className="rounded-lg border border-dashed px-3 py-2 text-sm"><summary className="cursor-pointer font-medium text-muted-foreground">Use an image URL instead</summary><Input className="mt-3" value={value} onChange={(event) => onChange(event.target.value)} placeholder="https://… or /image.jpg" /></details></div>;
}
function ImageCollection({ values, onChange }: { values: string[]; onChange: (values: string[]) => void }) {
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);

  const addUrl = (input: HTMLInputElement) => {
    const url = input.value.trim();
    if (!url) return;
    onChange([...values, url]);
    input.value = "";
  };

  return (
    <div className="space-y-3">
      <Label>Gallery images</Label>
      <p className="text-xs text-muted-foreground">
        Upload the photos shown in the Alrio gallery, then save to publish them.
      </p>
      {values.length ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {values.map((value, index) => (
            <div key={`${value}-${index}`} className="group relative aspect-square overflow-hidden rounded-lg border bg-muted">
              <img src={value} alt={`Gallery image ${index + 1}`} className="size-full object-cover" onError={(event) => { event.currentTarget.style.display = "none"; }} />
              <Button type="button" variant="secondary" size="icon" className="absolute right-2 top-2 size-7 opacity-100 shadow-sm sm:opacity-0 sm:group-hover:opacity-100" disabled={values.length === 1} onClick={() => onChange(values.filter((_, itemIndex) => itemIndex !== index))} aria-label={`Remove gallery image ${index + 1}`}>
                <Trash2 className="size-3.5" />
              </Button>
            </div>
          ))}
        </div>
      ) : (
        <Attachment state="idle" className="min-h-28 w-full items-center justify-center border-dashed bg-zinc-50">
          <AttachmentMedia><ImageIcon className="size-5" /></AttachmentMedia>
          <AttachmentContent><AttachmentTitle>No gallery images yet</AttachmentTitle><AttachmentDescription>Upload photos for the public gallery.</AttachmentDescription></AttachmentContent>
        </Attachment>
      )}
      <UploadDropzone endpoint="landingBrandingUploader" className="w-full" appearance={{ allowedContent: "text-xs font-medium text-zinc-500", button: "mt-2 h-8! w-full rounded-lg border border-zinc-900 bg-[linear-gradient(180deg,#3a3a3a_0%,#111_100%)] px-3 text-xs font-semibold text-white shadow-sm transition hover:brightness-110 disabled:opacity-60 data-[state=readying]:cursor-wait data-[state=uploading]:cursor-wait data-[state=uploading]:after:bg-white/20", container: "mt-1 w-full rounded-xl border border-dashed border-zinc-300 bg-zinc-50 px-4 py-5 text-center transition hover:bg-zinc-100 data-[state=uploading]:opacity-80", label: "text-sm font-semibold text-zinc-700", uploadIcon: "mx-auto size-8 text-zinc-500" }} content={{ allowedContent: "Images up to 8MB", button: uploadProgress === null ? "Upload gallery image" : `Uploading ${uploadProgress}%`, label: "Drag and drop a gallery image, or click to browse" }} onUploadBegin={(fileName) => { setUploadProgress(0); toast.loading(`Uploading ${fileName}...`, { id: "landing-gallery-upload" }); }} onUploadProgress={(progress) => { setUploadProgress(progress); toast.loading(`Uploading gallery image... ${progress}%`, { id: "landing-gallery-upload" }); }} onClientUploadComplete={(files) => { setUploadProgress(null); const url = files[0]?.ufsUrl; if (url) onChange([...values, url]); toast.success("Gallery image uploaded. Save changes to publish it.", { id: "landing-gallery-upload" }); }} onUploadError={(error: Error) => { setUploadProgress(null); toast.error(error.message || "Gallery image upload failed.", { id: "landing-gallery-upload" }); }} />
      <details className="rounded-lg border border-dashed px-3 py-2 text-sm">
        <summary className="cursor-pointer font-medium text-muted-foreground">Add an image URL instead</summary>
        <div className="mt-3 flex gap-2">
          <Input placeholder="https://… or /image.jpg" onKeyDown={(event) => { if (event.key === "Enter") { event.preventDefault(); addUrl(event.currentTarget); } }} />
          <Button type="button" variant="outline" onClick={(event) => { const input = event.currentTarget.parentElement?.querySelector("input"); if (input instanceof HTMLInputElement) addUrl(input); }}><Plus /> Add</Button>
        </div>
      </details>
    </div>
  );
}
