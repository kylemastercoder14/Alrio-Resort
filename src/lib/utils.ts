import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const passwordRequirements = [
  { regex: /.{8,}/, text: "At least 8 characters" },
  { regex: /[A-Z]/, text: "At least 1 uppercase letter" },
  { regex: /[0-9]/, text: "At least 1 number" },
] as const;

export const getStrengthColor = (score: number) => {
  if (score === 0) return "bg-zinc-200";
  if (score <= 1) return "bg-red-600";
  if (score <= 2) return "bg-orange-600";
  if (score < passwordRequirements.length) return "bg-yellow-600";

  return "bg-green-600";
}

export const getStrengthText = (score: number) => {
  if (score === 0) return "Enter a password";
  if (score <= 2) return "Weak password";
  if (score < passwordRequirements.length) return "Strong password";

  return "Very strong password";
}
