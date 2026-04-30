import { useState, useMemo, useCallback, useEffect } from 'react';
import { Link } from 'react-router';
import { PieChart, DollarSign, TrendingUp, Calendar, Plus, Settings, Eye, EyeOff, Trash2, Loader2, Bell } from 'lucide-react';
import { NewsletterSetupModal } from '../components/NewsletterSetupModal';
import { PortfolioSummary } from '../lib/types';
import { formatVND, formatPercent, getSafetyColorByScore, getSafetyLabelByScore } from '../lib/utils';
import { PieChart as RechartsPie, Pie, Cell, ResponsiveContainer, Tooltip, Legend, AreaChart, Area, XAxis, YAxis, CartesianGrid } from 'recharts';
import { AddTransactionWidget } from '../components/add-transaction-widget';
import { DividendTab } from '../components/dividend-tab';
import { CalendarTab } from '../components/calendar-tab';
import { DiversificationTab } from '../components/diversification-tab';
import { PerformanceTab } from '../components/performance-tab';
import { TransactionsTab } from '../components/transactions-tab';
import { supabase } from '../lib/supabase/client';

// Alias to bypass outdated generated types (real schema has stocks_assets, gold_assets, etc.)
const db = supabase as any;

// Types for Supabase data
interface Portfolio {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  total_value: number;
  total_cost: number;
  total_gain_loss: number;
  total_gain_loss_percentage: number;
  is_default: boolean;
  created_at: string;
}

interface DashboardHolding {
  id: string;
  assetId: string;
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
  sector: string;
  exchange: string;
  dividendYield: number;
  annualIncome: number;
  dividendSafety: string;
  dividendSafetyScore: number | null;
}

// Asset type labels mapping
const ASSET_TYPE_LABELS: Record<string, string> = {
  'STOCK': 'Cổ phiếu',
  'ETF': 'ETF',
  'FUND': 'Quỹ đầu tư',
  'BOND': 'Trái phiếu',
  'CRYPTO': 'Crypto',
  'REAL_ESTATE': 'Bất động sản',
  'COMMODITY': 'Hàng hóa',
  'CASH': 'Tiền mặt',
  'OTHER': 'Khác',
};

const COLORS = {
  Safe: '#10b981',
  Unrated: '#f59e0b',
  Risky: '#ef4444',
};


interface ColumnConfig {
  key: string;
  label: string;
  visible: boolean;
}

export function UserDashboard() {
  // State management
  const [activeTab, setActiveTab] = useState<'holdings' | 'dividends' | 'calendar' | 'diversification' | 'performance' | 'transactions' | 'add-transaction'>('holdings');
  const [showColumnSettings, setShowColumnSettings] = useState(false);
  const [columns, setColumns] = useState<ColumnConfig[]>([
    { key: 'ticker', label: 'Mã CK', visible: true },
    { key: 'name', label: 'Tên công ty', visible: true },
    { key: 'sector', label: 'Ngành', visible: true },
    { key: 'shares', label: 'Số lượng', visible: true },
    { key: 'avgPrice', label: 'Giá mua TB', visible: true },
    { key: 'currentPrice', label: 'Giá hiện tại', visible: true },
    { key: 'value', label: 'Giá trị', visible: true },
    { key: 'safety', label: 'Dividend Safety', visible: true },
    { key: 'yield', label: 'Tỷ suất cổ tức', visible: true },
    { key: 'annualIncome', label: 'Thu nhập/năm', visible: true },
    { key: 'profitLoss', label: 'Lãi/Lỗ', visible: true },
    { key: 'actions', label: 'Thao tác', visible: true },
  ]);

  // Supabase data state
  const [portfolio, setPortfolio] = useState<Portfolio | null>(null);
  const [holdings, setHoldings] = useState<DashboardHolding[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  // Real dividend history from user_dividend_payouts_history (same source as DividendTab)
  const [dividendYearlyMap, setDividendYearlyMap] = useState<Record<number, { confirmed: number; estimated: number }>>({});
  const [error, setError] = useState<string | null>(null);

  // Fetch data from Supabase
  const fetchData = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      // 1. Get user's portfolios
      const { data: portfolios, error: pError } = await db
        .from('portfolios')
        .select('*')
        .order('is_default', { ascending: false })
        .order('created_at', { ascending: false });

      if (pError) throw pError;

      if (!portfolios || portfolios.length === 0) {
        setPortfolio(null);
        setHoldings([]);
        setIsLoading(false);
        return;
      }

      const currentPortfolio: any = portfolios[0];
      setPortfolio(currentPortfolio as Portfolio);

      const pid = currentPortfolio.id;

      // 2a. Fetch stocks_assets joined with market data + dividend summary
      const [
        { data: stocksData, error: stocksErr },
        { data: goldData, error: goldErr },
        { data: cryptoData, error: cryptoErr },
        { data: fixedData, error: fixedErr },
        { data: customData, error: customErr },
        { data: dividendSummary, error: divErr },
      ] = await Promise.all([
        db
          .from('stocks_assets')
          .select('id, symbol, quantity, average_cost, created_at, market_data_stocks(company_name, current_price, industry, exchange)')
          .eq('portfolio_id', pid),
        db
          .from('gold_assets')
          .select('id, symbol, quantity, average_cost, created_at, market_data_gold(name, current_price_buy, current_price_sell)')
          .eq('portfolio_id', pid),
        db
          .from('crypto_assets')
          .select('id, symbol, quantity, average_cost, created_at, market_data_crypto(name, current_price)')
          .eq('portfolio_id', pid),
        db
          .from('fixed_income_assets')
          .select('id, issuer_name, symbol, principal_amount, interest_rate, transaction_date, maturity_date, status, created_at')
          .eq('portfolio_id', pid)
          .eq('status', 'active'),
        db
          .from('custom_assets')
          .select('id, asset_name, symbol, principal_value, income_amount, payment_frequency, transaction_date, status, created_at')
          .eq('portfolio_id', pid)
          .eq('status', 'active'),
        db
          .from('user_dividend_summary')
          .select('symbol, annual_income, current_yield')
          .eq('portfolio_id', pid),
      ]);

      if (stocksErr) throw stocksErr;
      if (goldErr) throw goldErr;
      if (cryptoErr) throw cryptoErr;
      if (fixedErr) throw fixedErr;
      if (customErr) throw customErr;
      if (divErr) console.warn('Dividend summary error (non-fatal):', divErr);

      // Fetch real dividend history (same source as DividendTab)
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: payoutsData } = await db
          .from('user_dividend_payouts_history')
          .select('ex_date, total_payout, status')
          .eq('user_id', user.id);

        const yearMap: Record<number, { confirmed: number; estimated: number }> = {};
        for (const row of payoutsData || []) {
          const year = row.ex_date ? new Date(row.ex_date).getFullYear() : new Date().getFullYear();
          if (!yearMap[year]) yearMap[year] = { confirmed: 0, estimated: 0 };
          const amount = Number(row.total_payout) || 0;
          if ((row.status || '').toLowerCase() === 'confirmed') {
            yearMap[year].confirmed += amount;
          } else {
            yearMap[year].estimated += amount;
          }
        }
        setDividendYearlyMap(yearMap);
      }

      // Lấy điểm dividend safety từ Supabase, chỉ filter đúng symbols của user
      const stockSymbols: string[] = (stocksData || []).map((r: any) => r.symbol).filter(Boolean);
      const safetyScoreMap: Record<string, number | null> = {};
      if (stockSymbols.length > 0) {
        const { data: fundamentalsData, error: fundErr } = await db
          .from('market_stocks_fundamentals')
          .select('symbol, dividend_safety_score')
          .in('symbol', stockSymbols);
        if (fundErr) {
          console.warn('Fundamentals fetch error (non-fatal):', fundErr);
        }
        for (const f of fundamentalsData || []) {
          safetyScoreMap[(f as any).symbol] =
            (f as any).dividend_safety_score != null
              ? Number((f as any).dividend_safety_score)
              : null;
        }
      }

      // Build a map: symbol -> { annual_income, current_yield }
      const divMap: Record<string, { annual_income: number; current_yield: number }> = {};
      for (const d of dividendSummary || []) {
        divMap[(d as any).symbol] = {
          annual_income: Number((d as any).annual_income) || 0,
          current_yield: Number((d as any).current_yield) || 0,
        };
      }

      const result: DashboardHolding[] = [];

      // 2b. Map stocks
      for (const row of stocksData || []) {
        const r = row as any;
        const mkt = r.market_data_stocks;
        const quantity = Number(r.quantity) || 0;
        const avgCost = Number(r.average_cost) || 0;
        const currentPrice = Number(mkt?.current_price) || avgCost;
        const totalCost = quantity * avgCost;
        const currentValue = quantity * currentPrice;
        const profitLoss = currentValue - totalCost;
        const div = divMap[r.symbol] || { annual_income: 0, current_yield: 0 };
        const safetyScore: number | null = safetyScoreMap[r.symbol] ?? null;
        // Tính dividendSafety string từ score (dùng cho safetyData chart)
        let dividendSafety: string = 'Unrated';
        if (safetyScore !== null) {
          if (safetyScore >= 60) dividendSafety = 'Safe';
          else if (safetyScore < 40) dividendSafety = 'Risky';
        }
        result.push({
          id: r.id,
          assetId: r.id,
          ticker: r.symbol,
          name: mkt?.company_name || r.symbol,
          assetType: 'STOCK',
          shares: quantity,
          avgBuyPrice: avgCost,
          currentPrice,
          totalCost,
          currentValue,
          profitLoss,
          profitLossPercent: totalCost > 0 ? (profitLoss / totalCost) * 100 : 0,
          sector: mkt?.industry || 'Chưa phân loại',
          exchange: mkt?.exchange || '',
          dividendYield: div.current_yield,
          annualIncome: div.annual_income,
          dividendSafety,
          dividendSafetyScore: safetyScore,
        });
      }

      // 2c. Map gold
      // Quy ước VN: nhìn từ góc độ KHÁCH HÀNG
      //   "Mua vào" (khách bỏ tiền mua) = current_price_sell của tiệm — giá cao hơn
      //   "Bán ra"  (khách nhận tiền bán) = current_price_buy  của tiệm — giá thấp hơn
      // average_cost = giá khách đã trả khi mua = current_price_sell của tiệm tại thời điểm đó
      // "Giá hiện tại" để tính P&L = current_price_sell (giá thị trường để mua hiện tại)
      //   → đồng bộ với cột "Mua vào" trên trang Markets Dashboard
      for (const row of goldData || []) {
        const r = row as any;
        const mkt = r.market_data_gold;
        const quantity = Number(r.quantity) || 0;
        const avgCost = Number(r.average_cost) || 0;
        // Ưu tiên current_price_sell (giá mua vào của khách = giá thị trường hiện tại)
        // Fallback: current_price_buy, rồi avgCost
        const currentPrice =
          (mkt?.current_price_sell != null ? Number(mkt.current_price_sell) : null) ??
          (mkt?.current_price_buy  != null ? Number(mkt.current_price_buy)  : null) ??
          avgCost;
        const totalCost = quantity * avgCost;
        const currentValue = quantity * currentPrice;
        result.push({
          id: r.id,
          assetId: r.id,
          ticker: r.symbol,
          name: mkt?.name || r.symbol,
          assetType: 'GOLD',
          shares: quantity,
          avgBuyPrice: avgCost,
          currentPrice,
          totalCost,
          currentValue,
          profitLoss: currentValue - totalCost,
          profitLossPercent: totalCost > 0 ? ((currentValue - totalCost) / totalCost) * 100 : 0,
          sector: 'Vàng',
          exchange: '',
          dividendYield: 0,
          annualIncome: 0,
          dividendSafety: 'Unrated',
          dividendSafetyScore: null,
        });
      }

      // 2d. Map crypto
      for (const row of cryptoData || []) {
        const r = row as any;
        const mkt = r.market_data_crypto;
        const quantity = Number(r.quantity) || 0;
        const avgCost = Number(r.average_cost) || 0;
        const currentPrice = Number(mkt?.current_price) || avgCost;
        const totalCost = quantity * avgCost;
        const currentValue = quantity * currentPrice;
        result.push({
          id: r.id,
          assetId: r.id,
          ticker: r.symbol,
          name: mkt?.name || r.symbol,
          assetType: 'CRYPTO',
          shares: quantity,
          avgBuyPrice: avgCost,
          currentPrice,
          totalCost,
          currentValue,
          profitLoss: currentValue - totalCost,
          profitLossPercent: totalCost > 0 ? ((currentValue - totalCost) / totalCost) * 100 : 0,
          sector: 'Crypto',
          exchange: '',
          dividendYield: 0,
          annualIncome: 0,
          dividendSafety: 'Unrated',
          dividendSafetyScore: null,
        });
      }

      // 2e. Map fixed income
      for (const row of fixedData || []) {
        const r = row as any;
        const principal = Number(r.principal_amount) || 0;
        const rate = Number(r.interest_rate) || 0;
        const annualIncome = principal * (rate / 100);
        result.push({
          id: r.id,
          assetId: r.id,
          ticker: r.symbol || r.issuer_name?.substring(0, 8).toUpperCase() || 'BOND',
          name: r.issuer_name,
          assetType: 'BOND',
          shares: 1,
          avgBuyPrice: principal,
          currentPrice: principal,
          totalCost: principal,
          currentValue: principal,
          profitLoss: 0,
          profitLossPercent: 0,
          sector: 'Trái phiếu/Tiền gửi',
          exchange: '',
          dividendYield: rate,
          annualIncome,
          dividendSafety: 'Unrated',
          dividendSafetyScore: null,
        });
      }

      // 2f. Map custom assets
      for (const row of customData || []) {
        const r = row as any;
        const principal = Number(r.principal_value) || 0;
        const income = Number(r.income_amount) || 0;
        const freqMap: Record<string, number> = { daily: 365, weekly: 52, monthly: 12, quarterly: 4, yearly: 1 };
        const annualIncome = income * (freqMap[r.payment_frequency] || 0);
        result.push({
          id: r.id,
          assetId: r.id,
          ticker: r.symbol || 'CUSTOM',
          name: r.asset_name,
          assetType: 'OTHER',
          shares: 1,
          avgBuyPrice: principal,
          currentPrice: principal,
          totalCost: principal,
          currentValue: principal,
          profitLoss: 0,
          profitLossPercent: 0,
          sector: 'Tài sản khác',
          exchange: '',
          dividendYield: principal > 0 ? (annualIncome / principal) * 100 : 0,
          annualIncome,
          dividendSafety: 'Unrated',
          dividendSafetyScore: null,
        });
      }

      setHoldings(result);
    } catch (err: any) {
      console.error('Dashboard fetch error:', err);
      setError(err.message || 'Không thể tải dữ liệu');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const [isCreatingPortfolio, setIsCreatingPortfolio] = useState(false);
  const [showNewsletterModal, setShowNewsletterModal] = useState(false);
  const [subscriberHoldings, setSubscriberHoldings] = useState<any[] | null>(null);

  // Tạo danh mục mặc định rồi chuyển sang tab "Thêm tài sản"
  const handleCreateFirstPortfolio = async () => {
    try {
      setIsCreatingPortfolio(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Chưa đăng nhập');

      const { data: newPortfolio, error } = await db
        .from('portfolios')
        .insert({
          user_id: user.id,
          name: 'Danh mục của tôi',
          is_default: true,
          total_cost: 0,
        })
        .select()
        .single();

      if (error) throw error;

      setPortfolio(newPortfolio as unknown as Portfolio);
      setActiveTab('add-transaction');
    } catch (err: any) {
      console.error('Create portfolio error:', err);
      setError(err.message || 'Không thể tạo danh mục');
    } finally {
      setIsCreatingPortfolio(false);
    }
  };

  // Load data on mount
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Kiểm tra subscriber holdings để hiện banner nếu chưa thiết lập
  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return;
      supabase
        .from('subscribers')
        .select('holdings')
        .eq('email', user.email!)
        .maybeSingle()
        .then(({ data }) => {
          const h = data?.holdings ?? [];
          setSubscriberHoldings(Array.isArray(h) ? h : []);
        });
    });
  }, []);

  // Delete holding — routes to correct table based on assetType
  const handleDeleteHolding = async (holdingId: string) => {
    if (!confirm('Bạn có chắc muốn xóa tài sản này?')) return;

    const holding = holdings.find(h => h.id === holdingId);
    const tableMap: Record<string, string> = {
      STOCK: 'stocks_assets',
      GOLD: 'gold_assets',
      CRYPTO: 'crypto_assets',
      BOND: 'fixed_income_assets',
      OTHER: 'custom_assets',
    };
    const table = tableMap[holding?.assetType || ''] || 'stocks_assets';

    try {
      const { error } = await db
        .from(table)
        .delete()
        .eq('id', holdingId);

      if (error) throw error;
      await fetchData();
    } catch (err: any) {
      alert('Lỗi: ' + (err.message || 'Không thể xóa'));
    }
  };

  const toggleColumn = (key: string) => {
    setColumns(prev => prev.map(col => 
      col.key === key ? { ...col, visible: !col.visible } : col
    ));
  };

  // Summary calculations from real data
  const summary: PortfolioSummary = useMemo(() => {
    if (!portfolio) {
      return {
        totalValue: 0,
        annualIncome: 0,
        dividendYield: 0,
        irr: 0,
        totalPL: 0,
        totalPLPercent: 0,
        yieldOnCost: 0,
      };
    }

    const totalValue = holdings.reduce((sum, h) => sum + h.currentValue, 0);
    const annualIncome = holdings.reduce((sum, h) => sum + h.annualIncome, 0);
    const totalCost = holdings.reduce((sum, h) => sum + h.totalCost, 0);
    const totalPL = holdings.reduce((sum, h) => sum + h.profitLoss, 0);
    
    return {
      totalValue,
      annualIncome,
      dividendYield: totalValue > 0 ? (annualIncome / totalValue) * 100 : 0,
      irr: totalCost > 0 ? (totalPL / totalCost) * 100 : 0, // Simplified IRR as ROI
      totalPL,
      totalPLPercent: totalCost > 0 ? (totalPL / totalCost) * 100 : 0,
      yieldOnCost: totalCost > 0 ? (annualIncome / totalCost) * 100 : 0,
      holdingsCount: holdings.length,
    };
  }, [holdings, portfolio]);

  // Safety distribution
  const safetyData = useMemo(() => {
    const distribution = holdings.reduce((acc, h) => {
      acc[h.dividendSafety] = (acc[h.dividendSafety] || 0) + h.currentValue;
      return acc;
    }, {} as Record<string, number>);

    return Object.entries(distribution).map(([name, value]) => ({
      name: name === 'Safe' ? 'An toàn' : name === 'Risky' ? 'Rủi ro' : 'Chưa đánh giá',
      value,
      color: name === 'Safe' ? COLORS.Safe : name === 'Risky' ? COLORS.Risky : COLORS.Unrated
    }));
  }, [holdings]);

  // Asset type distribution (by asset type, not sector)
  const ASSET_TYPE_DISPLAY: Record<string, { label: string; color: string }> = {
    STOCK:  { label: 'Cổ phiếu',   color: '#6366f1' },
    GOLD:   { label: 'Vàng',       color: '#f59e0b' },
    CRYPTO: { label: 'Crypto',     color: '#f97316' },
    BOND:   { label: 'Trái phiếu', color: '#10b981' },
    OTHER:  { label: 'Khác',       color: '#9ca3af' },
  };

  const sectorData = useMemo(() => {
    if (holdings.length === 0) {
      return [];
    }

    // Group by assetType (STOCK, GOLD, CRYPTO, BOND, OTHER)
    const distribution = holdings.reduce((acc, h) => {
      const key = h.assetType || 'OTHER';
      acc[key] = (acc[key] || 0) + h.currentValue;
      return acc;
    }, {} as Record<string, number>);

    // Build result in defined order with fixed colors
    const ORDER = ['STOCK', 'GOLD', 'CRYPTO', 'BOND', 'OTHER'];
    const result = ORDER
      .filter(key => distribution[key] > 0)
      .map(key => ({
        name: ASSET_TYPE_DISPLAY[key]?.label ?? key,
        value: distribution[key],
        color: ASSET_TYPE_DISPLAY[key]?.color ?? '#9ca3af',
        percentage: 0,
      }));

    // Calculate percentages
    const total = result.reduce((sum, item) => sum + item.value, 0);
    if (total > 0) {
      result.forEach(item => {
        item.percentage = (item.value / total) * 100;
      });
    }

    return result;
  }, [holdings]);

  // Real dividend history per year + 1 year projection from annualIncome
  const growthData = useMemo(() => {
    const currentYear = new Date().getFullYear();
    const years: Array<{ year: number; income: number; confirmed: number; estimated: number; type: string }> = [];

    // Collect all real years from dividend payout history
    const realYears = Object.keys(dividendYearlyMap).map(Number).sort((a, b) => a - b);

    for (const year of realYears) {
      const { confirmed, estimated } = dividendYearlyMap[year];
      years.push({
        year,
        income: confirmed + estimated,
        confirmed,
        estimated,
        type: year < currentYear ? 'historical' : 'current',
      });
    }

    // If current year has no real data yet, add it using annualIncome from holdings
    if (!dividendYearlyMap[currentYear]) {
      const currentIncome = summary.annualIncome || 0;
      years.push({
        year: currentYear,
        income: currentIncome,
        confirmed: 0,
        estimated: currentIncome,
        type: 'current',
      });
    }

    // Add 1 year projection (next year) based on annualIncome from holdings
    const nextYear = currentYear + 1;
    const projectedIncome = summary.annualIncome || 0;
    years.push({
      year: nextYear,
      income: projectedIncome,
      confirmed: 0,
      estimated: projectedIncome,
      type: 'projected',
    });

    return years;
  }, [dividendYearlyMap, summary.annualIncome]);

  return (
    <div className="p-6 space-y-6">
      {/* Loading State */}
      {isLoading && (
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600 mx-auto mb-4"></div>
            <p className="text-gray-600 dark:text-slate-300">Đang tải dữ liệu...</p>
          </div>
        </div>
      )}

      {/* Error State */}
      {error && !isLoading && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 rounded-lg p-6 text-center">
          <p className="text-red-800 font-medium mb-2">Có lỗi xảy ra</p>
          <p className="text-red-600 dark:text-red-400 text-sm mb-4">{error}</p>
          <button
            onClick={fetchData}
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
          >
            Thử lại
          </button>
        </div>
      )}

      {/* Newsletter banner — hiện khi subscriber chưa có holdings */}
      {!isLoading && subscriberHoldings !== null && subscriberHoldings.length === 0 && (
        <div className="bg-gradient-to-r from-[#0849ac] to-[#2563eb] rounded-xl px-5 py-4 flex items-center justify-between gap-4 shadow-md">
          <div className="flex items-center gap-3">
            <div className="bg-white/20 rounded-lg p-2 flex-shrink-0">
              <Bell className="size-5 text-white" />
            </div>
            <div>
              <p className="text-white font-semibold text-[14px]">Bạn chưa thiết lập nhận bản tin hàng ngày</p>
              <p className="text-blue-100 text-[12px] mt-0.5">Thêm danh mục cổ phiếu để nhận email phân tích tin tức mỗi sáng</p>
            </div>
          </div>
          <button
            onClick={() => setShowNewsletterModal(true)}
            className="bg-white text-[#0849ac] px-4 py-2 rounded-lg text-[13px] font-semibold hover:bg-blue-50 transition-colors whitespace-nowrap flex-shrink-0"
          >
            Thiết lập ngay →
          </button>
        </div>
      )}

      {/* Newsletter Setup Modal */}
      {showNewsletterModal && (
        <NewsletterSetupModal
          onClose={() => setShowNewsletterModal(false)}
          onSuccess={() => {
            setShowNewsletterModal(false);
            setSubscriberHoldings([{ placeholder: true }]); // ẩn banner sau khi lưu
          }}
        />
      )}

      {/* Empty State - No Portfolio */}
      {!isLoading && !error && !portfolio && (
        <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm dark:shadow-slate-900/40 border border-gray-200 dark:border-slate-700 dark:border-slate-700 p-12 text-center">
          <div className="max-w-md mx-auto">
            <PieChart className="size-16 text-gray-400 dark:text-slate-500 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
              Chưa có danh mục đầu tư
            </h3>
            <p className="text-gray-600 dark:text-slate-300 mb-6">
              Tạo danh mục đầu tư đầu tiên của bạn để bắt đầu theo dõi tài sản
            </p>
            <button
              onClick={handleCreateFirstPortfolio}
              disabled={isCreatingPortfolio}
              className="inline-flex items-center gap-2 px-6 py-3 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-60 disabled:cursor-not-allowed transition-colors font-medium"
            >
              {isCreatingPortfolio ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Plus className="size-4" />
              )}
              {isCreatingPortfolio ? 'Đang tạo danh mục...' : 'Thêm tài sản đầu tiên'}
            </button>
          </div>
        </div>
      )}

      {/* Main Content - Only show when data is loaded */}
      {!isLoading && !error && portfolio && (
        <>
          {/* Tab Navigation */}
      <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm dark:shadow-slate-900/40 border border-gray-200 dark:border-slate-700 dark:border-slate-700">
        <div className="flex items-center justify-between border-b border-gray-200 dark:border-slate-700 dark:border-slate-700">
          <div className="flex">
            <button
              onClick={() => setActiveTab('holdings')}
              className={`px-6 py-4 font-medium text-sm transition-colors border-b-2 ${
                activeTab === 'holdings'
                  ? 'border-emerald-600 text-emerald-600 dark:text-emerald-400 dark:text-emerald-400'
                  : 'border-transparent text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:text-slate-300'
              }`}
            >
              Tài sản nắm giữ
            </button>
            <button
              onClick={() => setActiveTab('dividends')}
              className={`px-6 py-4 font-medium text-sm transition-colors border-b-2 ${
                activeTab === 'dividends'
                  ? 'border-emerald-600 text-emerald-600 dark:text-emerald-400 dark:text-emerald-400'
                  : 'border-transparent text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:text-slate-300'
              }`}
            >
              Cổ tức
            </button>
            <button
              onClick={() => setActiveTab('calendar')}
              className={`px-6 py-4 font-medium text-sm transition-colors border-b-2 ${
                activeTab === 'calendar'
                  ? 'border-emerald-600 text-emerald-600 dark:text-emerald-400 dark:text-emerald-400'
                  : 'border-transparent text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:text-slate-300'
              }`}
            >
              Lịch trình
            </button>
            <button
              onClick={() => setActiveTab('diversification')}
              className={`px-6 py-4 font-medium text-sm transition-colors border-b-2 ${
                activeTab === 'diversification'
                  ? 'border-emerald-600 text-emerald-600 dark:text-emerald-400 dark:text-emerald-400'
                  : 'border-transparent text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:text-slate-300'
              }`}
            >
              Phân bổ
            </button>
            <button
              onClick={() => setActiveTab('performance')}
              className={`px-6 py-4 font-medium text-sm transition-colors border-b-2 ${
                activeTab === 'performance'
                  ? 'border-emerald-600 text-emerald-600 dark:text-emerald-400 dark:text-emerald-400'
                  : 'border-transparent text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:text-slate-300'
              }`}
            >
              Hiệu suất
            </button>
            <button
              onClick={() => setActiveTab('transactions')}
              className={`px-6 py-4 font-medium text-sm transition-colors border-b-2 ${
                activeTab === 'transactions'
                  ? 'border-emerald-600 text-emerald-600 dark:text-emerald-400 dark:text-emerald-400'
                  : 'border-transparent text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:text-slate-300'
              }`}
            >
              Giao dịch
            </button>
          </div>
          
          {/* Add Transaction Button - Highlighted */}
          <div className="px-4 py-2">
            <button
              onClick={() => setActiveTab('add-transaction')}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2 font-medium text-sm shadow-sm"
            >
              <Plus className="size-4" />
              Thêm giao dịch
            </button>
          </div>
        </div>
      </div>

      {activeTab === 'holdings' ? (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6 gap-4">
            <div className="bg-white dark:bg-slate-800 rounded-lg p-4 shadow-sm border border-gray-200 dark:border-slate-700 dark:border-slate-700">
              <div className="flex items-center gap-2 mb-2">
                <PieChart className="size-4 text-blue-600 dark:text-blue-400" />
                <h3 className="text-xs font-medium text-gray-600 dark:text-slate-300">Tổng tài sản</h3>
              </div>
              <p className="text-xl font-bold text-gray-900 dark:text-white">{formatVND(summary.totalValue)}</p>
            </div>

            <div className="bg-white dark:bg-slate-800 rounded-lg p-4 shadow-sm border border-gray-200 dark:border-slate-700 dark:border-slate-700">
              <div className="flex items-center gap-2 mb-2">
                <DollarSign className="size-4 text-emerald-600 dark:text-emerald-400" />
                <h3 className="text-xs font-medium text-gray-600 dark:text-slate-300">Thu nhập năm</h3>
              </div>
              <p className="text-xl font-bold text-emerald-700 dark:text-emerald-400">{formatVND(summary.annualIncome)}</p>
            </div>

            <div className="bg-white dark:bg-slate-800 rounded-lg p-4 shadow-sm border border-gray-200 dark:border-slate-700 dark:border-slate-700">
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp className="size-4 text-purple-600 dark:text-purple-400" />
                <h3 className="text-xs font-medium text-gray-600 dark:text-slate-300">Dividend Yield</h3>
              </div>
              <p className="text-xl font-bold text-purple-700">{summary.dividendYield.toFixed(2)}%</p>
            </div>

            <div className="bg-white dark:bg-slate-800 rounded-lg p-4 shadow-sm border border-gray-200 dark:border-slate-700 dark:border-slate-700">
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp className="size-4 text-indigo-600" />
                <h3 className="text-xs font-medium text-gray-600 dark:text-slate-300">IRR</h3>
              </div>
              <p className="text-xl font-bold text-indigo-700">{summary.irr.toFixed(2)}%</p>
            </div>

            <div className="bg-white dark:bg-slate-800 rounded-lg p-4 shadow-sm border border-gray-200 dark:border-slate-700 dark:border-slate-700">
              <div className="flex items-center gap-2 mb-2">
                <DollarSign className="size-4 text-teal-600 dark:text-teal-400" />
                <h3 className="text-xs font-medium text-gray-600 dark:text-slate-300">Total P/L</h3>
              </div>
              <p className={`text-xl font-bold ${summary.totalPL >= 0 ? 'text-emerald-700 dark:text-emerald-400' : 'text-red-700'}`}>
                {formatVND(summary.totalPL)}
              </p>
              <p className={`text-xs ${summary.totalPL >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
                {formatPercent(summary.totalPLPercent)}
              </p>
            </div>

            <div className="bg-white dark:bg-slate-800 rounded-lg p-4 shadow-sm border border-gray-200 dark:border-slate-700 dark:border-slate-700">
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp className="size-4 text-amber-600 dark:text-amber-400" />
                <h3 className="text-xs font-medium text-gray-600 dark:text-slate-300">Yield on Cost</h3>
              </div>
              <p className="text-xl font-bold text-amber-700 dark:text-amber-400">{summary.yieldOnCost.toFixed(2)}%</p>
            </div>
          </div>

          {/* Charts Row */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Safety Distribution - Clean & Focused */}
            <div className="bg-gradient-to-br from-blue-50 to-white rounded-lg p-6 shadow-sm border border-blue-100 hover:shadow-md transition-all">
              <div className="flex items-center justify-between mb-6">
                <h3 className="font-semibold text-gray-900 dark:text-white">Phân loại mức độ an toàn</h3>
              </div>

              <ResponsiveContainer width="100%" height={240}>
                <RechartsPie>
                  <Pie
                    data={safetyData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={90}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {safetyData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip 
                    formatter={(value: number) => formatVND(value)}
                    contentStyle={{ 
                      backgroundColor: 'rgba(255, 255, 255, 0.96)',
                      border: '1px solid #d1d5db',
                      borderRadius: '8px',
                      fontSize: '12px',
                      boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
                    }}
                  />
                </RechartsPie>
              </ResponsiveContainer>

              {/* Simplified Legend */}
              <div className="flex items-center justify-center gap-6 mt-4 text-xs">
                {safetyData.map((item, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded" style={{ backgroundColor: item.color }}></div>
                    <span className="text-gray-600 dark:text-slate-300">{item.name}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Asset Type Distribution - Clean & Focused with Link */}
            <div 
              className="bg-gradient-to-br from-purple-50 to-white rounded-lg p-6 shadow-sm border border-purple-100 hover:shadow-lg transition-all cursor-pointer group"
              onClick={() => setActiveTab('diversification')}
            >
              <div className="flex items-center justify-between mb-6">
                <h3 className="font-semibold text-gray-900 dark:text-white">Phân bổ theo loại tài sản</h3>
                <span className="text-xs text-purple-600 dark:text-purple-400 group-hover:text-purple-700 font-medium">
                  Xem chi tiết →
                </span>
              </div>

              {sectorData.length > 0 ? (
                <>
                  <ResponsiveContainer width="100%" height={240}>
                    <RechartsPie>
                      <Pie
                        data={sectorData}
                        cx="50%"
                        cy="50%"
                        outerRadius={90}
                        paddingAngle={3}
                        dataKey="value"
                      >
                        {sectorData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip 
                        formatter={(value: number) => [formatVND(value), 'Giá trị']}
                        contentStyle={{ 
                          backgroundColor: 'rgba(255, 255, 255, 0.96)',
                          border: '1px solid #d1d5db',
                          borderRadius: '8px',
                          fontSize: '12px',
                          boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
                        }}
                      />
                    </RechartsPie>
                  </ResponsiveContainer>

                  {/* Legend with percentages */}
                  <div className="flex flex-wrap items-center justify-center gap-3 mt-4 text-xs">
                    {sectorData.map((item, idx) => (
                      <div key={idx} className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded" style={{ backgroundColor: item.color }}></div>
                        <span className="text-gray-600 dark:text-slate-300">
                          {item.name} ({item.percentage.toFixed(1)}%)
                        </span>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <div className="h-[240px] flex items-center justify-center text-gray-400 dark:text-slate-500 text-sm">
                  Chưa có dữ liệu phân bổ
                </div>
              )}
            </div>

            {/* Passive Income History + Projection - Real data from DividendTab */}
            <div 
              className="bg-gradient-to-br from-emerald-50 to-white rounded-lg p-6 shadow-sm border border-emerald-100 hover:shadow-lg transition-all cursor-pointer group"
              onClick={() => setActiveTab('dividends')}
            >
              <div className="flex items-center justify-between mb-6">
                <h3 className="font-semibold text-gray-900 dark:text-white">Thu nhập thụ động</h3>
                <span className="text-xs text-emerald-600 dark:text-emerald-400 group-hover:text-emerald-700 dark:text-emerald-400 font-medium">
                  Xem chi tiết →
                </span>
              </div>

              <ResponsiveContainer width="100%" height={240}>
                <AreaChart data={growthData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="incomeGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#10b981" stopOpacity={0.2}/>
                      <stop offset="100%" stopColor="#10b981" stopOpacity={0.05}/>
                    </linearGradient>
                  </defs>

                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />

                  <XAxis
                    dataKey="year"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 11, fill: '#6b7280' }}
                    dy={5}
                  />

                  <YAxis
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 10, fill: '#6b7280' }}
                    width={60}
                    tickFormatter={(value: number) => {
                      if (value >= 1000000000) return `${(value / 1000000000).toFixed(1)}B`;
                      if (value >= 1000000) return `${(value / 1000000).toFixed(0)}M`;
                      return value.toString();
                    }}
                  />

                  <Tooltip
                    content={({ active, payload }) => {
                      if (!active || !payload?.length) return null;
                      const d = payload[0].payload as { year: number; income: number; confirmed: number; estimated: number; type: string };
                      const isProjected = d.type === 'projected';
                      return (
                        <div style={{
                          backgroundColor: '#ffffff',
                          border: '1px solid #e5e7eb',
                          borderRadius: '8px',
                          fontSize: '13px',
                          boxShadow: '0 4px 6px rgba(0,0,0,0.07)',
                          padding: '10px 14px',
                          minWidth: '210px',
                        }}>
                          <p style={{ fontWeight: 600, marginBottom: 8, color: '#111827' }}>
                            Năm {d.year}{isProjected ? ' — Dự kiến' : ''}
                          </p>
                          {!isProjected && (
                            <>
                              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 24, marginBottom: 4 }}>
                                <span style={{ color: '#6b7280' }}>Đã xác nhận</span>
                                <span style={{ fontWeight: 600, color: '#0ea5e9' }}>{formatVND(d.confirmed)}</span>
                              </div>
                              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 24, marginBottom: 8 }}>
                                <span style={{ color: '#6b7280' }}>Ước tính</span>
                                <span style={{ fontWeight: 600, color: '#93c5fd' }}>{formatVND(d.estimated)}</span>
                              </div>
                              <div style={{ borderTop: '1px solid #e5e7eb', paddingTop: 7, display: 'flex', justifyContent: 'space-between', gap: 24 }}>
                                <span style={{ color: '#374151', fontWeight: 500 }}>Tổng cộng</span>
                                <span style={{ fontWeight: 700, color: '#111827' }}>{formatVND(d.income)}</span>
                              </div>
                            </>
                          )}
                          {isProjected && (
                            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 24 }}>
                              <span style={{ color: '#6b7280' }}>Thu nhập dự kiến</span>
                              <span style={{ fontWeight: 600, color: '#93c5fd' }}>{formatVND(d.income)}</span>
                            </div>
                          )}
                        </div>
                      );
                    }}
                  />

                  <Area
                    type="monotone"
                    dataKey="income"
                    stroke="#10b981"
                    strokeWidth={2.5}
                    fill="url(#incomeGradient)"
                    dot={(props: any) => {
                      const { cx, cy, payload } = props;
                      if (!payload) return <g key={`dot-${cx}`} />;
                      if (payload.type === 'projected') {
                        return <circle key={`dot-${payload.year}`} cx={cx} cy={cy} r={5} fill="#fff" stroke="#059669" strokeWidth={2} />;
                      }
                      if (payload.type === 'current') {
                        return <circle key={`dot-${payload.year}`} cx={cx} cy={cy} r={5} fill="#10b981" stroke="#fff" strokeWidth={2} />;
                      }
                      return <g key={`dot-${cx}`} />;
                    }}
                    activeDot={{ r: 6, fill: '#10b981', stroke: '#fff', strokeWidth: 2 }}
                  />
                </AreaChart>
              </ResponsiveContainer>

              <div className="flex items-center justify-center gap-6 mt-4 text-xs">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-emerald-500"></div>
                  <span className="text-gray-600 dark:text-slate-300">Hiện tại</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-white border-2 border-emerald-700"></div>
                  <span className="text-gray-600 dark:text-slate-300">Dự kiến</span>
                </div>
              </div>
            </div>
          </div>

          {/* Holdings Table */}
          <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm dark:shadow-slate-900/40 border border-gray-200 dark:border-slate-700 dark:border-slate-700">
            <div className="p-6 border-b border-gray-200 dark:border-slate-700 dark:border-slate-700 flex items-center justify-between">
              <h2 className="font-semibold">Holdings</h2>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowColumnSettings(!showColumnSettings)}
                  className="px-3 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-800/50 transition-colors flex items-center gap-2"
                >
                  <Settings className="size-4" />
                  Columns
                </button>
              </div>
            </div>

            {showColumnSettings && (
              <div className="p-4 border-b border-gray-200 dark:border-slate-700 dark:border-slate-700 bg-gray-50 dark:bg-slate-950">
                <div className="flex flex-wrap gap-2">
                  {columns.map(col => (
                    <button
                      key={col.key}
                      onClick={() => toggleColumn(col.key)}
                      className={`px-3 py-1 text-sm rounded-lg border transition-colors flex items-center gap-2 ${
                        col.visible
                          ? 'bg-emerald-100 dark:bg-emerald-900/30 border-emerald-300 text-emerald-700 dark:text-emerald-400'
                          : 'bg-white border-gray-300 text-gray-600 dark:text-slate-300'
                      }`}
                    >
                      {col.visible ? <Eye className="size-3" /> : <EyeOff className="size-3" />}
                      {col.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 dark:bg-slate-800/50 border-b border-gray-200 dark:border-slate-700 dark:border-slate-700">
                  <tr>
                    {columns.filter(c => c.visible).map(col => (
                      <th key={col.key} className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-slate-400 uppercase tracking-wider">
                        {col.label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200 dark:divide-slate-700">
                  {holdings.map(holding => (
                    <tr key={holding.id} className="hover:bg-gray-50 dark:hover:bg-slate-800/50 transition-colors">
                      {columns.find(c => c.key === 'ticker')?.visible && (
                        <td className="px-6 py-4 whitespace-nowrap">
                          <Link to={`/stock/${holding.ticker}`} className="font-medium text-emerald-700 dark:text-emerald-400 hover:text-emerald-800">
                            {holding.ticker}
                          </Link>
                        </td>
                      )}
                      {columns.find(c => c.key === 'name')?.visible && (
                        <td className="px-6 py-4 whitespace-nowrap text-sm">{holding.name}</td>
                      )}
                      {columns.find(c => c.key === 'sector')?.visible && (
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-slate-300">{holding.sector}</td>
                      )}
                      {columns.find(c => c.key === 'shares')?.visible && (
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-right">{holding.shares.toLocaleString('vi-VN')}</td>
                      )}
                      {columns.find(c => c.key === 'avgPrice')?.visible && (
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-right">{formatVND(holding.avgBuyPrice)}</td>
                      )}
                      {columns.find(c => c.key === 'currentPrice')?.visible && (
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-right">{formatVND(holding.currentPrice)}</td>
                      )}
                      {columns.find(c => c.key === 'value')?.visible && (
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-medium">{formatVND(holding.currentValue)}</td>
                      )}
                      {columns.find(c => c.key === 'safety')?.visible && (
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2 py-1 text-xs font-medium rounded-full ${getSafetyColorByScore(holding.dividendSafetyScore)}`}>
                            {getSafetyLabelByScore(holding.dividendSafetyScore)}
                          </span>
                        </td>
                      )}
                      {columns.find(c => c.key === 'yield')?.visible && (
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-medium text-emerald-600 dark:text-emerald-400">
                          {holding.dividendYield.toFixed(1)}%
                        </td>
                      )}
                      {columns.find(c => c.key === 'annualIncome')?.visible && (
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-medium text-emerald-700 dark:text-emerald-400">
                          {formatVND(holding.annualIncome)}
                        </td>
                      )}
                      {columns.find(c => c.key === 'profitLoss')?.visible && (
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-right">
                          <div className={`font-medium ${holding.profitLoss >= 0 ? 'text-emerald-700 dark:text-emerald-400' : 'text-red-700'}`}>
                            {formatVND(holding.profitLoss)}
                          </div>
                          <div className={`text-xs ${holding.profitLoss >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
                            {formatPercent(holding.profitLossPercent)}
                          </div>
                        </td>
                      )}
                      {columns.find(c => c.key === 'actions')?.visible && (
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-right">
                          <button
                            onClick={() => handleDeleteHolding(holding.id)}
                            className="text-red-600 dark:text-red-400 hover:text-red-800 transition-colors p-2 hover:bg-red-50 dark:bg-red-900/20 rounded"
                            title="Xóa tài sản"
                          >
                            <Trash2 className="size-4" />
                          </button>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Empty State - No Holdings */}
            {holdings.length === 0 && (
              <div className="text-center py-12">
                <Plus className="size-12 text-gray-400 dark:text-slate-500 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                  Chưa có tài sản nào
                </h3>
                <p className="text-gray-600 dark:text-slate-300 mb-4">
                  Thêm tài sản đầu tiên vào danh mục của bạn
                </p>
                <button
                  onClick={() => setActiveTab('add-transaction')}
                  className="px-6 py-3 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors font-medium inline-flex items-center gap-2"
                >
                  <Plus className="size-5" />
                  Thêm tài sản
                </button>
              </div>
            )}
          </div>
        </>
      ) : activeTab === 'dividends' ? (
        <DividendTab
          portfolioCurrentValue={summary.totalValue}
          portfolioCost={summary.totalValue - summary.totalPL}
        />
      ) : activeTab === 'calendar' ? (
        <CalendarTab />
      ) : activeTab === 'diversification' ? (
        <DiversificationTab holdings={holdings} />
      ) : activeTab === 'performance' ? (
        <PerformanceTab holdings={holdings} />
      ) : activeTab === 'transactions' ? (
        <TransactionsTab />
      ) : (
        <AddTransactionWidget onSuccess={fetchData} />
      )}

      {/* Close main conditional render */}
      </>
      )}
    </div>
  );
}