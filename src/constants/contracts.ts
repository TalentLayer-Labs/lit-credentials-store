import { hardhat, polygon, polygonMumbai } from "wagmi/chains";

export const STORAGE_ADDRESS: Record<number, `0x${string}`> = {
  [hardhat.id]: "0x5fbdb2315678afecb367f032d93f642f64180aa3",
  [polygonMumbai.id]: "0x",
  [polygon.id]: "0x",
};
