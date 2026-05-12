import nodemailer from "nodemailer";

type SendCompanyMailPayload = {
  subject: string;
  html: string;
  text?: string;
};

const gmailUser = process.env.GMAIL_USER;
const gmailAppPassword = process.env.GMAIL_APP_PASSWORD;
const companyEmail = process.env.COMPANY_EMAIL || gmailUser;

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
}: SendCompanyMailPayload) {
  if (!gmailUser || !gmailAppPassword) {
    throw new Error(
      "Missing Gmail config. Please set GMAIL_USER and GMAIL_APP_PASSWORD in .env.local.",
    );
  }

  if (!companyEmail) {
    throw new Error("Missing COMPANY_EMAIL in .env.local.");
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
    to: companyEmail,
    subject,
    html,
    text,
  });
}
