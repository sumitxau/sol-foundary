"use client";

import { useState } from "react";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { DEFAULT_DECIMALS, ESTIMATED_RENT_SOL } from "@/config/constants";
import {
  deployToken2022,
  calculateProtocolFeeSol,
} from "@/services/tokenService";

export function useLaunchpad() {
  const { connection } = useConnection();
  const wallet = useWallet();

  const [form, setForm] = useState({
    name: "",
    symbol: "",
    uri: "",
    supply: "1000000",
    decimals: DEFAULT_DECIMALS,
    revokeFreeze: true,
    revokeMint: true,
  });

  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState({
    type: "",
    message: "",
    mintAddress: "",
    txSignature: "",
  });

  function updateField(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  const protocolFeeSol = calculateProtocolFeeSol(
    form.revokeFreeze,
    form.revokeMint
  );
  const totalEstimatedSol = Number(
    (protocolFeeSol + ESTIMATED_RENT_SOL).toFixed(4)
  );

  async function handleDeploy(e) {
    e.preventDefault();
    setIsLoading(true);
    setResult({
      type: "info",
      message: "Awaiting wallet signature...",
      mintAddress: "",
      txSignature: "",
    });

    try {
      const { mintAddress, txSignature } = await deployToken2022({
        connection,
        wallet,
        formData: form,
      });

      setResult({
        type: "success",
        message: `Token deployed at ${mintAddress}`,
        mintAddress,
        txSignature,
      });
    } catch (err) {
      setResult({
        type: "error",
        message: err.message || "Token deployment failed.",
        mintAddress: "",
        txSignature: "",
      });
    } finally {
      setIsLoading(false);
    }
  }

  return {
    form,
    updateField,
    isLoading,
    result,
    protocolFeeSol,
    totalEstimatedSol,
    handleDeploy,
  };
}
