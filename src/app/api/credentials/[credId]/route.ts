import axios from "axios";
import { ethers } from "ethers";

import { generateUUIDwithTimestamp } from "@/utils/uuid";

import { fetchStats, fetchTopLanguages } from "../../route";

interface Claim {
  id: string;
  platform: string;
  criteria: string;
  condition: string;
  value: any;
}

interface Credential {
  id: string;
  author: string;
  platform: string;
  description: string;
  issueTime: string;
  expiryTime: string;
  userAddress: string;
  claims?: Claim[];
}

const signerPrivateKey = process.env.NEXT_PRIVATE_SIGNER_KEY || ("0x" as `0x${string}`);

async function createCredential(userAddress: string, claims: Claim[]) {
  const currentTimestamp = (new Date().getTime() / 1000) | 0;
  const expiryTimestamp = currentTimestamp + 30 * 24 * 60 * 60;

  const signer = new ethers.Wallet(signerPrivateKey);

  const credential: Credential = {
    id: generateUUIDwithTimestamp(),
    author: "Talentlayer Core Team",
    platform: "github.com",
    description:
      "This credential validates user's programming skills and his open source contributions",
    issueTime: currentTimestamp.toString(),
    expiryTime: expiryTimestamp.toString(),
    userAddress,
  };

  credential.claims = claims;
  
  const credentialHash1 = ethers.utils.hashMessage(JSON.stringify(credential));
  const signature1 = await signer.signMessage(credentialHash1);

  const credentialHash2 = ethers.utils.hashMessage(JSON.stringify(credential));
  const signature2 = await signer.signMessage(credentialHash2);

  return {
    id: generateUUIDwithTimestamp(),
    issuer: await signer.getAddress(),
    signature1,
    signature2,
    credential,
  };
}

async function createClaims(token: string) {
  let claims: Claim[] = [];

  const options = {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  };

  const { data: userData } = await axios.get("https://api.github.com/user", options);

  const createdAt = new Date(userData.created_at);
  const createdAtMonth = new Date(createdAt.getFullYear(), createdAt.getMonth());

  const accountCreationClaim = {
    id: generateUUIDwithTimestamp(),
    platform: "github.com",
    criteria: "accountCreation",
    condition: "==",
    value: createdAtMonth.toISOString(),
  };

  claims.push(accountCreationClaim);

  if (userData.followers > 0) {
    const followersClaim = {
      id: generateUUIDwithTimestamp(),
      platform: "github.com",
      criteria: "followers",
      condition: ">=",
      value:
        userData.followers > 100 ? Math.floor(userData.followers / 10) * 10 : userData.followers,
    };

    claims.push(followersClaim);
  }

  const stats = await fetchStats(userData.login, true, true, true, true, token);

  const matrixPoints = ["totalStars", "totalPRsMerged", "totalCommits"];

  if (stats) {
    for (const matrixPoint of matrixPoints) {
      if ((stats as any)[matrixPoint] > 0) {
        claims.push({
          id: generateUUIDwithTimestamp(),
          platform: "github.com",
          criteria: matrixPoint,
          condition: "==",
          value: (stats as any)[matrixPoint],
        });
      }
    }
  }

  const topLanguages = await fetchTopLanguages(userData.login, token);

  const top5Languages = Object.keys(topLanguages).slice(0, 5);
  console.log(top5Languages);

  if (top5Languages.length != 0) {
    claims.push({
      id: generateUUIDwithTimestamp(),
      platform: "github.com",
      criteria: "top5Languages",
      condition: "==",
      value: top5Languages,
    });
  }

  return claims;
}

export async function POST(request: Request) {
  const clientId = process.env.NEXT_PUBLIC_GITHUB_OAUTH_CLIENT_ID || "";
  const clientSecret = process.env.NEXT_PRIVATE_GITHUB_OAUTH_CLIENT_SECRET || "";
  const { address, code } = await request.json();

  if (!ethers.utils.isAddress(address)) {
    return Response.json({ message: "invalid address" }, { status: 400 });
  }

  const userAddress = ethers.utils.getAddress(address);

  try {
    const { data } = await axios.post(
      "https://github.com/login/oauth/access_token",
      {
        client_id: clientId,
        client_secret: clientSecret,
        code,
      },
      {
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
      },
    );

    if (data.error) return Response.json({ data }, { status: 400 });

    const claims = await createClaims(data.access_token);
    const credential = await createCredential(userAddress, claims);

    return Response.json({ credential });
  } catch (e: any) {
    return Response.json({ data: e }, { status: 500 });
  }
}
