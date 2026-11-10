import nodemailer from "nodemailer";

import { getRuntimeSetting } from "@/lib/runtime-settings";

type PayslipEmailInput = {
  resortProfileId: string;
  resortName: string;
  recipientEmail: string;
  recipientName: string;
  payrollName: string;
  payPeriod: string;
  payDate: Date;
  netPay: number;
};

async function requiredSetting(
  resortProfileId: string,
  key: "SMTP_HOST" | "SMTP_USER" | "SMTP_PASSWORD" | "SMTP_FROM",
) {
  const value = await getRuntimeSetting(resortProfileId, key);
  if (!value) throw new Error(`${key} is required to send payslips.`);
  return value;
}

export async function sendPayrollPayslipEmail(input: PayslipEmailInput) {
  const transporter = nodemailer.createTransport({
    host: await requiredSetting(input.resortProfileId, "SMTP_HOST"),
    port: Number(
      (await getRuntimeSetting(input.resortProfileId, "SMTP_PORT")) ?? "587",
    ),
    secure:
      (await getRuntimeSetting(input.resortProfileId, "SMTP_SECURE")) === "true",
    auth: {
      user: await requiredSetting(input.resortProfileId, "SMTP_USER"),
      pass: await requiredSetting(input.resortProfileId, "SMTP_PASSWORD"),
    },
  });
  const formattedNetPay = new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
  }).format(input.netPay);
  const payDate = new Intl.DateTimeFormat("en-PH", {
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(input.payDate);

  await transporter.sendMail({
    from: await requiredSetting(input.resortProfileId, "SMTP_FROM"),
    to: input.recipientEmail,
    replyTo:
      (await getRuntimeSetting(input.resortProfileId, "SMTP_REPLY_TO")) ||
      undefined,
    subject: `Payslip ready: ${input.payPeriod} · ${input.resortName}`,
    text: [
      `Hi ${input.recipientName},`,
      "",
      `Your payslip for ${input.payPeriod} is ready.`,
      `Payroll: ${input.payrollName}`,
      `Pay date: ${payDate}`,
      `Net pay: ${formattedNetPay}`,
      "",
      `Please sign in to ${input.resortName} to review your payroll history.`,
    ].join("\n"),
    html: `<!doctype html><html><body style="margin:0;background:#f4f4f5;color:#18181b;font-family:Arial,sans-serif"><table role="presentation" width="100%" cellspacing="0" cellpadding="0"><tr><td align="center" style="padding:40px 20px"><table role="presentation" width="600" cellspacing="0" cellpadding="0" style="max-width:600px;background:#fff;border-radius:18px;overflow:hidden"><tr><td style="background:#18181b;padding:28px 32px;color:#fff"><p style="margin:0;font-size:12px;letter-spacing:1.6px;text-transform:uppercase;color:#d4a72c">${escapeHtml(input.resortName)}</p><h1 style="margin:10px 0 0;font-size:26px">Your payslip is ready</h1></td></tr><tr><td style="padding:32px"><p style="margin:0 0 16px">Hi ${escapeHtml(input.recipientName)},</p><p style="margin:0 0 24px;color:#52525b">Your payroll details for <strong>${escapeHtml(input.payPeriod)}</strong> are now available.</p><table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#fafafa;border:1px solid #e4e4e7;border-radius:12px"><tr><td style="padding:18px"><p style="margin:0 0 6px;color:#71717a;font-size:13px">NET PAY</p><p style="margin:0;font-size:24px;font-weight:700">${formattedNetPay}</p><p style="margin:10px 0 0;color:#52525b;font-size:14px">${escapeHtml(input.payrollName)} · Pay date ${payDate}</p></td></tr></table><p style="margin:24px 0 0;color:#71717a;font-size:13px">Please sign in to review your complete payroll history.</p></td></tr></table></td></tr></table></body></html>`,
  });
}

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (character) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" })[character]!,
  );
}
