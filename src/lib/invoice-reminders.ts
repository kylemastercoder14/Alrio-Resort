import nodemailer from "nodemailer";

import { prisma } from "@/lib/prisma";

type ReminderCadence = "STANDARD" | "LIGHT" | "STRICT" | "PAUSED";
type MailKind = "invoice" | "reminder";
const DAY_MS = 24 * 60 * 60 * 1000;

type ReminderRunResult = {
  failed: Array<{ id: string; message: string }>;
  skipped: number;
  sent: number;
  scanned: number;
};

const invoiceInclude = {
  lineItems: { orderBy: { sortOrder: "asc" as const } },
  resortProfile: { select: { resortName: true } },
} as const;

function getRequiredEnv(name: string) {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is required to send invoice email.`);
  return value;
}

function createTransporter() {
  return nodemailer.createTransport({
    host: getRequiredEnv("SMTP_HOST"),
    port: Number(process.env.SMTP_PORT ?? "587"),
    secure: process.env.SMTP_SECURE === "true",
    auth: { user: getRequiredEnv("SMTP_USER"), pass: getRequiredEnv("SMTP_PASSWORD") },
  });
}

export async function sendInvoiceEmailNow(invoiceId: string, now = new Date()) {
  const invoice = await prisma.resortInvoice.findUnique({ where: { id: invoiceId }, include: invoiceInclude });
  if (!invoice) throw new Error("Invoice not found.");
  if (!invoice.guestEmail?.trim()) throw new Error("Invoice has no guest email.");
  if (invoice.status === "VOID") throw new Error("A void invoice cannot be sent.");

  await deliverInvoiceEmail(invoice, "invoice");
  await prisma.resortInvoice.update({
    where: { id: invoice.id },
    data: {
      sentAt: now,
      status: parseMoney(invoice.balanceDue) <= 0 ? "PAID" : invoice.dueDate < now ? "OVERDUE" : "SENT",
      nextReminderAt: invoice.reminderCadence === "PAUSED" ? null : getFirstReminderAt(invoice.dueDate, invoice.reminderCadence),
    },
  });
  return { id: invoice.id };
}

export async function runInvoiceReminderCron(now = new Date()): Promise<ReminderRunResult> {
  const invoices = await prisma.resortInvoice.findMany({
    where: {
      status: { in: ["SENT", "OVERDUE"] },
      guestEmail: { not: null },
      reminderCadence: { not: "PAUSED" },
      OR: [{ nextReminderAt: { lte: now } }, { nextReminderAt: null }],
    },
    include: invoiceInclude,
    orderBy: { dueDate: "asc" },
  });
  const result: ReminderRunResult = { failed: [], skipped: 0, sent: 0, scanned: invoices.length };

  for (const invoice of invoices) {
    if (!shouldSendReminder(invoice, now)) {
      result.skipped += 1;
      continue;
    }
    try {
      await deliverInvoiceEmail(invoice, "reminder");
      await recordReminderSent(invoice, now);
      result.sent += 1;
    } catch (error) {
      result.failed.push({ id: invoice.id, message: error instanceof Error ? error.message : "Unknown reminder error." });
    }
  }
  return result;
}

export async function sendInvoiceReminderNow(invoiceId: string, now = new Date()) {
  const invoice = await prisma.resortInvoice.findUnique({ where: { id: invoiceId }, include: invoiceInclude });
  if (!invoice) throw new Error("Invoice not found.");
  if (!invoice.guestEmail?.trim()) throw new Error("Invoice has no guest email.");
  if (parseMoney(invoice.balanceDue) <= 0) throw new Error("Invoice has no remaining balance.");
  if (invoice.status === "DRAFT") throw new Error("Send the invoice before sending a reminder.");
  if (invoice.status === "VOID") throw new Error("A void invoice cannot receive reminders.");
  await deliverInvoiceEmail(invoice, "reminder");
  await recordReminderSent(invoice, now);
  return { id: invoice.id };
}

async function recordReminderSent(invoice: { id: string; dueDate: Date; reminderCadence: ReminderCadence }, now: Date) {
  await prisma.resortInvoice.update({
    where: { id: invoice.id },
    data: {
      lastReminderSentAt: now,
      nextReminderAt: getNextReminderAt(invoice.dueDate, invoice.reminderCadence, now),
      status: invoice.dueDate < now ? "OVERDUE" : undefined,
    },
  });
}

async function deliverInvoiceEmail(
  invoice: {
    balanceDue: string; code: string; dueDate: Date; guestEmail: string | null; guestName: string;
    publicToken: string; totalAmount: string;
    resortProfile: { resortName: string };
  },
  kind: MailKind,
) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? process.env.BETTER_AUTH_URL ?? "http://localhost:3000";
  const invoiceUrl = new URL(`/invoices/${invoice.publicToken}`, appUrl).toString();
  const resortName = invoice.resortProfile.resortName || "Alrio Private Resort";
  const subject = kind === "invoice" ? `Invoice ${invoice.code} from ${resortName}` : `Payment reminder - ${invoice.code}`;
  const title = kind === "invoice" ? "Your invoice is ready" : "Payment reminder";
  const intro = kind === "invoice" ? `Your invoice from ${resortName} is ready to review.` : `Invoice ${invoice.code} still has an outstanding balance.`;

  await createTransporter().sendMail({
    from: getRequiredEnv("SMTP_FROM"),
    to: invoice.guestEmail!,
    replyTo: process.env.SMTP_REPLY_TO || undefined,
    subject,
    text: [title, "", `Hi ${invoice.guestName},`, intro, `Due date: ${formatDate(invoice.dueDate)}`, `Total: ${formatAmount(invoice.totalAmount)}`, `Balance due: ${formatAmount(invoice.balanceDue)}`, `View invoice and pay securely: ${invoiceUrl}`, "", "Card, GCash, and QR Ph payments are processed securely by PayMongo."].join("\n"),
    html: buildEmailHtml({ ...invoice, intro, invoiceUrl, resortName, title }),
  });
}

function buildEmailHtml(input: { balanceDue: string; code: string; dueDate: Date; guestName: string; intro: string; invoiceUrl: string; resortName: string; title: string; totalAmount: string }) {
  return `<!doctype html><html><body style="margin:0;background:#f4f4f5;color:#18181b;font-family:Arial,sans-serif"><table role="presentation" width="100%"><tr><td align="center" style="padding:40px 20px"><table role="presentation" width="640" style="max-width:640px;width:100%;background:#fff;border:1px solid #e4e4e7;border-radius:18px"><tr><td style="padding:34px"><p style="margin:0 0 24px;color:#AE7B0C;font-size:13px;font-weight:700;letter-spacing:.12em;text-transform:uppercase">${escapeHtml(input.resortName)}</p><h1 style="margin:0 0 18px;font-size:28px">${escapeHtml(input.title)}</h1><p style="font-size:16px;line-height:1.6">Hi ${escapeHtml(input.guestName)}, ${escapeHtml(input.intro)}</p><table width="100%" cellspacing="0" cellpadding="0" style="margin:24px 0;border-collapse:collapse">${detailRow("Invoice", input.code)}${detailRow("Due date", formatDate(input.dueDate))}${detailRow("Total", formatAmount(input.totalAmount))}${detailRow("Balance due", formatAmount(input.balanceDue))}</table><a href="${input.invoiceUrl}" style="display:inline-block;border-radius:10px;background:#18181b;color:#fff;padding:12px 18px;text-decoration:none;font-weight:700">View invoice &amp; pay</a><p style="margin:22px 0 0;color:#71717a;font-size:13px">Secure payment via PayMongo using card, GCash, or QR Ph.</p></td></tr></table></td></tr></table></body></html>`;
}

function detailRow(label: string, value: string) {
  return `<tr><td style="border-bottom:1px solid #e4e4e7;padding:10px 0;color:#71717a">${escapeHtml(label)}</td><td align="right" style="border-bottom:1px solid #e4e4e7;padding:10px 0;font-weight:700">${escapeHtml(value)}</td></tr>`;
}

function shouldSendReminder(invoice: { balanceDue: string; dueDate: Date; guestEmail: string | null; lastReminderSentAt: Date | null; nextReminderAt: Date | null; reminderCadence: ReminderCadence }, now: Date) {
  if (!invoice.guestEmail?.trim() || invoice.reminderCadence === "PAUSED" || parseMoney(invoice.balanceDue) <= 0 || isSameDay(invoice.lastReminderSentAt, now)) return false;
  return (invoice.nextReminderAt ?? getFirstReminderAt(invoice.dueDate, invoice.reminderCadence)) <= now;
}

function getFirstReminderAt(dueDate: Date, cadence: ReminderCadence) {
  const first = startOfDay(dueDate);
  if (cadence !== "LIGHT") first.setDate(first.getDate() - 3);
  return first;
}

function getNextReminderAt(dueDate: Date, cadence: ReminderCadence, now: Date) {
  const due = startOfDay(dueDate);
  const today = startOfDay(now);
  const offsets = cadence === "STRICT" ? [-3, -1, 0] : cadence === "STANDARD" ? [-3, 0] : [0];
  for (const offset of offsets) {
    const scheduled = new Date(due);
    scheduled.setDate(due.getDate() + offset);
    if (scheduled > now) return scheduled;
  }
  const interval = cadence === "STRICT" ? 1 : cadence === "STANDARD" ? 3 : 7;
  const overdue = Math.max(0, Math.floor((today.getTime() - due.getTime()) / DAY_MS));
  const next = new Date(due);
  next.setDate(due.getDate() + (overdue <= 0 ? interval : Math.floor(overdue / interval) * interval + interval));
  return next;
}

function escapeHtml(value: string) { return value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;"); }
function formatDate(value: Date) { return value.toLocaleDateString("en-PH", { day: "numeric", month: "long", year: "numeric" }); }
function formatAmount(value: string) { return `PHP ${parseMoney(value).toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`; }
function parseMoney(value: string) { const amount = Number(value.replace(/[^\d.-]/g, "")); return Number.isFinite(amount) ? amount : 0; }
function startOfDay(value: Date) { const date = new Date(value); date.setHours(0, 0, 0, 0); return date; }
function isSameDay(left: Date | null, right: Date) { return !!left && startOfDay(left).getTime() === startOfDay(right).getTime(); }
