"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import Link from "next/link";
import { use } from "react";

interface Concept {
  concept: string;
  description: string;
  prompt: string;
  reference_product_index: number;
}

interface Product {
  name: string;
  price: string;
  imageUrl: string;
}

type LogEntry =
  | { type: "status"; text: string }
  | { type: "products"; storeName: string; count: number; products: Product[] }
  | { type: "concepts"; concepts: Concept[] }
  | { type: "images"; urls: string[] }
  | { type: "done"; canvaUrl?: string; imageCount: number; storeName: string; note?: string }
  | { type: "error"; text: string };

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

interface JobResult {
  jobId: string;
  status: string;
  storeName?: string;
  events: Array<{ event: string; data: unknown }>;
}

export default function StorePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [store, setStore] = useState<Store | null>(null);
  const [loading, setLoading] = useState(true);
  const [productUrl, setProductUrl] = useState("");
  const [adLibraryUrl, setAdLibraryUrl] = useState("");
  const [funnelStage, setFunnelStage] = useState("BOF");
  const [creativeType, setCreativeType] = useState<string[]>(["raw"]);
  const [format, setFormat] = useState("1:1");
  const [context, setContext] = useState("");
  const [running, setRunning] = useState(false);
  const [log, setLog] = useState<LogEntry[]>([]);
  const [pastJobs, setPastJobs] = useState<JobResult[]>([]);
  const [showPastJobs, setShowPastJobs] = useState(true);
  const logRef = useRef<HTMLDivElement>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const loadStore = useCallback(async () => {
    try {
      const res = await fetch("/api/stores");
      const stores: Store[] = await res.json();
      const found = stores.find((s) => s.id === id);
      if (found) {
        setStore(found);
        setProductUrl(found.url);
      }
    } catch {}
    setLoading(false);
  }, [id]);

  const loadPastJobs = useCallback(async () => {
    try {
      const res = await fetch("/api/results");
      const { jobs } = await res.json();
      const storeJobs = jobs.filter((j: JobResult) => {
        if (j.status !== "done") return false;
        const doneEvt = j.events.find((e) => e.event === "done");
        const storeName = (doneEvt?.data as { storeName?: string })?.storeName || j.storeName;
        return storeName?.toLowerCase().includes(store?.name?.toLowerCase() || id);
      });
      setPastJobs(storeJobs);
    } catch {}
  }, [id, store?.name]);

  useEffect(() => { loadStore(); }, [loadStore]);
  useEffect(() => { if (store) loadPastJobs(); }, [store, loadPastJobs]);
  useEffect(() => { return () => { if (pollRef.current) clearInterval(pollRef.current); }; }, []);

  function toggleCreativeType(type: string) {
    setCreativeType((prev) => prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type]);
  }

  function addLog(entry: LogEntry) {
    setLog((prev) => [...prev, entry]);
    setTimeout(() => { logRef.current?.scrollTo({ top: logRef.current.scrollHeight, behavior: "smooth" }); }, 50);
  }

  function startPolling(jobId: string) {
    if (pollRef.current) clearInterval(pollRef.current);
    pollRef.current = setInterval(async () => {
      try {
        const res = await fetch("/api/results");
        const { jobs } = await res.json();
        const job = jobs.find((j: JobResult) => j.jobId === jobId);
        if (job && job.status === "done") {
          if (pollRef.current) clearInterval(pollRef.current);
          pollRef.current = null;
          setLog([]);
          eventsToLog(job.events).forEach(addLog);
          setRunning(false);
          loadPastJobs();
        }
      } catch {}
    }, 5000);
  }

  function eventsToLog(events: Array<{ event: string; data: unknown }>): LogEntry[] {
    return events.map((e) => {
      switch (e.event) {
        case "status": return { type: "status" as const, text: e.data as string };
        case "products": return { type: "products" as const, ...(e.data as { storeName: string; count: number; products: Product[] }) };
        case "concepts": return { type: "concepts" as const, concepts: e.data as Concept[] };
        case "images": return { type: "images" as const, urls: e.data as string[] };
        case "done": return { type: "done" as const, ...(e.data as { imageCount: number; storeName: string; canvaUrl?: string; note?: string }) };
        default: return { type: "status" as const, text: String(e.data) };
      }
    });
  }

  async function handleGenerate() {
    if (!productUrl) return;
    setRunning(true);
    setLog([]);
    setShowPastJobs(false);
    let receivedDone = false;
    let jobId: string | null = null;

    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productUrl, adLibraryUrl, funnelStage, creativeType, format, context }),
      });

      const reader = res.body?.getReader();
      if (!reader) return;
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          try {
            const { event, data } = JSON.parse(line.slice(6));
            switch (event) {
              case "job": jobId = data.jobId || data; break;
              case "status": addLog({ type: "status", text: data }); break;
              case "products": addLog({ type: "products", ...data }); break;
              case "concepts": addLog({ type: "concepts", concepts: data }); break;
              case "images": addLog({ type: "images", urls: data }); break;
              case "done": addLog({ type: "done", ...data }); receivedDone = true; break;
              case "error": addLog({ type: "error", text: data }); break;
            }
          } catch {}
        }
      }
    } catch (err) {
      addLog({ type: "error", text: err instanceof Error ? err.message : "Verbinding mislukt" });
    } finally {
      if (!receivedDone && jobId) {
        addLog({ type: "status", text: "Verwerking duurt langer dan verwacht — resultaten verschijnen automatisch..." });
        startPolling(jobId);
      } else {
        setRunning(false);
        loadPastJobs();
      }
    }
  }

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
        {/* Header */}
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
          </div>
        </header>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 320px", gap: 24, alignItems: "start" }}>
          {/* Left: Generator */}
          <div>
            <div style={{ background: "#141414", border: "1px solid #222", borderRadius: 12, padding: 24, display: "flex", flexDirection: "column", gap: 20 }}>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <label style={{ fontSize: 13, fontWeight: 600, color: "#aaa", textTransform: "uppercase", letterSpacing: "0.05em" }}>Store URL</label>
                <input
                  style={{ background: "#1a1a1a", border: "1px solid #333", borderRadius: 8, padding: "12px 14px", color: "#fff", fontSize: 15, outline: "none" }}
                  type="url"
                  value={productUrl}
                  onChange={(e) => setProductUrl(e.target.value)}
                  disabled={running}
                />
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <label style={{ fontSize: 13, fontWeight: 600, color: "#aaa", textTransform: "uppercase", letterSpacing: "0.05em" }}>Ad Library Link</label>
                <input
                  style={{ background: "#1a1a1a", border: "1px solid #333", borderRadius: 8, padding: "12px 14px", color: "#fff", fontSize: 15, outline: "none" }}
                  type="url"
                  placeholder="https://www.facebook.com/ads/library/..."
                  value={adLibraryUrl}
                  onChange={(e) => setAdLibraryUrl(e.target.value)}
                  disabled={running}
                />
              </div>

              <div style={{ display: "flex", gap: 12 }}>
                <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 6 }}>
                  <label style={{ fontSize: 13, fontWeight: 600, color: "#aaa", textTransform: "uppercase", letterSpacing: "0.05em" }}>Funnel</label>
                  <div style={{ display: "flex", gap: 6 }}>
                    {["BOF", "MOF", "TOF"].map((s) => (
                      <button key={s} onClick={() => setFunnelStage(s)} disabled={running}
                        style={{ flex: 1, background: funnelStage === s ? "#1f1f1f" : "#1a1a1a", border: funnelStage === s ? "1px solid #fff" : "1px solid #333", borderRadius: 8, padding: "10px 8px", color: funnelStage === s ? "#fff" : "#999", cursor: "pointer", fontSize: 13, fontWeight: 600 }}>
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
                <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 6 }}>
                  <label style={{ fontSize: 13, fontWeight: 600, color: "#aaa", textTransform: "uppercase", letterSpacing: "0.05em" }}>Formaat</label>
                  <div style={{ display: "flex", gap: 6 }}>
                    {["1:1", "9:16"].map((f) => (
                      <button key={f} onClick={() => setFormat(f)} disabled={running}
                        style={{ flex: 1, background: format === f ? "#1f1f1f" : "#1a1a1a", border: format === f ? "1px solid #fff" : "1px solid #333", borderRadius: 8, padding: "10px 8px", color: format === f ? "#fff" : "#999", cursor: "pointer", fontSize: 13, fontWeight: 600 }}>
                        {f}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <label style={{ fontSize: 13, fontWeight: 600, color: "#aaa", textTransform: "uppercase", letterSpacing: "0.05em" }}>Type</label>
                <div style={{ display: "flex", gap: 6 }}>
                  {[{ key: "raw", label: "Raw Shots" }, { key: "txt", label: "Text" }].map((t) => (
                    <button key={t.key} onClick={() => toggleCreativeType(t.key)} disabled={running}
                      style={{ flex: 1, background: creativeType.includes(t.key) ? "#1f1f1f" : "#1a1a1a", border: creativeType.includes(t.key) ? "1px solid #fff" : "1px solid #333", borderRadius: 8, padding: "10px 8px", color: creativeType.includes(t.key) ? "#fff" : "#999", cursor: "pointer", fontSize: 13, fontWeight: 600 }}>
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <label style={{ fontSize: 13, fontWeight: 600, color: "#aaa", textTransform: "uppercase", letterSpacing: "0.05em" }}>Context / Instructies</label>
                <textarea
                  style={{ background: "#1a1a1a", border: "1px solid #333", borderRadius: 8, padding: "12px 14px", color: "#fff", fontSize: 14, outline: "none", resize: "vertical", minHeight: 80, fontFamily: "inherit", lineHeight: 1.5 }}
                  placeholder="Bijv: focus op urgentie + schaarste, gebruik Duitse tekst, laat het product in een keuken setting zien, vergelijk met dure merken..."
                  value={context}
                  onChange={(e) => setContext(e.target.value)}
                  disabled={running}
                />
                <span style={{ fontSize: 11, color: "#555" }}>Extra context die meegenomen wordt in de prompts</span>
              </div>

              <button
                onClick={handleGenerate}
                disabled={running || !productUrl}
                style={{ background: "#fff", color: "#000", border: "none", borderRadius: 8, padding: "14px", fontSize: 15, fontWeight: 600, cursor: running || !productUrl ? "not-allowed" : "pointer", opacity: running || !productUrl ? 0.4 : 1 }}
              >
                {running ? "Bezig..." : "Genereer 10 Creatives"}
              </button>
            </div>

            {/* Log */}
            {log.length > 0 && (
              <div ref={logRef} style={{ marginTop: 16, background: "#141414", border: "1px solid #222", borderRadius: 12, padding: 20, maxHeight: 500, overflowY: "auto", display: "flex", flexDirection: "column", gap: 12 }}>
                {log.map((entry, i) => (
                  <div key={i}>
                    {entry.type === "status" && <div style={{ fontSize: 14, color: "#888", display: "flex", alignItems: "center", gap: 8 }}><span style={{ color: "#4ade80", fontSize: 8 }}>●</span> {entry.text}</div>}
                    {entry.type === "images" && (
                      <div>
                        <strong style={{ fontSize: 14 }}>{entry.urls.length} images gegenereerd</strong>
                        <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 6, marginTop: 10 }}>
                          {entry.urls.map((url, j) => (
                            <a key={j} href={url} target="_blank" rel="noopener noreferrer"><img src={url} alt={`Creative ${j + 1}`} style={{ width: "100%", aspectRatio: "1", objectFit: "cover", borderRadius: 6 }} /></a>
                          ))}
                        </div>
                      </div>
                    )}
                    {entry.type === "done" && (
                      <div style={{ display: "flex", gap: 12, alignItems: "center", padding: 16, background: "#0d2818", borderRadius: 8, border: "1px solid #166534" }}>
                        <span style={{ fontSize: 24, color: "#4ade80" }}>✓</span>
                        <div>
                          <strong>Klaar!</strong> {entry.imageCount} creatives
                          {entry.canvaUrl && <><br /><a href={entry.canvaUrl} target="_blank" rel="noopener noreferrer" style={{ color: "#4ade80", textDecoration: "none", fontWeight: 600 }}>Open in Canva →</a></>}
                        </div>
                      </div>
                    )}
                    {entry.type === "error" && <div style={{ padding: 12, background: "#2d1111", borderRadius: 8, border: "1px solid #7f1d1d", color: "#fca5a5", fontSize: 14 }}><strong>Fout:</strong> {entry.text}</div>}
                  </div>
                ))}
                {running && <div style={{ display: "flex", justifyContent: "center", padding: 8 }}><div style={{ width: 8, height: 8, borderRadius: "50%", background: "#4ade80", animation: "pulse 1s infinite" }} /></div>}
              </div>
            )}

            {/* Past jobs */}
            {showPastJobs && pastJobs.length > 0 && (
              <div style={{ marginTop: 16 }}>
                <h3 style={{ fontSize: 14, fontWeight: 600, color: "#888", textTransform: "uppercase", letterSpacing: 1, marginBottom: 12 }}>Eerdere resultaten</h3>
                {pastJobs.map((job) => {
                  const imgEvt = job.events.find((e) => e.event === "images");
                  const doneEvt = job.events.find((e) => e.event === "done");
                  const imgUrls = (imgEvt?.data as string[]) || [];
                  const doneData = doneEvt?.data as { canvaUrl?: string; note?: string } | undefined;
                  return (
                    <div key={job.jobId} style={{ background: "#141414", border: "1px solid #222", borderRadius: 12, padding: 16, marginBottom: 8 }}>
                      {imgUrls.length > 0 && (
                        <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 4, marginBottom: 8 }}>
                          {imgUrls.slice(0, 5).map((url, j) => (
                            <a key={j} href={url} target="_blank" rel="noopener noreferrer"><img src={url} alt={`Creative ${j + 1}`} style={{ width: "100%", aspectRatio: "1", objectFit: "cover", borderRadius: 4 }} /></a>
                          ))}
                        </div>
                      )}
                      {doneData?.canvaUrl && <a href={doneData.canvaUrl} target="_blank" rel="noopener noreferrer" style={{ color: "#4ade80", textDecoration: "none", fontSize: 13 }}>Open in Canva →</a>}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Right: Store Intelligence */}
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {/* Quick stats */}
            {store.adAccount.campaigns.length > 0 && (
              <div style={{ background: "#141414", border: "1px solid #222", borderRadius: 12, padding: 16 }}>
                <h3 style={{ fontSize: 12, fontWeight: 600, color: "#888", textTransform: "uppercase", letterSpacing: 1, marginTop: 0, marginBottom: 12 }}>Meta Ads</h3>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                  <div style={{ background: "#1a1a1a", borderRadius: 8, padding: 12 }}>
                    <div style={{ fontSize: 11, color: "#888" }}>Spend</div>
                    <div style={{ fontSize: 18, fontWeight: 700, color: "#fff" }}>${store.adAccount.totalSpend?.toLocaleString()}</div>
                  </div>
                  <div style={{ background: "#1a1a1a", borderRadius: 8, padding: 12 }}>
                    <div style={{ fontSize: 11, color: "#888" }}>Purchases</div>
                    <div style={{ fontSize: 18, fontWeight: 700, color: "#fff" }}>{store.adAccount.totalPurchases}</div>
                  </div>
                  <div style={{ background: "#1a1a1a", borderRadius: 8, padding: 12 }}>
                    <div style={{ fontSize: 11, color: "#888" }}>Winners</div>
                    <div style={{ fontSize: 18, fontWeight: 700, color: "#22c55e" }}>{profitableCampaigns.length}/{store.adAccount.campaigns.length}</div>
                  </div>
                  <div style={{ background: "#1a1a1a", borderRadius: 8, padding: 12 }}>
                    <div style={{ fontSize: 11, color: "#888" }}>Best ROAS</div>
                    <div style={{ fontSize: 18, fontWeight: 700, color: "#22c55e" }}>
                      {Math.max(...store.adAccount.campaigns.filter((c) => c.roas).map((c) => c.roas!)).toFixed(2)}x
                    </div>
                  </div>
                </div>

                {/* Winner campaigns */}
                {profitableCampaigns.length > 0 && (
                  <div style={{ marginTop: 12 }}>
                    <div style={{ fontSize: 11, color: "#22c55e", fontWeight: 600, marginBottom: 6 }}>Winning Campaigns</div>
                    {profitableCampaigns.map((c, i) => (
                      <div key={i} style={{ fontSize: 12, color: "#ccc", padding: "6px 0", borderBottom: "1px solid #222", display: "flex", justifyContent: "space-between" }}>
                        <span>{c.name}</span>
                        <span style={{ color: "#22c55e", fontWeight: 600 }}>{c.roas?.toFixed(2)}x</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Top Ads */}
            {store.adAccount.ads && store.adAccount.ads.filter((a) => a.winner).length > 0 && (
              <div style={{ background: "#141414", border: "1px solid #222", borderRadius: 12, padding: 16 }}>
                <h3 style={{ fontSize: 12, fontWeight: 600, color: "#888", textTransform: "uppercase", letterSpacing: 1, marginTop: 0, marginBottom: 12 }}>Top Creatives</h3>
                {store.adAccount.ads.filter((a) => a.winner).sort((a, b) => b.roas - a.roas).slice(0, 5).map((ad, i) => (
                  <div key={i} style={{ padding: "8px 0", borderBottom: i < Math.min(store.adAccount.ads!.filter((a) => a.winner).length, 5) - 1 ? "1px solid #222" : "none" }}>
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
            {(store.learnings.winningPatterns.length > 0 || store.learnings.angles.length > 0) && (
              <div style={{ background: "#141414", border: "1px solid #222", borderRadius: 12, padding: 16 }}>
                <h3 style={{ fontSize: 12, fontWeight: 600, color: "#888", textTransform: "uppercase", letterSpacing: 1, marginTop: 0, marginBottom: 12 }}>Learnings</h3>
                {store.learnings.winningPatterns.length > 0 && (
                  <div style={{ marginBottom: 12 }}>
                    <div style={{ fontSize: 11, color: "#6366f1", fontWeight: 600, marginBottom: 6 }}>Patterns</div>
                    {store.learnings.winningPatterns.map((p, i) => (
                      <div key={i} style={{ fontSize: 12, color: "#aaa", marginBottom: 4, paddingLeft: 8, borderLeft: "2px solid #333" }}>{p}</div>
                    ))}
                  </div>
                )}
                {store.learnings.angles.length > 0 && (
                  <div style={{ marginBottom: 12 }}>
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

            {store.learnings.notes && (
              <div style={{ background: "#141414", border: "1px solid #222", borderRadius: 12, padding: 16 }}>
                <h3 style={{ fontSize: 12, fontWeight: 600, color: "#888", textTransform: "uppercase", letterSpacing: 1, marginTop: 0, marginBottom: 8 }}>Notes</h3>
                <p style={{ fontSize: 12, color: "#aaa", margin: 0, lineHeight: 1.5 }}>{store.learnings.notes}</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
