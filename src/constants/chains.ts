import { defineChain } from "viem";
import { hardhat, polygon, avalancheFuji } from "wagmi/chains";

import { env } from "@/env.mjs";

import { FIXED_PKP } from "./config";

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

export const litChronicle = defineChain({
  id: 175177,
  name: 'Chronicle - Lit Protocol Testnet',
  nativeCurrency: { name: 'testLPX', symbol: 'testLPX', decimals: 18 },
  rpcUrls: {
    default: {
      http: ['	https://chain-rpc.litprotocol.com/http'],
    },
    public: {
      http: ['	https://chain-rpc.litprotocol.com/http'],
    },
  },
  blockExplorers: {
    default: {
      name: 'PolygonScan',
      url: 'https://chain.litprotocol.com/',
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
      if (FIXED_PKP) {
        console.log("Using fixed PKP, using avalanche fuji");
        return avalancheFuji;
      } else {
        console.log("Using fixed PKP, using Lit Chronicle chain. Needed to mint a PKP");
        return litChronicle;
      }
    case "mainnet":
      return polygon;
    default:
      throw new Error("Invalid NEXT_PUBLIC_CHAIN value");
  }
};

export const CHAIN = getChain();
