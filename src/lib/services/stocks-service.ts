// ========================================
// WEALBEE - STOCKS SERVICE
// Truy vấn dữ liệu thực từ Supabase (market_data_* tables)
// Thay thế hoàn toàn mock-data.ts
// ========================================

import { createClient } from '@supabase/supabase-js';
import { projectId, publicAnonKey } from '../../utils/supabase/info';
import { Stock, DividendHistoryItem } from '../types';

// Client riêng cho market data — không dùng generated Database types
const db = createClient(`https://${projectId}.supabase.co`, publicAnonKey);

// Chuẩn hoá exchange string về đúng union type của Stock
function normalizeExchange(raw: string | null | undefined): 'HOSE' | 'HNX' | 'UPCOM' {
  const upper = (raw ?? '').toUpperCase().replace('-', '');
  if (upper === 'HNX') return 'HNX';
  if (upper === 'UPCOM' || upper === 'UPCOM') return 'UPCOM';
  return 'HOSE';
}

// ========================================
// PRIVATE: Convert Supabase row → Stock
// ========================================
function mapDbToStock(
  dbStock: Record<string, any>,
  fundamentals: Record<string, any> | null,
  dividends: Record<string, any>[]
): Stock {
  const currentYear = new Date().getFullYear();

  // Nhóm cổ tức theo năm
  const byYear: Record<number, { total: number; items: Record<string, any>[] }> = {};
  for (const d of dividends) {
    const year = new Date(d.ex_dividend_date).getFullYear();
    if (!byYear[year]) byYear[year] = { total: 0, items: [] };
    byYear[year].total += Number(d.amount_per_share) || 0;
    byYear[year].items.push(d);
  }

  // Annual payout TTM (12 tháng gần nhất)
  const oneYearAgo = new Date();
  oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
  const annualPayout = dividends
    .filter((d) => new Date(d.ex_dividend_date) >= oneYearAgo)
    .reduce((s, d) => s + (Number(d.amount_per_share) || 0), 0);

  const price = Number(dbStock.current_price) || 0;
  const dividendYield = price > 0 ? (annualPayout / price) * 100 : 0;

  // Latest dividend record
  const latest = dividends[0];
  const exDividendDate: string = latest?.ex_dividend_date ?? '';
  const paymentDate: string = latest?.payment_date ?? '';

  // Tần suất chi trả
  const divCountPerYear =
    (byYear[currentYear]?.items.length ?? 0) ||
    (byYear[currentYear - 1]?.items.length ?? 0);
  let frequency: 'Annual' | 'Semi-Annual' | 'Quarterly' = 'Annual';
  if (divCountPerYear >= 4) frequency = 'Quarterly';
  else if (divCountPerYear >= 2) frequency = 'Semi-Annual';

  // Điểm an toàn cổ tức
  const safetyScore: number | null =
    fundamentals?.dividend_safety_score != null
      ? Number(fundamentals.dividend_safety_score)
      : null;
  let dividendSafety: 'Safe' | 'Unrated' | 'Risky' = 'Unrated';
  if (safetyScore !== null) {
    if (safetyScore >= 70) dividendSafety = 'Safe';
    else if (safetyScore < 40) dividendSafety = 'Risky';
  }

  // Payout ratio từ EPS TTM
  const epsTTM = Number(dbStock.eps_ttm) || 0;
  const payoutRatio = epsTTM > 0 ? Math.round((annualPayout / epsTTM) * 100) : 0;

  // Tăng trưởng cổ tức
  const lastYearPayout = byYear[currentYear - 1]?.total ?? 0;
  const dividendGrowth1Y =
    lastYearPayout > 0
      ? ((annualPayout - lastYearPayout) / lastYearPayout) * 100
      : 0;
  // Dùng dividend_growth_5y từ DB nếu có
  const dividendGrowth5Y =
    dbStock.dividend_growth_5y != null
      ? Number(dbStock.dividend_growth_5y) * 100
      : dividendGrowth1Y;

  // Streak — số năm liên tiếp có cổ tức
  let dividendStreak = 0;
  for (let y = currentYear; y >= currentYear - 15; y--) {
    if ((byYear[y]?.total ?? 0) > 0) dividendStreak++;
    else break;
  }

  // Dividend history (8 năm gần nhất)
  const dividendHistory: DividendHistoryItem[] = Object.entries(byYear)
    .map(([yearStr, info]) => ({
      year: Number(yearStr),
      amount: info.total,
      exDate: info.items[0]?.ex_dividend_date ?? '',
      payDate: info.items[0]?.payment_date ?? '',
      yield: price > 0 ? (info.total / price) * 100 : 0,
    }))
    .sort((a, b) => b.year - a.year)
    .slice(0, 8);

  // Market cap
  const sharesOutstanding = Number(dbStock.shares_outstanding) || 0;
  const marketCap = price * sharesOutstanding;

  // Exchange + Sector from real DB columns
  const exchange = normalizeExchange(dbStock.exchange);
  const sector = (dbStock.industry as string) || 'N/A';

  return {
    id: dbStock.symbol as string,
    ticker: dbStock.symbol as string,
    name: (dbStock.company_name as string) || (dbStock.symbol as string),
    sector,
    exchange,
    price,
    currency: 'VND',
    dividendYield,
    dividendPerShare: Number(latest?.amount_per_share) || 0,
    annualPayout,
    exDividendDate,
    paymentDate,
    frequency,
    dividendSafety,
    avgDividendYield5Y: dividendYield,
    dividendGrowth1Y,
    dividendGrowth3Y: dividendGrowth1Y,
    dividendGrowth5Y,
    dividendStreak,
    payoutRatio,
    marketCap,
    beta: 1.0,
    revenueYoY: Number(dbStock.revenue_ttm) || 0,
    netIncomeYoY: Number(dbStock.net_income_ttm) || 0,
    fcfYoY: Number(dbStock.free_cash_flow) || 0,
    ebitdaYoY: Number(dbStock.ebitda_ttm) || 0,
    debtToEquity:
      fundamentals?.debt_to_equity != null
        ? Number(fundamentals.debt_to_equity)
        : 0,
    priceToSMA200: 1.0,
    dividendHistory,
    financialHistory: [],
  };
}

// ========================================
// PUBLIC API
// ========================================

// ========================================
// VN30 — Danh sách 30 mã cổ phiếu VN30
// ========================================
export const VN30_SYMBOLS = [
  'ACB', 'BCM', 'BID', 'BVH', 'CTG',
  'FPT', 'GAS', 'GVR', 'HDB', 'HPG',
  'MBB', 'MSN', 'MWG', 'PLX', 'POW',
  'SAB', 'SHB', 'SSB', 'SSI', 'STB',
  'TCB', 'TPB', 'VCB', 'VHM', 'VIB',
  'VIC', 'VJC', 'VNM', 'VPB', 'VRE',
] as const;

/** Lấy cổ phiếu VN30 từ Supabase (nhanh hơn getAllStocks) */
export async function getVN30Stocks(): Promise<Stock[]> {
  const { data: stocks, error } = await (db as any)
    .from('market_data_stocks')
    .select('*')
    .in('symbol', [...VN30_SYMBOLS])
    .order('symbol', { ascending: true });

  if (error) {
    console.error('[stocks-service] getVN30Stocks error:', error);
    return [];
  }
  if (!stocks || stocks.length === 0) return [];

  const { data: fundamentals } = await (db as any)
    .from('market_stocks_fundamentals')
    .select('*')
    .in('symbol', [...VN30_SYMBOLS]);

  const tenYearsAgo = new Date();
  tenYearsAgo.setFullYear(tenYearsAgo.getFullYear() - 10);

  const { data: dividends } = await (db as any)
    .from('market_data_dividends')
    .select('*')
    .in('symbol', [...VN30_SYMBOLS])
    .gte('ex_dividend_date', tenYearsAgo.toISOString().split('T')[0])
    .order('ex_dividend_date', { ascending: false });

  const allF: Record<string, any>[] = fundamentals ?? [];
  const allD: Record<string, any>[] = dividends ?? [];

  return (stocks as Record<string, any>[]).map((stock) =>
    mapDbToStock(
      stock,
      allF.find((x) => x.symbol === stock.symbol) ?? null,
      allD.filter((x) => x.symbol === stock.symbol)
    )
  );
}

/** Lấy toàn bộ cổ phiếu từ Supabase (chỉ lấy cổ phiếu có giá) */
export async function getAllStocks(): Promise<Stock[]> {
  // Chỉ lấy cổ phiếu có current_price để tránh null price
  const { data: stocks, error } = await (db as any)
    .from('market_data_stocks')
    .select('*')
    .not('current_price', 'is', null)
    .order('symbol', { ascending: true });

  if (error) {
    console.error('[stocks-service] getAllStocks error:', error);
    return [];
  }
  if (!stocks || stocks.length === 0) return [];

  const { data: fundamentals } = await (db as any)
    .from('market_stocks_fundamentals')
    .select('*');

  const tenYearsAgo = new Date();
  tenYearsAgo.setFullYear(tenYearsAgo.getFullYear() - 10);

  const { data: dividends } = await (db as any)
    .from('market_data_dividends')
    .select('*')
    .gte('ex_dividend_date', tenYearsAgo.toISOString().split('T')[0])
    .order('ex_dividend_date', { ascending: false });

  const allF: Record<string, any>[] = fundamentals ?? [];
  const allD: Record<string, any>[] = dividends ?? [];

  return (stocks as Record<string, any>[]).map((stock) =>
    mapDbToStock(
      stock,
      allF.find((x) => x.symbol === stock.symbol) ?? null,
      allD.filter((x) => x.symbol === stock.symbol)
    )
  );
}

/** Lấy 1 cổ phiếu theo symbol */
export async function getStockBySymbol(symbol: string): Promise<Stock | null> {
  const upper = symbol.toUpperCase();

  const { data: stock, error } = await (db as any)
    .from('market_data_stocks')
    .select('*')
    .eq('symbol', upper)
    .single();

  if (error || !stock) return null;

  const { data: fundamentals } = await (db as any)
    .from('market_stocks_fundamentals')
    .select('*')
    .eq('symbol', upper)
    .single();

  const tenYearsAgo = new Date();
  tenYearsAgo.setFullYear(tenYearsAgo.getFullYear() - 10);

  const { data: dividends } = await (db as any)
    .from('market_data_dividends')
    .select('*')
    .eq('symbol', upper)
    .gte('ex_dividend_date', tenYearsAgo.toISOString().split('T')[0])
    .order('ex_dividend_date', { ascending: false });

  return mapDbToStock(
    stock as Record<string, any>,
    (fundamentals as Record<string, any>) ?? null,
    (dividends as Record<string, any>[]) ?? []
  );
}

/** Tìm kiếm cổ phiếu (dùng cho autocomplete) */
export async function searchStocks(query: string): Promise<Stock[]> {
  if (!query || query.length < 1) return [];

  const { data: stocks, error } = await (db as any)
    .from('market_data_stocks')
    .select('symbol, company_name, current_price, exchange, industry')
    .or(`symbol.ilike.%${query}%,company_name.ilike.%${query}%`)
    .not('current_price', 'is', null)
    .order('symbol', { ascending: true })
    .limit(10);

  if (error || !stocks) return [];

  return (stocks as Record<string, any>[]).map((s) => ({
    id: s.symbol as string,
    ticker: s.symbol as string,
    name: (s.company_name as string) || (s.symbol as string),
    sector: (s.industry as string) || 'N/A',
    exchange: normalizeExchange(s.exchange),
    price: Number(s.current_price) || 0,
    currency: 'VND',
    dividendYield: 0,
    dividendPerShare: 0,
    annualPayout: 0,
    exDividendDate: '',
    paymentDate: '',
    frequency: 'Annual' as const,
    dividendSafety: 'Unrated' as const,
    avgDividendYield5Y: 0,
    dividendGrowth1Y: 0,
    dividendGrowth3Y: 0,
    dividendGrowth5Y: 0,
    dividendStreak: 0,
    payoutRatio: 0,
    marketCap: 0,
    beta: 1.0,
    revenueYoY: 0,
    netIncomeYoY: 0,
    fcfYoY: 0,
    ebitdaYoY: 0,
    debtToEquity: 0,
    priceToSMA200: 1.0,
    dividendHistory: [],
    financialHistory: [],
  }));
}
