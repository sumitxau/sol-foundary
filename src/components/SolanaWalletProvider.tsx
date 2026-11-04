"use client";

import { createContext, useContext, useState, useMemo } from "react";
import { ConnectionProvider, WalletProvider } from "@solana/wallet-adapter-react";
import { WalletModalProvider } from "@solana/wallet-adapter-react-ui";
import "@solana/wallet-adapter-react-ui/styles.css";
import { NETWORKS, RPC_ENDPOINTS } from "@/config/constants";

const NetworkContext = createContext({
  network: NETWORKS.MAINNET,
  toggleNetwork: () => {},
});

export function useNetwork() {
  return useContext(NetworkContext);
}

export function SolanaWalletProvider({ children }) {
  // Default is Mainnet;
  const [network, setNetwork] = useState(NETWORKS.MAINNET);
  const endpoint = RPC_ENDPOINTS[network];
  const wallets = useMemo(() => [], []);

  function toggleNetwork() {
    setNetwork((prev) =>
      prev === NETWORKS.MAINNET ? NETWORKS.DEVNET : NETWORKS.MAINNET
    );
  }

  return (
    <NetworkContext.Provider value={{ network, toggleNetwork }}>
      <ConnectionProvider endpoint={endpoint}>
        <WalletProvider wallets={wallets} autoConnect>
          <WalletModalProvider>{children}</WalletModalProvider>
        </WalletProvider>
      </ConnectionProvider>
    </NetworkContext.Provider>
  );
}
