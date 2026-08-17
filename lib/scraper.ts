import puppeteer from "puppeteer";

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

const NON_PRODUCT_PATTERNS = [
  /logo/i, /icon/i, /badge/i, /banner/i, /guarantee/i, /garantie/i,
  /payment/i, /shipping/i, /trust/i, /seal/i, /arrow/i, /chevron/i,
  /sprite/i, /placeholder/i, /avatar/i, /flag/i, /social/i,
  /facebook/i, /instagram/i, /twitter/i, /tiktok/i, /youtube/i,
  /\.svg$/i, /1x1\.gif/i, /spacer/i, /pixel/i, /tracking/i,
];

function isProductImage(src: string, alt: string, width: number, height: number): boolean {
  if (width > 0 && width < 100) return false;
  if (height > 0 && height < 100) return false;
  const combined = src + " " + alt;
  return !NON_PRODUCT_PATTERNS.some((p) => p.test(combined));
}

export async function scrapeProductPage(
  url: string
): Promise<{ products: ProductInfo[]; storeName: string; storeOffer: StoreOffer }> {
  // Try Shopify API first — most reliable for product data
  const apiProducts = await tryShopifyApi(url);

  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();
  await page.goto(url, { waitUntil: "networkidle2", timeout: 30000 });

  const data = await page.evaluate((apiProds: ProductInfo[] | null, nonProductPatterns: string[]) => {
    const storeName =
      document.querySelector("meta[property='og:site_name']")?.getAttribute("content") ??
      document.title.split("|").pop()?.trim() ??
      document.title.split("–").pop()?.trim() ??
      "Store";

    // If we got products from API, use those but still analyze offer from page
    let products: Array<{
      name: string;
      price: string;
      originalPrice: string;
      imageUrl: string;
      url: string;
    }> = [];

    if (apiProds && apiProds.length > 0) {
      products = apiProds.map((p) => ({
        name: p.name,
        price: p.price,
        originalPrice: p.originalPrice ?? "",
        imageUrl: p.imageUrl,
        url: p.url,
      }));
    } else {
      // Strategy 1: Shopify product cards — broad selectors
      const cardSelectors = [
        ".product-card",
        "[data-product-card]",
        ".grid__item .card",
        ".collection-product-card",
        ".product-item",
        ".product-grid-item",
        ".product-block",
        ".product-list-item",
        "li[data-product-id]",
        ".grid-product",
        ".productgrid--item",
        ".product-index",
      ];

      let cards: Element[] = [];
      for (const sel of cardSelectors) {
        const found = document.querySelectorAll(sel);
        if (found.length >= 2) {
          cards = Array.from(found);
          break;
        }
      }

      // Strategy 2: Find repeating link+image patterns (product listings)
      if (cards.length === 0) {
        const productLinks = Array.from(document.querySelectorAll("a[href*='/products/']"));
        const seen = new Set<string>();
        for (const link of productLinks) {
          const img = link.querySelector("img");
          if (!img) continue;
          const href = (link as HTMLAnchorElement).href;
          if (seen.has(href)) continue;
          seen.add(href);
          cards.push(link);
        }
      }

      for (const card of cards) {
        const imgEl = card.querySelector("img");
        if (!imgEl) continue;

        const imgSrc = imgEl.src || imgEl.getAttribute("data-src") || imgEl.getAttribute("data-srcset")?.split(" ")[0] || "";
        if (!imgSrc) continue;

        const w = imgEl.naturalWidth || imgEl.width || 0;
        const h = imgEl.naturalHeight || imgEl.height || 0;
        const alt = imgEl.alt || "";
        const cleanSrc = imgSrc.split("?")[0];

        const patternsToSkip = nonProductPatterns.map((p) => new RegExp(p, "i"));
        const combined = cleanSrc + " " + alt;
        if (patternsToSkip.some((p) => p.test(combined))) continue;
        if (w > 0 && w < 100) continue;
        if (h > 0 && h < 100) continue;

        const nameEl = card.querySelector("h2, h3, h4, h5, .card__heading, .product-card__title, [data-product-card-title], .product-title, .grid-product__title");
        const priceEl = card.querySelector(".price-item--sale, .price-item--regular, .price, .product-card__price, .money, [data-price]");
        const origPriceEl = card.querySelector(".price-item--regular.price-item--last, .price--compare, s, del, .compare-at-price");
        const linkEl = card.querySelector("a[href*='/products/']") || card.closest("a");

        const name = nameEl?.textContent?.trim() || alt || `Product ${products.length + 1}`;

        const seen = new Set<string>();
        if (seen.has(cleanSrc)) continue;
        seen.add(cleanSrc);

        products.push({
          name,
          price: priceEl?.textContent?.trim() ?? "",
          originalPrice: origPriceEl?.textContent?.trim() ?? "",
          imageUrl: cleanSrc,
          url: (linkEl as HTMLAnchorElement)?.href ?? "",
        });
      }
    }

    // Analyze store offer from prices and page context
    const collectionName = document.querySelector("h1, .collection-title, [data-collection-title]")?.textContent?.trim() ?? "";
    const pageText = document.body.innerText.substring(0, 5000).toLowerCase();

    const originalPrices: string[] = [];
    const salePrices: string[] = [];
    let isFree = false;
    let isClosingSale = false;

    for (const p of products) {
      if (p.originalPrice) originalPrices.push(p.originalPrice);
      if (p.price) {
        salePrices.push(p.price);
        if (p.price.match(/[¥€$£]\s*0([.,]0+)?|free|gratis|無料|0\s*[¥€$£]|CHF\s*0/i)) {
          isFree = true;
        }
      }
    }

    const closingKeywords = ["closing", "clearance", "final", "last", "sluiting", "閉店", "closing down", "everything must go", "alles muss raus", "lagerverkauf", "schliessen", "räumungsverkauf"];
    isClosingSale = closingKeywords.some((kw) => pageText.includes(kw));

    // Detect discount percentage from page text
    const discountMatch = pageText.match(/(\d{1,2})\s*%\s*(rabatt|off|korting|discount|reduziert)/i)
      || pageText.match(/(bis zu|up to|tot)\s*(\d{1,2})\s*%/i);

    let offer = "";
    if (isFree) {
      offer = "Everything is FREE — just pay shipping";
    } else if (discountMatch && isClosingSale) {
      const pct = discountMatch[1] || discountMatch[2];
      offer = `Closing sale — up to ${pct}% off`;
    } else if (isClosingSale) {
      offer = `Closing sale — massive discounts`;
    } else if (originalPrices.length > 0 && salePrices.length > 0) {
      offer = `On sale: was ${originalPrices[0]}, now ${salePrices[0]}`;
    } else if (salePrices.length > 0) {
      offer = `Starting at ${salePrices[0]}`;
    }

    const storeOffer: {
      offer: string;
      originalPrices: string[];
      salePrices: string[];
      isFree: boolean;
      isClosingSale: boolean;
      collectionName: string;
    } = { offer, originalPrices, salePrices, isFree, isClosingSale, collectionName };

    return { products, storeName, storeOffer };
  }, apiProducts, NON_PRODUCT_PATTERNS.map((p) => p.source));

  await browser.close();
  return data;
}
