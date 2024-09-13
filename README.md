# Lit Credential Store

## Introduction

Today, diverse teams building in Web3 require access to third-party off-chain data. This data is often personal in nature and touches various regulatory frameworks including GDPR. Authenticity, access control and encryption of this data is necessary - currently there are no standard methods for enabling this.

The External Data Access Control & Credential Module is a framework and developer toolkit for…
- Connecting to existing decentralized identity (DID) systems
- On-ramping third-party off-chain data and creating an attestation of authenticity for said data, associated with a specific DID
- Managing access control to the third-party data

**Problem:**
- Many teams need to bring in off-chain personal data for use in their DAPP
- Off-chain information often includes sensitive personal data that must be accessed and controlled for regulatory compliance and privacy reasons
- There is no accessible method for teams to import off-chain personal data and natively gate access control

**Solution:**
- A tool and standard framework that lets developers create diverse access-controlled off-chain data attestations
- A system that can be configured to pull in data from any third-party source
- A system that can be compatible with existing DID and user identity solutions

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


## Adding a New Integration

To add a new integration, see [ADD_CREDENTIAL.md](./ADD_CREDENTIAL.md).

## Licence

GNU GENERAL PUBLIC LICENSE, see [LICENSE](./LICENSE) for more information.
