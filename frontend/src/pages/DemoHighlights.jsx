import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { getRankedAccounts } from '../api/client';
import { riskColorVar, formatScore } from "../utils/risk";

// Built for the demo, not daily use: shows only the handful of accounts
// worth talking about, one per card, instead of the full scrollable table.
// Swap TOP_N if you want more or fewer cards on stage.
const TOP_N = 5;

export default function DemoHighlights() {
  const [accounts, setAccounts] = useState([]);
  const [status, setStatus] = useState("loading");

  useEffect(() => {
    getRankedAccounts({ limit: TOP_N })
      .then((data) => {
        setAccounts(data.results.slice(0, TOP_N));
        setStatus("ready");
      })
      .catch(() => setStatus("error"));
  }, []);

  return (
    <div className="app-shell">
      <div className="page-header">
        <h1>Top {TOP_N} suspected accounts</h1>
        <Link to="/" className="link-button">View full list →</Link>
      </div>

      {status === "loading" && <div className="state-message panel">Loading…</div>}
      {status === "error" && <div className="state-message panel">Couldn't load highlights.</div>}

      {status === "ready" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {accounts.map((account) => (
            <Link
              key={account.account_id}
              to={`/account/${account.account_id}`}
              className="panel"
              style={{
                display: "block",
                padding: 20,
                borderLeft: `4px solid ${riskColorVar(account.risk_score)}`,
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                <span className="mono" style={{ fontSize: 16, fontWeight: 500 }}>
                  {account.account_id}
                </span>
                <span
                  className="mono"
                  style={{ fontSize: 18, fontWeight: 500, color: riskColorVar(account.risk_score) }}
                >
                  {formatScore(account.risk_score)}
                </span>
              </div>
              <p className="text-secondary" style={{ fontSize: 14, margin: "8px 0 0" }}>
                {account.top_reasons?.[0]}
              </p>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
