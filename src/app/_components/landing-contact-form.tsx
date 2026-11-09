"use client";

import { useMutation } from "@tanstack/react-query";
import { ArrowUpRight, CheckCircle2, Loader2 } from "lucide-react";
import { type FormEvent, useState } from "react";
import { useTRPC } from "@/trpc/client";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldGroup, FieldLabel, FieldLegend, FieldSet } from "@/components/ui/field";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";

export function LandingContactForm() {
  const trpc = useTRPC();
  const [consent, setConsent] = useState(false);
  const inquiry = useMutation(trpc.public.sendContactInquiry.mutationOptions());

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (inquiry.isPending) return;
    const form = event.currentTarget;
    const data = new FormData(form);
    const hasConsent = data.get("consent") === "on";
    if (!hasConsent) return;
    inquiry.mutate(
      {
        name: String(data.get("name") ?? ""),
        email: String(data.get("email") ?? ""),
        phone: String(data.get("phone") ?? ""),
        subject: String(data.get("subject") ?? ""),
        message: String(data.get("message") ?? ""),
        website: String(data.get("website") ?? ""),
        consent: hasConsent,
      },
      { onSuccess: () => { form.reset(); setConsent(false); } },
    );
  }

  return (
    <Card className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-none ring-0 sm:p-8 lg:p-10">
      <CardHeader className="gap-2 p-0">
        <CardTitle role="heading" aria-level={3} className="text-2xl font-medium tracking-tight text-zinc-900">
          Send us a note
        </CardTitle>
        <CardDescription className="text-sm text-zinc-500">
          Tell us what you have in mind. We’d love to hear from you.
        </CardDescription>
      </CardHeader>
      <CardContent className="p-0">
        <form onSubmit={submit} aria-busy={inquiry.isPending}>
          <FieldSet
            disabled={inquiry.isPending}
            className="gap-5 disabled:opacity-60"
          >
            <FieldLegend className="sr-only">Your contact details and enquiry</FieldLegend>
            <FieldGroup className="grid gap-5 sm:grid-cols-2">
              <Field className="gap-2">
                <FieldLabel htmlFor="contact-name">Full name</FieldLabel>
                <Input
                  id="contact-name"
                  name="name"
                  autoComplete="name"
                  required
                  minLength={2}
                  maxLength={100}
                  placeholder="Your full name"
                />
              </Field>
              <Field className="gap-2">
                <FieldLabel htmlFor="contact-email">Email address</FieldLabel>
                <Input
                  id="contact-email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  maxLength={254}
                  placeholder="you@example.com"
                />
              </Field>
            </FieldGroup>
            <FieldGroup className="grid gap-5 sm:grid-cols-2">
              <Field className="gap-2">
                <FieldLabel htmlFor="contact-phone">
                  Phone (optional)
                </FieldLabel>
                <Input
                  id="contact-phone"
                  name="phone"
                  type="tel"
                  autoComplete="tel"
                  maxLength={30}
                  placeholder="Your phone number"
                />
              </Field>
              <Field className="gap-2">
                <FieldLabel htmlFor="contact-subject">Subject</FieldLabel>
                <Input
                  id="contact-subject"
                  name="subject"
                  required
                  minLength={2}
                  maxLength={120}
                  placeholder="How can we help?"
                />
              </Field>
            </FieldGroup>
            <Field className="gap-2">
              <FieldLabel htmlFor="contact-message">Your message</FieldLabel>
              <Textarea
                id="contact-message"
                name="message"
                required
                minLength={10}
                maxLength={3000}
                rows={5}
                className="min-h-36 resize-y"
                placeholder="Share your preferred dates, group size, or any questions…"
              />
            </Field>
            <Field className="hidden" aria-hidden="true">
              <FieldLabel htmlFor="contact-website">Website</FieldLabel>
              <Input
                id="contact-website"
                name="website"
                tabIndex={-1}
                autoComplete="off"
              />
            </Field>
            <Field orientation="horizontal" className="items-start gap-3">
              <Checkbox
                id="contact-consent"
                name="consent"
                required
                checked={consent}
                onCheckedChange={(checked) => setConsent(checked === true)}
                disabled={inquiry.isPending}
                className="mt-0.5 shrink-0"
              />
              <FieldLabel htmlFor="contact-consent" className="text-xs font-normal leading-5 text-zinc-500">
                I agree that Alrio Private Resort may use these details to respond to my enquiry.
              </FieldLabel>
            </Field>
            <Button
              type="submit"
              className="w-fit self-start rounded-full px-3"
            >
              {inquiry.isPending ? "Sending…" : "Send enquiry"}
              {inquiry.isPending ? (
                <Loader2 className="size-4 animate-spin" aria-hidden="true" />
              ) : (
                <ArrowUpRight className="size-4" aria-hidden="true" />
              )}
            </Button>
          </FieldSet>
          <FieldGroup aria-live="polite" aria-atomic="true">
            {inquiry.isSuccess && (
              <Alert role="status" className="mt-5 border-emerald-100 bg-emerald-50 text-green-800">
                <CheckCircle2 className="size-4" aria-hidden="true" />
                <AlertDescription className="text-green-800">
                  Your enquiry has been saved for the Alrio team. Thank you for getting in touch.
                </AlertDescription>
              </Alert>
            )}
            {inquiry.isError && (
              <Alert variant="destructive" className="mt-5 border-red-200 bg-red-50">
                <AlertDescription className="text-red-700">{inquiry.error.message}</AlertDescription>
              </Alert>
            )}
          </FieldGroup>
        </form>
      </CardContent>
    </Card>
  );
}
