"use client";
import { usePathname } from "next/navigation";

import dynamic from "next/dynamic";
import { useNetwork } from "@/components/SolanaWalletProvider";
import { NETWORKS } from "@/config/constants";
import Link from "next/link";




const WalletMultiButton = dynamic(
  async () =>
    (await import("@solana/wallet-adapter-react-ui")).WalletMultiButton,
  { ssr: false }
);

export function Navbar() {
    const pathname = usePathname(); 
  const { network, toggleNetwork } = useNetwork();
  const isMainnet = network === NETWORKS.MAINNET;

  return (
  
    <header className="navbar">
      <div className="brand-group">
        <span className="status-dot" />
        <Link href="/" className="brand-title">
          SolFoundry
        </Link>
        <nav className="nav-links">
          <Link
            href="/"
            className={`nav-item ${pathname === "/" ? "nav-item-active" : ""}`}
          >
             LAUNCHPAD
          </Link>
          <Link
            href="/swap"
            className={`nav-item ${
              pathname === "/swap" ? "nav-item-active" : ""
            }`}
          >
             DEX SWAP & LP
          </Link>
        </nav>
      </div>

     <div className="nav-actions">
        <span className="badge badge-mainnet">
          SOLANA MAINNET
        </span>
        <WalletMultiButton />
      </div>
    </header>
  );
}
