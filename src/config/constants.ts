function requireEnv(value: string | undefined, name: string): string {
  if (!value) {
    throw new Error(`Missing environment variable: ${name}`);
  }

  return value;
}

export const TREASURY_WALLET_ADDRESS: string = requireEnv(
  process.env.NEXT_PUBLIC_TREASURY_WALLET,
  "NEXT_PUBLIC_TREASURY_WALLET"
);

export const SOLANA_RPC_URL: string = requireEnv(
  process.env.NEXT_PUBLIC_SOLANA_RPC,
  "NEXT_PUBLIC_SOLANA_RPC"
);

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
