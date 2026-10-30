export const TREASURY_WALLET_ADDRESS =
  process.env.NEXT_PUBLIC_TREASURY_WALLET || "F3FeCPujtrVpLyNynmXQTAM4okuvMmi9TyTFziMRaFyL";

export const NETWORKS = {
  MAINNET: "mainnet-beta",
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
