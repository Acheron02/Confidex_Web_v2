import nodemailer from "nodemailer";

type SendAdminOtpEmailParams = {
  to: string;
  name?: string;
  otp: string;
};

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.GMAIL_EMAIL,
    pass: process.env.GMAIL_APP_PASSWORD,
  },
});

export async function sendAdminOtpEmail({
  to,
  name,
  otp,
}: SendAdminOtpEmailParams) {
  try {
    await transporter.sendMail({
      from: `"Confidex" <${process.env.GMAIL_EMAIL}>`,
      to,
      subject: "Your Confidex Admin Verification Code",

      text: `Hello${name ? ` ${name}` : ""},

Your Confidex verification code is: ${otp}

This code will expire in 10 minutes.

If you did not request this, please ignore this email.

— Confidex Security Team`,

      html: `
      <div style="font-family: Arial, sans-serif; padding: 16px; color: #333;">

        <p>Hello${name ? ` <strong>${name}</strong>` : ""},</p>

        <p>This code is required to complete your <strong>admin login</strong>.</p>

        <p>Your verification code is:</p>

        <div style="
          font-size: 28px;
          font-weight: bold;
          letter-spacing: 4px;
          margin: 16px 0;
          color: #000;
        ">
          ${otp}
        </div>

        <p>This code will expire in <strong>10 minutes</strong>.</p>

        <p style="margin-top: 20px; font-size: 12px; color: #666;">
          If you did not request this, please ignore and report this email.
        </p>

        <hr style="margin: 20px 0;" />

        <p style="font-size: 12px; color: #999;">
          — Confidex Security Team
        </p>
      </div>
      `,
    });
  } catch (error) {
    console.error("OTP email error:", error);
    throw new Error("Failed to send OTP email");
  }
}
