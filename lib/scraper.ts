export interface ProductInfo {
  name: string;
  price: string;
  originalPrice?: string;
  imageUrl: string;
  url: string;
}

export interface StoreOffer {
  offer: string;
  originalPrices: string[];
  salePrices: string[];
  isFree: boolean;
  isClosingSale: boolean;
  collectionName: string;
}

async function tryShopifyApi(baseUrl: string): Promise<ProductInfo[] | null> {
  try {
    const origin = new URL(baseUrl).origin;
    const res = await fetch(`${origin}/products.json?limit=10`, { signal: AbortSignal.timeout(8000) });
    if (!res.ok) return null;
    const data = await res.json();
    if (!data.products?.length) return null;

    return data.products.slice(0, 10).map((p: { title: string; variants?: Array<{ price?: string; compare_at_price?: string }>; images?: Array<{ src: string }>; handle?: string }) => ({
      name: p.title,
      price: p.variants?.[0]?.price ? `${p.variants[0].price}` : "",
      originalPrice: p.variants?.[0]?.compare_at_price ? `${p.variants[0].compare_at_price}` : "",
      imageUrl: p.images?.[0]?.src?.split("?")[0] ?? "",
      url: `${origin}/products/${p.handle}`,
    })).filter((p: ProductInfo) => p.imageUrl);
  } catch {
    return null;
  }
}

async function fetchHtml(url: string): Promise<string> {
  const res = await fetch(url, {
    signal: AbortSignal.timeout(15000),
    headers: {
      "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      "Accept": "text/html,application/xhtml+xml",
    },
  });
  return res.text();
}

function extractMeta(html: string, property: string): string {
  const re = new RegExp(`<meta[^>]+(?:property|name)=["']${property}["'][^>]+content=["']([^"']*)["']`, "i");
  const match = html.match(re);
  if (match) return match[1];
  const re2 = new RegExp(`<meta[^>]+content=["']([^"']*)["'][^>]+(?:property|name)=["']${property}["']`, "i");
  const match2 = html.match(re2);
  return match2?.[1] ?? "";
}

function extractTitle(html: string): string {
  const match = html.match(/<title[^>]*>([^<]*)<\/title>/i);
  return match?.[1]?.trim() ?? "Store";
}

function parseProductsFromHtml(html: string, baseUrl: string): ProductInfo[] {
  const products: ProductInfo[] = [];
  const seen = new Set<string>();
  const origin = new URL(baseUrl).origin;

  const productLinkRe = /<a[^>]+href=["']([^"']*\/products\/[^"'?#]*)["'][^>]*>([\s\S]*?)<\/a>/gi;
  let match;

  while ((match = productLinkRe.exec(html)) !== null) {
    const href = match[1].startsWith("http") ? match[1] : `${origin}${match[1]}`;
    if (seen.has(href)) continue;

    const block = match[2];
    const imgMatch = block.match(/<img[^>]+(?:src|data-src)=["']([^"']+)["'][^>]*/i);
    if (!imgMatch) continue;

    let imgSrc = imgMatch[1];
    if (imgSrc.startsWith("//")) imgSrc = `https:${imgSrc}`;
    const cleanSrc = imgSrc.split("?")[0];

    if (/logo|icon|badge|banner|\.svg$|1x1|spacer|pixel|tracking/i.test(cleanSrc)) continue;

    const altMatch = imgMatch[0].match(/alt=["']([^"']*)["']/i);
    const nameFromAlt = altMatch?.[1]?.trim() ?? "";

    const headingMatch = block.match(/<(?:h[2-5]|span|div)[^>]*class=["'][^"']*(?:title|heading|name)[^"']*["'][^>]*>([^<]+)/i);
    const name = headingMatch?.[1]?.trim() || nameFromAlt || `Product ${products.length + 1}`;

    const priceMatch = block.match(/(?:€|£|\$|CHF)\s*[\d,.]+|[\d,.]+\s*(?:€|£|\$|CHF)/);
    const price = priceMatch?.[0]?.trim() ?? "";

    seen.add(href);
    products.push({ name, price, imageUrl: cleanSrc, url: href });

    if (products.length >= 10) break;
  }

  return products;
}

function analyzeOffer(products: ProductInfo[], html: string): StoreOffer {
  const pageText = html.replace(/<[^>]+>/g, " ").substring(0, 8000).toLowerCase();

  const collectionMatch = html.match(/<h1[^>]*>([^<]+)<\/h1>/i);
  const collectionName = collectionMatch?.[1]?.trim() ?? "";

  const originalPrices: string[] = [];
  const salePrices: string[] = [];
  let isFree = false;
  let isClosingSale = false;

  for (const p of products) {
    if (p.originalPrice) originalPrices.push(p.originalPrice);
    if (p.price) {
      salePrices.push(p.price);
      if (/[¥€$£]\s*0([.,]0+)?|free|gratis|0\s*[¥€$£]|CHF\s*0/i.test(p.price)) {
        isFree = true;
      }
    }
  }

  const closingKeywords = ["closing", "clearance", "final sale", "last chance", "sluiting", "closing down", "everything must go", "alles muss raus", "lagerverkauf", "räumungsverkauf"];
  isClosingSale = closingKeywords.some((kw) => pageText.includes(kw));

  const discountMatch = pageText.match(/(\d{1,2})\s*%\s*(rabatt|off|korting|discount|reduziert)/i)
    || pageText.match(/(bis zu|up to|tot)\s*(\d{1,2})\s*%/i);

  let offer = "";
  if (isFree) {
    offer = "Everything is FREE — just pay shipping";
  } else if (discountMatch && isClosingSale) {
    const pct = discountMatch[1] || discountMatch[2];
    offer = `Closing sale — up to ${pct}% off`;
  } else if (isClosingSale) {
    offer = "Closing sale — massive discounts";
  } else if (originalPrices.length > 0 && salePrices.length > 0) {
    offer = `On sale: was ${originalPrices[0]}, now ${salePrices[0]}`;
  } else if (salePrices.length > 0) {
    offer = `Starting at ${salePrices[0]}`;
  }

  return { offer, originalPrices, salePrices, isFree, isClosingSale, collectionName };
}

export async function scrapeProductPage(
  url: string
): Promise<{ products: ProductInfo[]; storeName: string; storeOffer: StoreOffer }> {
  const apiProducts = await tryShopifyApi(url);

  const html = await fetchHtml(url);

  const storeName =
    extractMeta(html, "og:site_name") ||
    extractTitle(html).split(/[|–—]/).pop()?.trim() ||
    "Store";

  let products: ProductInfo[];
  if (apiProducts && apiProducts.length > 0) {
    products = apiProducts;
  } else {
    products = parseProductsFromHtml(html, url);
  }

  const storeOffer = analyzeOffer(products, html);

  return { products, storeName, storeOffer };
}
