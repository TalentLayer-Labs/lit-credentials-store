## ℹ️ Introduction to the External Data Access Control & Credential Module
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
- A tool and standard framework that lets developers create diverse access-controlled off-chain data attestations for their hiring use cases
- A system that can be configured to pull in data from any third-party source
- A system that can be compatible with existing DID and user identity solutions

## ⭐ Implementing the External Data Access Control & Credential Module for your use case
The External Data Access Control & Credential Module is a standard framework that lets developers create diverse access controlled off-chain data attestations for their hiring use cases. We will use Lit actions to run the serverless function to check the user's data from external data sources, and then generate credentials attesting to the data in the Lit actions. Then Lit access control will then be used to encrypt and decrypt the user's data.

**The issuer:** A Lit action with immutable code that connects to an external API which generates an EAS attestation

**The holder:** Any DID

**Schema:** The schema of the data can be configured as builders please.

**Privacy rule:** The privacy rule should be generic, so as to be configurable by builders.

## 🛠️ Demo Implementation: Github Data in TalentLayer IDs
This demo is one possible implementation of External Data Access Control & Credential Module; using it for importing off-chain data from Github and associating it with TalentLayer. This demo is a [Next.js](https://nextjs.org/) project bootstrapped with [`create-next-app`](https://github.com/vercel/next.js/tree/canary/packages/create-next-app).

**The issuer:** A Lit action with immutable code that connects to the Github API which generate an EAS attestation

**The holder:** A TalentLayer ID

**Schema:** The schema of the data will be compatible with TalentLayer and github API

**Privacy rule:** The privacy rule will be as follows: If a user holds a particular NFT linked to the DID, the info is public inside the community

## Getting Started

First, run the development server:

```bash
bun install && bun run dev
```

ps: bun is needed because yarn, pnpm and npm generates an error with the contracts-sdk package.
See [this issue](https://github.com/LIT-Protocol/Issues-and-Reports/issues/31#issuecomment-2113405611) for more info.

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

