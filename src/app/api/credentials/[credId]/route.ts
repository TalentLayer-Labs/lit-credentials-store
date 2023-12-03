import axios from "axios";
import { ethers } from "ethers";

import { fetchStats } from "../../route";
import fetchTopLanguages from "../../route1";

// {
//   login: 'yashgo0018',
//   id: 39233126,
//   node_id: 'MDQ6VXNlcjM5MjMzMTI2',
//   avatar_url: 'https://avatars.githubusercontent.com/u/39233126?v=4',
//   gravatar_id: '',
//   url: 'https://api.github.com/users/yashgo0018',
//   html_url: 'https://github.com/yashgo0018',
//   followers_url: 'https://api.github.com/users/yashgo0018/followers',
//   following_url: 'https://api.github.com/users/yashgo0018/following{/other_user}',
//   gists_url: 'https://api.github.com/users/yashgo0018/gists{/gist_id}',
//   starred_url: 'https://api.github.com/users/yashgo0018/starred{/owner}{/repo}',
//   subscriptions_url: 'https://api.github.com/users/yashgo0018/subscriptions',
//   organizations_url: 'https://api.github.com/users/yashgo0018/orgs',
//   repos_url: 'https://api.github.com/users/yashgo0018/repos',
//   events_url: 'https://api.github.com/users/yashgo0018/events{/privacy}',
//   received_events_url: 'https://api.github.com/users/yashgo0018/received_events',
//   type: 'User',
//   site_admin: false,
//   name: 'Yash Goyal',
//   company: null,
//   blog: 'yashgoyal.dev',
//   location: null,
//   email: 'yashgo0018@gmail.com',
//   hireable: true,
//   bio: 'Blockchain Developer, Machine Learning Engineer.',
//   twitter_username: null,
//   public_repos: 61,
//   public_gists: 6,
//   followers: 27,
//   following: 16,
//   created_at: '2018-05-13T07:03:07Z',
//   updated_at: '2023-11-02T12:40:37Z',
//   private_gists: 1,
//   total_private_repos: 11,
//   owned_private_repos: 9,
//   disk_usage: 192197,
//   collaborators: 2,
//   two_factor_authentication: false,
//   plan: {
//     name: 'pro',
//     space: 976562499,
//     collaborators: 0,
//     private_repos: 9999
//   }
// }

interface Claim {
  platform: string;
  criteria: string;
  condition: string;
  value: any;
}

interface Credential {
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

  console.log(currentTimestamp);

  const signer = new ethers.Wallet(signerPrivateKey);

  console.log(signer);

  const credential: Credential = {
    author: "Talentlayer Core Team",
    platform: "github.com",
    description:
      "This credential validates user's programming skills and his open source contributions",
    issueTime: currentTimestamp.toString(),
    expiryTime: expiryTimestamp.toString(),
    userAddress,
  };

  console.log(credential);

  const credentialHash1 = ethers.utils.hashMessage(JSON.stringify(credential));
  console.log(credentialHash1);
  const signature1 = await signer.signMessage(credentialHash1);
  console.log(signature1);

  credential.claims = claims;

  const credentialHash2 = ethers.utils.hashMessage(JSON.stringify(credential));
  const signature2 = await signer.signMessage(credentialHash2);

  return {
    issuer: await signer.getAddress(),
    signature1,
    signature2,
    credential,
  };
}

async function generateClaims(token: string) {
  let claims: Claim[] = [];

  const options = {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  };

  console.log(token);

  const { data: userData } = await axios.get("https://api.github.com/user", options);

  const createdAt = new Date(userData.created_at);
  const createdAtMonth = new Date(createdAt.getFullYear(), createdAt.getMonth());

  const accountCreationClaim = {
    platform: "github.com",
    criteria: "accountCreation",
    condition: "==",
    value: createdAtMonth.toISOString(),
  };

  claims.push(accountCreationClaim);

  if (userData.followers > 0) {
    const followersClaim = {
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
          platform: "github.com",
          criteria: matrixPoint,
          condition: "==",
          value: (stats as any)[matrixPoint],
        });
      }
    }
  }

  // TODO: experience one now
  const topLanguages = await fetchTopLanguages(userData.login, token);

  const top5Languages = Object.keys(topLanguages).slice(0, 5);
  console.log(top5Languages);

  if (top5Languages.length != 0) {
    claims.push({
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

    console.log("A");

    // TODO: create credentials here
    const claims = await generateClaims(data.access_token);
    console.log("A");
    const credential = await createCredential(userAddress, claims);
    console.log("C");

    return Response.json({ credential });
  } catch (e: any) {
    return Response.json({ data: e }, { status: 500 });
  }
}

// const stats = await fetchStats(
//   username,
//   parseBoolean(include_all_commits),
//   parseArray(exclude_repo),
//   showStats.includes("prs_merged") ||
//     showStats.includes("prs_merged_percentage"),
//   showStats.includes("discussions_started"),
//   showStats.includes("discussions_answered"),
// );
