import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod";

export const env = createEnv({
  server: {},
  client: {
    NEXT_PUBLIC_CHAIN: z.union([
      z.literal("localhost"),
      z.literal("testnet"),
      z.literal("mainnet"),
    ]),
    NEXT_PUBLIC_TALENTLAYER_DID_ADDRESS: z.string().min(1),
    NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID: z.string().min(1),
    NEXT_PUBLIC_GITHUB_OAUTH_CLIENT_ID: z.string().min(1),
    NEXT_PUBLIC_IPFS_GATEWAY_URL: z.string(),
    NEXT_PUBLIC_BLOCKEXPLORER_LINK: z.string(),
    NEXT_PUBLIC_PINATA_JWT: z.string(),
  },
  // Only need to destructure client variables
  experimental__runtimeEnv: {
    NEXT_PUBLIC_CHAIN: process.env.NEXT_PUBLIC_CHAIN,
    NEXT_PUBLIC_TALENTLAYER_DID_ADDRESS: process.env.NEXT_PUBLIC_TALENTLAYER_DID_ADDRESS,
    NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID: process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID,
    NEXT_PUBLIC_GITHUB_OAUTH_CLIENT_ID: process.env.NEXT_PUBLIC_GITHUB_OAUTH_CLIENT_ID,
    NEXT_PUBLIC_IPFS_GATEWAY_URL: process.env.NEXT_PUBLIC_IPFS_GATEWAY_URL,
    NEXT_PUBLIC_BLOCKEXPLORER_LINK: process.env.NEXT_PUBLIC_BLOCKEXPLORER_LINK,
    NEXT_PUBLIC_PINATA_JWT: process.env.NEXT_PUBLIC_PINATA_JWT,
  },
  skipValidation: process.env.SKIP_ENV_VALIDATION === "true",
});
