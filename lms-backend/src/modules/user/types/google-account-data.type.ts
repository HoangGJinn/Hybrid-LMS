/** Identity of the Google account that signs in to a pre-provisioned user. */
export interface GoogleAccountData {
  readonly ssoId: string;
  readonly ssoProvider: string;
  readonly avatarUrl: string | null;
  readonly fullName: string;
}
