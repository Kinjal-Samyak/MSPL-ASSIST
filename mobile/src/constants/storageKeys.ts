/** Key names for SecureStore entries. Centralised so a typo can't silently create a second key. */
export const STORAGE_KEYS = {
  authSession: 'mspl.auth.session',
} as const;

export type StorageKey = (typeof STORAGE_KEYS)[keyof typeof STORAGE_KEYS];
