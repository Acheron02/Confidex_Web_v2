import nodemailer from "nodemailer";

type SendCompanyMailPayload = {
  subject: string;
  html: string;
  text?: string;
  to?: string | string[];
};

const gmailUser = process.env.GMAIL_USER;
const gmailAppPassword = process.env.GMAIL_APP_PASSWORD;
const companyEmail = process.env.COMPANY_EMAIL || gmailUser;

function parseRecipients(value: string | string[] | undefined): string[] {
  if (Array.isArray(value)) {
    return value.map((item) => String(item || "").trim()).filter(Boolean);
  }

  return String(value || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

export function getCompanyMailRecipients() {
  const recipients = [
    ...parseRecipients(companyEmail),
    ...parseRecipients(process.env.ADMIN_ALERT_EMAILS),
    ...parseRecipients(process.env.STOCK_ALERT_EMAILS),
  ];

  return Array.from(new Set(recipients));
}

export function escapeHtml(value: unknown) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

export async function sendCompanyMail({
  subject,
  html,
  text,
  to,
}: SendCompanyMailPayload) {
  if (!gmailUser || !gmailAppPassword) {
    throw new Error(
      "Missing Gmail config. Please set GMAIL_USER and GMAIL_APP_PASSWORD in .env.local.",
    );
  }

  const recipients = parseRecipients(to).length
    ? parseRecipients(to)
    : getCompanyMailRecipients();

  if (!recipients.length) {
    throw new Error(
      "Missing email recipient. Please set COMPANY_EMAIL, ADMIN_ALERT_EMAILS, or STOCK_ALERT_EMAILS in .env.local.",
    );
  }

  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: gmailUser,
      pass: gmailAppPassword,
    },
  });

  await transporter.sendMail({
    from: `"Confidex System" <${gmailUser}>`,
    to: recipients.join(", "),
    subject,
    html,
    text,
  });
}
