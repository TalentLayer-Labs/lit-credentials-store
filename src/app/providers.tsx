"use client";

import { getDefaultWallets, RainbowKitProvider } from "@rainbow-me/rainbowkit";
import { ThemeProvider } from "next-themes";
import { ThemeProviderProps } from "next-themes/dist/types";
import { WagmiConfig, configureChains, createConfig } from "wagmi";
import { infuraProvider } from "wagmi/providers/infura";
import { publicProvider } from "wagmi/providers/public";

import { CHAIN } from "@/constants/chains";
import { env } from "@/env.mjs";

import { UserProvider } from "./context/userContext";

const { chains, publicClient, webSocketPublicClient } = configureChains(
  [CHAIN],
  [infuraProvider({ apiKey: env.NEXT_PUBLIC_INFURA_ID }), publicProvider()],
);

const { connectors } = getDefaultWallets({
  appName: "Lit Credential Store",
  projectId: env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID,
  chains,
});

const config = createConfig({
  autoConnect: true,
  connectors,
  publicClient,
  webSocketPublicClient,
  persister: null,
});

export function Providers({ children, ...props }: ThemeProviderProps) {
  return (
    <WagmiConfig config={config}>
      <RainbowKitProvider chains={chains}>
        <UserProvider>
          <ThemeProvider {...props}>{children}</ThemeProvider>
        </UserProvider>
      </RainbowKitProvider>
    </WagmiConfig>
  );
}
