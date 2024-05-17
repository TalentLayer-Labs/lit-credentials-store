# Lit Credential Store

This project is a toolkit that lets developers create diverse access-controlled off-chain data attestations using [LitProtocol](https://litprotocol.com/).

Users gives access to their github to a secured LitAction. The Lit's MPC fetches user's data and gives a trust score.

Finally, the data can stored and encrypted on Ipfs and added to a user profile : the [TalentLayerID](https://docs.talentlayer.org/introduction/basics/what-is-talentlayer-id) in our case.


## Getting Started

First, copy/paste and fill the `.env.example` as `.env`.


You can then run the development server:

```bash
bun install && bun run dev
```

ps: bun is needed because yarn, pnpm and npm generates an error with the contracts-sdk package.
See [this issue](https://github.com/LIT-Protocol/Issues-and-Reports/issues/31#issuecomment-2113405611) for more info.

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## File structure

ps: it's a nextjs project created using `create-next-app`.

Key files:

- `src/app/credentials/[credId]/CredentialPage.tsx`: Main react component for credential management.
- `src/services/CredentialService.ts`: Interface for credential services.
- `src/services/GitHubService.ts`: GitHub integration implementation (our example).
- `src/utils/`: Utility functions for IPFS, encryption, and signatures.
- `src/utils/lit-utils`: Utilities for interacting with LIT

## Adding a new credential

To add a new credential, you will need to :
- Create the associated service
- Add the new service to `available-cred.ts`
- Create the LitAction (for secured fetching)
- Generate and upload the LitAction to ipfs

## Adding a New Integration

### Step 1: Create the Lit Action

- Create a new lit action file in `src/utils/lit-utils` (e.g., `3-lit-action-gitlab.ts`). You can use the github file as example.
- Add the new claims in `9-lit-action-index.js`.
- Generate the new file running `bun run generate-litaction`. This will generate a new file in `src/utils/lit-utils/out` based on all integrations and the utils file
- Upload this file to IPFS and get the `CID` (we will need it later)

You can learn more about LitAction on the [Lit Protocol documentation](https://developer.litprotocol.com/v3/sdk/serverless-signing/quick-start).


### Step 2: Create the associated service

Create a new service file in `./src/services` (e.g., `GitlabService.ts`) that implements `CredentialService` with : 
- `getAuthenticationUrl`
- `fetchAccessToken`
- `fetchCredential`

You will need to add your ipfs cid in this file.

For example:

```typescript
import { ExecuteJsResponse } from "@lit-protocol/types";
import axios from "axios";
import { ethers } from "ethers";

import { FIXED_PKP } from "@/constants/config";
import { lit } from "@/utils/lit-utils/lit";
import { signAndSaveAuthMessage } from "@/utils/lit-utils/signature";

import { CredentialService } from "./CredentialService";


export class GitlabService implements CredentialService {
  constructor(private clientId: string, private scope: string, private authUrl: string, private credId: string) {}

  getAuthenticationUrl(redirectUrl: string): string {
    const params = new URLSearchParams({ client_id: this.clientId, scope: this.scope, redirect_url: redirectUrl });
    return `${this.authUrl}?${params.toString()}`;
  }

  async fetchAccessToken(code: string, address: string): Promise<string> {
    const { data } = await axios.post(`/api/credentials/${this.credId}`, { code, address });
    return data.data.access_token;
  }

  async fetchCredential(accessToken: string, address: string, client: any): Promise<Credential> {
    const authSig = await signAndSaveAuthMessage({ web3: client, expiration: new Date(Date.now() + 86400000).toISOString() });
    const { signatures, response } = await this.initLitAction(accessToken, address, authSig, client) as ExecuteJsResponse;

    return { id: response.id, credential: response.credential, signature1: signatures.sig1, issuer: 'Lit Protocol' } as Credential;
  }

  private async initLitAction(accessToken: string, userAddress: string, authSig: any, client: any) {
    const pkp = await this.getPkp(client);
    const sigName = "sig1";

    return await lit.litNodeClient.executeJs({
      ipfsId: "", // TODO: add here your ipfs CID
      authSig,
      jsParams: { toSign: ethers.utils.arrayify(ethers.utils.keccak256(ethers.utils.toUtf8Bytes("Hello world"))), publicKey: pkp, sigName, accessToken, userAddress },
    });
  }

  private async getPkp(client: any): Promise<string> {
    return FIXED_PKP ? FIXED_PKP : (await lit.mintPkp(client)).publicKey;
  }
}
```

Ps: you can configure a `FIXED_PKP` by minting one on [lit explorer](https://explorer.litprotocol.com/mint-pkp). This will be used instead to sign transactions. If you don't use it, it will automatically fallback to the `mintPkp` function. To run it, the user needs to be on the Lit "Chronicle" Testnet and have [Lit Faucet](https://faucet.litprotocol.com/)

### Step 3: Update availableCreds

Add the new service configuration in `src/available-cred.ts`:

```Typescript
export const availableCreds = {
  github: {
    clientId: "your-github-client-id",
    scope: "user:email",
    authenticationUrl: "https://github.com/login/oauth/authorize",
  },
  // Add your new service here
  gitlab: {
    name: "Gitlab or Your service name",
    clientId: "your-myservice-client-id",
    scope: "your-scope",
    authenticationUrl: "https://myservice.com/oauth/authorize",
  },
};
```

### Step 4: Use the New Service in CredentialPage

Update `CredentialPage.tsx` to include the new service:

```Typescript
import { GitlabService } from "@/services/GitlabService"; // Import your new service

// Inside the CredentialPage component
let service: CredentialService | null = null;

if (credId && availableCreds[credId]) {
  const { clientId, scope, authenticationUrl } = availableCreds[credId];

  switch (credId) {
    case 'github':
      service = new GitHubService(clientId, scope, authenticationUrl, credId);
      break;
    case 'myService':
      service = new GitlabService(clientId, scope, authenticationUrl, credId);
      break;
    // Add more cases for additional services
  }
}
```

You can now test your integration on [http://localhost:3000/](http://localhost:3000/)

