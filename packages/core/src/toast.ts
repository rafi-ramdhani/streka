// Toast subtitle wording, verbatim from the prototype (its dashes included).
// Product rule 3: offline changes copy only, never behavior.

export interface ToastContext {
  account: boolean;
  online: boolean;
  firstLog: boolean;
  streakN: number;
}

export function toastSub({ account, online, firstLog, streakN }: ToastContext): string {
  if (firstLog) {
    const line =
      streakN === 1 ? 'Streak started — day 1' : `Streak kept — day ${streakN}`;
    const suffix = !account ? 'on this phone' : online ? 'synced' : 'will sync';
    return `${line} · ${suffix}`;
  }
  if (!account) return 'Saved on this phone';
  return online ? 'Synced to your account' : 'Saved — will sync when online';
}
