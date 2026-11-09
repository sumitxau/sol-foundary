
import { Buffer } from "buffer";
import {
  Connection,
  Keypair,
  PublicKey,
  SystemProgram,
  Transaction,
  LAMPORTS_PER_SOL,
} from "@solana/web3.js";

import {
  TOKEN_2022_PROGRAM_ID,
  ExtensionType,
  TYPE_SIZE,
  LENGTH_SIZE,
  AuthorityType,
  getMintLen,
  getAssociatedTokenAddressSync,
  createInitializeMetadataPointerInstruction,
  createInitializeMintInstruction,
  createAssociatedTokenAccountInstruction,
  createMintToInstruction,
  createSetAuthorityInstruction,
} from "@solana/spl-token";

import type { WalletContextState } from "@solana/wallet-adapter-react";
import {
  createInitializeInstruction,
  pack,
} from "@solana/spl-token-metadata";

import {
  TREASURY_WALLET_ADDRESS,
  BASE_PROTOCOL_FEE_SOL,
  REVOKE_AUTHORITY_FEE_SOL,
} from "@/config/constants";

// Browser Buffer polyfill
if (typeof window !== "undefined") {
  window.Buffer = window.Buffer || Buffer;
}

// Types
export interface LaunchpadFormData {
  name: string;
  symbol: string;
  uri: string;
  supply: string;
  decimals: number | string;
  revokeFreeze: boolean;
  revokeMint: boolean;
}

interface DeployTokenParams {
  connection: Connection;
  wallet: WalletContextState;
  formData: LaunchpadFormData;
}

const MAX_U64 = (1n << 64n) - 1n;

// Calculate protocol fee in SOL
export function calculateProtocolFeeSol(
  revokeFreeze: boolean,
  revokeMint: boolean
): number {
  return (
    BASE_PROTOCOL_FEE_SOL +
    (revokeFreeze ? REVOKE_AUTHORITY_FEE_SOL : 0) +
    (revokeMint ? REVOKE_AUTHORITY_FEE_SOL : 0)
  );
}

// Deploy Token-2022
export async function deployToken2022({
  connection,
  wallet,
  formData,
}: DeployTokenParams) {
  const owner = wallet.publicKey;

  if (!wallet.connected || !owner) {
    throw new Error("Connect your Solana wallet before deploying.");
  }

  // Validate form
  const name = formData.name.trim();
  const symbol = formData.symbol.trim();
  const uri = formData.uri.trim();
  const decimals = Number(formData.decimals);

  if (!name || !symbol || !uri) {
    throw new Error("Name, symbol and metadata URI are required.");
  }

  if (!/^\d+$/.test(formData.supply)) {
    throw new Error("Supply must be a positive whole number.");
  }

  const supply = BigInt(formData.supply);

  if (supply <= 0n) {
    throw new Error("Supply must be greater than zero.");
  }

  if (!Number.isInteger(decimals) || decimals < 0 || decimals > 9) {
    throw new Error("Decimals must be between 0 and 9.");
  }

  // Calculate raw token supply without floating-point arithmetic
  const rawSupply = supply * 10n ** BigInt(decimals);

  if (rawSupply > MAX_U64) {
    throw new Error("Token supply exceeds the maximum supported amount.");
  }

  // Generate mint and treasury addresses
  const mintKeypair = Keypair.generate();
  const treasury = new PublicKey(TREASURY_WALLET_ADDRESS);

  // Prepare on-chain metadata
  const metadata = {
    updateAuthority: owner,
    mint: mintKeypair.publicKey,
    name,
    symbol,
    uri,
    additionalMetadata: [],
  };

  // Calculate mint size and rent
  const mintLen = getMintLen([ExtensionType.MetadataPointer]);
  const metadataLen = TYPE_SIZE + LENGTH_SIZE + pack(metadata).length;

  const rentLamports = await connection.getMinimumBalanceForRentExemption(
    mintLen + metadataLen
  );

  // Derive associated token account
  const associatedToken = getAssociatedTokenAddressSync(
    mintKeypair.publicKey,
    owner,
    false,
    TOKEN_2022_PROGRAM_ID
  );

  // Calculate protocol fee
  const protocolFeeSol = calculateProtocolFeeSol(
    formData.revokeFreeze,
    formData.revokeMint
  );

  if (!Number.isFinite(protocolFeeSol) || protocolFeeSol < 0) {
    throw new Error("Invalid protocol fee configuration.");
  }

  const protocolFeeLamports = Math.round(
    protocolFeeSol * LAMPORTS_PER_SOL
  );

  // Build atomic deployment transaction
  const transaction = new Transaction().add(
    // 1. Transfer protocol fee
    SystemProgram.transfer({
      fromPubkey: owner,
      toPubkey: treasury,
      lamports: protocolFeeLamports,
    }),

    // 2. Create Token-2022 mint account
    SystemProgram.createAccount({
      fromPubkey: owner,
      newAccountPubkey: mintKeypair.publicKey,
      space: mintLen,
      lamports: rentLamports,
      programId: TOKEN_2022_PROGRAM_ID,
    }),

    // 3. Initialize metadata pointer
    createInitializeMetadataPointerInstruction(
      mintKeypair.publicKey,
      owner,
      mintKeypair.publicKey,
      TOKEN_2022_PROGRAM_ID
    ),

    // 4. Initialize mint
    createInitializeMintInstruction(
      mintKeypair.publicKey,
      decimals,
      owner,
      formData.revokeFreeze ? null : owner,
      TOKEN_2022_PROGRAM_ID
    ),

    // 5. Initialize on-chain metadata
    createInitializeInstruction({
      programId: TOKEN_2022_PROGRAM_ID,
      mint: mintKeypair.publicKey,
      metadata: mintKeypair.publicKey,
      name,
      symbol,
      uri,
      mintAuthority: owner,
      updateAuthority: owner,
    }),

    // 6. Create associated token account
    createAssociatedTokenAccountInstruction(
      owner,
      associatedToken,
      owner,
      mintKeypair.publicKey,
      TOKEN_2022_PROGRAM_ID
    ),

    // 7. Mint initial supply
    createMintToInstruction(
      mintKeypair.publicKey,
      associatedToken,
      owner,
      rawSupply,
      [],
      TOKEN_2022_PROGRAM_ID
    )
  );

  // 8. Revoke mint authority if requested
  if (formData.revokeMint) {
    transaction.add(
      createSetAuthorityInstruction(
        mintKeypair.publicKey,
        owner,
        AuthorityType.MintTokens,
        null,
        [],
        TOKEN_2022_PROGRAM_ID
      )
    );
  }

  // Sign and submit transaction
  const latestBlockhash = await connection.getLatestBlockhash("confirmed");

  transaction.feePayer = owner;
  transaction.recentBlockhash = latestBlockhash.blockhash;
  transaction.partialSign(mintKeypair);

  const txSignature = await wallet.sendTransaction(
    transaction,
    connection
  );

  // Confirm on-chain execution
  const confirmation = await connection.confirmTransaction(
    {
      signature: txSignature,
      blockhash: latestBlockhash.blockhash,
      lastValidBlockHeight: latestBlockhash.lastValidBlockHeight,
    },
    "confirmed"
  );

  if (confirmation.value.err) {
    throw new Error(
      `Token deployment failed: ${JSON.stringify(confirmation.value.err)}`
    );
  }

  return {
    mintAddress: mintKeypair.publicKey.toBase58(),
    ataAddress: associatedToken.toBase58(),
    txSignature,
  };
}
