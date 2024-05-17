import { hardhat, polygon } from "wagmi/chains";

import { polygonAmoy } from "./chains";

export const EXPLORER_URL: Record<number, string> = {
  [hardhat.id]: "",
  [polygonAmoy.id]: "https://amoy.polygonscan.com",
  [polygon.id]: "https://polygonscan.com",
};

export const getAddressExplorerLink = (chainId: number, address: string) => {
  return `${EXPLORER_URL[chainId]}/address/${address}`;
};
