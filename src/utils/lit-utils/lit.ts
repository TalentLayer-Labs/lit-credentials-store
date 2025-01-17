"use client";

import { AuthMethodScope, AuthMethodType } from '@lit-protocol/constants';
import { LitContracts } from '@lit-protocol/contracts-sdk';
import * as LitJsSdk from "@lit-protocol/lit-node-client";
import { AccessControlConditions } from "@lit-protocol/types";
import { GetWalletClientResult } from "@wagmi/core";
import { ethers } from 'ethers';

import { litChronicle } from '@/constants/chains';

import { signAndSaveAuthMessage } from "./signature";

class Lit {
  litNodeClient: LitJsSdk.LitNodeClient;
  chain;

  constructor(chain: string = "fuji") {
    this.chain = chain;
    this.litNodeClient = new LitJsSdk.LitNodeClient({
      litNetwork: "cayenne",
    });
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

    const authSig = await this.getAuthSig(client);
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

  async getAuthSig(client: GetWalletClientResult) {
    if (!this.litNodeClient.connectedNodes) {
      await this.connect();
    }

    const authSig = await signAndSaveAuthMessage({
      web3: client,
      expiration: new Date(Date.now() + 1000 * 60 * 60 * 24).toISOString(),
    });
    return authSig;
  }

  async mintPkp(client: GetWalletClientResult) {
    console.log("mintPkp");
    const authSig = await this.getAuthSig(client);

    // Mint a PKP and Add Permitted Scopes
    const authMethod = {
      authMethodType: AuthMethodType.EthWallet,
      accessToken: JSON.stringify(authSig),
    };

    const provider = new ethers.providers.Web3Provider(window.ethereum);
    // await provider.send("eth_requestAccounts", []);
    const ethersSigner = provider.getSigner();

    // Connect contract
    const contractClient = new LitContracts({
      signer: ethersSigner,
      network: 'cayenne',
    });
    await contractClient.connect();

    const mintInfo = await contractClient.mintWithAuth({
      authMethod: authMethod,
      scopes: [
        AuthMethodScope.SignAnything, // allow to sign Tx
        // AuthMethodScope.PersonalSign // allow only signing (EIP-191)
        // AuthMethodScope.NoPermissions, // just prove ownership
      ],
    });
    return mintInfo.pkp;
  }

  async checkLitBalance(address: string): Promise<number> {
    const provider = new ethers.providers.JsonRpcProvider(litChronicle.rpcUrls.default.http[0]);
    const balance = await provider.getBalance(address);
    return parseFloat(ethers.utils.formatEther(balance));
  }
}

const lit = new Lit();

export { lit };
