import { Buffer } from "buffer";
import { Connection, PublicKey, VersionedTransaction } from "@solana/web3.js";
import { WalletContextState } from "@solana/wallet-adapter-react";
import { getAssociatedTokenAddressSync, TOKEN_PROGRAM_ID } from "@solana/spl-token";
import { TREASURY_WALLET_ADDRESS, SWAP_FEE_BPS } from "@/config/constants";

const JUPITER_QUOTE_API = "https://quote-api.jup.ag/v6/quote";
const JUPITER_SWAP_API = "https://quote-api.jup.ag/v6/swap";

export interface JupiterQuoteResponse {
  inputMint: string;
  inAmount: string;
  outputMint: string;
  outAmount: string;
  otherAmountThreshold: string;
  swapMode: string;
  slippageBps: number;
  platformFee?: {
    amount: string;
    feeBps: number;
  };
  priceImpactPct: string;
  routePlan: Array<{
    swapInfo: {
      ammKey: string;
      label: string;
      inputMint: string;
      outputMint: string;
      inAmount: string;
      outAmount: string;
      feeAmount: string;
      feeMint: string;
    };
    percent: number;
  }>;
}

export async function fetchJupiterQuote({
  inputMint,
  outputMint,
  amountUi,
  inputDecimals,
  slippageBps = 50,
}: {
  inputMint: string;
  outputMint: string;
  amountUi: number;
  inputDecimals: number;
  slippageBps?: number;
}): Promise<JupiterQuoteResponse> {
  if (!amountUi || amountUi <= 0) {
    throw new Error("Enter a valid swap amount greater than 0.");
  }
  if (inputMint === outputMint) {
    throw new Error("Input and Output token mints cannot be identical.");
  }

  const rawAmount = Math.round(amountUi * 10 ** inputDecimals);

  // platform fee (20 bps = 0.20%) into Jupiter's route calculator
  const url = `${JUPITER_QUOTE_API}?inputMint=${inputMint.trim()}&outputMint=${outputMint.trim()}&amount=${rawAmount}&slippageBps=${slippageBps}&platformFeeBps=${SWAP_FEE_BPS}`;

  const res = await fetch(url);
  if (!res.ok) {
    throw new Error("Unable to fetch route quote for this token pair.");
  }

  const data: JupiterQuoteResponse = await res.json();
  return data;
}

export async function executeJupiterSwap({
  connection,
  wallet,
  quoteResponse,
}: {
  connection: Connection;
  wallet: WalletContextState;
  quoteResponse: JupiterQuoteResponse;
}): Promise<string> {
  if (!wallet || !wallet.publicKey) {
    throw new Error("Connect your Solana wallet to execute swap.");
  }

  // Derive your treasury's token account to receive the 0.20% fee
  const treasuryPubkey = new PublicKey(TREASURY_WALLET_ADDRESS);
  const feeMintPubkey = new PublicKey(quoteResponse.outputMint);
  const feeAccount = getAssociatedTokenAddressSync(
    feeMintPubkey,
    treasuryPubkey,
    true,
    TOKEN_PROGRAM_ID
  );

  const swapRequestBody: Record<string, unknown> = {
    quoteResponse,
    userPublicKey: wallet.publicKey.toBase58(),
    wrapAndUnwrapSol: true,
    dynamicComputeUnitLimit: true,
    prioritizationFeeLamports: "auto",
  };

  // Only pass feeAccount if Jupiter confirmed the platform fee in the quote
  if (quoteResponse.platformFee) {
    swapRequestBody.feeAccount = feeAccount.toBase58();
  }

  const res = await fetch(JUPITER_SWAP_API, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(swapRequestBody),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Failed to build swap transaction: ${errText}`);
  }

  const { swapTransaction } = await res.json();
  const swapTransactionBuf = Buffer.from(swapTransaction, "base64");
  const transaction = VersionedTransaction.deserialize(swapTransactionBuf);

  const txSignature = await wallet.sendTransaction(transaction, connection);
  return txSignature;
}

export function getRaydiumPoolCreateUrl(mintAddress: string): string {
  const cleanMint = mintAddress.trim();
  return cleanMint
    ? `https://raydium.io/liquidity/create-pool/?token=${cleanMint}`
    : "https://raydium.io/liquidity/create-pool/";
}

export function getMeteoraPoolCreateUrl(): string {
  return "https://app.meteora.ag/pools/create";
}