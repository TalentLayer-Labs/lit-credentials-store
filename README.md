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
npm run dev
# or
yarn dev
# or
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/basic-features/font-optimization) to automatically optimize and load Inter, a custom Google Font.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js/) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/deployment) for more details.
