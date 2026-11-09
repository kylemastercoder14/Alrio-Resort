"use client";

import Link from "next/link";
import { ArrowLeft, ArrowRight, BookOpen } from "lucide-react";
import { useParams } from "next/navigation";

import { Article, sections } from "../page";

export default function DocsArticlePage() {
  const params = useParams<{ slug: string }>();
  const slug = params.slug;
  const index = sections.findIndex((section) => section.id === slug);
  if (index === -1) {
    return (
      <main className="mx-auto max-w-3xl px-5 py-24 text-center">
        <h1 className="text-3xl font-bold">Documentation page not found</h1>
        <Link href="/docs" className="mt-4 inline-block text-blue-600 hover:underline">
          Return to documentation
        </Link>
      </main>
    );
  }

  const section = sections[index];
  const previous = sections[index - 1];
  const next = sections[index + 1];

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-30 border-b bg-background/95 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-5 lg:px-8">
          <Link href="/docs" className="flex items-center gap-2 font-bold">
            <span className="flex size-8 items-center justify-center rounded-lg bg-blue-600 text-white">
              <BookOpen className="size-4" />
            </span>
            Alrio Private Resort <span className="text-sm text-muted-foreground">Docs</span>
          </Link>
          <Link
            href="/"
            className="text-sm font-medium text-muted-foreground hover:text-foreground"
          >
            Dashboard
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-5 pb-24 pt-10 lg:px-8">
        <Link
          href="/docs"
          className="text-sm font-medium text-blue-600 hover:text-blue-700"
        >
          Documentation
        </Link>
        <Article section={section} />

        <nav className="mt-12 grid gap-3 sm:grid-cols-2" aria-label="Documentation pagination">
          {previous ? (
            <Link
              href={`/docs/${previous.id}`}
              className={`group flex min-h-24 items-center gap-4 rounded-xl border px-5 py-4 transition hover:border-foreground hover:bg-muted ${next ? "" : "sm:col-span-2"}`}
            >
              <ArrowLeft className="size-5 shrink-0 text-muted-foreground transition group-hover:text-foreground" />
              <span>
                <span className="block text-sm text-muted-foreground">Previous</span>
                <span className="text-lg font-medium">{previous.label}</span>
              </span>
            </Link>
          ) : null}
          {next ? (
            <Link
              href={`/docs/${next.id}`}
              className={`group flex min-h-24 items-center justify-end gap-4 rounded-xl border px-5 py-4 text-right transition hover:border-foreground hover:bg-muted ${previous ? "" : "sm:col-span-2"}`}
            >
              <span>
                <span className="block text-sm text-muted-foreground">Next</span>
                <span className="text-lg font-medium">{next.label}</span>
              </span>
              <ArrowRight className="size-5 shrink-0 text-muted-foreground transition group-hover:text-foreground" />
            </Link>
          ) : null}
        </nav>
        <p className="mt-7 text-sm text-muted-foreground">Last updated October 29, 2026</p>
      </main>
    </div>
  );
}
