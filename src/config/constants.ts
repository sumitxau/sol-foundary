export const TREASURY_WALLET_ADDRESS: string =
  process.env.NEXT_PUBLIC_TREASURY_WALLET || "F3FeCPujtrVpLyNynmXQTAM4okuvMmi9TyTFziMRaFyL";

export const NETWORKS = {
  MAINNET : "mainnet-beta",
  DEVNET: "devnet",
};

export const RPC_ENDPOINTS = {
  "mainnet-beta":
    process.env.NEXT_PUBLIC_MAINNET_RPC_URL || "https://api.mainnet-beta.solana.com",
  devnet:
    process.env.NEXT_PUBLIC_DEVNET_RPC_URL || "https://api.devnet.solana.com",
};

export const DEFAULT_DECIMALS = 9;
export const BASE_PROTOCOL_FEE_SOL = 0.01;
export const REVOKE_AUTHORITY_FEE_SOL = 0.01;
export const ESTIMATED_RENT_SOL = 0.0052;

export interface SwapToken {
  mint: string;
  symbol: string;
  name: string;
  decimals: number;
}

export const POPULAR_SWAP_TOKENS: SwapToken[] = [
  {
    mint: "So11111111111111111111111111111111111111112",
    symbol: "SOL",
    name: "Wrapped SOL",
    decimals: 9,
  },
  {
    mint: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
    symbol: "USDC",
    name: "USD Coin",
    decimals: 6,
  },
];

export const SWAP_FEE_BPS = 20;
