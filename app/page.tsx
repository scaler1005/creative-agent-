"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";

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
  };
  learnings: {
    winningPatterns: string[];
    angles: string[];
    prompts: string[];
    offers: string[];
    notes: string;
  };
}

function BrainSVG() {
  return (
    <svg viewBox="0 0 500 420" style={{ width: "100%", height: "100%", overflow: "visible" }}>
      <defs>
        <filter id="glow-soft"><feGaussianBlur stdDeviation="2" /><feMerge><feMergeNode /><feMergeNode in="SourceGraphic" /></feMerge></filter>
        <filter id="glow-med"><feGaussianBlur stdDeviation="4" /><feMerge><feMergeNode /><feMergeNode in="SourceGraphic" /></feMerge></filter>
        <filter id="glow-big"><feGaussianBlur stdDeviation="8" /><feMerge><feMergeNode /><feMergeNode in="SourceGraphic" /></feMerge></filter>
        <radialGradient id="brain-core" cx="50%" cy="45%" r="40%">
          <stop offset="0%" stopColor="rgba(60,160,255,0.15)" />
          <stop offset="100%" stopColor="transparent" />
        </radialGradient>
      </defs>

      {/* Ambient core glow */}
      <ellipse cx="250" cy="185" rx="120" ry="100" fill="url(#brain-core)" filter="url(#glow-big)" />

      {/* === LEFT HEMISPHERE — side profile brain shape === */}
      <path d="
        M 250 55
        C 230 50, 195 48, 170 55
        C 145 62, 120 72, 105 90
        C 88 110, 78 128, 75 150
        C 72 172, 75 195, 82 215
        C 88 235, 98 252, 115 268
        C 128 280, 145 288, 165 292
        C 180 295, 200 296, 220 295
        C 235 293, 245 290, 250 285
      " stroke="rgba(50,150,255,0.55)" strokeWidth="1.2" fill="none" filter="url(#glow-soft)" />

      {/* RIGHT HEMISPHERE */}
      <path d="
        M 250 55
        C 270 50, 305 48, 330 55
        C 355 62, 380 72, 395 90
        C 412 110, 422 128, 425 150
        C 428 172, 425 195, 418 215
        C 412 235, 402 252, 385 268
        C 372 280, 355 288, 335 292
        C 320 295, 300 296, 280 295
        C 265 293, 255 290, 250 285
      " stroke="rgba(50,150,255,0.55)" strokeWidth="1.2" fill="none" filter="url(#glow-soft)" />

      {/* Central fissure */}
      <path d="M 250 50 C 249 80, 251 120, 250 160 C 249 200, 251 240, 250 290" stroke="rgba(30,100,220,0.5)" strokeWidth="0.8" fill="none" />

      {/* === LEFT HEMISPHERE FOLDS (gyri/sulci) === */}
      <path d="M 135 78 C 155 72, 185 68, 210 65 C 225 63, 240 58, 248 56" stroke="rgba(60,170,255,0.35)" strokeWidth="0.8" fill="none" />
      <path d="M 115 95 C 140 85, 170 80, 200 78 C 220 76, 238 70, 248 66" stroke="rgba(60,170,255,0.3)" strokeWidth="0.7" fill="none" />
      <path d="M 100 115 C 125 105, 155 98, 190 95 C 215 92, 235 85, 248 78" stroke="rgba(60,170,255,0.28)" strokeWidth="0.7" fill="none" />

      <path d="M 88 138 C 110 128, 145 118, 185 115 C 210 112, 235 100, 248 92" stroke="rgba(60,170,255,0.25)" strokeWidth="0.7" fill="none" />
      <path d="M 80 160 C 105 148, 140 138, 180 135 C 208 132, 235 118, 248 108" stroke="rgba(60,170,255,0.22)" strokeWidth="0.6" fill="none" />
      <path d="M 78 182 C 100 170, 138 158, 178 155 C 208 152, 235 138, 248 125" stroke="rgba(60,170,255,0.2)" strokeWidth="0.6" fill="none" />

      <path d="M 80 205 C 102 192, 140 180, 180 178 C 210 175, 235 158, 248 145" stroke="rgba(60,170,255,0.18)" strokeWidth="0.6" fill="none" />
      <path d="M 88 228 C 108 215, 145 202, 185 200 C 212 198, 235 180, 248 165" stroke="rgba(60,170,255,0.16)" strokeWidth="0.5" fill="none" />
      <path d="M 105 248 C 125 238, 155 225, 190 222 C 215 220, 238 200, 248 185" stroke="rgba(60,170,255,0.14)" strokeWidth="0.5" fill="none" />
      <path d="M 125 265 C 145 258, 168 248, 200 244 C 222 242, 242 222, 248 205" stroke="rgba(60,170,255,0.12)" strokeWidth="0.5" fill="none" />

      {/* === RIGHT HEMISPHERE FOLDS === */}
      <path d="M 365 78 C 345 72, 315 68, 290 65 C 275 63, 260 58, 252 56" stroke="rgba(60,170,255,0.35)" strokeWidth="0.8" fill="none" />
      <path d="M 385 95 C 360 85, 330 80, 300 78 C 280 76, 262 70, 252 66" stroke="rgba(60,170,255,0.3)" strokeWidth="0.7" fill="none" />
      <path d="M 400 115 C 375 105, 345 98, 310 95 C 285 92, 265 85, 252 78" stroke="rgba(60,170,255,0.28)" strokeWidth="0.7" fill="none" />

      <path d="M 412 138 C 390 128, 355 118, 315 115 C 290 112, 265 100, 252 92" stroke="rgba(60,170,255,0.25)" strokeWidth="0.7" fill="none" />
      <path d="M 420 160 C 395 148, 360 138, 320 135 C 292 132, 265 118, 252 108" stroke="rgba(60,170,255,0.22)" strokeWidth="0.6" fill="none" />
      <path d="M 422 182 C 400 170, 362 158, 322 155 C 292 152, 265 138, 252 125" stroke="rgba(60,170,255,0.2)" strokeWidth="0.6" fill="none" />

      <path d="M 420 205 C 398 192, 360 180, 320 178 C 290 175, 265 158, 252 145" stroke="rgba(60,170,255,0.18)" strokeWidth="0.6" fill="none" />
      <path d="M 412 228 C 392 215, 355 202, 315 200 C 288 198, 265 180, 252 165" stroke="rgba(60,170,255,0.16)" strokeWidth="0.5" fill="none" />
      <path d="M 395 248 C 375 238, 345 225, 310 222 C 285 220, 262 200, 252 185" stroke="rgba(60,170,255,0.14)" strokeWidth="0.5" fill="none" />
      <path d="M 375 265 C 355 258, 332 248, 300 244 C 278 242, 258 222, 252 205" stroke="rgba(60,170,255,0.12)" strokeWidth="0.5" fill="none" />

      {/* === CEREBELLUM === */}
      <path d="M 165 292 C 175 305, 195 315, 220 318 C 235 320, 245 320, 250 320" stroke="rgba(40,130,250,0.35)" strokeWidth="0.8" fill="none" />
      <path d="M 335 292 C 325 305, 305 315, 280 318 C 265 320, 255 320, 250 320" stroke="rgba(40,130,250,0.35)" strokeWidth="0.8" fill="none" />
      <path d="M 180 298 C 200 305, 225 308, 250 310 C 275 308, 300 305, 320 298" stroke="rgba(40,130,250,0.2)" strokeWidth="0.5" fill="none" />
      <path d="M 192 305 C 210 310, 230 313, 250 314 C 270 313, 290 310, 308 305" stroke="rgba(40,130,250,0.15)" strokeWidth="0.4" fill="none" />

      {/* === BRAINSTEM === */}
      <path d="M 242 320 C 238 340, 236 358, 240 372 C 244 382, 250 386, 256 382 C 260 372, 262 355, 258 338 C 256 328, 254 322, 252 320" stroke="rgba(40,130,250,0.35)" strokeWidth="0.9" fill="none" filter="url(#glow-soft)" />

      {/* === LATERAL FISSURE (Sylvian) === */}
      <path d="M 95 155 C 120 148, 155 145, 195 150 C 220 153, 240 148, 248 140" stroke="rgba(25,80,200,0.4)" strokeWidth="0.9" fill="none" />
      <path d="M 405 155 C 380 148, 345 145, 305 150 C 280 153, 260 148, 252 140" stroke="rgba(25,80,200,0.4)" strokeWidth="0.9" fill="none" />

      {/* === NEURAL ACTIVITY === */}
      <circle cx="155" cy="88" r="2.5" fill="rgba(120,200,255,0.7)" filter="url(#glow-soft)"><animate attributeName="opacity" values="0.2;0.9;0.2" dur="2.2s" repeatCount="indefinite" /></circle>
      <circle cx="345" cy="92" r="2" fill="rgba(120,200,255,0.6)" filter="url(#glow-soft)"><animate attributeName="opacity" values="0.4;1;0.4" dur="2.8s" repeatCount="indefinite" /></circle>
      <circle cx="120" cy="140" r="2" fill="rgba(120,200,255,0.5)" filter="url(#glow-soft)"><animate attributeName="opacity" values="0.2;0.7;0.2" dur="3.2s" repeatCount="indefinite" /></circle>
      <circle cx="380" cy="145" r="2.2" fill="rgba(120,200,255,0.6)" filter="url(#glow-soft)"><animate attributeName="opacity" values="0.3;0.85;0.3" dur="1.9s" repeatCount="indefinite" /></circle>
      <circle cx="200" cy="120" r="1.8" fill="rgba(150,215,255,0.7)" filter="url(#glow-soft)"><animate attributeName="opacity" values="0.3;1;0.3" dur="2.5s" repeatCount="indefinite" /></circle>
      <circle cx="300" cy="125" r="1.8" fill="rgba(150,215,255,0.6)" filter="url(#glow-soft)"><animate attributeName="opacity" values="0.15;0.7;0.15" dur="3s" repeatCount="indefinite" /></circle>
      <circle cx="160" cy="200" r="1.5" fill="rgba(120,200,255,0.5)" filter="url(#glow-soft)"><animate attributeName="opacity" values="0.3;0.75;0.3" dur="3.5s" repeatCount="indefinite" /></circle>
      <circle cx="340" cy="205" r="1.5" fill="rgba(120,200,255,0.5)" filter="url(#glow-soft)"><animate attributeName="opacity" values="0.2;0.6;0.2" dur="2.7s" repeatCount="indefinite" /></circle>
      <circle cx="220" cy="250" r="1.3" fill="rgba(120,200,255,0.4)" filter="url(#glow-soft)"><animate attributeName="opacity" values="0.25;0.65;0.25" dur="3.1s" repeatCount="indefinite" /></circle>
      <circle cx="280" cy="248" r="1.3" fill="rgba(120,200,255,0.4)" filter="url(#glow-soft)"><animate attributeName="opacity" values="0.2;0.55;0.2" dur="2.9s" repeatCount="indefinite" /></circle>
      <circle cx="250" cy="75" r="1.5" fill="rgba(160,220,255,0.6)" filter="url(#glow-soft)"><animate attributeName="opacity" values="0.3;0.8;0.3" dur="2.3s" repeatCount="indefinite" /></circle>
      <circle cx="100" cy="180" r="1.8" fill="rgba(120,200,255,0.4)" filter="url(#glow-soft)"><animate attributeName="opacity" values="0.15;0.6;0.15" dur="3.8s" repeatCount="indefinite" /></circle>
      <circle cx="400" cy="178" r="1.8" fill="rgba(120,200,255,0.4)" filter="url(#glow-soft)"><animate attributeName="opacity" values="0.2;0.65;0.2" dur="3.4s" repeatCount="indefinite" /></circle>

      {/* Traveling neural signals */}
      <circle r="1.2" fill="rgba(180,230,255,0.9)" filter="url(#glow-soft)">
        <animateMotion dur="4s" repeatCount="indefinite" path="M 135 78 C 155 72, 185 68, 210 65 C 225 63, 240 58, 248 56" />
        <animate attributeName="opacity" values="0;1;0" dur="4s" repeatCount="indefinite" />
      </circle>
      <circle r="1" fill="rgba(180,230,255,0.8)" filter="url(#glow-soft)">
        <animateMotion dur="5s" repeatCount="indefinite" path="M 365 78 C 345 72, 315 68, 290 65 C 275 63, 260 58, 252 56" />
        <animate attributeName="opacity" values="0;1;0" dur="5s" repeatCount="indefinite" />
      </circle>
      <circle r="1" fill="rgba(180,230,255,0.7)" filter="url(#glow-soft)">
        <animateMotion dur="6s" repeatCount="indefinite" path="M 88 138 C 110 128, 145 118, 185 115 C 210 112, 235 100, 248 92" />
        <animate attributeName="opacity" values="0;0.8;0" dur="6s" repeatCount="indefinite" />
      </circle>
      <circle r="1" fill="rgba(180,230,255,0.7)" filter="url(#glow-soft)">
        <animateMotion dur="5.5s" repeatCount="indefinite" path="M 412 138 C 390 128, 355 118, 315 115 C 290 112, 265 100, 252 92" />
        <animate attributeName="opacity" values="0;0.8;0" dur="5.5s" repeatCount="indefinite" />
      </circle>
    </svg>
  );
}

export default function Home() {
  const [stores, setStores] = useState<Store[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<string | null>(null);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 640);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  const loadStores = useCallback(async () => {
    try {
      const res = await fetch("/api/stores");
      setStores(await res.json());
    } catch {}
    setLoading(false);
  }, []);

  useEffect(() => { loadStores(); }, [loadStores]);

  const profitableCount = (s: Store) => s.adAccount.campaigns.filter((c) => c.profitable).length;
  const bestRoas = (s: Store) => {
    const vals = s.adAccount.campaigns.filter((c) => c.roas).map((c) => c.roas!);
    return vals.length > 0 ? Math.max(...vals) : 0;
  };

  if (loading) {
    return (
      <div style={{ minHeight: "100vh", background: "#050507", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ width: 32, height: 32, border: "2px solid #151520", borderTopColor: "#2563eb", borderRadius: "50%", animation: "spin 0.7s linear infinite" }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  const BRAIN_W = isMobile ? 180 : 340;
  const BRAIN_H = isMobile ? 154 : 290;
  const NODE_W = isMobile ? 115 : 160;
  const NODE_H = isMobile ? 34 : 48;
  const RADIUS = isMobile ? 125 : 260;
  const CX = isMobile ? 160 : 400;
  const CY = isMobile ? 165 : 310;
  const AREA_W = isMobile ? 320 : 800;
  const AREA_H = isMobile ? 330 : 640;

  const storePopup = (store: Store, hasData: boolean) => (
    <div style={{
      background: "rgba(8,10,18,0.96)",
      border: "1px solid rgba(37,99,235,0.18)",
      borderRadius: 10,
      padding: 14,
      width: 200,
      backdropFilter: "blur(12px)",
      boxShadow: "0 8px 32px rgba(0,0,0,0.5)",
    }}>
      {hasData && (
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10, paddingBottom: 10, borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
          <div><div style={{ fontSize: 9, color: "rgba(255,255,255,0.28)", textTransform: "uppercase", letterSpacing: "0.05em" }}>Spend</div><div style={{ fontSize: 14, fontWeight: 700, color: "#fff" }}>${store.adAccount.totalSpend?.toLocaleString()}</div></div>
          <div style={{ textAlign: "right" }}><div style={{ fontSize: 9, color: "rgba(255,255,255,0.28)", textTransform: "uppercase", letterSpacing: "0.05em" }}>Best ROAS</div><div style={{ fontSize: 14, fontWeight: 700, color: "#22c55e" }}>{bestRoas(store).toFixed(2)}x</div></div>
        </div>
      )}
      <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
        <Link href={`/store/${store.id}`} className="ab" style={{ display: "flex", alignItems: "center", gap: 8, padding: "9px 10px", background: "rgba(37,99,235,0.06)", border: "1px solid rgba(37,99,235,0.14)", borderRadius: 7, color: "#fff", textDecoration: "none", fontSize: 12, fontWeight: 500, transition: "all 0.15s" }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="rgba(37,99,235,0.8)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" /></svg>
          Generate Winners
        </Link>
        <Link href={`/store/${store.id}/upload`} className="ab" style={{ display: "flex", alignItems: "center", gap: 8, padding: "9px 10px", background: "rgba(37,99,235,0.06)", border: "1px solid rgba(37,99,235,0.14)", borderRadius: 7, color: "#fff", textDecoration: "none", fontSize: 12, fontWeight: 500, transition: "all 0.15s" }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="rgba(37,99,235,0.8)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" /></svg>
          Upload CSV
        </Link>
      </div>
      {store.niche && <div style={{ marginTop: 8, fontSize: 9, color: "rgba(255,255,255,0.18)", textAlign: "center", textTransform: "uppercase", letterSpacing: "0.1em" }}>{store.niche}</div>}
    </div>
  );

  return (
    <div style={{ minHeight: "100vh", background: "#050507", color: "#e0e0e0", fontFamily: "'Inter', system-ui, -apple-system, sans-serif", overflow: "hidden", display: "flex", flexDirection: "column" }}>
      <style>{`
        @keyframes float { 0%, 100% { transform: translate(-50%, -50%) translateY(0); } 50% { transform: translate(-50%, -50%) translateY(-6px); } }
        @keyframes pulse-ring { 0%, 100% { opacity: 0.06; transform: translate(-50%, -50%) scale(1); } 50% { opacity: 0.12; transform: translate(-50%, -50%) scale(1.03); } }
        .sn { transition: all 0.25s cubic-bezier(0.34, 1.56, 0.64, 1); cursor: pointer; }
        .sn:hover { transform: translate(-50%, -50%) scale(1.1); }
        .ab:hover { background: rgba(37,99,235,0.12) !important; border-color: rgba(37,99,235,0.4) !important; }
      `}</style>

      <div style={{ flex: 1, position: "relative", display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column" }}>
        <div style={{ position: "relative", width: AREA_W, height: AREA_H, maxWidth: "100vw" }}>

          <svg style={{ position: "absolute", inset: 0, width: "100%", height: "100%", pointerEvents: "none" }} viewBox={`0 0 ${AREA_W} ${AREA_H}`}>
            {stores.map((store, i) => {
              const angle = (i * (360 / stores.length) - 90) * (Math.PI / 180);
              const sx = CX + Math.cos(angle) * RADIUS;
              const sy = CY + Math.sin(angle) * RADIUS;
              const isActive = selected === store.id;
              const hasData = store.adAccount.campaigns.length > 0;
              return (
                <g key={store.id}>
                  <line x1={CX} y1={CY} x2={sx} y2={sy} stroke={isActive ? "rgba(37,99,235,0.45)" : "rgba(37,99,235,0.1)"} strokeWidth={isActive ? 1.5 : 0.7} strokeDasharray={hasData ? "none" : "4 6"} />
                  {hasData && (
                    <line x1={CX} y1={CY} x2={sx} y2={sy} stroke="rgba(37,99,235,0.2)" strokeWidth={0.7} strokeDasharray="3 9" strokeDashoffset="0">
                      <animate attributeName="stroke-dashoffset" values="0;-24" dur="2s" repeatCount="indefinite" />
                    </line>
                  )}
                </g>
              );
            })}
          </svg>

          <div style={{ position: "absolute", left: CX, top: CY, transform: "translate(-50%, -50%)", width: BRAIN_W, height: BRAIN_H, zIndex: 2, animation: "float 8s ease-in-out infinite" }}>
            <div style={{ position: "absolute", left: "50%", top: "50%", width: BRAIN_W * 1.4, height: BRAIN_H * 1.4, transform: "translate(-50%, -50%)", borderRadius: "50%", background: "radial-gradient(circle, rgba(37,99,235,0.06) 0%, transparent 60%)", animation: "pulse-ring 6s ease-in-out infinite" }} />
            <BrainSVG />
          </div>

          {stores.map((store, i) => {
            const angle = (i * (360 / stores.length) - 90) * (Math.PI / 180);
            const x = CX + Math.cos(angle) * RADIUS;
            const y = CY + Math.sin(angle) * RADIUS;
            const isSelected = selected === store.id;
            const hasData = store.adAccount.campaigns.length > 0;
            const winners = profitableCount(store);

            return (
              <div key={store.id} style={{ position: "absolute", left: x, top: y, zIndex: isSelected ? 10 : 3 }}>
                <div
                  className="sn"
                  onClick={() => setSelected(isSelected ? null : store.id)}
                  style={{
                    width: NODE_W,
                    height: NODE_H,
                    borderRadius: NODE_H / 2,
                    transform: "translate(-50%, -50%)",
                    background: isSelected ? "rgba(37,99,235,0.1)" : "rgba(8,10,18,0.92)",
                    border: isSelected ? "1.5px solid rgba(37,99,235,0.55)" : hasData ? "1px solid rgba(37,99,235,0.18)" : "1px solid rgba(255,255,255,0.05)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 6,
                    boxShadow: isSelected ? "0 0 28px rgba(37,99,235,0.12)" : "none",
                    backdropFilter: "blur(8px)",
                    padding: "0 14px",
                    whiteSpace: "nowrap",
                  }}
                >
                  <span style={{ fontSize: isMobile ? 11 : 12, color: "#fff", fontWeight: 600 }}>
                    {store.name}
                  </span>
                  {hasData && winners > 0 && (
                    <span style={{ fontSize: 9, color: "rgba(34,197,94,0.75)", fontWeight: 500, flexShrink: 0 }}>
                      {winners}W
                    </span>
                  )}
                </div>

                {isSelected && !isMobile && (
                  <div style={{ position: "absolute", top: NODE_H / 2 + 14, left: "50%", transform: "translateX(-50%)", zIndex: 20 }}>
                    <div style={{ position: "absolute", top: -5, left: "50%", transform: "translateX(-50%) rotate(45deg)", width: 10, height: 10, background: "rgba(8,10,18,0.96)", borderTop: "1px solid rgba(37,99,235,0.18)", borderLeft: "1px solid rgba(37,99,235,0.18)", zIndex: 21 }} />
                    {storePopup(store, hasData)}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Mobile popup — fixed at bottom */}
        {isMobile && selected && (() => {
          const store = stores.find((s) => s.id === selected);
          if (!store) return null;
          const hasData = store.adAccount.campaigns.length > 0;
          return (
            <div style={{ position: "fixed", bottom: 0, left: 0, right: 0, zIndex: 30, padding: "0 16px 24px", background: "linear-gradient(transparent, rgba(5,5,7,0.95) 20%)" }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: "#fff", marginBottom: 10, textAlign: "center" }}>{store.name}</div>
              {storePopup(store, hasData)}
            </div>
          );
        })()}
      </div>

      <div style={{ display: "flex", justifyContent: "center", gap: isMobile ? 20 : 48, padding: isMobile ? "14px 12px 20px" : "18px 0 26px", borderTop: "1px solid rgba(255,255,255,0.03)", flexWrap: "wrap" }}>
        {[
          { value: stores.length, label: "Stores", color: "#fff" },
          { value: stores.reduce((s, st) => s + profitableCount(st), 0), label: "Winners", color: "#2563eb" },
          { value: "$" + stores.reduce((s, st) => s + (st.adAccount.totalSpend || 0), 0).toLocaleString(), label: "Total Spend", color: "#22c55e" },
          { value: stores.reduce((s, st) => s + (st.adAccount.totalPurchases || 0), 0), label: "Purchases", color: "#22c55e" },
        ].map((stat, i) => (
          <div key={i} style={{ textAlign: "center" }}>
            <div style={{ fontSize: isMobile ? 16 : 20, fontWeight: 700, color: stat.color, fontVariantNumeric: "tabular-nums" }}>{stat.value}</div>
            <div style={{ fontSize: isMobile ? 9 : 10, color: "rgba(255,255,255,0.22)", textTransform: "uppercase", letterSpacing: "0.12em", marginTop: 2 }}>{stat.label}</div>
          </div>
        ))}
      </div>

      {selected && <div style={{ position: "fixed", inset: 0, zIndex: 1 }} onClick={() => setSelected(null)} />}
    </div>
  );
}
