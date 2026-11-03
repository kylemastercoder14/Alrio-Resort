import type { Metadata } from "next";
import { Geist, Geist_Mono, Inter } from "next/font/google";
import "./globals.css";
import { cn } from "@/lib/utils";
import { TRPCReactProvider } from "@/trpc/client";
import { Toaster } from "sonner";

const inter = Inter({subsets:['latin'],variable:'--font-sans'});

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "ResortCloud - SaaS Resort Management System",
  description:
    "ResortCloud is a SaaS-based resort management platform that streamlines reservations, guest experience, staff coordination, and property operations — all in one place.",
  icons: {
    icon: [
      {
        url: "/main/logo-light.png?v=2",
        media: "(prefers-color-scheme: light)",
        type: "image/png",
      },
      {
        url: "/main/logo-dark.png?v=2",
        media: "(prefers-color-scheme: dark)",
        type: "image/png",
      },
    ],
    shortcut: "/main/logo-dark.png?v=2",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={cn("h-full", "antialiased", geistSans.variable, geistMono.variable, "font-sans", inter.variable)}
    >
      <body className="min-h-full flex flex-col">
        <TRPCReactProvider>{children}</TRPCReactProvider>
        <Toaster closeButton position="bottom-center" />
      </body>
    </html>
  );
}
