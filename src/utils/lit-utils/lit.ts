"use client";

import * as LitJsSdk from "@lit-protocol/lit-node-client";
import { AccessControlConditions } from "@lit-protocol/types";
import { GetWalletClientResult } from "@wagmi/core";

import { signAndSaveAuthMessage } from "./signature";

const client = new LitJsSdk.LitNodeClient({
  litNetwork: "cayenne",
});

class Lit {
  litNodeClient: LitJsSdk.LitNodeClient;
  chain;

  constructor(chain: string = "mumbai") {
    this.chain = chain;
    this.litNodeClient = client;
  }

  async connect() {
    await this.litNodeClient.connect();
  }

  // We use AccessControlConditions, not to be confused with EVMContractConditions
  async encrypt(
    client: GetWalletClientResult,
    accessControlConditions: AccessControlConditions,
    message: string,
  ) {
    if (!this.litNodeClient.connectedNodes) {
      await this.connect();
    }

    const authSig = await signAndSaveAuthMessage({
      web3: client,
      expiration: new Date(Date.now() + 1000 * 60 * 60 * 24).toISOString(),
    });
    const { ciphertext, dataToEncryptHash } = await LitJsSdk.encryptString(
      {
        accessControlConditions,
        authSig,
        chain: this.chain,
        dataToEncrypt: message,
      },
      this.litNodeClient,
    );

    return {
      ciphertext,
      dataToEncryptHash,
    };
  }
}

const lit = new Lit();

export default lit;
