import { useState, useEffect, useMemo, useRef } from 'react';
import { Link } from 'react-router';
import { Search, ArrowUp, ArrowDown, ArrowUpDown, Loader2, SlidersHorizontal, X, TrendingUp, Coins, Bitcoin, RefreshCw, ChevronRight } from 'lucide-react';
import { getVN30Stocks } from '../lib/services/stocks-service';
import { Stock } from '../lib/types';
import { formatVND, formatPercent, getSafetyColor, getSafetyLabel } from '../lib/utils';
import { supabase } from '../lib/supabase/client';

const db = supabase as any;

// ─── Types ────────────────────────────────────────────────────────────────────
type SortDirection = 'asc' | 'desc';
type GoldSortField = 'name' | 'price_buy' | 'price_sell';
type CryptoSortField = 'name' | 'price';

interface GoldRow {
  symbol: string;
  name: string;
  current_price_buy: number | null;
  current_price_sell: number | null;
}

interface CryptoRow {
  symbol: string;
  name: string;
  current_price: number | null;
}

// ─── Column definitions ───────────────────────────────────────────────────────
type ColId =
  | 'sector' | 'sharePrice' | 'price'
  | 'safetyScore' | 'avgDivYield5Y' | 'divGrowth1Y' | 'divGrowth5Y'
  | 'divGrowthStreak' | 'payout' | 'fcf' | 'ebitda' | 'beta'
  | 'marketCap' | 'divYield' | 'annualPayout' | 'divGrowth3Y'
  | 'divStreak' | 'frequency' | 'revenue' | 'netIncome';

interface ColDef {
  id: ColId;
  label: string;
  fullLabel: string;
  align: 'left' | 'right' | 'center';
  sortKey?: keyof Stock | null;
  render: (s: Stock) => React.ReactNode;
  minW: string;
}

const fmt = (v: number) => {
  if (v === 0) return null;
  const abs = Math.abs(v);
  if (abs >= 1_000_000_000_000) return `${(v / 1_000_000_000_000).toFixed(1)}T`;
  if (abs >= 1_000_000_000)     return `${(v / 1_000_000_000).toFixed(1)}B`;
  return `${(v / 1_000_000).toFixed(0)}M`;
};

const GrowthCell = ({ v }: { v: number }) =>
  v === 0 ? <span className="text-gray-300 dark:text-slate-600 text-xs">—</span> :
  v > 0   ? <span className="inline-flex items-center gap-0.5 text-emerald-600 dark:text-emerald-400 font-medium"><ArrowUp className="size-3" />{Math.abs(v).toFixed(1)}%</span> :
             <span className="inline-flex items-center gap-0.5 text-red-500 dark:text-red-400 font-medium"><ArrowDown className="size-3" />{Math.abs(v).toFixed(1)}%</span>;

const NA = <span className="text-gray-300 dark:text-slate-600 text-xs">—</span>;

const SafetyBadge = ({ s }: { s: Stock }) => {
  const colors: Record<string, string> = {
    Safe:    'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 ring-1 ring-emerald-200 dark:ring-emerald-800',
    Risky:   'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 ring-1 ring-red-200 dark:ring-red-800',
    Unrated: 'bg-gray-100 text-gray-400 dark:text-slate-500 ring-1 ring-gray-200',
  };
  const cls = colors[s.dividendSafety] ?? colors.Unrated;
  return <span className={`px-2 py-0.5 text-xs font-medium rounded-md ${cls}`}>{getSafetyLabel(s.dividendSafety)}</span>;
};

const ALL_COLUMNS: ColDef[] = [
  { id: 'sector',         label: 'Ngành',         fullLabel: 'Sector',                 align: 'left',   sortKey: 'sector',            minW: '140px', render: s => <span className="text-gray-500 dark:text-slate-400 text-xs">{s.sector || '—'}</span> },
  { id: 'sharePrice',     label: 'Thị giá',       fullLabel: 'Share price',            align: 'right',  sortKey: 'price',             minW: '110px', render: s => <span className="font-semibold text-gray-900 dark:text-white">{s.price.toLocaleString('vi-VN')} đ</span> },
  { id: 'price',          label: 'Giá (VND)',     fullLabel: 'Price (VND)',             align: 'right',  sortKey: 'price',             minW: '110px', render: s => <span className="font-medium">{formatVND(s.price)}</span> },
  { id: 'safetyScore',    label: 'Safety',        fullLabel: 'Dividend safety score',  align: 'center', sortKey: null,                minW: '100px', render: s => <SafetyBadge s={s} /> },
  { id: 'avgDivYield5Y',  label: 'Avg Yield 5Y',  fullLabel: 'Avg div. yield (5Y)',    align: 'right',  sortKey: 'avgDividendYield5Y',minW: '115px', render: s => s.avgDividendYield5Y > 0 ? <span className="text-emerald-600 dark:text-emerald-400 font-medium">{s.avgDividendYield5Y.toFixed(1)}%</span> : NA },
  { id: 'divGrowth1Y',    label: 'Growth 1Y',     fullLabel: 'Dividend growth (1Y)',   align: 'right',  sortKey: 'dividendGrowth1Y',  minW: '100px', render: s => <GrowthCell v={s.dividendGrowth1Y} /> },
  { id: 'divGrowth5Y',    label: 'Growth 5Y',     fullLabel: 'Dividend growth (5Y)',   align: 'right',  sortKey: 'dividendGrowth5Y',  minW: '100px', render: s => <GrowthCell v={s.dividendGrowth5Y} /> },
  { id: 'divGrowthStreak',label: 'Growth Streak', fullLabel: 'Dividend growth streak', align: 'right',  sortKey: 'dividendStreak',    minW: '110px', render: s => s.dividendStreak > 0 ? <span className="font-medium">{s.dividendStreak} năm</span> : NA },
  { id: 'payout',         label: 'Payout',        fullLabel: 'Payout ratio',           align: 'right',  sortKey: 'payoutRatio',       minW: '85px',  render: s => s.payoutRatio > 0 ? <span>{s.payoutRatio}%</span> : NA },
  { id: 'fcf',            label: 'FCF',           fullLabel: 'FCF (TTM)',              align: 'right',  sortKey: 'fcfYoY',            minW: '90px',  render: s => { const v = fmt(s.fcfYoY); return v ? <span className={s.fcfYoY >= 0 ? 'text-emerald-600 dark:text-emerald-400 font-medium' : 'text-red-500 dark:text-red-400 font-medium'}>{v}</span> : NA; } },
  { id: 'ebitda',         label: 'EBITDA',        fullLabel: 'EBITDA (TTM)',           align: 'right',  sortKey: 'ebitdaYoY',         minW: '95px',  render: s => { const v = fmt(s.ebitdaYoY); return v ? <span className="font-medium">{v}</span> : NA; } },
  { id: 'beta',           label: 'Beta',          fullLabel: 'Beta',                   align: 'right',  sortKey: 'beta',              minW: '65px',  render: s => <span className="tabular-nums">{s.beta.toFixed(2)}</span> },
  { id: 'marketCap',      label: 'Vốn hoá',       fullLabel: 'Market cap',             align: 'right',  sortKey: 'marketCap',         minW: '95px',  render: s => { const v = fmt(s.marketCap); return v ? <span className="font-medium">{v}</span> : NA; } },
  { id: 'divYield',       label: 'Div. Yield',    fullLabel: 'Dividend yield',         align: 'right',  sortKey: 'dividendYield',     minW: '100px', render: s => s.dividendYield > 0 ? <span className="text-emerald-600 dark:text-emerald-400 font-semibold">{s.dividendYield.toFixed(1)}%</span> : NA },
  { id: 'annualPayout',   label: 'Ann. Payout',   fullLabel: 'Annual payout (đ/CP)',   align: 'right',  sortKey: 'annualPayout',      minW: '125px', render: s => s.annualPayout > 0 ? <span className="tabular-nums">{s.annualPayout.toLocaleString('vi-VN')} đ</span> : NA },
  { id: 'divGrowth3Y',    label: 'Growth 3Y',     fullLabel: 'Dividend growth (3Y)',   align: 'right',  sortKey: 'dividendGrowth3Y',  minW: '100px', render: s => <GrowthCell v={s.dividendGrowth3Y} /> },
  { id: 'divStreak',      label: 'Div. Streak',   fullLabel: 'Dividend streak',        align: 'right',  sortKey: 'dividendStreak',    minW: '100px', render: s => s.dividendStreak > 0 ? <span>{s.dividendStreak} năm</span> : NA },
  { id: 'frequency',      label: 'Tần suất',      fullLabel: 'Frequency',              align: 'center', sortKey: null,                minW: '90px',  render: s => <span className="text-xs text-gray-500 dark:text-slate-400 bg-gray-100 px-2 py-0.5 rounded">{s.frequency}</span> },
  { id: 'revenue',        label: 'Revenue',       fullLabel: 'Revenue (TTM)',          align: 'right',  sortKey: 'revenueYoY',        minW: '90px',  render: s => { const v = fmt(s.revenueYoY); return v ? <span>{v}</span> : NA; } },
  { id: 'netIncome',      label: 'Net Income',    fullLabel: 'Net income (TTM)',       align: 'right',  sortKey: 'netIncomeYoY',      minW: '110px', render: s => { const v = fmt(s.netIncomeYoY); return v ? <span className={s.netIncomeYoY >= 0 ? 'text-emerald-600 dark:text-emerald-400 font-medium' : 'text-red-500 dark:text-red-400 font-medium'}>{v}</span> : NA; } },
];

const DEFAULT_VISIBLE: ColId[] = [
  'sector', 'sharePrice', 'safetyScore', 'avgDivYield5Y',
  'divGrowth1Y', 'divGrowth5Y', 'payout', 'marketCap', 'divYield',
];

// ─── Component ────────────────────────────────────────────────────────────────
export function MarketsDashboard() {
  const [activeTab, setActiveTab] = useState<'stocks' | 'gold' | 'crypto'>('stocks');
  const [searchQuery, setSearchQuery] = useState('');

  // ── Stocks ────────────────────────────────────────────────────────────────
  const [sortField, setSortField] = useState<keyof Stock>('ticker');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const [vietnamStocks, setVietnamStocks] = useState<Stock[]>([]);
  const [stocksLoading, setStocksLoading] = useState(true);
  const [stocksError, setStocksError] = useState<string | null>(null);

  // Column chooser
  const [visibleCols, setVisibleCols] = useState<Set<ColId>>(new Set(DEFAULT_VISIBLE));
  const [chooserOpen, setChooserOpen] = useState(false);
  const chooserRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (chooserRef.current && !chooserRef.current.contains(e.target as Node))
        setChooserOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        setStocksLoading(true);
        setStocksError(null);
        const data = await getVN30Stocks();
        if (!cancelled) setVietnamStocks(data);
      } catch {
        if (!cancelled) setStocksError('Không thể tải dữ liệu cổ phiếu VN30.');
      } finally {
        if (!cancelled) setStocksLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, []);

  // ── Gold ──────────────────────────────────────────────────────────────────
  const [goldSortField, setGoldSortField] = useState<GoldSortField>('name');
  const [goldSortDir, setGoldSortDir] = useState<SortDirection>('asc');
  const [goldRows, setGoldRows] = useState<GoldRow[]>([]);
  const [goldLoading, setGoldLoading] = useState(true);
  const [goldError, setGoldError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function fetchGold() {
      try {
        setGoldLoading(true); setGoldError(null);
        const { data, error } = await db.from('market_data_gold').select('symbol, name, current_price_buy, current_price_sell').order('name', { ascending: true });
        if (error) throw error;
        if (!cancelled) setGoldRows(data || []);
      } catch { if (!cancelled) setGoldError('Không thể tải dữ liệu vàng.'); }
      finally  { if (!cancelled) setGoldLoading(false); }
    }
    fetchGold();
    return () => { cancelled = true; };
  }, []);

  // ── Crypto ────────────────────────────────────────────────────────────────
  const [cryptoSortField, setCryptoSortField] = useState<CryptoSortField>('name');
  const [cryptoSortDir, setCryptoSortDir] = useState<SortDirection>('asc');
  const [cryptoRows, setCryptoRows] = useState<CryptoRow[]>([]);
  const [cryptoLoading, setCryptoLoading] = useState(true);
  const [cryptoError, setCryptoError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function fetchCrypto() {
      try {
        setCryptoLoading(true); setCryptoError(null);
        const { data, error } = await db.from('market_data_crypto').select('symbol, name, current_price').order('name', { ascending: true });
        if (error) throw error;
        if (!cancelled) setCryptoRows(data || []);
      } catch { if (!cancelled) setCryptoError('Không thể tải dữ liệu crypto.'); }
      finally  { if (!cancelled) setCryptoLoading(false); }
    }
    fetchCrypto();
    return () => { cancelled = true; };
  }, []);

  // ── Sort helpers ──────────────────────────────────────────────────────────
  const handleSort = (field: keyof Stock) => {
    if (sortField === field) setSortDirection(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortField(field); setSortDirection('desc'); }
  };
  const handleGoldSort   = (f: GoldSortField)   => { if (goldSortField   === f) setGoldSortDir  (d => d === 'asc' ? 'desc' : 'asc'); else { setGoldSortField(f);   setGoldSortDir('desc');   } };
  const handleCryptoSort = (f: CryptoSortField) => { if (cryptoSortField === f) setCryptoSortDir(d => d === 'asc' ? 'desc' : 'asc'); else { setCryptoSortField(f); setCryptoSortDir('desc'); } };

  const SortIcon = ({ field }: { field: keyof Stock }) =>
    sortField !== field ? <ArrowUpDown className="size-3 text-gray-400 dark:text-slate-500 shrink-0" /> :
    sortDirection === 'asc' ? <ArrowUp className="size-3 text-emerald-600 dark:text-emerald-400 shrink-0" /> : <ArrowDown className="size-3 text-emerald-600 dark:text-emerald-400 shrink-0" />;
  const GoldSortIcon   = ({ field }: { field: GoldSortField })   => goldSortField   !== field ? <ArrowUpDown className="size-3 text-gray-400 dark:text-slate-500" /> : goldSortDir   === 'asc' ? <ArrowUp className="size-3 text-emerald-600 dark:text-emerald-400" /> : <ArrowDown className="size-3 text-emerald-600 dark:text-emerald-400" />;
  const CryptoSortIcon = ({ field }: { field: CryptoSortField }) => cryptoSortField !== field ? <ArrowUpDown className="size-3 text-gray-400 dark:text-slate-500" /> : cryptoSortDir === 'asc' ? <ArrowUp className="size-3 text-emerald-600 dark:text-emerald-400" /> : <ArrowDown className="size-3 text-emerald-600 dark:text-emerald-400" />;

  // ── Derived data ──────────────────────────────────────────────────────────
  const filteredAndSortedStocks = useMemo(() => {
    let list = vietnamStocks;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      list = list.filter(s => s.ticker.toLowerCase().includes(q) || s.name.toLowerCase().includes(q) || s.sector.toLowerCase().includes(q));
    }
    return [...list].sort((a, b) => {
      let av: any = a[sortField], bv: any = b[sortField];
      if (typeof av === 'string') { av = av.toLowerCase(); bv = (bv as string).toLowerCase(); }
      av = av ?? (sortDirection === 'asc' ? Infinity : -Infinity);
      bv = bv ?? (sortDirection === 'asc' ? Infinity : -Infinity);
      return sortDirection === 'asc' ? (av > bv ? 1 : -1) : (av < bv ? 1 : -1);
    });
  }, [vietnamStocks, searchQuery, sortField, sortDirection]);

  const sortedGold = useMemo(() => [...goldRows].sort((a, b) => {
    let av: any, bv: any;
    if (goldSortField === 'name')      { av = a.name.toLowerCase(); bv = b.name.toLowerCase(); }
    else if (goldSortField === 'price_buy') { av = a.current_price_buy ?? -Infinity; bv = b.current_price_buy ?? -Infinity; }
    else                               { av = a.current_price_sell ?? -Infinity; bv = b.current_price_sell ?? -Infinity; }
    return goldSortDir === 'asc' ? (av > bv ? 1 : -1) : (av < bv ? 1 : -1);
  }), [goldRows, goldSortField, goldSortDir]);

  const sortedCrypto = useMemo(() => [...cryptoRows].sort((a, b) => {
    let av: any = cryptoSortField === 'name' ? a.name.toLowerCase() : (a.current_price ?? -Infinity);
    let bv: any = cryptoSortField === 'name' ? b.name.toLowerCase() : (b.current_price ?? -Infinity);
    return cryptoSortDir === 'asc' ? (av > bv ? 1 : -1) : (av < bv ? 1 : -1);
  }), [cryptoRows, cryptoSortField, cryptoSortDir]);

  const visibleColDefs = useMemo(() => ALL_COLUMNS.filter(c => visibleCols.has(c.id)), [visibleCols]);

  const toggleCol = (id: ColId) => setVisibleCols(prev => {
    const next = new Set(prev);
    if (next.has(id)) { if (next.size > 1) next.delete(id); }
    else next.add(id);
    return next;
  });

  const totalCols = 2 + visibleColDefs.length;

  // ── Column chooser groups ────────────────────────────────────────────────
  const colGroups = [
    { label: 'Giá & Thị trường', ids: ['sector', 'sharePrice', 'price', 'marketCap', 'beta'] as ColId[] },
    { label: 'Cổ tức',           ids: ['divYield', 'avgDivYield5Y', 'annualPayout', 'frequency', 'payout'] as ColId[] },
    { label: 'Tăng trưởng',      ids: ['divGrowth1Y', 'divGrowth3Y', 'divGrowth5Y', 'divGrowthStreak', 'divStreak'] as ColId[] },
    { label: 'Tài chính',        ids: ['revenue', 'netIncome', 'ebitda', 'fcf', 'safetyScore'] as ColId[] },
  ];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-950">
      {/* ── Page Header ── */}
      <div className="bg-white dark:bg-slate-800 border-b border-gray-200 dark:border-slate-700 dark:border-slate-700">
        <div className="px-6 pt-6 pb-0">
          {/* Title row */}
          <div className="flex items-start justify-between mb-5">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <TrendingUp className="size-5 text-emerald-600 dark:text-emerald-400" />
                <h1 className="text-xl font-bold text-gray-900 dark:text-white">Markets</h1>
              </div>
              <p className="text-sm text-gray-500 dark:text-slate-400">Theo dõi thị trường cổ phiếu VN30, vàng và tiền điện tử</p>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-gray-400 dark:text-slate-500 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 rounded-lg px-3 py-2">
              <RefreshCw className="size-3 text-amber-500" />
              <span className="text-amber-600 dark:text-amber-400 font-medium">Dữ liệu tham khảo · cập nhật tự động sắp ra mắt</span>
            </div>
          </div>

          {/* Tab bar */}
          <div className="flex gap-0">
            {([
              { key: 'stocks', label: 'Cổ phiếu VN30', icon: <TrendingUp className="size-4" />, count: vietnamStocks.length },
              { key: 'gold',   label: 'Vàng',           icon: <Coins className="size-4" />,      count: goldRows.length },
              { key: 'crypto', label: 'Crypto',         icon: <Bitcoin className="size-4" />,    count: cryptoRows.length },
            ] as const).map(({ key, label, icon, count }) => (
              <button
                key={key}
                onClick={() => { setActiveTab(key); setSearchQuery(''); }}
                className={`relative flex items-center gap-2 px-5 py-3.5 text-sm font-medium transition-all border-b-2 -mb-px ${
                  activeTab === key
                    ? 'border-emerald-600 text-emerald-700 dark:text-emerald-400 bg-white'
                    : 'border-transparent text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-800/50'
                }`}
              >
                {icon}
                {label}
                {count > 0 && (
                  <span className={`text-xs px-1.5 py-0.5 rounded-full font-semibold ${
                    activeTab === key ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400' : 'bg-gray-100 text-gray-500 dark:text-slate-400'
                  }`}>
                    {count}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── Content area ── */}
      <div className="p-6">

        {/* ═══════════════════════════════ STOCKS TAB ═══════════════════════════════ */}
        {activeTab === 'stocks' && (
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 dark:border-slate-700 dark:border-slate-700 shadow-sm overflow-hidden">

            {/* Toolbar */}
            <div className="px-5 py-4 border-b border-gray-100 dark:border-slate-700/50 flex items-center gap-3">
              {/* Search */}
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-gray-400 dark:text-slate-500 pointer-events-none" />
                <input
                  type="text"
                  placeholder="Tìm mã CK, tên công ty, ngành..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 text-sm bg-gray-50 border border-gray-200 dark:border-slate-700 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 dark:focus:ring-emerald-400 focus:bg-white transition-colors placeholder:text-gray-400 dark:text-slate-500"
                />
              </div>

              <div className="h-5 w-px bg-gray-200" />

              {/* VN30 badge */}
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-400 text-xs font-semibold rounded-lg whitespace-nowrap shrink-0">
                <span className="size-1.5 rounded-full bg-emerald-50 dark:bg-emerald-900/200 animate-pulse inline-block" />
                VN30 Index · {filteredAndSortedStocks.length} mã
              </span>

              <div className="flex-1" />

              {/* Column chooser trigger */}
              <button
                onClick={() => setChooserOpen(v => !v)}
                className={`flex items-center gap-2 px-3.5 py-2 text-sm font-medium rounded-lg border transition-all ${
                  chooserOpen
                    ? 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-300 text-emerald-700 dark:text-emerald-400'
                    : 'bg-white border-gray-200 dark:border-slate-700 text-gray-600 dark:text-slate-300 hover:border-gray-300 hover:bg-gray-50 dark:hover:bg-slate-800/50'
                }`}
              >
                <SlidersHorizontal className="size-4" />
                Cột
                <span className={`text-xs font-bold px-1.5 py-0.5 rounded-full ${
                  chooserOpen ? 'bg-emerald-200 text-emerald-800' : 'bg-gray-100 text-gray-600 dark:text-slate-300'
                }`}>
                  {visibleCols.size}
                </span>
              </button>
            </div>

            <div className="flex">
              {/* ── Main Table ── */}
              <div className="flex-1 overflow-x-auto min-w-0">
                <table className="w-full min-w-max">
                  <thead>
                    <tr className="bg-gray-50 dark:bg-slate-800/50 border-b border-gray-200 dark:border-slate-700 dark:border-slate-700">
                      {/* Sticky: # */}
                      <th className="sticky left-0 z-10 bg-gray-50 w-10 px-3 py-3 text-xs font-semibold text-gray-400 dark:text-slate-500 text-center border-r border-gray-200 dark:border-slate-700">
                        #
                      </th>
                      {/* Sticky: Ticker */}
                      <th
                        className="sticky left-10 z-10 bg-gray-50 px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wide cursor-pointer hover:bg-gray-100 dark:hover:bg-slate-800 whitespace-nowrap border-r border-gray-200 dark:border-slate-700 select-none"
                        onClick={() => handleSort('ticker')}
                      >
                        <div className="flex items-center gap-1.5">Mã CK <SortIcon field="ticker" /></div>
                      </th>
                      {/* Sticky: Name */}
                      <th className="sticky left-[138px] z-10 bg-gray-50 px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wide whitespace-nowrap min-w-[190px] border-r border-gray-200 dark:border-slate-700">
                        Tên công ty
                      </th>
                      {/* Dynamic columns */}
                      {visibleColDefs.map(col => (
                        <th
                          key={col.id}
                          style={{ minWidth: col.minW }}
                          className={`px-4 py-3 text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wide whitespace-nowrap select-none ${
                            col.align === 'right' ? 'text-right' : col.align === 'center' ? 'text-center' : 'text-left'
                          } ${col.sortKey ? 'cursor-pointer hover:bg-gray-100 dark:hover:bg-slate-800' : ''}`}
                          onClick={() => col.sortKey && handleSort(col.sortKey as keyof Stock)}
                        >
                          <div className={`flex items-center gap-1.5 ${col.align === 'right' ? 'justify-end' : col.align === 'center' ? 'justify-center' : ''}`}>
                            {col.label}
                            {col.sortKey && <SortIcon field={col.sortKey as keyof Stock} />}
                          </div>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {stocksLoading ? (
                      <tr>
                        <td colSpan={totalCols + 1} className="py-20 text-center">
                          <div className="flex flex-col items-center gap-3">
                            <div className="size-10 rounded-full bg-emerald-50 dark:bg-emerald-900/20 flex items-center justify-center">
                              <Loader2 className="size-5 text-emerald-600 dark:text-emerald-400 animate-spin" />
                            </div>
                            <p className="text-gray-400 dark:text-slate-500 text-sm">Đang tải dữ liệu VN30...</p>
                          </div>
                        </td>
                      </tr>
                    ) : stocksError ? (
                      <tr>
                        <td colSpan={totalCols + 1} className="py-16 text-center">
                          <p className="text-red-400 text-sm">{stocksError}</p>
                        </td>
                      </tr>
                    ) : filteredAndSortedStocks.length === 0 ? (
                      <tr>
                        <td colSpan={totalCols + 1} className="py-16 text-center">
                          <p className="text-gray-400 dark:text-slate-500 text-sm">
                            {searchQuery ? `Không tìm thấy kết quả cho "${searchQuery}"` : 'Chưa có dữ liệu VN30.'}
                          </p>
                        </td>
                      </tr>
                    ) : filteredAndSortedStocks.map((stock, idx) => (
                      <tr
                        key={stock.id}
                        className="group border-b border-gray-100 dark:border-slate-700/50 last:border-b-0 hover:bg-emerald-50 dark:bg-emerald-900/20/30 transition-colors"
                      >
                        {/* Row number */}
                        <td className="sticky left-0 z-10 bg-white group-hover:bg-emerald-50 dark:bg-emerald-900/20/30 w-10 px-3 py-3.5 text-center text-xs text-gray-300 dark:text-slate-600 font-medium border-r border-gray-100 tabular-nums">
                          {idx + 1}
                        </td>
                        {/* Ticker */}
                        <td className="sticky left-10 z-10 bg-white group-hover:bg-emerald-50 dark:bg-emerald-900/20/30 px-4 py-3.5 whitespace-nowrap border-r border-gray-100">
                          <Link
                            to={`/app/stock/${stock.ticker}`}
                            className="flex items-center gap-1 font-bold text-sm text-emerald-700 dark:text-emerald-400 hover:text-emerald-800 group-hover/link:underline"
                          >
                            {stock.ticker}
                            <ChevronRight className="size-3 opacity-0 group-hover:opacity-60 transition-opacity" />
                          </Link>
                        </td>
                        {/* Name */}
                        <td className="sticky left-[138px] z-10 bg-white group-hover:bg-emerald-50 dark:bg-emerald-900/20/30 px-4 py-3.5 whitespace-nowrap text-sm text-gray-700 dark:text-slate-300 font-medium min-w-[190px] border-r border-gray-100">
                          {stock.name}
                        </td>
                        {/* Dynamic cells */}
                        {visibleColDefs.map(col => (
                          <td
                            key={col.id}
                            className={`px-4 py-3.5 whitespace-nowrap text-sm ${
                              col.align === 'right' ? 'text-right' : col.align === 'center' ? 'text-center' : 'text-left'
                            }`}
                          >
                            {col.render(stock)}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* ── Column chooser side panel ── */}
              {chooserOpen && (
                <div ref={chooserRef} className="w-64 shrink-0 border-l border-gray-200 dark:border-slate-700 bg-gray-50 flex flex-col">
                  <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-slate-700 dark:border-slate-700 bg-white">
                    <span className="text-sm font-semibold text-gray-800">Chọn cột</span>
                    <button onClick={() => setChooserOpen(false)} className="size-6 flex items-center justify-center rounded hover:bg-gray-100 dark:hover:bg-slate-800 text-gray-400 dark:text-slate-500 hover:text-gray-600 dark:text-slate-300 transition-colors">
                      <X className="size-4" />
                    </button>
                  </div>
                  <div className="flex-1 overflow-y-auto py-2 px-3 space-y-4">
                    {colGroups.map(group => (
                      <div key={group.label}>
                        <p className="text-[10px] font-bold text-gray-400 dark:text-slate-500 uppercase tracking-widest mb-1.5 px-1">{group.label}</p>
                        <div className="space-y-0.5">
                          {group.ids.map(id => {
                            const col = ALL_COLUMNS.find(c => c.id === id)!;
                            return (
                              <label key={id} className="flex items-center gap-2.5 px-2 py-1.5 rounded-lg hover:bg-white cursor-pointer transition-colors group">
                                <input
                                  type="checkbox"
                                  checked={visibleCols.has(id)}
                                  onChange={() => toggleCol(id)}
                                  className="rounded border-gray-300 text-emerald-600 dark:text-emerald-400 focus:ring-emerald-500 dark:focus:ring-emerald-400 cursor-pointer shrink-0"
                                />
                                <span className="text-xs text-gray-600 dark:text-slate-300 group-hover:text-gray-900 dark:text-white select-none leading-tight">{col.fullLabel}</span>
                              </label>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="px-3 py-3 border-t border-gray-200 dark:border-slate-700 dark:border-slate-700 bg-white flex gap-2">
                    <button
                      onClick={() => setVisibleCols(new Set(DEFAULT_VISIBLE))}
                      className="flex-1 text-xs text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:text-slate-300 py-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors font-medium"
                    >
                      Mặc định
                    </button>
                    <button
                      onClick={() => setVisibleCols(new Set(ALL_COLUMNS.map(c => c.id)))}
                      className="flex-1 text-xs text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:text-emerald-400 py-1.5 font-semibold rounded-lg hover:bg-emerald-50 dark:bg-emerald-900/20 transition-colors"
                    >
                      Tất cả
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Table footer */}
            {!stocksLoading && filteredAndSortedStocks.length > 0 && (
              <div className="px-5 py-3 bg-gray-50 border-t border-gray-100 flex items-center justify-between">
                <span className="text-xs text-gray-400 dark:text-slate-500">
                  {filteredAndSortedStocks.length} / 30 mã VN30
                  {searchQuery && <span className="ml-1 text-gray-500 dark:text-slate-400">· "<em>{searchQuery}</em>"</span>}
                </span>
                <span className="text-xs text-gray-400 dark:text-slate-500">{visibleColDefs.length} cột · Nhấn tiêu đề để sắp xếp</span>
              </div>
            )}
          </div>
        )}

        {/* ═══════════════════════════════ GOLD TAB ═══════════════════════════════ */}
        {activeTab === 'gold' && (
          <div className="space-y-4">
            {/* Sub header */}
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-semibold text-gray-900 dark:text-white">Bảng giá vàng</h2>
                <p className="text-xs text-gray-400 dark:text-slate-500 mt-0.5">Giá mua vào / bán ra theo thị trường</p>
              </div>
              <span className="text-xs text-gray-400 dark:text-slate-500 bg-white border border-gray-200 dark:border-slate-700 dark:border-slate-700 px-3 py-1.5 rounded-lg">
                {sortedGold.length} mục
              </span>
            </div>

            {goldLoading ? (
              <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 dark:border-slate-700 dark:border-slate-700 py-20 flex flex-col items-center gap-3">
                <div className="size-10 rounded-full bg-yellow-50 dark:bg-yellow-900/20 flex items-center justify-center">
                  <Loader2 className="size-5 text-yellow-500 animate-spin" />
                </div>
                <p className="text-gray-400 dark:text-slate-500 text-sm">Đang tải dữ liệu vàng...</p>
              </div>
            ) : goldError ? (
              <div className="bg-white dark:bg-slate-800 rounded-xl border border-red-100 py-10 text-center">
                <p className="text-red-400 text-sm">{goldError}</p>
              </div>
            ) : sortedGold.length === 0 ? (
              <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 dark:border-slate-700 dark:border-slate-700 py-16 text-center">
                <p className="text-gray-400 dark:text-slate-500 text-sm">Chưa có dữ liệu vàng.</p>
              </div>
            ) : (
              <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 dark:border-slate-700 dark:border-slate-700 shadow-sm overflow-hidden">
                <table className="w-full">
                  <thead>
                    <tr className="bg-gray-50 dark:bg-slate-800/50 border-b border-gray-200 dark:border-slate-700 dark:border-slate-700">
                      <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wide cursor-pointer hover:bg-gray-100 dark:hover:bg-slate-800 select-none w-1/2"
                          onClick={() => handleGoldSort('name')}>
                        <div className="flex items-center gap-1.5">
                          Loại vàng
                          <GoldSortIcon field="name" />
                        </div>
                      </th>
                      <th className="px-5 py-3 text-right text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wide cursor-pointer hover:bg-gray-100 dark:hover:bg-slate-800 select-none"
                          onClick={() => handleGoldSort('price_sell')}>
                        <div className="flex items-center justify-end gap-1.5">
                          <span className="inline-flex items-center gap-1">
                            <span className="size-2 rounded-full bg-blue-400 inline-block" />
                            Mua vào
                          </span>
                          <GoldSortIcon field="price_sell" />
                        </div>
                      </th>
                      <th className="px-5 py-3 text-right text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wide cursor-pointer hover:bg-gray-100 dark:hover:bg-slate-800 select-none"
                          onClick={() => handleGoldSort('price_buy')}>
                        <div className="flex items-center justify-end gap-1.5">
                          <span className="inline-flex items-center gap-1">
                            <span className="size-2 rounded-full bg-emerald-400 inline-block" />
                            Bán ra
                          </span>
                          <GoldSortIcon field="price_buy" />
                        </div>
                      </th>
                      <th className="px-5 py-3 text-right text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wide">
                        Chênh lệch
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {sortedGold.map((row, idx) => {
                      const spread = (row.current_price_sell != null && row.current_price_buy != null)
                        ? row.current_price_sell - row.current_price_buy : null;
                      return (
                        <tr key={row.symbol} className="border-b border-gray-100 dark:border-slate-700/50 last:border-b-0 hover:bg-yellow-50 dark:bg-yellow-900/20/30 transition-colors">
                          <td className="px-5 py-4">
                            <div className="flex items-center gap-3">
                              <div className="size-9 rounded-lg bg-gradient-to-br from-yellow-400 to-amber-500 flex items-center justify-center text-white shrink-0">
                                <Coins className="size-4" />
                              </div>
                              <div>
                                <div className="font-semibold text-sm text-gray-900 dark:text-white">{row.name}</div>
                                <div className="text-xs text-gray-400 dark:text-slate-500 font-medium mt-0.5 font-mono">{row.symbol}</div>
                              </div>
                            </div>
                          </td>
                          <td className="px-5 py-4 text-right">
                            <span className="text-sm font-semibold text-gray-800 tabular-nums">
                              {row.current_price_sell != null ? `${row.current_price_sell.toLocaleString('vi-VN')} đ` : <span className="text-gray-300 dark:text-slate-600">—</span>}
                            </span>
                          </td>
                          <td className="px-5 py-4 text-right">
                            <span className="text-sm font-semibold text-emerald-700 dark:text-emerald-400 tabular-nums">
                              {row.current_price_buy != null ? `${row.current_price_buy.toLocaleString('vi-VN')} đ` : <span className="text-gray-300 dark:text-slate-600">—</span>}
                            </span>
                          </td>
                          <td className="px-5 py-4 text-right">
                            {spread != null ? (
                              <span className="text-xs font-medium text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 px-2 py-1 rounded-md tabular-nums">
                                {spread.toLocaleString('vi-VN')} đ
                              </span>
                            ) : <span className="text-gray-300 dark:text-slate-600">—</span>}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* ═══════════════════════════════ CRYPTO TAB ═══════════════════════════════ */}
        {activeTab === 'crypto' && (
          <div className="space-y-4">
            {/* Sub header + search */}
            <div className="flex items-center justify-between gap-4">
              <div>
                <h2 className="text-base font-semibold text-gray-900 dark:text-white">Thị trường Crypto</h2>
                <p className="text-xs text-gray-400 dark:text-slate-500 mt-0.5">Giá niêm yết theo USD</p>
              </div>
              <div className="relative max-w-xs w-full">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-gray-400 dark:text-slate-500 pointer-events-none" />
                <input
                  type="text"
                  placeholder="Tìm theo tên, symbol..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 text-sm bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 dark:border-slate-700 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 dark:focus:ring-emerald-400 placeholder:text-gray-400 dark:text-slate-500"
                />
              </div>
            </div>

            {cryptoLoading ? (
              <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 dark:border-slate-700 dark:border-slate-700 py-20 flex flex-col items-center gap-3">
                <div className="size-10 rounded-full bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center">
                  <Loader2 className="size-5 text-blue-500 dark:text-blue-400 animate-spin" />
                </div>
                <p className="text-gray-400 dark:text-slate-500 text-sm">Đang tải dữ liệu crypto...</p>
              </div>
            ) : cryptoError ? (
              <div className="bg-white dark:bg-slate-800 rounded-xl border border-red-100 py-10 text-center">
                <p className="text-red-400 text-sm">{cryptoError}</p>
              </div>
            ) : sortedCrypto.length === 0 ? (
              <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 dark:border-slate-700 dark:border-slate-700 py-16 text-center">
                <p className="text-gray-400 dark:text-slate-500 text-sm">Chưa có dữ liệu crypto.</p>
              </div>
            ) : (
              <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 dark:border-slate-700 dark:border-slate-700 shadow-sm overflow-hidden">
                <table className="w-full">
                  <thead>
                    <tr className="bg-gray-50 dark:bg-slate-800/50 border-b border-gray-200 dark:border-slate-700 dark:border-slate-700">
                      <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wide w-8 text-center">#</th>
                      <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wide cursor-pointer hover:bg-gray-100 dark:hover:bg-slate-800 select-none"
                          onClick={() => handleCryptoSort('name')}>
                        <div className="flex items-center gap-1.5">Tên <CryptoSortIcon field="name" /></div>
                      </th>
                      <th className="px-5 py-3 text-right text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wide cursor-pointer hover:bg-gray-100 dark:hover:bg-slate-800 select-none"
                          onClick={() => handleCryptoSort('price')}>
                        <div className="flex items-center justify-end gap-1.5">Giá hiện tại <CryptoSortIcon field="price" /></div>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {sortedCrypto
                      .filter(r => !searchQuery || r.name.toLowerCase().includes(searchQuery.toLowerCase()) || r.symbol.toLowerCase().includes(searchQuery.toLowerCase()))
                      .map((row, idx) => {
                        const colors = ['from-orange-400 to-amber-500', 'from-blue-500 to-indigo-600', 'from-yellow-400 to-orange-500', 'from-teal-400 to-emerald-500', 'from-purple-500 to-pink-500', 'from-red-500 to-rose-600'];
                        const grad = colors[idx % colors.length];
                        return (
                          <tr key={row.symbol} className="border-b border-gray-100 dark:border-slate-700/50 last:border-b-0 hover:bg-blue-50 dark:bg-blue-900/20/20 transition-colors">
                            <td className="px-5 py-4 text-center text-xs text-gray-300 dark:text-slate-600 font-medium tabular-nums w-8">{idx + 1}</td>
                            <td className="px-5 py-4">
                              <div className="flex items-center gap-3">
                                <div className={`size-9 rounded-lg bg-gradient-to-br ${grad} flex items-center justify-center text-white font-bold text-sm shrink-0`}>
                                  {row.symbol.charAt(0)}
                                </div>
                                <div>
                                  <div className="font-semibold text-sm text-gray-900 dark:text-white">{row.name}</div>
                                  <div className="text-xs text-gray-400 dark:text-slate-500 font-mono font-medium mt-0.5">{row.symbol}</div>
                                </div>
                              </div>
                            </td>
                            <td className="px-5 py-4 text-right">
                              {row.current_price != null ? (
                                <span className="text-sm font-bold text-gray-900 dark:text-white tabular-nums">
                                  {row.current_price >= 1
                                    ? `$${Number(row.current_price).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                                    : `$${Number(row.current_price).toFixed(6)}`}
                                </span>
                              ) : <span className="text-gray-300 dark:text-slate-600 text-sm">—</span>}
                            </td>
                          </tr>
                        );
                      })}
                  </tbody>
                </table>
                <div className="px-5 py-3 bg-gray-50 border-t border-gray-100 text-xs text-gray-400 dark:text-slate-500">
                  {sortedCrypto.length} loại tiền điện tử · Giá USD
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
