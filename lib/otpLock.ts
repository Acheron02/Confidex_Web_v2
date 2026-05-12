export function getOtpLockMinutes(lockLevel: number): number {
  if (lockLevel <= 1) return 1;
  if (lockLevel === 2) return 3;
  return 5;
}

export function getOtpLockMs(lockLevel: number): number {
  return getOtpLockMinutes(lockLevel) * 60 * 1000;
}

export function getRetryAfterSeconds(lockedUntil: Date): number {
  return Math.max(0, Math.ceil((lockedUntil.getTime() - Date.now()) / 1000));
}

export function formatOtpLockMessage(lockedUntil: Date): string {
  const retryAfterSeconds = getRetryAfterSeconds(lockedUntil);
  const minutes = Math.floor(retryAfterSeconds / 60);
  const seconds = retryAfterSeconds % 60;

  if (minutes > 0) {
    return `Too many incorrect OTP attempts. Try again in ${minutes}m ${seconds}s.`;
  }

  return `Too many incorrect OTP attempts. Try again in ${seconds}s.`;
}
