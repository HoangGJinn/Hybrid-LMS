export interface ZaloStatus {
  linked: boolean;
  linkedAt: string | null;
}

export interface ZaloLinkCode {
  code: string;
  expiresInSeconds: number;
}