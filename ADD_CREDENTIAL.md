# Lit Credential Store

## Prerequisites

Get started by following the [README](./README.md) instructions.
You should have the project running on [http://localhost:3000](http://localhost:3000) before starting.


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
}
```

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

