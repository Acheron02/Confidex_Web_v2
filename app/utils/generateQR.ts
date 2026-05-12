// app/utils/qr.ts
export const generateQrCode = async (userId: string) => {
  if (!userId) throw new Error("Invalid user ID");

  try {
    const res = await fetch("/api/qr-tokens/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId }),
    });

    const data = await res.json();

    if (!res.ok || !data.token) {
      throw new Error(data.error || "Failed to generate QR token");
    }

    return data.token; // Return the token for embedding in QR
  } catch (err) {
    console.error("QR Code generation error:", err);
    throw err; // Let the caller handle errors
  }
};
