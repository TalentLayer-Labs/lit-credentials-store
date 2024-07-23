import { ICredential } from "@/interfaces/Credential";

/* eslint-disable unicorn/filename-case */
export interface CredentialService {
  getAuthenticationUrl(redirectUrl: string): string;
  fetchAccessToken(code: string, address: string): Promise<string>;
  fetchCredential(accessToken: string, address: string, client: any): Promise<ICredential>;
}
