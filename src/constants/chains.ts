import { defineChain } from "viem";
import { hardhat, polygon } from "wagmi/chains";

import { env } from "@/env.mjs";

export const polygonAmoy = defineChain({
  id: 80002,
  name: 'Polygon Amoy',
  nativeCurrency: { name: 'MATIC', symbol: 'MATIC', decimals: 18 },
  rpcUrls: {
    default: {
      http: ['https://rpc-amoy.polygon.technology'],
    },
    public: {
      http: ['https://rpc-amoy.polygon.technology'],
    },
  },
  blockExplorers: {
    default: {
      name: 'PolygonScan',
      url: 'https://amoy.polygonscan.com/',
    },
  },
  contracts: {
    multicall3: {
      address: '0xca11bde05977b3631167028862be2a173976ca11',
      blockCreated: 3127388,
    },
  },
  testnet: true,
  network: ""
})

const getChain = () => {
  switch (env.NEXT_PUBLIC_CHAIN) {
    case "localhost":
      return hardhat;
    case "testnet":
      return polygonAmoy;
    case "mainnet":
      return polygon;
    default:
      throw new Error("Invalid NEXT_PUBLIC_CHAIN value");
  }
};

export const CHAIN = getChain();
