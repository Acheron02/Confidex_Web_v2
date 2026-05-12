import User from "@/models/User";

/**
 * Generate a random string
 * @param length number of characters
 * @returns random string
 */
export function generateRandomString(length: number): string {
  const chars =
    "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let result = "";
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

/**
 * Generate a unique username with last 4 digits of phone placed in the middle
 * @param phoneNumber user's phone number
 * @param totalLength total username length (default 16)
 * @returns unique username
 */
export async function generateUniqueUsernameWithPhone(
  phoneNumber: string,
  totalLength = 16
): Promise<string> {
  let unique = false;
  let username = "";

  const digits = phoneNumber.replace(/\D/g, ""); // keep only numbers
  const last4 = digits.slice(-4); // last 4 digits

  const randomLength = totalLength - 4; // remaining chars for random

  while (!unique) {
    const randomPart = generateRandomString(randomLength);

    // Insert last 4 digits somewhere in the middle
    const middleIndex = Math.floor(randomPart.length / 2);
    username =
      randomPart.slice(0, middleIndex) + last4 + randomPart.slice(middleIndex);

    const exists = await User.findOne({ username });
    if (!exists) unique = true;
  }

  return username;
}
