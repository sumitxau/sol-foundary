import { Buffer } from "buffer";
import {
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
import { createInitializeInstruction, pack } from "@solana/spl-token-metadata";
import {
  TREASURY_WALLET_ADDRESS,
  DEFAULT_DECIMALS,
  BASE_PROTOCOL_FEE_SOL,
  REVOKE_AUTHORITY_FEE_SOL,
} from "@/config/constants";

if (typeof window !== "undefined") {
  window.Buffer = window.Buffer || Buffer;
}

export function calculateProtocolFeeSol(revokeFreeze, revokeMint) {
  let fee = BASE_PROTOCOL_FEE_SOL;
  if (revokeFreeze) fee += REVOKE_AUTHORITY_FEE_SOL;
  if (revokeMint) fee += REVOKE_AUTHORITY_FEE_SOL;
  return Number(fee.toFixed(4));
}

export async function deployToken2022({ connection, wallet, formData }) {
  if (!wallet || !wallet.publicKey) {
    throw new Error("Connect your Solana wallet before deploying.");
  }

  const name = formData.name?.trim();
  const symbol = formData.symbol?.trim().toUpperCase();
  const uri = formData.uri?.trim();
  const supply = Number(formData.supply);
  const decimals = Number(formData.decimals ?? DEFAULT_DECIMALS);

  if (!name || !symbol) {
    throw new Error("Token Name and Ticker Symbol are required.");
  }
  if (!uri) {
    throw new Error("Metadata JSON / Image URL is required.");
  }
  if (!supply || supply <= 0) {
    throw new Error("Initial Supply must be greater than 0.");
  }

  const mintKeypair = Keypair.generate();
  const treasuryPubkey = new PublicKey(TREASURY_WALLET_ADDRESS);

  const metadata = {
    mint: mintKeypair.publicKey,
    name,
    symbol,
    uri,
    additionalMetadata: [],
  };

  // 1. Calculate base Mint space (for createAccount) and full rent lamports (Mint + Metadata)
  const mintLen = getMintLen([ExtensionType.MetadataPointer]);
  const metadataLen = TYPE_SIZE + LENGTH_SIZE + pack(metadata).length;
  const rentLamports = await connection.getMinimumBalanceForRentExemption(
    mintLen + metadataLen
  
  );

  // 2. Derive the user's Associated Token Account (ATA) for Token-2022
  const associatedToken = getAssociatedTokenAddressSync(
    mintKeypair.publicKey,
    wallet.publicKey,
    false,
    TOKEN_2022_PROGRAM_ID
  );

  // 3. Calculate total service fee in lamports
  const protocolFeeSol = calculateProtocolFeeSol(
    formData.revokeFreeze,
    formData.revokeMint
  );
  const protocolFeeLamports = Math.round(protocolFeeSol * LAMPORTS_PER_SOL);

  // 4. Calculate raw token supply using BigInt to prevent JavaScript number overflow
  const rawSupply = BigInt(Math.round(supply)) * BigInt(10 ** decimals);

  const transaction = new Transaction().add(
    // Ix 0: Transfer Protocol Fee to your Treasury Wallet
    SystemProgram.transfer({
      fromPubkey: wallet.publicKey,
      toPubkey: treasuryPubkey,
      lamports: protocolFeeLamports,
    }),
    // Ix 1: Allocate Mint account on-chain (space = mintLen only; lamports = full rent)
    SystemProgram.createAccount({
      fromPubkey: wallet.publicKey,
      newAccountPubkey: mintKeypair.publicKey,
      space: mintLen,
      lamports: rentLamports,
      programId: TOKEN_2022_PROGRAM_ID,
    }),
    // Ix 2: Point metadata to the Mint account itself
    createInitializeMetadataPointerInstruction(
      mintKeypair.publicKey,
      wallet.publicKey,
      mintKeypair.publicKey,
      TOKEN_2022_PROGRAM_ID
    ),
    // Ix 3: Initialize Mint (sets freezeAuthority to null if revokeFreeze is checked)
    createInitializeMintInstruction(
      mintKeypair.publicKey,
      decimals,
      wallet.publicKey,
      formData.revokeFreeze ? null : wallet.publicKey,
      TOKEN_2022_PROGRAM_ID
    ),
    // Ix 4: Write TokenMetadata (name, symbol, uri) into the Mint account
    createInitializeInstruction({
      programId: TOKEN_2022_PROGRAM_ID,
      mint: mintKeypair.publicKey,
      metadata: mintKeypair.publicKey,
      name: metadata.name,
      symbol: metadata.symbol,
      uri: metadata.uri,
      mintAuthority: wallet.publicKey,
      updateAuthority: wallet.publicKey,
    }),
    // Ix 5: Create the user's Associated Token Account (ATA)
    createAssociatedTokenAccountInstruction(
      wallet.publicKey,
      associatedToken,
      wallet.publicKey,
      mintKeypair.publicKey,
      TOKEN_2022_PROGRAM_ID
    ),
    // Ix 6: Mint initial supply into the user's ATA
    createMintToInstruction(
      mintKeypair.publicKey,
      associatedToken,
      wallet.publicKey,
      rawSupply,
      [],
      TOKEN_2022_PROGRAM_ID
    )
  );

  // Ix 7 : Permanently lock total supply by setting MintTokens authority to null
  if (formData.revokeMint) {
    transaction.add(
      createSetAuthorityInstruction(
        mintKeypair.publicKey,
        wallet.publicKey,
        AuthorityType.MintTokens,
        null,
        [],
        TOKEN_2022_PROGRAM_ID
      )
    );
  }

  transaction.feePayer = wallet.publicKey;
  const latestBlockhash = await connection.getLatestBlockhash("confirmed");
  transaction.recentBlockhash = latestBlockhash.blockhash;
  transaction.partialSign(mintKeypair);

  const txSignature = await wallet.sendTransaction(transaction, connection);

  return {
    mintAddress: mintKeypair.publicKey.toBase58(),
    ataAddress: associatedToken.toBase58(),
    txSignature,
  };
}
