import { useMemo, useState, useEffect, useCallback } from 'react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine,
} from 'recharts';
import { Info, X, Plus, ChevronRight, Download, Loader2 } from 'lucide-react';
import { formatVND } from '../lib/utils';
import { supabase } from '../lib/supabase/client';

const db = supabase as any;

// ─── Types ────────────────────────────────────────────────────────────────────

interface HoldingForPerformance {
  id: string;
  ticker: string;
  name: string;
  assetType: string;
  shares: number;
  avgBuyPrice: number;
  currentPrice: number;
  totalCost: number;
  currentValue: number;
  profitLoss: number;
  profitLossPercent: number;
}

interface PerformanceTabProps {
  holdings: HoldingForPerformance[];
}

// ─── Constants ────────────────────────────────────────────────────────────────

type Period = '1m' | '3m' | '6m' | 'YTD' | '1y' | '5y' | 'all';
const PERIODS: Period[] = ['1m', '3m', '6m', 'YTD', '1y', '5y', 'all'];

const AVAILABLE_BENCHMARKS = [
  { id: 'VN-Index', name: 'VN-Index', dbSymbol: 'VNINDEX', color: '#10b981' },
  { id: 'VN30',     name: 'VN30',     dbSymbol: 'VN30',    color: '#8b5cf6' },
  { id: 'HNX',      name: 'HNX',      dbSymbol: 'HNX',     color: '#f59e0b' },
  { id: 'UPCOM',    name: 'UPCOM',    dbSymbol: 'UPCOM',   color: '#ec4899' },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Format a YYYY-MM-DD string as "22 Jan 26" without timezone issues */
function fmtDate(dateStr: string): string {
  const [y, m, d] = dateStr.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  return `${date.getDate()} ${date.toLocaleDateString('en-US', { month: 'short' })} ${String(date.getFullYear()).slice(-2)}`;
}

/**
 * Compute start date string (YYYY-MM-DD) relative to a reference date.
 * Using the LATEST available data date as reference avoids the situation
 * where the DB data doesn't extend to today, making short periods empty.
 */
function getStartDateStr(period: Period, refDate: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  const fmt = (d: Date) =>
    `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

  // Build ref from explicit y/m/d to avoid DST edge cases
  const ry = refDate.getFullYear();
  const rm = refDate.getMonth();
  const rd = refDate.getDate();

  switch (period) {
    case '1m':  { const d = new Date(ry, rm - 1,  rd); return fmt(d); }
    case '3m':  { const d = new Date(ry, rm - 3,  rd); return fmt(d); }
    case '6m':  { const d = new Date(ry, rm - 6,  rd); return fmt(d); }
    case 'YTD': return `${ry}-01-01`;
    case '1y':  { const d = new Date(ry - 1, rm,  rd); return fmt(d); }
    case '5y':  { const d = new Date(ry - 5, rm,  rd); return fmt(d); }
    case 'all': return '2000-01-01';
  }
}

function thinned(arr: any[], maxPoints = 200) {
  if (arr.length <= maxPoints) return arr;
  const step = Math.ceil(arr.length / maxPoints);
  const result = arr.filter((_: any, i: number) => i % step === 0);
  if (result[result.length - 1] !== arr[arr.length - 1]) {
    result.push(arr[arr.length - 1]);
  }
  return result;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function PerformanceTab({ holdings }: PerformanceTabProps) {
  const [selectedPeriod, setSelectedPeriod] = useState<Period>('1y');
  const [selectedBenchmarks, setSelectedBenchmarks] = useState<string[]>(['VN-Index']);
  const [showBenchmarkSelector, setShowBenchmarkSelector] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);

  // symbol → { date → adjustedClose }
  const [priceHistory, setPriceHistory] = useState<Record<string, Record<string, number>>>({});
  const [historyLoading, setHistoryLoading] = useState(false);

  // benchmark dbSymbol → { date → value }
  const [benchmarkHistory, setBenchmarkHistory] = useState<Record<string, Record<string, number>>>({});

  const stockHoldings = useMemo(
    () => holdings.filter(h => h.assetType.toUpperCase() === 'STOCK'),
    [holdings]
  );

  // ── Fetch price history for stock holdings + all index benchmarks ─────────
  //
  // ROOT CAUSE FIX: Supabase PostgREST has a hard server-side limit of 1000 rows
  // per request regardless of .limit(). With 4 indices × 1275 days = 5040 rows,
  // the old .in('symbol', [...4 indices]) query only returned 2021 data.
  //
  // Solution: query each symbol separately and paginate with .range() so that:
  //   - Page 1: rows 0–999 (2021-01-04 → ~2025-01-06)
  //   - Page 2: rows 1000–1999 (2025-01-07 → 2026-02-13)
  // Both pages fetched in parallel per symbol, all symbols fetched in parallel.
  const fetchHistory = useCallback(async () => {
    setHistoryLoading(true);
    try {
      const stockSymbols = stockHoldings.map(h => h.ticker.toUpperCase());
      const indexSymbols = AVAILABLE_BENCHMARKS.map(b => b.dbSymbol);
      const FROM_DATE = '2021-01-01';

      // Fetch a single symbol with 2 pages in parallel (handles up to 2000 rows)
      const fetchSymbol = async (sym: string): Promise<Array<{ trading_date: string; adjusted_close: number }>> => {
        const [p1, p2] = await Promise.all([
          db
            .from('market_data_stock_history')
            .select('trading_date, adjusted_close')
            .eq('symbol', sym)
            .gte('trading_date', FROM_DATE)
            .order('trading_date', { ascending: true })
            .range(0, 999),
          db
            .from('market_data_stock_history')
            .select('trading_date, adjusted_close')
            .eq('symbol', sym)
            .gte('trading_date', FROM_DATE)
            .order('trading_date', { ascending: true })
            .range(1000, 1999),
        ]);
        return [...(p1.data || []), ...(p2.data || [])];
      };

      // Fetch all symbols in parallel
      const indexSet = new Set(indexSymbols);
      const allSymbols = [...(stockSymbols.length > 0 ? stockSymbols : []), ...indexSymbols];
      const allResults = await Promise.all(allSymbols.map(sym => fetchSymbol(sym)));

      const stockMap: Record<string, Record<string, number>> = {};
      const indexMap: Record<string, Record<string, number>> = {};

      allSymbols.forEach((sym, i) => {
        const target = indexSet.has(sym) ? indexMap : stockMap;
        if (!target[sym]) target[sym] = {};
        for (const row of allResults[i]) {
          const val = Number(row.adjusted_close);
          if (!isNaN(val) && val > 0) {
            target[sym][row.trading_date] = val;
          }
        }
      });

      setPriceHistory(stockMap);
      setBenchmarkHistory(indexMap);
    } catch (err) {
      console.warn('Price history fetch error:', err);
    } finally {
      setHistoryLoading(false);
    }
  }, [stockHoldings]);

  useEffect(() => { fetchHistory(); }, [fetchHistory]);

  // ── Build full time-series (all dates, all prices forward-filled) ───────────
  // Only uses STOCK holdings for the portfolio line.
  // This lets us fairly compare "stock portfolio %" vs "index %".
  const allPortfolioData = useMemo(() => {
    const dateSet = new Set<string>();

    for (const sym of Object.keys(priceHistory)) {
      for (const dt of Object.keys(priceHistory[sym])) dateSet.add(dt);
    }
    for (const bmData of Object.values(benchmarkHistory)) {
      for (const dt of Object.keys(bmData)) dateSet.add(dt);
    }

    if (dateSet.size === 0) return [];

    const sortedDates = Array.from(dateSet).sort(); // YYYY-MM-DD sorts lexicographically

    // Forward-fill stock prices for each holding
    const filledStockPrices: Record<string, Record<string, number>> = {};
    for (const h of stockHoldings) {
      const sym = h.ticker.toUpperCase();
      const raw = priceHistory[sym] || {};
      const filled: Record<string, number> = {};
      let lastKnown = h.avgBuyPrice; // fallback before first data point
      for (const date of sortedDates) {
        if (raw[date] !== undefined) lastKnown = raw[date];
        filled[date] = lastKnown;
      }
      filledStockPrices[sym] = filled;
    }

    // Forward-fill benchmark prices
    const filledBmPrices: Record<string, Record<string, number>> = {};
    for (const bm of AVAILABLE_BENCHMARKS) {
      const raw = benchmarkHistory[bm.dbSymbol] || {};
      const filled: Record<string, number> = {};
      let lastKnown: number | undefined;
      for (const date of sortedDates) {
        if (raw[date] !== undefined) lastKnown = raw[date];
        if (lastKnown !== undefined) filled[date] = lastKnown;
      }
      filledBmPrices[bm.dbSymbol] = filled;
    }

    // Stock-only cost basis (for the "invested" reference in tooltip)
    const stockInvested = stockHoldings.reduce((s, h) => s + h.totalCost, 0);

    return sortedDates.map(date => {
      // Portfolio = STOCKS ONLY (enables fair % comparison with stock indices)
      const stockValue = stockHoldings.reduce((sum, h) => {
        const px = filledStockPrices[h.ticker.toUpperCase()]?.[date] ?? h.avgBuyPrice;
        return sum + h.shares * px;
      }, 0);

      const point: Record<string, any> = {
        date,
        portfolio: Math.round(stockValue),
        invested: Math.round(stockInvested),
      };

      for (const bm of AVAILABLE_BENCHMARKS) {
        const val = filledBmPrices[bm.dbSymbol]?.[date];
        if (val !== undefined) point[bm.dbSymbol] = val;
      }

      return point;
    });
  }, [stockHoldings, priceHistory, benchmarkHistory]);

  // ── Filter to selected period + normalize to % return ──────────────────────
  //
  // KEY FIX: use the LAST available date in allPortfolioData as the reference
  // for period calculation, not new Date() (today). This ensures short periods
  // like 1m/3m work even when the DB data doesn't extend to today.
  //
  // All series are normalized to 0% at the period start:
  //   portfolioPct = (stockValue / baseStockValue - 1) × 100
  //   benchmarkPct = (indexValue / baseIndexValue  - 1) × 100
  const { filteredData, dateRange, profit, profitPercent, benchmarkComparison } = useMemo(() => {
    if (allPortfolioData.length === 0) {
      return { filteredData: [], dateRange: '', profit: 0, profitPercent: 0, benchmarkComparison: null };
    }

    // Last date with any data in the DB — used as the "end" reference for periods
    const lastDateStr = allPortfolioData[allPortfolioData.length - 1].date as string;
    const [ly, lm, ld] = lastDateStr.split('-').map(Number);
    const refDate = new Date(ly, lm - 1, ld); // local date, no timezone shift

    const startDateStr = getStartDateStr(selectedPeriod, refDate);
    const filtered = allPortfolioData.filter(d => (d.date as string) >= startDateStr);

    if (filtered.length < 2) {
      return { filteredData: [], dateRange: '', profit: 0, profitPercent: 0, benchmarkComparison: null };
    }

    const first = filtered[0];
    const last  = filtered[filtered.length - 1];
    const portfolioStart = first.portfolio as number;
    const profitVal = (last.portfolio as number) - portfolioStart;
    const profitPct = portfolioStart > 0 ? (profitVal / portfolioStart) * 100 : 0;

    // Find first valid (non-zero) benchmark value in the filtered range
    const bmFirstValues: Record<string, number> = {};
    for (const bm of AVAILABLE_BENCHMARKS) {
      for (const d of filtered) {
        if (d[bm.dbSymbol] && (d[bm.dbSymbol] as number) > 0) {
          bmFirstValues[bm.dbSymbol] = d[bm.dbSymbol] as number;
          break;
        }
      }
    }

    // Find last valid benchmark value
    const bmLastValues: Record<string, number> = {};
    for (const bm of AVAILABLE_BENCHMARKS) {
      for (let i = filtered.length - 1; i >= 0; i--) {
        if (filtered[i][bm.dbSymbol] && (filtered[i][bm.dbSymbol] as number) > 0) {
          bmLastValues[bm.dbSymbol] = filtered[i][bm.dbSymbol] as number;
          break;
        }
      }
    }

    // Convert to % return from period start
    const displayData = thinned(filtered).map((d: any) => {
      const point: Record<string, any> = {
        ...d,
        displayDate: fmtDate(d.date as string),
        portfolioPct: portfolioStart > 0
          ? ((d.portfolio as number) / portfolioStart - 1) * 100
          : 0,
      };
      for (const bm of AVAILABLE_BENCHMARKS) {
        const firstVal = bmFirstValues[bm.dbSymbol];
        const curVal   = d[bm.dbSymbol] as number | undefined;
        if (firstVal && curVal) {
          point[bm.id + 'Pct'] = (curVal / firstVal - 1) * 100;
        }
      }
      return point;
    });

    // Benchmark comparison banner
    let benchmarkComparison: {
      benchmarkName: string;
      portfolioPct: number;
      benchmarkPct: number;
      diff: number;
      isAhead: boolean;
    } | null = null;

    if (selectedBenchmarks.length > 0) {
      const bmId  = selectedBenchmarks[0];
      const bm    = AVAILABLE_BENCHMARKS.find(b => b.id === bmId);
      if (bm) {
        const firstVal = bmFirstValues[bm.dbSymbol];
        const lastVal  = bmLastValues[bm.dbSymbol];
        if (firstVal && lastVal) {
          const bmPct = (lastVal / firstVal - 1) * 100;
          const diff  = profitPct - bmPct;
          benchmarkComparison = {
            benchmarkName: bm.name,
            portfolioPct: profitPct,
            benchmarkPct: bmPct,
            diff,
            isAhead: diff > 0,
          };
        }
      }
    }

    return {
      filteredData: displayData,
      dateRange: `${fmtDate(first.date as string)} – ${fmtDate(last.date as string)}`,
      profit: profitVal,
      profitPercent: profitPct,
      benchmarkComparison,
    };
  }, [selectedPeriod, allPortfolioData, selectedBenchmarks]);

  // ── Per-asset performance from real P&L ─────────────────────────────────────
  const assetPerformance = useMemo(() =>
    holdings
      .filter(h => h.totalCost > 0)
      .map(h => ({
        id: h.ticker,
        name: h.name,
        assetType: h.assetType,
        percentChange: h.profitLossPercent,
        totalCost: h.totalCost,
        currentValue: h.currentValue,
        profit: h.profitLoss,
      }))
      .sort((a, b) => b.percentChange - a.percentChange),
  [holdings]);

  // ── Portfolio summary (full portfolio, all asset types) ─────────────────────
  const totalInvested     = useMemo(() => holdings.reduce((s, h) => s + h.totalCost, 0), [holdings]);
  const totalCurrentValue = useMemo(() => holdings.reduce((s, h) => s + h.currentValue, 0), [holdings]);
  const totalPL    = totalCurrentValue - totalInvested;
  const totalPLPct = totalInvested > 0 ? (totalPL / totalInvested) * 100 : 0;

  // ── Stock portfolio summary (for chart header) ───────────────────────────────
  const stockTotalCost  = useMemo(() => stockHoldings.reduce((s, h) => s + h.totalCost, 0), [stockHoldings]);
  const stockTotalValue = useMemo(() => stockHoldings.reduce((s, h) => s + h.currentValue, 0), [stockHoldings]);

  // ── Export CSV ──────────────────────────────────────────────────────────────
  const exportToCSV = () => {
    const headers = ['Ticker', 'Tên', 'Lợi nhuận (%)', 'Lợi nhuận (VND)', 'Đã đầu tư (VND)', 'Giá trị hiện tại (VND)'];
    const rows = assetPerformance.map(a => [
      a.id, a.name,
      `${a.percentChange > 0 ? '+' : ''}${a.percentChange.toFixed(2)}%`,
      formatVND(a.profit), formatVND(a.totalCost), formatVND(a.currentValue),
    ]);
    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `hieu-suat-tai-san-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  // ── Lock body scroll when modal open ───────────────────────────────────────
  useEffect(() => {
    if (!showDetailsModal) return;
    const scrollY = window.scrollY;
    document.body.style.overflow = 'hidden';
    document.body.style.position = 'fixed';
    document.body.style.top = `-${scrollY}px`;
    document.body.style.width = '100%';
    return () => {
      document.body.style.overflow = '';
      document.body.style.position = '';
      document.body.style.top = '';
      document.body.style.width = '';
      window.scrollTo(0, scrollY);
    };
  }, [showDetailsModal]);

  // ── Empty state ─────────────────────────────────────────────────────────────
  if (holdings.length === 0) {
    return (
      <div className="bg-white rounded-xl p-12 shadow-md border border-gray-200 text-center text-gray-400">
        <p className="text-lg font-medium">Chưa có tài sản nào trong danh mục</p>
        <p className="text-sm mt-1">Thêm tài sản để xem hiệu suất</p>
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">

      {/* ── Card 1: Stock Portfolio vs Index Line Chart ──────────────────────── */}
      <div className="bg-white rounded-xl p-6 shadow-md border border-gray-200">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <h3 className="text-lg font-bold text-gray-900">Hiệu suất cổ phiếu</h3>
            <Info className="size-4 text-gray-400" />
          </div>
          {dateRange && (
            <div className="flex items-center gap-3">
              <span className="text-sm text-gray-500">{dateRange}</span>
              <span className={`text-lg font-bold ${profit >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                {profit >= 0 ? '+' : ''}{formatVND(profit)}
                <span className="text-sm font-medium ml-1">
                  ({profitPercent >= 0 ? '+' : ''}{profitPercent.toFixed(2)}%)
                </span>
              </span>
            </div>
          )}
        </div>

        {/* Benchmark selector */}
        <div className="mb-4 flex items-center gap-2 flex-wrap">
          <span className="text-xs font-medium text-gray-500">So sánh với:</span>
          {selectedBenchmarks.map(bid => {
            const bm = AVAILABLE_BENCHMARKS.find(b => b.id === bid);
            return (
              <div key={bid} className="flex items-center gap-1.5 px-2.5 py-1 bg-gray-100 rounded-md text-xs font-medium text-gray-700">
                <span className="inline-block w-2 h-2 rounded-full" style={{ background: bm?.color }} />
                <span>{bm?.name}</span>
                <button
                  onClick={() => setSelectedBenchmarks(p => p.filter(x => x !== bid))}
                  className="hover:bg-gray-200 rounded p-0.5"
                >
                  <X className="size-3" />
                </button>
              </div>
            );
          })}
          <div className="relative">
            <button
              onClick={() => setShowBenchmarkSelector(s => !s)}
              className="flex items-center gap-1.5 px-2.5 py-1 bg-blue-50 hover:bg-blue-100 rounded-md text-xs font-medium text-blue-600"
            >
              <Plus className="size-3" /> Thêm
            </button>
            {showBenchmarkSelector && (
              <div className="absolute top-full left-0 mt-1 bg-white rounded-lg shadow-lg border border-gray-200 z-10 min-w-[160px]">
                {AVAILABLE_BENCHMARKS.map(bm => (
                  <button
                    key={bm.id}
                    disabled={selectedBenchmarks.includes(bm.id)}
                    onClick={() => { setSelectedBenchmarks(p => [...p, bm.id]); setShowBenchmarkSelector(false); }}
                    className="w-full text-left px-3 py-2 hover:bg-gray-50 text-xs font-medium text-gray-700 first:rounded-t-lg last:rounded-b-lg disabled:opacity-40 flex items-center gap-2"
                  >
                    <span className="inline-block w-2 h-2 rounded-full" style={{ background: bm.color }} />
                    {bm.name}
                    {selectedBenchmarks.includes(bm.id) && <span className="ml-auto text-gray-400">✓</span>}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Benchmark comparison banner */}
        {benchmarkComparison && (
          <div className={`mb-4 px-4 py-2.5 rounded-lg border text-sm flex items-center gap-2 flex-wrap ${
            benchmarkComparison.isAhead
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : 'bg-red-50 border-red-200 text-red-800'
          }`}>
            <span>Cổ phiếu của bạn</span>
            <span className="font-bold">
              {benchmarkComparison.portfolioPct >= 0 ? '+' : ''}{benchmarkComparison.portfolioPct.toFixed(2)}%
            </span>
            <span className="text-gray-500">vs {benchmarkComparison.benchmarkName}</span>
            <span className="font-bold">
              {benchmarkComparison.benchmarkPct >= 0 ? '+' : ''}{benchmarkComparison.benchmarkPct.toFixed(2)}%
            </span>
            <span className={`ml-auto font-semibold ${benchmarkComparison.isAhead ? 'text-emerald-600' : 'text-red-600'}`}>
              {benchmarkComparison.isAhead ? '▲' : '▼'} {Math.abs(benchmarkComparison.diff).toFixed(2)}%
              {benchmarkComparison.isAhead ? ' vượt trội' : ' thua kém'}
            </span>
          </div>
        )}

        {/* Period buttons */}
        <div className="flex gap-2 mb-4">
          {PERIODS.map(p => (
            <button
              key={p}
              onClick={() => setSelectedPeriod(p)}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                selectedPeriod === p ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {p}
            </button>
          ))}
        </div>

        {/* Legend */}
        <div className="flex items-center gap-4 mb-3 flex-wrap">
          <div className="flex items-center gap-1.5">
            <div className="w-6 rounded" style={{ height: '2.5px', background: '#3b82f6' }} />
            <span className="text-xs text-gray-600 font-medium">Cổ phiếu</span>
          </div>
          {selectedBenchmarks.map(bid => {
            const bm = AVAILABLE_BENCHMARKS.find(b => b.id === bid);
            if (!bm) return null;
            return (
              <div key={bid} className="flex items-center gap-1.5">
                <div
                  className="w-6 rounded"
                  style={{ height: '2px', borderTop: `2px dashed ${bm.color}` }}
                />
                <span className="text-xs text-gray-600">{bm.name}</span>
              </div>
            );
          })}
        </div>

        {/* Chart */}
        {historyLoading ? (
          <div className="flex items-center justify-center h-[300px] bg-gray-50 rounded-xl">
            <Loader2 className="size-8 animate-spin text-blue-500" />
          </div>
        ) : filteredData.length >= 2 ? (
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={filteredData} margin={{ top: 10, right: 45, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
              <XAxis
                dataKey="displayDate"
                tick={{ fontSize: 11, fill: '#6b7280' }}
                axisLine={{ stroke: '#e5e7eb' }}
                tickLine={false}
                interval="preserveStartEnd"
              />
              <YAxis
                orientation="right"
                tick={{ fontSize: 11, fill: '#6b7280' }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(v: number) => `${v >= 0 ? '+' : ''}${v.toFixed(0)}%`}
                width={52}
              />
              {/* 0% baseline */}
              <ReferenceLine y={0} stroke="#9ca3af" strokeWidth={1} strokeDasharray="4 4" />
              <Tooltip
                content={({ active, payload }) => {
                  if (!active || !payload?.length) return null;
                  const d = payload[0].payload;
                  const pPct = d.portfolioPct as number;
                  return (
                    <div className="bg-white p-3 rounded-lg shadow-lg border border-gray-200 text-xs min-w-[190px]">
                      <p className="text-gray-500 mb-2 font-medium">{d.displayDate}</p>
                      <div className="space-y-1.5">
                        {/* Stock portfolio */}
                        <div className="flex items-center gap-2">
                          <div className="w-4 rounded-sm" style={{ height: '2.5px', background: '#3b82f6' }} />
                          <span className="text-gray-600">Cổ phiếu:</span>
                          <span className={`font-bold ml-auto ${pPct >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                            {pPct >= 0 ? '+' : ''}{pPct.toFixed(2)}%
                          </span>
                        </div>
                        <div className="text-gray-400 pl-6 -mt-0.5">
                          {formatVND(d.portfolio as number)}
                        </div>
                        {/* Benchmarks */}
                        {selectedBenchmarks.map(bmId => {
                          const bm = AVAILABLE_BENCHMARKS.find(b => b.id === bmId);
                          if (!bm) return null;
                          const pct = d[bm.id + 'Pct'] as number | undefined;
                          if (pct === undefined) return null;
                          return (
                            <div key={bm.id} className="flex items-center gap-2">
                              <div
                                className="w-4 rounded-sm"
                                style={{ height: '2px', borderTop: `2px dashed ${bm.color}` }}
                              />
                              <span className="text-gray-600">{bm.name}:</span>
                              <span className={`font-bold ml-auto ${pct >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                                {pct >= 0 ? '+' : ''}{pct.toFixed(2)}%
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                }}
              />
              {/* Stock portfolio — solid blue line */}
              <Line
                type="monotone"
                dataKey="portfolioPct"
                stroke="#3b82f6"
                strokeWidth={2.5}
                dot={false}
                name="Cổ phiếu"
                activeDot={{ r: 4, fill: '#3b82f6' }}
              />
              {/* Benchmark lines — dashed */}
              {selectedBenchmarks.map(bmId => {
                const bm = AVAILABLE_BENCHMARKS.find(b => b.id === bmId);
                if (!bm) return null;
                return (
                  <Line
                    key={bm.id}
                    type="monotone"
                    dataKey={bm.id + 'Pct'}
                    stroke={bm.color}
                    strokeWidth={1.5}
                    dot={false}
                    name={bm.name}
                    strokeDasharray="6 3"
                    connectNulls
                    activeDot={{ r: 3 }}
                  />
                );
              })}
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex flex-col items-center justify-center h-[300px] bg-gray-50 rounded-xl border border-dashed border-gray-200">
            <p className="text-sm font-medium text-gray-400">
              {stockHoldings.length === 0
                ? 'Chưa có cổ phiếu nào — thêm cổ phiếu để so sánh với chỉ số'
                : 'Chưa có đủ dữ liệu lịch sử cho khoảng thời gian này'}
            </p>
          </div>
        )}

        {/* Summary cards — stock portfolio */}
        <div className="grid grid-cols-3 gap-4 mt-6">
          <div className="bg-blue-50 rounded-lg p-4">
            <div className="text-sm text-gray-600 mb-1">Giá trị cổ phiếu</div>
            <div className="text-xl font-bold text-blue-600">{formatVND(stockTotalValue)}</div>
            <div className="text-xs text-gray-500 mt-1">Hiện tại</div>
          </div>
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="text-sm text-gray-600 mb-1">Đã đầu tư CP</div>
            <div className="text-xl font-bold text-gray-700">{formatVND(stockTotalCost)}</div>
            <div className="text-xs text-gray-500 mt-1">Tổng vốn cổ phiếu</div>
          </div>
          <div className={`${(stockTotalValue - stockTotalCost) >= 0 ? 'bg-emerald-50' : 'bg-red-50'} rounded-lg p-4`}>
            <div className="text-sm text-gray-600 mb-1">Lãi/Lỗ cổ phiếu</div>
            <div className={`text-xl font-bold ${(stockTotalValue - stockTotalCost) >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
              {(stockTotalValue - stockTotalCost) >= 0 ? '+' : ''}{formatVND(stockTotalValue - stockTotalCost)}
            </div>
            <div className={`text-xs mt-1 font-medium ${(stockTotalValue - stockTotalCost) >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
              {stockTotalCost > 0
                ? `${((stockTotalValue - stockTotalCost) / stockTotalCost * 100) >= 0 ? '+' : ''}${((stockTotalValue - stockTotalCost) / stockTotalCost * 100).toFixed(2)}%`
                : '—'}
            </div>
          </div>
        </div>
      </div>

      {/* ── Card 2: Per-Asset Performance Bars ──────────────────────────────── */}
      <div className="bg-white rounded-xl p-6 shadow-md border border-gray-200">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-bold text-gray-900">Hiệu suất từng tài sản</h3>
          <span className="text-xs text-gray-400">Tính từ giá mua trung bình</span>
        </div>

        {assetPerformance.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-8">Không có dữ liệu</p>
        ) : (
          <div className="space-y-4">
            {assetPerformance.map(asset => {
              const isProfit = asset.percentChange > 0.005;
              const isLoss   = asset.percentChange < -0.005;
              const color    = isProfit ? '#10b981' : isLoss ? '#ef4444' : '#f59e0b';
              const gradient = isProfit
                ? 'linear-gradient(90deg, #10b981 0%, #34d399 100%)'
                : isLoss
                ? 'linear-gradient(90deg, #ef4444 0%, #f87171 100%)'
                : 'linear-gradient(90deg, #f59e0b 0%, #fb923c 100%)';
              const maxAbs = Math.max(...assetPerformance.map(a => Math.abs(a.percentChange)), 1);
              const barW   = (Math.abs(asset.percentChange) / maxAbs) * 100;

              return (
                <div key={asset.id} className="group">
                  <div className="flex items-center gap-4">
                    <div className="w-28 flex-shrink-0">
                      <div className="text-sm font-bold text-gray-900">{asset.id}</div>
                      <div className="text-xs text-gray-500 truncate">{asset.name}</div>
                    </div>
                    <div className="flex-1 flex items-center gap-3">
                      <div className="flex-1 bg-gray-100 rounded-lg h-10 relative overflow-hidden border border-gray-200">
                        <div
                          className="h-full rounded-lg transition-all duration-700 ease-out flex items-center justify-end pr-4"
                          style={{ width: `${Math.max(barW, 2)}%`, background: gradient }}
                        >
                          {barW > 20 && (
                            <span className="text-xs font-bold text-white drop-shadow-sm">
                              {asset.percentChange > 0 ? '+' : ''}{asset.percentChange.toFixed(2)}%
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="w-20 text-right">
                        {barW <= 20 && (
                          <span className="text-sm font-bold" style={{ color }}>
                            {asset.percentChange > 0 ? '+' : ''}{asset.percentChange.toFixed(2)}%
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <div className="mt-8 flex justify-center">
          <button
            onClick={() => setShowDetailsModal(true)}
            className="group flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white text-sm font-semibold rounded-xl transition-all shadow-lg hover:shadow-xl"
          >
            Xem chi tiết
            <ChevronRight className="size-4 group-hover:translate-x-1 transition-transform" />
          </button>
        </div>
      </div>

      {/* ── Details Modal ────────────────────────────────────────────────────── */}
      {showDetailsModal && (
        <div className="fixed inset-0 bg-white/20 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-[80vw] h-[80vh] flex flex-col">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">Chi tiết hiệu suất tài sản</h2>
                <p className="text-sm text-gray-500 mt-1">Dữ liệu thực từ danh mục của bạn</p>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={exportToCSV}
                  className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold rounded-lg transition-colors shadow-sm"
                >
                  <Download className="size-4" /> Export CSV
                </button>
                <button onClick={() => setShowDetailsModal(false)} className="p-2 hover:bg-gray-100 rounded-lg">
                  <X className="size-5 text-gray-500" />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-auto p-6">
              <table className="w-full">
                <thead className="sticky top-0 bg-gradient-to-r from-gray-50 to-gray-100 border-b-2 border-gray-200">
                  <tr>
                    <th className="text-left p-4 text-sm font-bold text-gray-700">Tài sản</th>
                    <th className="text-right p-4 text-sm font-bold text-gray-700">Lợi nhuận (%)</th>
                    <th className="text-right p-4 text-sm font-bold text-gray-700">Lợi nhuận (VND)</th>
                    <th className="text-right p-4 text-sm font-bold text-gray-700">Đã đầu tư</th>
                    <th className="text-right p-4 text-sm font-bold text-gray-700">Giá trị hiện tại</th>
                  </tr>
                </thead>
                <tbody>
                  {assetPerformance.map(asset => {
                    const isP = asset.percentChange > 0.005;
                    const isN = Math.abs(asset.percentChange) <= 0.005;
                    const cls = isN ? 'text-amber-600' : isP ? 'text-emerald-600' : 'text-red-600';
                    return (
                      <tr key={asset.id} className="border-b border-gray-100 hover:bg-blue-50 transition-colors">
                        <td className="p-4">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-bold text-sm shadow">
                              {asset.id.substring(0, 2)}
                            </div>
                            <div>
                              <div className="text-sm font-bold text-gray-900">{asset.id}</div>
                              <div className="text-xs text-gray-500 max-w-[200px] truncate">{asset.name}</div>
                            </div>
                          </div>
                        </td>
                        <td className="p-4 text-right">
                          <span className={`text-base font-bold ${cls}`}>
                            {asset.percentChange > 0 ? '+' : ''}{asset.percentChange.toFixed(2)}%
                          </span>
                        </td>
                        <td className="p-4 text-right">
                          <span className={`text-sm font-semibold ${cls}`}>
                            {asset.profit > 0 ? '+' : ''}{formatVND(asset.profit)}
                          </span>
                        </td>
                        <td className="p-4 text-right">
                          <span className="text-sm font-semibold text-gray-700">{formatVND(asset.totalCost)}</span>
                        </td>
                        <td className="p-4 text-right">
                          <span className="text-sm font-bold text-gray-900">{formatVND(asset.currentValue)}</span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot className="sticky bottom-0 bg-gradient-to-r from-blue-50 to-blue-100 border-t-2 border-blue-200">
                  <tr>
                    <td className="p-4 text-sm font-bold text-gray-900">TỔNG CỘNG</td>
                    <td className="p-4 text-right">
                      <span className={`text-base font-bold ${totalPL >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                        {totalPL >= 0 ? '+' : ''}{totalPLPct.toFixed(2)}%
                      </span>
                    </td>
                    <td className="p-4 text-right">
                      <span className={`text-sm font-bold ${totalPL >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                        {totalPL >= 0 ? '+' : ''}{formatVND(totalPL)}
                      </span>
                    </td>
                    <td className="p-4 text-right">
                      <span className="text-sm font-bold text-gray-900">{formatVND(totalInvested)}</span>
                    </td>
                    <td className="p-4 text-right">
                      <span className="text-sm font-bold text-gray-900">{formatVND(totalCurrentValue)}</span>
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
