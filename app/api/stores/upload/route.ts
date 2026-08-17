import { NextRequest, NextResponse } from "next/server";
import { getStore, saveStore } from "@/lib/store-data";

interface ParsedAd {
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

interface ParsedCampaign {
  name: string;
  status: string;
  spend: number;
  purchases: number;
  cpa: number | null;
  roas: number | null;
  ctr: number;
  cpc: number;
  cpm: number;
  addToCart: number;
  profitable: boolean;
}

function parseCSV(text: string): Record<string, string>[] {
  const lines = text.trim().split("\n");
  if (lines.length < 2) return [];

  const headers = lines[0].split(",").map((h) => h.trim().replace(/^"|"$/g, ""));
  return lines.slice(1).map((line) => {
    const values: string[] = [];
    let current = "";
    let inQuotes = false;

    for (const char of line) {
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === "," && !inQuotes) {
        values.push(current.trim());
        current = "";
      } else {
        current += char;
      }
    }
    values.push(current.trim());

    const row: Record<string, string> = {};
    headers.forEach((h, i) => {
      row[h] = values[i] || "";
    });
    return row;
  });
}

function findColumn(row: Record<string, string>, patterns: string[]): string {
  const keys = Object.keys(row);
  for (const p of patterns) {
    const found = keys.find((k) => k.toLowerCase().includes(p.toLowerCase()));
    if (found) return found;
  }
  return "";
}

function num(val: string | undefined): number {
  if (!val) return 0;
  const cleaned = val.replace(/[,$%]/g, "").trim();
  const n = parseFloat(cleaned);
  return isNaN(n) ? 0 : n;
}

function parseAdsFromCSV(rows: Record<string, string>[]): ParsedAd[] {
  if (rows.length === 0) return [];

  const sample = rows[0];
  const nameCol = findColumn(sample, ["ad name", "ad_name", "name"]);
  const campCol = findColumn(sample, ["campaign name", "campaign_name", "campaign"]);
  const statusCol = findColumn(sample, ["delivery", "status", "effective_status"]);
  const spendCol = findColumn(sample, ["amount spent", "spend", "cost"]);
  const purchCol = findColumn(sample, ["purchases", "purchase", "conversions"]);
  const roasCol = findColumn(sample, ["roas", "purchase_roas", "return"]);
  const ctrCol = findColumn(sample, ["ctr", "click-through"]);
  const cpcCol = findColumn(sample, ["cpc", "cost per click", "cost_per_click"]);
  const atcCol = findColumn(sample, ["add to cart", "adds_to_cart", "adds to cart", "atc"]);

  return rows
    .filter((r) => num(r[spendCol]) > 0)
    .map((r) => {
      const spend = num(r[spendCol]);
      const purchases = num(r[purchCol]);
      const roas = num(r[roasCol]);
      const cpa = purchases > 0 ? spend / purchases : 0;

      return {
        name: r[nameCol] || "Unknown",
        campaign: r[campCol] || "Unknown",
        status: (r[statusCol] || "unknown").toLowerCase().includes("activ") ? "active" : "inactive",
        spend,
        purchases,
        cpa: Math.round(cpa * 100) / 100,
        roas: Math.round(roas * 100) / 100,
        ctr: num(r[ctrCol]),
        cpc: num(r[cpcCol]),
        addToCart: num(r[atcCol]),
        winner: false,
      };
    });
}

function parseCampaignsFromCSV(rows: Record<string, string>[]): ParsedCampaign[] {
  if (rows.length === 0) return [];

  const sample = rows[0];
  const nameCol = findColumn(sample, ["campaign name", "campaign_name", "name"]);
  const statusCol = findColumn(sample, ["delivery", "status", "effective_status"]);
  const spendCol = findColumn(sample, ["amount spent", "spend", "cost"]);
  const purchCol = findColumn(sample, ["purchases", "purchase", "conversions"]);
  const roasCol = findColumn(sample, ["roas", "purchase_roas", "return"]);
  const ctrCol = findColumn(sample, ["ctr", "click-through"]);
  const cpcCol = findColumn(sample, ["cpc", "cost per click"]);
  const cpmCol = findColumn(sample, ["cpm", "cost per 1000", "cost per mille"]);
  const atcCol = findColumn(sample, ["add to cart", "adds_to_cart", "adds to cart", "atc"]);

  return rows
    .filter((r) => num(r[spendCol]) > 0)
    .map((r) => {
      const spend = num(r[spendCol]);
      const purchases = num(r[purchCol]);
      const roas = roasCol ? num(r[roasCol]) : null;
      const cpa = purchases > 0 ? spend / purchases : null;

      return {
        name: r[nameCol] || "Unknown",
        status: (r[statusCol] || "unknown").toLowerCase().includes("activ") ? "active" : "inactive",
        spend,
        purchases,
        cpa: cpa ? Math.round(cpa * 100) / 100 : null,
        roas: roas ? Math.round(roas * 100) / 100 : null,
        ctr: num(r[ctrCol]),
        cpc: num(r[cpcCol]),
        cpm: num(r[cpmCol]),
        addToCart: num(r[atcCol]),
        profitable: (roas ?? 0) >= 2,
      };
    });
}

function analyzeAds(ads: ParsedAd[]): { winners: ParsedAd[]; learnings: string[] } {
  const sorted = [...ads].sort((a, b) => b.purchases - a.purchases);
  const totalSpend = ads.reduce((s, a) => s + a.spend, 0);
  const totalPurchases = ads.reduce((s, a) => s + a.purchases, 0);

  const winners = sorted.filter((ad) => {
    if (ad.purchases === 0) return false;
    if (ad.roas >= 2) return true;
    if (ad.purchases >= 3 && ad.cpa < totalSpend / totalPurchases) return true;
    return false;
  });

  winners.forEach((w) => (w.winner = true));

  const learnings: string[] = [];

  if (winners.length > 0) {
    const top = winners[0];
    const spendShare = Math.round((top.spend / totalSpend) * 100);
    learnings.push(
      `${top.name} = top creative: ${top.purchases} purchases, ${top.roas}x ROAS, $${top.cpa} CPA — ${spendShare}% van spend`
    );
  }

  if (winners.length > 1) {
    const second = winners[1];
    learnings.push(
      `${second.name} = #2: ${second.purchases} purchases, ${second.roas}x ROAS, $${second.cpa} CPA`
    );
  }

  const highCTR = ads.filter((a) => a.ctr > 8).sort((a, b) => b.ctr - a.ctr);
  if (highCTR.length > 0) {
    learnings.push(
      `Hoge CTR ads: ${highCTR.map((a) => `${a.name} (${a.ctr}%)`).join(", ")} — sterke hooks`
    );
  }

  const lowCPC = ads.filter((a) => a.purchases > 0).sort((a, b) => a.cpc - b.cpc);
  if (lowCPC.length > 0 && lowCPC[0].cpc < 1) {
    learnings.push(
      `Laagste CPC op winners: $${lowCPC[0].cpc} (${lowCPC[0].name}) — hoge relevance`
    );
  }

  const highATC = ads.filter((a) => a.addToCart > 50).sort((a, b) => b.addToCart - a.addToCart);
  if (highATC.length > 0) {
    learnings.push(
      `Hoge ATC: ${highATC.map((a) => `${a.name} (${a.addToCart} ATC)`).join(", ")}`
    );
  }

  return { winners, learnings };
}

function analyzeCampaigns(campaigns: ParsedCampaign[]): string[] {
  const learnings: string[] = [];
  const profitable = campaigns.filter((c) => c.profitable);

  if (profitable.length > 0) {
    learnings.push(
      `Winstgevende campaigns: ${profitable.map((c) => `${c.name} (${c.roas}x)`).join(", ")}`
    );
  }

  const bestROAS = campaigns.filter((c) => c.roas).sort((a, b) => (b.roas ?? 0) - (a.roas ?? 0));
  if (bestROAS.length > 0 && bestROAS[0].roas) {
    learnings.push(`Beste ROAS: ${bestROAS[0].name} — ${bestROAS[0].roas}x`);
  }

  return learnings;
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const storeId = formData.get("storeId") as string | null;
    const type = (formData.get("type") as string) || "ad";

    if (!file || !storeId) {
      return NextResponse.json({ success: false, error: "File en storeId zijn verplicht" }, { status: 400 });
    }

    const storeData = await getStore(storeId);
    if (!storeData) {
      return NextResponse.json({ success: false, error: "Store niet gevonden" }, { status: 404 });
    }

    const csvText = await file.text();
    const rows = parseCSV(csvText);

    if (rows.length === 0) {
      return NextResponse.json({ success: false, error: "CSV is leeg of ongeldig" }, { status: 400 });
    }

    const today = new Date().toISOString().split("T")[0];
    let importedCount = 0;
    let winnersCount = 0;

    const adAccount = storeData.adAccount as Record<string, unknown>;
    const learnings = storeData.learnings as Record<string, unknown>;

    if (type === "ad") {
      const ads = parseAdsFromCSV(rows);
      const { winners, learnings: newLearnings } = analyzeAds(ads);
      winnersCount = winners.length;
      importedCount = ads.length;

      adAccount.ads = ads;
      adAccount.lastImport = today;
      adAccount.totalSpend = ads.reduce((s: number, a: ParsedAd) => s + a.spend, 0);
      adAccount.totalPurchases = ads.reduce((s: number, a: ParsedAd) => s + a.purchases, 0);

      learnings.winningPatterns = newLearnings;
    } else {
      const campaigns = parseCampaignsFromCSV(rows);
      const newLearnings = analyzeCampaigns(campaigns);
      importedCount = campaigns.length;
      winnersCount = campaigns.filter((c) => c.profitable).length;

      adAccount.campaigns = campaigns;
      adAccount.lastImport = today;
      adAccount.totalSpend = campaigns.reduce((s: number, c: ParsedCampaign) => s + c.spend, 0);
      adAccount.totalPurchases = campaigns.reduce((s: number, c: ParsedCampaign) => s + c.purchases, 0);

      const existingLearnings = (learnings.winningPatterns as string[]) || [];
      learnings.winningPatterns = [...newLearnings, ...existingLearnings.slice(0, 3)];
    }

    await saveStore(storeId, storeData);

    return NextResponse.json({
      success: true,
      imported: importedCount,
      winners: winnersCount,
      learnings: (learnings.winningPatterns as string[]).length,
    });
  } catch (err) {
    return NextResponse.json(
      { success: false, error: err instanceof Error ? err.message : "Upload mislukt" },
      { status: 500 }
    );
  }
}
