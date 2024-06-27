/* eslint-disable unicorn/filename-case */
import { ExecuteJsResponse } from "@lit-protocol/types";
import axios from "axios";
import { ethers } from "ethers";

import { FIXED_PKP } from "@/constants/config";
import { lit } from "@/utils/lit-utils/lit";
import { signAndSaveAuthMessage } from "@/utils/lit-utils/signature";

import { CredentialService } from "./CredentialService";


export class GitHubService implements CredentialService {
  private clientId: string;
  private scope: string;
  private authenticationUrl: string;
  private credId: string;

  constructor(clientId: string, scope: string, authenticationUrl: string, credId: string) {
    this.clientId = clientId;
    this.scope = scope;
    this.authenticationUrl = authenticationUrl;
    this.credId = credId;
  }

  getAuthenticationUrl(redirectUrl: string): string {
    const params = new URLSearchParams({
      client_id: this.clientId,
      scope: this.scope,
      redirect_url: redirectUrl,
    });

    return `${this.authenticationUrl}?${params.toString()}`;
  }

  async fetchAccessToken(code: string, address: string): Promise<string> {
    const { data } = await axios.post(`/api/credentials/${this.credId}`, { code, address });
    return data.data.access_token;
  }

  async fetchCredential(accessToken: string, address: string, client: any): Promise<Credential> {
    console.log("Fetching credential from GitHub...");
    const authSig = await signAndSaveAuthMessage({
      web3: client,
      expiration: new Date(Date.now() + 1000 * 60 * 60 * 24).toISOString(),
    });

    const { signatures, response } = await this.initLitAction(accessToken, address, authSig, client) as ExecuteJsResponse;
    const responseData = response as any;

    return {
      id: responseData.id,
      credential: responseData.credential,
      signature1: signatures.sig1,
      issuer: 'Lit Protocol',
    } as Credential;
  }

  private async initLitAction(githubAccessToken: string, userAddress: string, authSig: any, client: any) {
    const pkp = await this.getPkp(client);
    const sigName = "sig1";

    return await lit.litNodeClient.executeJs({
      ipfsId: "QmTD4B6hQ21ft7tfztiPfwthAq5npfh8Ae3btYozcdDuiY",
      authSig,
      jsParams: {
        toSign: ethers.utils.arrayify(ethers.utils.keccak256(ethers.utils.toUtf8Bytes("Hello world"))),
        publicKey: pkp,
        sigName,
        githubAccessToken,
        userAddress,
      },
    });
  }

  private async getPkp(client: any): Promise<string> {
    return FIXED_PKP ? FIXED_PKP : (await lit.mintPkp(client)).publicKey;
  }
}
