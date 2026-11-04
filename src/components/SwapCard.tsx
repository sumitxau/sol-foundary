"use client";

import { useState, FormEvent } from "react";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { POPULAR_SWAP_TOKENS, SWAP_FEE_BPS } from "@/config/constants";
import {
  fetchJupiterQuote,
  executeJupiterSwap,
  JupiterQuoteResponse,
  getRaydiumPoolCreateUrl,
  getMeteoraPoolCreateUrl,
} from "@/services/dexService";

export function SwapCard() {
  const { connection } = useConnection();
  const wallet = useWallet();

  const [inputMint, setInputMint] = useState<string>(
    POPULAR_SWAP_TOKENS[0].mint
  );
  const [outputMint, setOutputMint] = useState<string>(
    POPULAR_SWAP_TOKENS[1].mint
  );
  const [customOutputMint, setCustomOutputMint] = useState<string>("");
  const [amountUi, setAmountUi] = useState<string>("0.1");
  const [slippageBps, setSlippageBps] = useState<number>(50);

  const [quote, setQuote] = useState<JupiterQuoteResponse | null>(null);
  const [isQuoting, setIsQuoting] = useState<boolean>(false);
  const [isSwapping, setIsSwapping] = useState<boolean>(false);
  const [status, setStatus] = useState<{
    type: "" | "info" | "success" | "error";
    message: string;
    txSignature?: string;
  }>({ type: "", message: "" });

  const activeOutputMint = customOutputMint.trim() || outputMint;
  const inputTokenObj =
    POPULAR_SWAP_TOKENS.find((t) => t.mint === inputMint) ||
    POPULAR_SWAP_TOKENS[0];
  const outputTokenObj = POPULAR_SWAP_TOKENS.find(
    (t) => t.mint === activeOutputMint
  );
  const outputDecimals = outputTokenObj ? outputTokenObj.decimals : 9;

  async function handleGetQuote(e: FormEvent) {
    e.preventDefault();
    setIsQuoting(true);
    setStatus({ type: "info", message: "Fetching optimal Jupiter V6 route..." });
    setQuote(null);

    try {
      const q = await fetchJupiterQuote({
        inputMint,
        outputMint: activeOutputMint,
        amountUi: Number(amountUi),
        inputDecimals: inputTokenObj.decimals,
        slippageBps,
      });
      setQuote(q);
      setStatus({ type: "", message: "" });
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : "Failed to fetch swap quote.";
      setStatus({ type: "error", message: msg });
    } finally {
      setIsQuoting(false);
    }
  }

  async function handleExecuteSwap() {
    if (!quote) return;
    setIsSwapping(true);
    setStatus({
      type: "info",
      message: "Awaiting wallet signature for VersionedTransaction...",
    });

    try {
      const sig = await executeJupiterSwap({
        connection,
        wallet,
        quoteResponse: quote,
      });
      setStatus({
        type: "success",
        message: "Swap executed on-chain!",
        txSignature: sig,
      });
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : "Swap transaction failed.";
      setStatus({ type: "error", message: msg });
    } finally {
      setIsSwapping(false);
    }
  }

  const estimatedOutUi = quote
    ? (Number(quote.outAmount) / 10 ** outputDecimals).toFixed(6)
    : "0.00";

  const routeLabels = quote
    ? quote.routePlan.map((r) => r.swapInfo.label).join(" -> ")
    : "—";

  return (
    <main className="main-container">
      <div className="launchpad-card">
        <div className="card-header">
          <div>
            <h1 className="card-title">Jupiter V6 DEX Aggregator & LP Hub</h1>
            <p className="card-subtitle">
              Route optimal cross-DEX swaps (Raydium, Meteora, Orca) or bootstrap
              a new Liquidity Pool
            </p>
          </div>
          <span className="badge">JUPITER V6</span>
        </div>

        <form onSubmit={handleGetQuote} className="swap-form">
          <div className="grid-two">
            <div className="field-group">
              <label className="field-label">YOU PAY (INPUT TOKEN)</label>
              <select
                value={inputMint}
                onChange={(e) => {
                  setInputMint(e.target.value);
                  setQuote(null);
                }}
                className="input-field"
              >
                {POPULAR_SWAP_TOKENS.map((t) => (
                  <option key={t.mint} value={t.mint}>
                    {t.symbol} — {t.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="field-group">
              <label className="field-label">SWAP AMOUNT</label>
              <input
                type="number"
                step="any"
                value={amountUi}
                onChange={(e) => {
                  setAmountUi(e.target.value);
                  setQuote(null);
                }}
                placeholder="0.1"
                className="input-field"
              />
            </div>
          </div>

          <div className="grid-two">
            <div className="field-group">
              <label className="field-label">YOU RECEIVE (PRESET TOKEN)</label>
              <select
                value={outputMint}
                onChange={(e) => {
                  setOutputMint(e.target.value);
                  setCustomOutputMint("");
                  setQuote(null);
                }}
                className="input-field"
              >
                {POPULAR_SWAP_TOKENS.map((t) => (
                  <option key={t.mint} value={t.mint}>
                    {t.symbol} — {t.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="field-group">
              <label className="field-label">SLIPPAGE TOLERANCE (BPS)</label>
              <select
                value={slippageBps}
                onChange={(e) => setSlippageBps(Number(e.target.value))}
                className="input-field"
              >
                <option value={50}>0.50% (50 bps)</option>
                <option value={100}>1.00% (100 bps)</option>
                <option value={300}>3.00% (300 bps)</option>
              </select>
            </div>
          </div>

          <div className="field-group">
            <label className="field-label">
              OR PASTE CUSTOM LAUNCHED TOKEN MINT ADDRESS (OPTIONAL)
            </label>
            <input
              type="text"
              value={customOutputMint}
              onChange={(e) => {
                setCustomOutputMint(e.target.value);
                setQuote(null);
              }}
              placeholder="Paste any Solana SPL / Token-2022 Mint Address..."
              className="input-field"
            />
          </div>

          <button type="submit" disabled={isQuoting} className="btn-primary">
            {isQuoting ? "COMPUTING OPTIMAL ROUTE..." : "1. FETCH JUPITER V6 QUOTE"}
          </button>
        </form>

        {quote && (
          <div className="fee-receipt">
            <div className="fee-row">
              <span>Expected Output</span>
              <span>
                {estimatedOutUi} {outputTokenObj ? outputTokenObj.symbol : "TOKENS"}
              </span>
            </div>
            <div className="fee-row">
              <span>Optimal AMM Route</span>
              <span>{routeLabels}</span>
            </div>
            <div className="fee-row">
              <span>Price Impact</span>
              <span>{Number(quote.priceImpactPct).toFixed(4)}%</span>
            </div>
            <div className="fee-row fee-total">
              <span>Protocol Routing Fee</span>
              <span>{(SWAP_FEE_BPS / 100).toFixed(2)}%</span>
            </div>

            <button
              type="button"
              onClick={handleExecuteSwap}
              disabled={isSwapping}
              className="btn-primary"
            >
              {isSwapping
                ? "SIGNING VERSIONED TRANSACTION..."
                : "2. EXECUTE ON-CHAIN SWAP"}
            </button>
          </div>
        )}

        {status.message && (
          <div
            className={`status-box ${
              status.type === "error"
                ? "status-error"
                : status.type === "success"
                ? "status-success"
                : "status-info"
            }`}
          >
            <p>{status.message}</p>
            {status.txSignature && (
              <div className="explorer-links">
                <a
                  href={`https://solscan.io/tx/${status.txSignature}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  View Swap Transaction on Solscan ↗
                </a>
              </div>
            )}
          </div>
        )}

        <div className="authority-section">
          <span className="field-label">
            BOOTSTRAP LIQUIDITY POOL (FOR NEWLY MINTED TOKENS)
          </span>
          <p className="card-subtitle">
            After deploying your Token-2022 asset and revoking Freeze Authority,
            pair it with SOL or USDC in an AMM Liquidity Pool so anyone can trade
            it on Jupiter:
          </p>
          <div className="explorer-links">
            <a
              href={getRaydiumPoolCreateUrl(activeOutputMint)}
              target="_blank"
              rel="noreferrer"
            >
              Create Raydium AMM Pool ↗
            </a>
            <a
              href={getMeteoraPoolCreateUrl()}
              target="_blank"
              rel="noreferrer"
            >
              Create Meteora Dynamic Pool ↗
            </a>
          </div>
        </div>
      </div>
    </main>
  );
}
