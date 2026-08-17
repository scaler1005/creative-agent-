"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { use } from "react";

interface Campaign {
  name: string;
  status: string;
  spend: number;
  purchases: number;
  cpa: number | null;
  roas: number | null;
  ctr: number;
  profitable: boolean;
}

interface Ad {
  name: string;
  campaign: string;
  status: string;
  spend: number;
  purchases: number;
  cpa: number;
  roas: number;
  ctr: number;
  cpc: number;
  addToCart: number;
  winner: boolean;
  note?: string;
}

interface Store {
  id: string;
  name: string;
  url: string;
  niche: string;
  adAccount: {
    platform: string;
    lastImport: string | null;
    totalSpend?: number;
    totalPurchases?: number;
    campaigns: Campaign[];
    ads?: Ad[];
  };
  learnings: {
    winningPatterns: string[];
    angles: string[];
    prompts: string[];
    offers: string[];
    notes: string;
  };
}

export default function StorePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [store, setStore] = useState<Store | null>(null);
  const [loading, setLoading] = useState(true);

  const loadStore = useCallback(async () => {
    try {
      const res = await fetch("/api/stores");
      const stores: Store[] = await res.json();
      const found = stores.find((s) => s.id === id);
      if (found) setStore(found);
    } catch {}
    setLoading(false);
  }, [id]);

  useEffect(() => { loadStore(); }, [loadStore]);

  if (loading) {
    return <div style={{ minHeight: "100vh", background: "#0a0a0a", display: "flex", alignItems: "center", justifyContent: "center" }}><p style={{ color: "#888" }}>Laden...</p></div>;
  }

  if (!store) {
    return <div style={{ minHeight: "100vh", background: "#0a0a0a", display: "flex", alignItems: "center", justifyContent: "center" }}><p style={{ color: "#888" }}>Store niet gevonden</p></div>;
  }

  const profitableCampaigns = store.adAccount.campaigns.filter((c) => c.profitable);

  return (
    <div style={{ minHeight: "100vh", background: "#0a0a0a", color: "#e5e5e5", fontFamily: "system-ui, -apple-system, sans-serif", display: "flex", justifyContent: "center", padding: "40px 20px" }}>
      <div style={{ width: "100%", maxWidth: 900 }}>
        <header style={{ marginBottom: 32 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 4 }}>
                <Link href="/" style={{ color: "#666", textDecoration: "none", fontSize: 13 }}>← Brain</Link>
                <span style={{ color: "#333" }}>|</span>
                <a href={store.url} target="_blank" rel="noopener" style={{ color: "#6366f1", textDecoration: "none", fontSize: 13 }}>{store.url}</a>
              </div>
              <h1 style={{ fontSize: 28, fontWeight: 700, color: "#fff", margin: 0 }}>{store.name}</h1>
              <p style={{ fontSize: 14, color: "#888", marginTop: 4 }}>
                {store.niche && <span style={{ background: "#1a1a2e", padding: "2px 8px", borderRadius: 4, marginRight: 8 }}>{store.niche}</span>}
                {store.adAccount.lastImport ? `Data t/m ${store.adAccount.lastImport}` : "Geen ad data"}
              </p>
            </div>
            <Link href={`/store/${id}/upload`} style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 16px", background: "rgba(37,99,235,0.06)", border: "1px solid rgba(37,99,235,0.14)", borderRadius: 8, color: "#fff", textDecoration: "none", fontSize: 13, fontWeight: 500 }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="rgba(37,99,235,0.8)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" /></svg>
              Upload CSV
            </Link>
          </div>
        </header>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
          {/* Meta Ads Overview */}
          {store.adAccount.campaigns.length > 0 && (
            <div style={{ background: "#141414", border: "1px solid #222", borderRadius: 12, padding: 20 }}>
              <h3 style={{ fontSize: 12, fontWeight: 600, color: "#888", textTransform: "uppercase", letterSpacing: 1, marginTop: 0, marginBottom: 16 }}>Meta Ads</h3>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 16 }}>
                <div style={{ background: "#1a1a1a", borderRadius: 8, padding: 12 }}>
                  <div style={{ fontSize: 11, color: "#888" }}>Spend</div>
                  <div style={{ fontSize: 20, fontWeight: 700, color: "#fff" }}>${store.adAccount.totalSpend?.toLocaleString()}</div>
                </div>
                <div style={{ background: "#1a1a1a", borderRadius: 8, padding: 12 }}>
                  <div style={{ fontSize: 11, color: "#888" }}>Purchases</div>
                  <div style={{ fontSize: 20, fontWeight: 700, color: "#fff" }}>{store.adAccount.totalPurchases}</div>
                </div>
                <div style={{ background: "#1a1a1a", borderRadius: 8, padding: 12 }}>
                  <div style={{ fontSize: 11, color: "#888" }}>Winners</div>
                  <div style={{ fontSize: 20, fontWeight: 700, color: "#22c55e" }}>{profitableCampaigns.length}/{store.adAccount.campaigns.length}</div>
                </div>
                <div style={{ background: "#1a1a1a", borderRadius: 8, padding: 12 }}>
                  <div style={{ fontSize: 11, color: "#888" }}>Best ROAS</div>
                  <div style={{ fontSize: 20, fontWeight: 700, color: "#22c55e" }}>
                    {Math.max(...store.adAccount.campaigns.filter((c) => c.roas).map((c) => c.roas!)).toFixed(2)}x
                  </div>
                </div>
              </div>

              {profitableCampaigns.length > 0 && (
                <div>
                  <div style={{ fontSize: 11, color: "#22c55e", fontWeight: 600, marginBottom: 8 }}>Winning Campaigns</div>
                  {profitableCampaigns.map((c, i) => (
                    <div key={i} style={{ fontSize: 12, color: "#ccc", padding: "8px 0", borderBottom: "1px solid #222", display: "flex", justifyContent: "space-between" }}>
                      <span>{c.name}</span>
                      <span style={{ color: "#22c55e", fontWeight: 600 }}>{c.roas?.toFixed(2)}x</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* All Campaigns */}
          {store.adAccount.campaigns.length > 0 && (
            <div style={{ background: "#141414", border: "1px solid #222", borderRadius: 12, padding: 20 }}>
              <h3 style={{ fontSize: 12, fontWeight: 600, color: "#888", textTransform: "uppercase", letterSpacing: 1, marginTop: 0, marginBottom: 16 }}>Alle Campaigns</h3>
              {store.adAccount.campaigns.sort((a, b) => (b.roas || 0) - (a.roas || 0)).map((c, i) => (
                <div key={i} style={{ padding: "8px 0", borderBottom: i < store.adAccount.campaigns.length - 1 ? "1px solid #222" : "none" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ fontSize: 12, color: "#fff", fontWeight: 500 }}>{c.name}</span>
                    <span style={{ fontSize: 12, color: c.profitable ? "#22c55e" : "#ef4444", fontWeight: 600 }}>
                      {c.roas ? `${c.roas.toFixed(2)}x` : "—"}
                    </span>
                  </div>
                  <div style={{ display: "flex", gap: 12, marginTop: 3, fontSize: 11, color: "#666" }}>
                    <span>${c.spend.toFixed(0)}</span>
                    <span>{c.purchases} purch</span>
                    <span>{c.ctr.toFixed(1)}% CTR</span>
                    <span style={{ color: c.status === "ACTIVE" ? "#22c55e" : "#666" }}>{c.status}</span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Top Creatives */}
          {store.adAccount.ads && store.adAccount.ads.filter((a) => a.winner).length > 0 && (
            <div style={{ background: "#141414", border: "1px solid #222", borderRadius: 12, padding: 20 }}>
              <h3 style={{ fontSize: 12, fontWeight: 600, color: "#888", textTransform: "uppercase", letterSpacing: 1, marginTop: 0, marginBottom: 16 }}>Top Creatives</h3>
              {store.adAccount.ads.filter((a) => a.winner).sort((a, b) => b.roas - a.roas).map((ad, i) => (
                <div key={i} style={{ padding: "8px 0", borderBottom: i < Math.min(store.adAccount.ads!.filter((a) => a.winner).length) - 1 ? "1px solid #222" : "none" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ fontSize: 12, color: "#fff", fontWeight: 600 }}>{ad.name}</span>
                    <span style={{ fontSize: 12, color: "#22c55e", fontWeight: 700 }}>{ad.roas.toFixed(2)}x</span>
                  </div>
                  <div style={{ display: "flex", gap: 12, marginTop: 4, fontSize: 11, color: "#888" }}>
                    <span>${ad.spend.toFixed(0)}</span>
                    <span>{ad.purchases} purch</span>
                    <span>${ad.cpa.toFixed(0)} CPA</span>
                    <span>{ad.ctr.toFixed(1)}% CTR</span>
                  </div>
                  {ad.note && <div style={{ fontSize: 10, color: "#6366f1", marginTop: 3 }}>{ad.note}</div>}
                </div>
              ))}
            </div>
          )}

          {/* Learnings */}
          {(store.learnings.winningPatterns.length > 0 || store.learnings.angles.length > 0 || store.learnings.offers.length > 0) && (
            <div style={{ background: "#141414", border: "1px solid #222", borderRadius: 12, padding: 20 }}>
              <h3 style={{ fontSize: 12, fontWeight: 600, color: "#888", textTransform: "uppercase", letterSpacing: 1, marginTop: 0, marginBottom: 16 }}>Learnings</h3>
              {store.learnings.winningPatterns.length > 0 && (
                <div style={{ marginBottom: 14 }}>
                  <div style={{ fontSize: 11, color: "#6366f1", fontWeight: 600, marginBottom: 6 }}>Winning Patterns</div>
                  {store.learnings.winningPatterns.map((p, i) => (
                    <div key={i} style={{ fontSize: 12, color: "#aaa", marginBottom: 4, paddingLeft: 8, borderLeft: "2px solid #333" }}>{p}</div>
                  ))}
                </div>
              )}
              {store.learnings.angles.length > 0 && (
                <div style={{ marginBottom: 14 }}>
                  <div style={{ fontSize: 11, color: "#f59e0b", fontWeight: 600, marginBottom: 6 }}>Angles</div>
                  {store.learnings.angles.map((a, i) => (
                    <div key={i} style={{ fontSize: 12, color: "#aaa", marginBottom: 4, paddingLeft: 8, borderLeft: "2px solid #333" }}>{a}</div>
                  ))}
                </div>
              )}
              {store.learnings.offers.length > 0 && (
                <div>
                  <div style={{ fontSize: 11, color: "#22c55e", fontWeight: 600, marginBottom: 6 }}>Offers</div>
                  {store.learnings.offers.map((o, i) => (
                    <div key={i} style={{ fontSize: 12, color: "#aaa", marginBottom: 4, paddingLeft: 8, borderLeft: "2px solid #333" }}>{o}</div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {store.learnings.notes && (
          <div style={{ marginTop: 16, background: "#141414", border: "1px solid #222", borderRadius: 12, padding: 20 }}>
            <h3 style={{ fontSize: 12, fontWeight: 600, color: "#888", textTransform: "uppercase", letterSpacing: 1, marginTop: 0, marginBottom: 8 }}>Notes</h3>
            <p style={{ fontSize: 13, color: "#aaa", margin: 0, lineHeight: 1.6 }}>{store.learnings.notes}</p>
          </div>
        )}
      </div>
    </div>
  );
}
