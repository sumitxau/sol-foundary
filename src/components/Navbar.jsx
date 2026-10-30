"use client";

import dynamic from "next/dynamic";
import { useNetwork } from "@/components/SolanaWalletProvider";
import { NETWORKS } from "@/config/constants";

const WalletMultiButton = dynamic(
  async () =>
    (await import("@solana/wallet-adapter-react-ui")).WalletMultiButton,
  { ssr: false }
);

export function Navbar() {
  const { network, toggleNetwork } = useNetwork();
  const isMainnet = network === NETWORKS.MAINNET;

  return (
    <header className="navbar">
      <div className="brand-group">
        <span className="status-dot" />
        <span className="brand-title">SolFoundry</span>
        <nav className="nav-links">
          <span className="nav-item nav-item-active">LAUNCHPAD</span>
          <span className="nav-item nav-item-disabled" title="Coming in v0.2">
            LIQUIDITY & SWAP
          </span>
        </nav>
      </div>

      <div className="nav-actions">
        <button
          type="button"
          onClick={toggleNetwork}
          className={`network-btn ${isMainnet ? "network-mainnet" : "network-devnet"}`}
        >
          {isMainnet ? "MAINNET" : "DEVNET"} // SWITCH
        </button>
        <WalletMultiButton />
      </div>
    </header>
  );
}
