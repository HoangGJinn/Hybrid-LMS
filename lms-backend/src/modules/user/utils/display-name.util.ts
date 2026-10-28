/**
 * Name shown for an account whose real name is not known yet: the part of the email before the "@".
 * A pre-provisioned account without a name gets this; the first Google login replaces it.
 */
export const deriveDisplayName = (email: string): string =>
  email.split('@')[0] || email;
