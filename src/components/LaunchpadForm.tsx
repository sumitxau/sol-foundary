"use client";

import { useLaunchpad } from "@/hooks/useLaunchpad";
import { useNetwork } from "@/components/SolanaWalletProvider";
import {
  NETWORKS,
  BASE_PROTOCOL_FEE_SOL,
  REVOKE_AUTHORITY_FEE_SOL,
  ESTIMATED_RENT_SOL,
} from "@/config/constants";

export function LaunchpadForm() {
  const { network } = useNetwork();
  const {
    form,
    updateField,
    isLoading,
    result,
    protocolFeeSol,
    totalEstimatedSol,
    handleDeploy,
  } = useLaunchpad();

  const clusterQuery = network === NETWORKS.DEVNET ? "?cluster=devnet" : "";

  return (
    <main className="main-container">
      <form onSubmit={handleDeploy} className="launchpad-card">
        <div className="card-header">
          <div>
            <h1 className="card-title">Deploy SPL Token-2022</h1>
            <p className="card-subtitle">
              Atomic Mint + On-Chain MetadataPointer + ATA Supply Allocation
            </p>
          </div>
          <span className="badge">{network.toUpperCase()}</span>
        </div>

        <div className="grid-two">
          <div className="field-group">
            <label className="field-label">TOKEN NAME</label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => updateField("name", e.target.value)}
              placeholder="e.g. SolFoundry"
              className="input-field"
            />
          </div>

          <div className="field-group">
            <label className="field-label">TICKER SYMBOL</label>
            <input
              type="text"
              value={form.symbol}
              onChange={(e) => updateField("symbol", e.target.value)}
              placeholder="e.g. SOLF"
              className="input-field"
            />
          </div>
        </div>

        <div className="grid-two">
          <div className="field-group">
            <label className="field-label">INITIAL SUPPLY</label>
            <input
              type="number"
              value={form.supply}
              onChange={(e) => updateField("supply", e.target.value)}
              placeholder="1000000"
              className="input-field"
            />
          </div>

          <div className="field-group">
            <label className="field-label">DECIMALS</label>
            <input
              type="number"
              min="0"
              max="9"
              value={form.decimals}
              onChange={(e) => updateField("decimals", e.target.value)}
              className="input-field"
            />
          </div>
        </div>

        <div className="field-group">
          <label className="field-label">METADATA JSON / IMAGE URI</label>
          <input
            type="text"
            value={form.uri}
            onChange={(e) => updateField("uri", e.target.value)}
            placeholder="https://.../metadata.json"
            className="input-field"
          />
        </div>

        <div className="authority-section">
          <span className="field-label">ON-CHAIN AUTHORITY & RUGCHECK CONTROLS</span>

          <label className="toggle-row">
            <input
              type="checkbox"
              checked={form.revokeFreeze}
              onChange={(e) => updateField("revokeFreeze", e.target.checked)}
            />
            <div className="toggle-text">
              <span className="toggle-title">
                Revoke Freeze Authority (+{REVOKE_AUTHORITY_FEE_SOL} SOL)
              </span>
              <span className="toggle-desc">
                Sets freezeAuthority to null. Required before creating a Raydium or Meteora Liquidity Pool.
              </span>
            </div>
          </label>

          <label className="toggle-row">
            <input
              type="checkbox"
              checked={form.revokeMint}
              onChange={(e) => updateField("revokeMint", e.target.checked)}
            />
            <div className="toggle-text">
              <span className="toggle-title">
                Revoke Mint Authority (+{REVOKE_AUTHORITY_FEE_SOL} SOL)
              </span>
              <span className="toggle-desc">
                Permanently locks supply after initial minting so no additional tokens can ever be printed.
              </span>
            </div>
          </label>
        </div>

        <div className="fee-receipt">
          <div className="fee-row">
            <span>Base Protocol Execution Fee</span>
            <span>{BASE_PROTOCOL_FEE_SOL} SOL</span>
          </div>
          <div className="fee-row">
            <span>Authority Revocation Add-Ons</span>
            <span>
              {(protocolFeeSol - BASE_PROTOCOL_FEE_SOL).toFixed(2)} SOL
            </span>
          </div>
          <div className="fee-row">
            <span>Solana Network Rent-Exempt Storage (~350B + ATA)</span>
            <span>~{ESTIMATED_RENT_SOL} SOL</span>
          </div>
          <div className="fee-row fee-total">
            <span>TOTAL ESTIMATED COST</span>
            <span>{totalEstimatedSol} SOL</span>
          </div>
        </div>

        <button type="submit" disabled={isLoading} className="btn-primary">
          {isLoading
            ? "SIGNING & DEPLOYING ON-CHAIN..."
            : `DEPLOY TOKEN (${protocolFeeSol} SOL FEE)`}
        </button>

        {result.message && (
          <div
            className={`status-box ${
              result.type === "error"
                ? "status-error"
                : result.type === "success"
                ? "status-success"
                : ""
            }`}
          >
            <p>{result.message}</p>
            {result.mintAddress && (
              <a
                href={`https://explorer.solana.com/address/${result.mintAddress}${clusterQuery}`}
                target="_blank"
                rel="noreferrer"
                className="explorer-link"
              >
                Inspect Token Mint on Solana Explorer →
              </a>
            )}
          </div>
        )}
      </form>
    </main>
  );
}
