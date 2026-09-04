import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { checkRateLimit } from '@/lib/utils/rate-limiter';

// 60-second in-memory cache for ultra-low latency (<5ms)
let cachedProducts: any[] | null = null;
let cachedCategories: any[] | null = null;
let lastCacheTime = 0;
const CACHE_TTL_MS = 60 * 1000;

// Levenshtein distance for fuzzy typo matching
function levenshtein(a: string, b: string): number {
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;
  const matrix: number[][] = [];
  for (let i = 0; i <= b.length; i++) matrix[i] = [i];
  for (let j = 0; j <= a.length; j++) matrix[0][j] = j;

  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }
  return matrix[b.length][a.length];
}

function scoreProduct(product: any, query: string): number {
  const q = query.toLowerCase().trim();
  if (!q) return 0;

  const nameEn = (product.name_en || '').toLowerCase();
  const nameBn = (product.name_bn || '').toLowerCase();
  const descEn = (product.description_en || '').toLowerCase();
  const catName = (product.category?.name_en || '').toLowerCase();
  const brand = (product.brand || '').toLowerCase();
  const tags = Array.isArray(product.tags) ? product.tags.join(' ').toLowerCase() : '';

  // 1. Exact title matches (highest relevance)
  if (nameEn === q || nameBn === q) return 1000;
  if (nameEn.startsWith(q)) return 600;

  // Split product words and query tokens
  const productWords = (nameEn + ' ' + brand + ' ' + catName)
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(w => w.length > 1);

  const tokens = q.split(/\s+/).filter(Boolean);
  let tokenMatches = 0;
  let score = 0;

  for (const token of tokens) {
    let matchedToken = false;

    // Direct substring or word-prefix in name
    if (nameEn.includes(token) || nameBn.includes(token)) {
      matchedToken = true;
      const regex = new RegExp('\\b' + token, 'i');
      if (regex.test(nameEn)) {
        score += 120; // Word starts with token (e.g. "wat" in "Watch")
      } else {
        score += 60;
      }
    } else if (brand.includes(token)) {
      matchedToken = true;
      score += 70;
    } else if (catName.includes(token)) {
      matchedToken = true;
      score += 50;
    } else if (tags.includes(token)) {
      matchedToken = true;
      score += 40;
    } else if (descEn.includes(token)) {
      matchedToken = true;
      score += 30;
    }

    // Fuzzy check for typos (if token is 4+ letters)
    if (!matchedToken && token.length >= 4) {
      for (const word of productWords) {
        const maxDist = token.length >= 5 ? 2 : 1;
        const dist = levenshtein(token, word);
        if (dist <= maxDist) {
          matchedToken = true;
          score += 45 - dist * 10;
          break;
        }
      }
    }

    if (matchedToken) tokenMatches++;
  }

  // Substantial bonus if all query tokens match
  if (tokenMatches === tokens.length) {
    score += 150;
  }

  return tokenMatches > 0 ? score : 0;
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);

    // Rate limit: 30 search suggestions per minute per IP
    const ip =
      (request.headers as any).get?.('cf-connecting-ip') ||
      (request.headers as any).get?.('x-forwarded-for')?.split(',')[0].trim() ||
      '127.0.0.1';
    const rate = checkRateLimit(`search:${ip}`, 30, 60_000);
    if (!rate.allowed) {
      return NextResponse.json({ products: [], categories: [], suggestions: [], total_matches: 0 }, { status: 429 });
    }

    // Cap query length to prevent DoS via pathologically long strings
    const rawQ = (searchParams.get('q') || '').trim();
    const q = rawQ.slice(0, 100);

    const now = Date.now();
    const supabase = await createClient();

    // Cache products & categories in memory
    if (!cachedProducts || now - lastCacheTime > CACHE_TTL_MS) {
      const [{ data: products }, { data: categories }] = await Promise.all([
        supabase
          .from('products')
          .select('id, name_en, name_bn, description_en, slug, base_price, sale_price, images, brand, tags, category:categories(id, name_en, slug)')
          .eq('is_active', true)
          .limit(150),
        supabase
          .from('categories')
          .select('id, name_en, name_bn, slug')
          .eq('is_active', true)
          .order('sort_order', { ascending: true })
          .limit(10),
      ]);

      cachedProducts = products || [];
      cachedCategories = categories || [];
      lastCacheTime = now;
    }

    // If query is empty, return popular suggestions
    if (!q) {
      return NextResponse.json({
        products: [],
        categories: (cachedCategories || []).slice(0, 5),
        popular_searches: ['Smart Watch', 'Headphones', 'Cotton Shirt', 'Leather Wallet', 'Backpack'],
        total_matches: 0,
      });
    }

    // Score and rank all products
    const scoredProducts = (cachedProducts || [])
      .map(p => ({ product: p, score: scoreProduct(p, q) }))
      .filter(item => item.score > 0)
      .sort((a, b) => b.score - a.score);

    const matchingProducts = scoredProducts.slice(0, 6).map(item => item.product);

    // Matching categories
    const qLower = q.toLowerCase();
    const matchingCategories = (cachedCategories || [])
      .filter(cat => {
        const name = (cat.name_en || '').toLowerCase();
        const slug = (cat.slug || '').toLowerCase();
        return name.includes(qLower) || slug.includes(qLower) || (qLower.length >= 4 && levenshtein(qLower, name) <= 1);
      })
      .slice(0, 3);

    // Auto-generate smart suggestions based on matches
    const suggestions: string[] = [];
    matchingProducts.forEach(p => {
      const name = p.name_en;
      if (!suggestions.includes(name) && suggestions.length < 4) {
        suggestions.push(name);
      }
    });

    return NextResponse.json(
      {
        products: matchingProducts,
        categories: matchingCategories,
        suggestions,
        total_matches: scoredProducts.length,
      },
      {
        headers: {
          'Cache-Control': 'public, max-age=30, stale-while-revalidate=60',
        },
      }
    );
  } catch (error: any) {
    console.error('Search suggest error:', error);
    return NextResponse.json({ products: [], categories: [], suggestions: [], total_matches: 0 }, { status: 500 });
  }
}
