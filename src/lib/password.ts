export type PasswordStrength = 'empty' | 'tooShort' | 'needMix' | 'ok' | 'strong';

/** Mirrors the web rule: at least 8 characters, with a letter and a number. */
export function passwordStrength(pw: string): PasswordStrength {
  if (!pw) return 'empty';
  if (pw.length < 8) return 'tooShort';
  if (!/[A-Za-z]/.test(pw) || !/\d/.test(pw)) return 'needMix';
  const classes = [/[a-z]/, /[A-Z]/, /\d/, /[^A-Za-z0-9]/].filter((r) => r.test(pw)).length;
  return pw.length >= 12 || classes >= 3 ? 'strong' : 'ok';
}

export const isAcceptablePassword = (pw: string) => {
  const s = passwordStrength(pw);
  return s === 'ok' || s === 'strong';
};
