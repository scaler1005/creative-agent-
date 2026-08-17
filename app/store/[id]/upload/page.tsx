"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { use } from "react";

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
  };
}

export default function UploadPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [store, setStore] = useState<Store | null>(null);
  const [loading, setLoading] = useState(true);
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [csvType, setCsvType] = useState<"campaign" | "ad">("ad");
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState<string | null>(null);

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

  async function handleUpload() {
    if (!csvFile) return;
    setUploading(true);
    setResult(null);

    try {
      const formData = new FormData();
      formData.append("file", csvFile);
      formData.append("storeId", id);
      formData.append("type", csvType);

      const res = await fetch("/api/stores/upload", { method: "POST", body: formData });
      const data = await res.json();

      if (data.success) {
        setResult(`${data.imported} ${csvType === "ad" ? "ads" : "campaigns"} geimporteerd. ${data.winners || 0} winners gevonden.`);
        loadStore();
      } else {
        setResult(`Fout: ${data.error}`);
      }
    } catch (err) {
      setResult(`Upload mislukt: ${err instanceof Error ? err.message : "onbekende fout"}`);
    }
    setUploading(false);
  }

  if (loading) {
    return <div style={{ minHeight: "100vh", background: "#060608", display: "flex", alignItems: "center", justifyContent: "center" }}><p style={{ color: "#555" }}>Laden...</p></div>;
  }

  if (!store) {
    return <div style={{ minHeight: "100vh", background: "#060608", display: "flex", alignItems: "center", justifyContent: "center" }}><p style={{ color: "#555" }}>Store niet gevonden</p></div>;
  }

  return (
    <div style={{ minHeight: "100vh", background: "#060608", color: "#e0e0e0", fontFamily: "system-ui, -apple-system, sans-serif", display: "flex", justifyContent: "center", padding: "60px 20px" }}>
      <div style={{ width: "100%", maxWidth: 520 }}>
        {/* Nav */}
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 32 }}>
          <Link href="/" style={{ color: "#555", textDecoration: "none", fontSize: 13 }}>Brain</Link>
          <span style={{ color: "#222" }}>/</span>
          <Link href={`/store/${id}`} style={{ color: "#555", textDecoration: "none", fontSize: 13 }}>{store.name}</Link>
          <span style={{ color: "#222" }}>/</span>
          <span style={{ color: "#888", fontSize: 13 }}>Upload</span>
        </div>

        <h1 style={{ fontSize: 24, fontWeight: 700, color: "#fff", margin: "0 0 8px" }}>Upload CSV</h1>
        <p style={{ fontSize: 14, color: "#555", margin: "0 0 32px" }}>
          Importeer Meta Ads data voor {store.name}
          {store.adAccount.lastImport && <span> — laatste import: {store.adAccount.lastImport}</span>}
        </p>

        <div style={{ background: "#0c0c14", border: "1px solid #1e1e2e", borderRadius: 12, padding: 24, display: "flex", flexDirection: "column", gap: 20 }}>
          {/* CSV Type */}
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: "#555", textTransform: "uppercase", letterSpacing: "0.05em", display: "block", marginBottom: 8 }}>Data Level</label>
            <div style={{ display: "flex", gap: 8 }}>
              {[
                { key: "ad" as const, label: "Ad Level", desc: "Per creative performance" },
                { key: "campaign" as const, label: "Campaign Level", desc: "Per campagne totalen" },
              ].map((t) => (
                <button
                  key={t.key}
                  onClick={() => setCsvType(t.key)}
                  style={{
                    flex: 1,
                    background: csvType === t.key ? "#111120" : "#0a0a10",
                    border: csvType === t.key ? "1px solid #6366f1" : "1px solid #1a1a2a",
                    borderRadius: 8,
                    padding: "10px 12px",
                    cursor: "pointer",
                    textAlign: "left",
                  }}
                >
                  <div style={{ fontSize: 13, fontWeight: 600, color: csvType === t.key ? "#fff" : "#666" }}>{t.label}</div>
                  <div style={{ fontSize: 11, color: "#444", marginTop: 2 }}>{t.desc}</div>
                </button>
              ))}
            </div>
          </div>

          {/* File drop */}
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: "#555", textTransform: "uppercase", letterSpacing: "0.05em", display: "block", marginBottom: 8 }}>CSV File</label>
            <label
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                padding: "32px 16px",
                border: csvFile ? "1px solid #22c55e" : "1px dashed #1e1e3a",
                borderRadius: 10,
                background: csvFile ? "rgba(34,197,94,0.03)" : "#0a0a10",
                cursor: "pointer",
                transition: "all 0.2s",
              }}
            >
              <input
                type="file"
                accept=".csv"
                style={{ display: "none" }}
                onChange={(e) => setCsvFile(e.target.files?.[0] || null)}
              />
              {csvFile ? (
                <>
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" /></svg>
                  <span style={{ fontSize: 14, color: "#22c55e", marginTop: 8, fontWeight: 500 }}>{csvFile.name}</span>
                  <span style={{ fontSize: 11, color: "#555", marginTop: 2 }}>{(csvFile.size / 1024).toFixed(1)} KB</span>
                </>
              ) : (
                <>
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#333" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" /></svg>
                  <span style={{ fontSize: 13, color: "#444", marginTop: 8 }}>Klik om CSV te selecteren</span>
                  <span style={{ fontSize: 11, color: "#333", marginTop: 2 }}>Meta Ads export (.csv)</span>
                </>
              )}
            </label>
          </div>

          {/* Upload button */}
          <button
            onClick={handleUpload}
            disabled={!csvFile || uploading}
            style={{
              background: !csvFile || uploading ? "#111" : "#6366f1",
              color: !csvFile || uploading ? "#444" : "#fff",
              border: "none",
              borderRadius: 8,
              padding: "14px",
              fontSize: 14,
              fontWeight: 600,
              cursor: !csvFile || uploading ? "not-allowed" : "pointer",
              transition: "all 0.2s",
            }}
          >
            {uploading ? "Importeren..." : "Importeer Data"}
          </button>

          {/* Result */}
          {result && (
            <div style={{
              padding: 14,
              borderRadius: 8,
              background: result.startsWith("Fout") || result.startsWith("Upload") ? "#1a0a0a" : "#0a1a10",
              border: result.startsWith("Fout") || result.startsWith("Upload") ? "1px solid #3b1111" : "1px solid #0d3320",
              fontSize: 13,
              color: result.startsWith("Fout") || result.startsWith("Upload") ? "#f87171" : "#4ade80",
            }}>
              {result}
            </div>
          )}
        </div>

        {/* Instructions */}
        <div style={{ marginTop: 24, padding: "16px 20px", background: "#0c0c14", border: "1px solid #1a1a2a", borderRadius: 10 }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: "#444", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 10 }}>Hoe te exporteren</div>
          <ol style={{ margin: 0, paddingLeft: 20, fontSize: 13, color: "#555", lineHeight: 1.8 }}>
            <li>Open Meta Ads Manager</li>
            <li>Selecteer de juiste periode en account</li>
            <li>Kies &quot;Ads&quot; tab voor ad-level data</li>
            <li>Kolommen: Ad name, Spend, Purchases, ROAS, CTR, CPC, ATC</li>
            <li>Export als CSV</li>
          </ol>
        </div>
      </div>
    </div>
  );
}
