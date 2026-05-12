import { NextRequest, NextResponse } from "next/server";
import mongoose, { Schema, model, models } from "mongoose";
import nodemailer from "nodemailer";

export const runtime = "nodejs";

const MONGODB_URI = process.env.MONGODB_URI;
const MONGODB_DB = process.env.MONGODB_DB || "Confidex_v2";

const GMAIL_EMAIL = process.env.GMAIL_EMAIL;
const GMAIL_APP_PASSWORD = process.env.GMAIL_APP_PASSWORD;
const CONTACT_RECEIVER_EMAIL =
  process.env.CONTACT_RECEIVER_EMAIL || process.env.GMAIL_EMAIL;

async function connectDB() {
  if (!MONGODB_URI) {
    throw new Error("MONGODB_URI is not defined in .env.local");
  }

  if (mongoose.connection.readyState >= 1) {
    return;
  }

  await mongoose.connect(MONGODB_URI, {
    dbName: MONGODB_DB,
  });
}

const ContactMessage =
  models.ContactMessage ||
  model(
    "ContactMessage",
    new Schema(
      {
        name: {
          type: String,
          required: true,
          trim: true,
        },
        email: {
          type: String,
          required: true,
          trim: true,
          lowercase: true,
        },
        phone: {
          type: String,
          trim: true,
          default: "",
        },
        concern: {
          type: String,
          required: true,
          trim: true,
        },
        message: {
          type: String,
          required: true,
          trim: true,
        },
        status: {
          type: String,
          enum: ["new", "reviewed", "resolved"],
          default: "new",
        },
        emailSent: {
          type: Boolean,
          default: false,
        },
        emailSentAt: {
          type: Date,
          default: null,
        },
        emailError: {
          type: String,
          default: "",
        },
      },
      {
        timestamps: true,
      },
    ),
  );

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function buildEmailHtml(data: {
  name: string;
  email: string;
  phone: string;
  concern: string;
  message: string;
}) {
  const name = escapeHtml(data.name);
  const email = escapeHtml(data.email);
  const phone = escapeHtml(data.phone || "Not provided");
  const concern = escapeHtml(data.concern);
  const message = escapeHtml(data.message).replaceAll("\n", "<br />");

  return `
    <div style="margin:0;padding:0;background:#f6f6f6;font-family:Arial,sans-serif;color:#111827;">
      <div style="max-width:680px;margin:0 auto;padding:32px 16px;">
        <div style="overflow:hidden;border:1px solid #e5e7eb;border-radius:20px;background:#ffffff;">
          <div style="background:#111111;color:#ffffff;padding:28px 32px;">
            <p style="margin:0 0 8px;font-size:12px;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:#f59e0b;">
              Confidex Contact Form
            </p>
            <h1 style="margin:0;font-size:28px;line-height:1.2;">
              New message received
            </h1>
          </div>

          <div style="padding:28px 32px;">
            <table style="width:100%;border-collapse:collapse;">
              <tr>
                <td style="width:140px;padding:12px 0;font-size:13px;color:#6b7280;">Name</td>
                <td style="padding:12px 0;font-size:15px;font-weight:700;">${name}</td>
              </tr>
              <tr>
                <td style="padding:12px 0;font-size:13px;color:#6b7280;">Email</td>
                <td style="padding:12px 0;font-size:15px;font-weight:700;">${email}</td>
              </tr>
              <tr>
                <td style="padding:12px 0;font-size:13px;color:#6b7280;">Phone</td>
                <td style="padding:12px 0;font-size:15px;font-weight:700;">${phone}</td>
              </tr>
              <tr>
                <td style="padding:12px 0;font-size:13px;color:#6b7280;">Concern</td>
                <td style="padding:12px 0;font-size:15px;font-weight:700;">${concern}</td>
              </tr>
            </table>

            <div style="margin-top:24px;padding:20px;border:1px solid #e5e7eb;border-radius:16px;background:#f9fafb;">
              <p style="margin:0 0 10px;font-size:13px;font-weight:700;color:#6b7280;text-transform:uppercase;letter-spacing:1px;">
                Message
              </p>
              <p style="margin:0;font-size:15px;line-height:1.7;color:#111827;">
                ${message}
              </p>
            </div>
          </div>

          <div style="padding:18px 32px;border-top:1px solid #e5e7eb;background:#fafafa;">
            <p style="margin:0;font-size:12px;color:#6b7280;">
              This email was sent from the Confidex website contact page.
            </p>
          </div>
        </div>
      </div>
    </div>
  `;
}

function buildEmailText(data: {
  name: string;
  email: string;
  phone: string;
  concern: string;
  message: string;
}) {
  return `
New Confidex Contact Message

Name: ${data.name}
Email: ${data.email}
Phone: ${data.phone || "Not provided"}
Concern: ${data.concern}

Message:
${data.message}
  `.trim();
}

function cleanSubject(value: string) {
  return value
    .replace(/[\r\n]+/g, " ")
    .trim()
    .slice(0, 120);
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const name = String(body.name || "")
      .trim()
      .slice(0, 120);
    const email = String(body.email || "")
      .trim()
      .toLowerCase()
      .slice(0, 160);
    const phone = String(body.phone || "")
      .trim()
      .slice(0, 60);
    const concern = String(body.concern || "")
      .trim()
      .slice(0, 120);
    const message = String(body.message || "")
      .trim()
      .slice(0, 5000);

    if (!name || !email || !concern || !message) {
      return NextResponse.json(
        {
          ok: false,
          message: "Please complete all required fields.",
        },
        { status: 400 },
      );
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailRegex.test(email)) {
      return NextResponse.json(
        {
          ok: false,
          message: "Please enter a valid email address.",
        },
        { status: 400 },
      );
    }

    if (!GMAIL_EMAIL || !GMAIL_APP_PASSWORD || !CONTACT_RECEIVER_EMAIL) {
      return NextResponse.json(
        {
          ok: false,
          message:
            "Email service is not configured. Please check GMAIL_EMAIL, GMAIL_APP_PASSWORD, and CONTACT_RECEIVER_EMAIL.",
        },
        { status: 500 },
      );
    }

    await connectDB();

    const savedMessage = await ContactMessage.create({
      name,
      email,
      phone,
      concern,
      message,
      emailSent: false,
      emailSentAt: null,
      emailError: "",
    });

    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: GMAIL_EMAIL,
        pass: GMAIL_APP_PASSWORD,
      },
    });

    try {
      await transporter.sendMail({
        from: `"${name} via Confidex Website" <${GMAIL_EMAIL}>`,
        to: CONTACT_RECEIVER_EMAIL,
        replyTo: email,
        subject: `New Confidex Contact Message: ${cleanSubject(concern)}`,
        text: buildEmailText({
          name,
          email,
          phone,
          concern,
          message,
        }),
        html: buildEmailHtml({
          name,
          email,
          phone,
          concern,
          message,
        }),
      });

      savedMessage.emailSent = true;
      savedMessage.emailSentAt = new Date();
      savedMessage.emailError = "";
      await savedMessage.save();

      return NextResponse.json(
        {
          ok: true,
          message: "Your message has been sent successfully.",
        },
        { status: 201 },
      );
    } catch (emailError) {
      const errorMessage =
        emailError instanceof Error
          ? emailError.message
          : "Unknown email sending error.";

      savedMessage.emailSent = false;
      savedMessage.emailError = errorMessage;
      await savedMessage.save();

      console.error("CONTACT_EMAIL_ERROR:", emailError);

      return NextResponse.json(
        {
          ok: false,
          message:
            "Your message was saved, but the email could not be sent. Please try again later.",
        },
        { status: 500 },
      );
    }
  } catch (error) {
    console.error("CONTACT_FORM_ERROR:", error);

    return NextResponse.json(
      {
        ok: false,
        message: "Something went wrong while sending your message.",
      },
      { status: 500 },
    );
  }
}
