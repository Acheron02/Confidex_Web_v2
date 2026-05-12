function normalizeSmsPhone(phoneNumber: string) {
  return phoneNumber.replace(/\s+/g, "").replace(/^\+/, "");
}

async function safeReadResponse(response: Response) {
  const text = await response.text();

  if (!text) return null;

  try {
    return JSON.parse(text);
  } catch {
    return { raw: text };
  }
}

export async function sendOtpSms(phoneNumber: string, otp: string) {
  if (!process.env.PHILSMS_API_KEY) {
    throw new Error("PHILSMS_API_KEY is missing");
  }

  const recipient = normalizeSmsPhone(phoneNumber);
  const message = `Your Confidex verification code is ${otp}. Do not share this code with anyone.`;

  const response = await fetch(
    "https://dashboard.philsms.com/api/v3/sms/send",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.PHILSMS_API_KEY}`,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        recipient,
        sender_id: "PhilSMS",
        type: "plain",
        message,
      }),
      signal: AbortSignal.timeout(10000),
    },
  );

  const data = await safeReadResponse(response);
  console.log("PhilSMS response:", data);

  if (!response.ok || data?.status === "error") {
    throw new Error(data?.message || `Failed to send SMS (${response.status})`);
  }

  return data;
}
