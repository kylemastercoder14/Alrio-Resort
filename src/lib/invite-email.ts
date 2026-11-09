import { randomBytes } from "crypto";
import nodemailer from "nodemailer";

type StaffInviteEmailInput = {
  appUrl: string;
  email: string;
  message?: string;
  role: string;
  token: string;
  workspaceName: string;
};

type ReservationConfirmationEmailInput = {
  appUrl: string;
  checkIn: Date;
  checkOut: Date;
  deposit?: string;
  email: string;
  guestName: string;
  nights: number;
  reservationId: string;
  roomName: string;
  roomType: string;
  totalAmount: string;
  workspaceName: string;
};

function getRequiredEnv(name: string) {
  const value = process.env[name];

  if (!value) {
    throw new Error(`${name} is required to send invitation emails.`);
  }

  return value;
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function getInviteUrl(appUrl: string, token: string) {
  const inviteUrl = new URL(
    `/auth/sign-up/staff/${encodeURIComponent(token)}`,
    appUrl,
  );

  return inviteUrl.toString();
}

function getInvitationSupportUrl() {
  const supportUrl = new URL(
    "https://alrioprivateresort.com/support/submit-a-ticket",
  );
  supportUrl.searchParams.set(
    "invitation_error",
    randomBytes(16).toString("hex"),
  );

  return supportUrl.toString();
}

function createTransporter() {
  const host = getRequiredEnv("SMTP_HOST");
  const port = Number(process.env.SMTP_PORT ?? "587");
  const secure = process.env.SMTP_SECURE === "true";
  const user = getRequiredEnv("SMTP_USER");
  const pass = getRequiredEnv("SMTP_PASSWORD");

  return nodemailer.createTransport({
    host,
    port,
    secure,
    auth: {
      user,
      pass,
    },
  });
}

export async function sendStaffInviteEmail(input: StaffInviteEmailInput) {
  const from = getRequiredEnv("SMTP_FROM");
  const inviteUrl = getInviteUrl(input.appUrl, input.token);
  const supportUrl = getInvitationSupportUrl();
  const transporter = createTransporter();
  const html = buildStaffInviteHtml({
    ...input,
    inviteUrl,
    supportUrl,
  });
  const text = buildStaffInviteText({
    ...input,
    inviteUrl,
    supportUrl,
  });

  await transporter.sendMail({
    from,
    to: input.email,
    subject: `Invitation to join ${input.workspaceName}`,
    html,
    text,
  });
}

export async function sendPasswordResetEmail(input: {
  email: string;
  url: string;
}) {
  await createTransporter().sendMail({
    from: getRequiredEnv("SMTP_FROM"),
    to: input.email,
    subject: "Reset your Alrio Private Resort password",
    text: `Reset your Alrio Private Resort password using this link:\n\n${input.url}\n\nThis link expires in one hour and can be used once. If you did not request a reset, you can ignore this email.`,
    html: `<div style="font-family:Arial,sans-serif;line-height:1.6;color:#18181b;max-width:520px;margin:auto;padding:32px"><h1 style="font-size:24px">Reset your password</h1><p>Use the button below to set a new password for your Alrio Private Resort account.</p><p><a href="${escapeHtml(input.url)}" style="display:inline-block;background:#ae7b0c;color:white;padding:12px 24px;border-radius:8px;text-decoration:none">Reset password</a></p><p>This link expires in one hour and can be used once.</p><p>If you did not request a reset, you can ignore this email.</p><p>Alrio Private Resort</p></div>`,
  });
}

export async function sendReservationConfirmationEmail(
  input: ReservationConfirmationEmailInput,
) {
  const from = getRequiredEnv("SMTP_FROM");
  const bookingUrl = new URL("/", input.appUrl).toString();
  const transporter = createTransporter();
  const html = buildReservationConfirmationHtml({
    ...input,
    bookingUrl,
  });
  const text = buildReservationConfirmationText({
    ...input,
    bookingUrl,
  });

  await transporter.sendMail({
    from,
    to: input.email,
    subject: `Booking confirmation - ${input.workspaceName}`,
    html,
    text,
  });
}

function buildStaffInviteHtml(
  input: StaffInviteEmailInput & {
    inviteUrl: string;
    supportUrl: string;
  },
) {
  const workspaceName = escapeHtml(input.workspaceName);
  const role = escapeHtml(input.role);
  const message = input.message?.trim();

  return `<!doctype html>
<html>
  <body style="margin:0;background:#ffffff;color:#020617;font-family:Arial,sans-serif;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#ffffff;">
      <tr>
        <td align="center" style="padding:48px 24px;">
          <table role="presentation" width="670" cellspacing="0" cellpadding="0" style="max-width:670px;width:100%;">
            <tr>
              <td style="padding-bottom:40px;">
                <img src="https://q3m5xo7hmq.ufs.sh/f/cwO9cyRsC4yhcPZxvzRsC4yhxXWijpTZmVgvJrAqb9SRz7u6" width="90" alt="Alrio Private Resort" style="display:block;border:0;outline:none;text-decoration:none;" />
              </td>
            </tr>
            <tr>
              <td>
                <h1 style="margin:0 0 24px;font-size:25px;line-height:1.2;font-weight:600;color:#020617;">Your invitation</h1>
                <p style="margin:0 0 22px;font-size:15px;line-height:1.6;color:#000000;">You are invited to join ${workspaceName}.</p>
                <p style="margin:0 0 22px;font-size:15px;line-height:1.6;color:#000000;">Role: <strong>${role}</strong></p>
                ${
                  message
                    ? `<p style="margin:0 0 22px;font-size:15px;line-height:1.6;color:#000000;">${escapeHtml(message)}</p>`
                    : ""
                }
                <p style="margin:0 0 38px;font-size:15px;line-height:1.6;color:#000000;">This invitation will expire in 24 hours.</p>
                <a href="${input.inviteUrl}" style="display:inline-block;height:32px;border:1px solid #000000;border-radius:10px;background:#171717;background-image:linear-gradient(to bottom,#4b4b4b,#171717);color:#ffffff;font-size:14px;font-weight:500;line-height:32px;text-decoration:none;padding:0 10px;box-shadow:inset 0 1px 0 rgba(255,255,255,0.35),0 1px 1px rgba(0,0,0,0.35);">Accept invitation</a>
                <p style="margin:22px 0 0;font-size:15px;line-height:1.6;color:#000000;">If you're having trouble with the above button, <a href="${input.supportUrl}" style="color:#000000;text-decoration:underline;">click here</a>.</p>
              </td>
            </tr>
            <tr>
              <td style="padding-top:70px;">
                <div style="border-top:1px dashed #cbd5e1;padding-top:20px;color:#64748b;font-size:13px;">© 2026 Alrio Private Resort</div>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

function buildReservationConfirmationHtml(
  input: ReservationConfirmationEmailInput & {
    bookingUrl: string;
  },
) {
  const workspaceName = escapeHtml(input.workspaceName);
  const guestName = escapeHtml(input.guestName);
  const roomName = input.roomName;
  const roomType = input.roomType;
  const totalAmount = formatEmailAmount(input.totalAmount);
  const deposit = input.deposit ? formatEmailAmount(input.deposit) : "";

  return `<!doctype html>
<html>
  <body style="margin:0;background:#ffffff;color:#020617;font-family:Arial,sans-serif;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#ffffff;">
      <tr>
        <td align="center" style="padding:48px 24px;">
          <table role="presentation" width="670" cellspacing="0" cellpadding="0" style="max-width:670px;width:100%;">
            <tr>
              <td style="padding-bottom:40px;">
                <img src="https://q3m5xo7hmq.ufs.sh/f/cwO9cyRsC4yhcPZxvzRsC4yhxXWijpTZmVgvJrAqb9SRz7u6" width="90" alt="Alrio Private Resort" style="display:block;border:0;outline:none;text-decoration:none;" />
              </td>
            </tr>
            <tr>
              <td>
                <h1 style="margin:0 0 24px;font-size:25px;line-height:1.2;font-weight:600;color:#020617;">Your booking is confirmed</h1>
                <p style="margin:0 0 22px;font-size:15px;line-height:1.6;color:#000000;">Hi ${guestName}, your reservation at ${workspaceName} has been saved.</p>
                <p style="margin:0 0 22px;font-size:15px;line-height:1.6;color:#000000;">Booking reference: <strong>${escapeHtml(input.reservationId)}</strong></p>
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:0 0 30px;border-collapse:collapse;">
                  ${buildDetailRow("Room", `${roomName} (${roomType})`)}
                  ${buildDetailRow("Check-in", formatEmailDate(input.checkIn))}
                  ${buildDetailRow("Check-out", formatEmailDate(input.checkOut))}
                  ${buildDetailRow("Nights", String(input.nights))}
                  ${buildDetailRow("Total", totalAmount)}
                  ${deposit ? buildDetailRow("Deposit", deposit) : ""}
                </table>
                <a href="${input.bookingUrl}" style="display:inline-block;height:32px;border:1px solid #000000;border-radius:10px;background:#171717;background-image:linear-gradient(to bottom,#4b4b4b,#171717);color:#ffffff;font-size:14px;font-weight:500;line-height:32px;text-decoration:none;padding:0 10px;box-shadow:inset 0 1px 0 rgba(255,255,255,0.35),0 1px 1px rgba(0,0,0,0.35);">View booking</a>
                <p style="margin:22px 0 0;font-size:15px;line-height:1.6;color:#000000;">If you have questions, reply to this email or contact ${workspaceName}.</p>
              </td>
            </tr>
            <tr>
              <td style="padding-top:70px;">
                <div style="border-top:1px dashed #cbd5e1;padding-top:20px;color:#64748b;font-size:13px;">Â© 2026 Alrio Private Resort</div>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

function buildReservationConfirmationText(
  input: ReservationConfirmationEmailInput & {
    bookingUrl: string;
  },
) {
  return [
    "Your booking is confirmed",
    "",
    `Hi ${input.guestName}, your reservation at ${input.workspaceName} has been saved.`,
    `Booking reference: ${input.reservationId}`,
    `Room: ${input.roomName} (${input.roomType})`,
    `Check-in: ${formatEmailDate(input.checkIn)}`,
    `Check-out: ${formatEmailDate(input.checkOut)}`,
    `Nights: ${input.nights}`,
    `Total: ${formatEmailAmount(input.totalAmount)}`,
    input.deposit ? `Deposit: ${formatEmailAmount(input.deposit)}` : "",
    "",
    `View booking: ${input.bookingUrl}`,
    "",
    "Â© 2026 Alrio Private Resort",
  ]
    .filter(Boolean)
    .join("\n");
}

function buildDetailRow(label: string, value: string) {
  return `<tr>
    <td style="width:160px;padding:10px 0;border-bottom:1px solid #e5e7eb;color:#64748b;font-size:14px;">${escapeHtml(label)}</td>
    <td style="padding:10px 0;border-bottom:1px solid #e5e7eb;color:#020617;font-size:14px;font-weight:600;">${escapeHtml(value)}</td>
  </tr>`;
}

function formatEmailDate(value: Date) {
  return value.toLocaleDateString("en-PH", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function formatEmailAmount(value: string) {
  const amount = Number(value.replace(/[^\d.]/g, ""));

  if (!Number.isFinite(amount)) return value;

  return `PHP ${amount.toLocaleString("en-PH", {
    maximumFractionDigits: 2,
  })}`;
}

function buildStaffInviteText(
  input: StaffInviteEmailInput & {
    inviteUrl: string;
    supportUrl: string;
  },
) {
  return [
    "Your invitation",
    "",
    `You are invited to join ${input.workspaceName}.`,
    `Role: ${input.role}`,
    input.message ? `Note: ${input.message}` : "",
    "This invitation will expire in 24 hours.",
    "",
    `Accept invitation: ${input.inviteUrl}`,
    `Invitation support: ${input.supportUrl}`,
    "",
    "© 2026 Alrio Private Resort",
  ]
    .filter(Boolean)
    .join("\n");
}
