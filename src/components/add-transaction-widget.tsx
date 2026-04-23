import { useState, useCallback } from 'react';
import { Plus, Upload, TrendingUp, Landmark, Boxes, Loader2 } from 'lucide-react';
import { searchStocks } from '../lib/services/stocks-service';
import { formatVND } from '../lib/utils';
import { DatePicker } from './date-picker';
import { CustomDropdown } from './custom-dropdown';
import { CustomSelect } from './custom-select';
import { supabase } from '../lib/supabase/client';

// Alias to bypass outdated generated types
const db = supabase as any;

interface TransactionRow {
  id: string;
  assetCategory: 'tradable' | 'fixed-income' | 'custom';
  assetType: 'stock' | 'fund' | 'gold' | 'crypto' | 'deposit' | 'bond' | 'custom';
  
  // Common fields
  date: string;
  
  // Tradable assets (stock, fund, gold, crypto)
  ticker?: string;
  name?: string;
  type?: 'BUY' | 'SELL';
  shares?: string;
  price?: string;
  fee?: string;
  
  // Fixed income (deposit, bond)
  issuer?: string;
  assetCodeFI?: string; // Asset code for fixed income
  faceValue?: string;
  interestRate?: string;
  maturityDate?: string;
  
  // Custom assets
  assetName?: string;
  assetCode?: string;
  principalValue?: string;
  income?: string;
  paymentFrequency?: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly';
}

const assetCategoryOptions = [
  { value: 'tradable', label: 'Cổ phiếu/Quỹ/Vàng/Crypto' },
  { value: 'fixed-income', label: 'Tiền gửi/Trái phiếu' },
  { value: 'custom', label: 'Tài sản tùy chỉnh' }
];

const tradableAssetTypes = [
  { value: 'stock', label: 'Cổ phiếu' },
  { value: 'fund', label: 'Quỹ đầu tư' },
  { value: 'gold', label: 'Vàng' },
  { value: 'crypto', label: 'Crypto' }
];

const fixedIncomeTypes = [
  { value: 'deposit', label: 'Tiền gửi' },
  { value: 'bond', label: 'Trái phiếu' }
];

const paymentFrequencyOptions = [
  { value: 'daily', label: 'Ngày' },
  { value: 'weekly', label: 'Tuần' },
  { value: 'monthly', label: 'Tháng' },
  { value: 'quarterly', label: 'Quý' },
  { value: 'yearly', label: 'Năm' }
];

const otherAssets = {
  fund: [
    { id: 'f1', ticker: 'VCBF-BCF', name: 'Quỹ Cân bằng Vietcombank' },
    { id: 'f2', ticker: 'VCBF-MGF', name: 'Quỹ Tăng trưởng Vietcombank' },
    { id: 'f3', ticker: 'DCDS', name: 'Quỹ Cổ phiếu Dragon Capital' }
  ],
  gold: [
    { id: 'g1', ticker: 'SJC', name: 'Vàng SJC' },
    { id: 'g2', ticker: 'PNJ', name: 'Vàng PNJ' },
    { id: 'g3', ticker: 'DOJI', name: 'Vàng DOJI' }
  ],
  crypto: [
    { id: 'c1', ticker: 'BTC', name: 'Bitcoin' },
    { id: 'c2', ticker: 'ETH', name: 'Ethereum' },
    { id: 'c3', ticker: 'BNB', name: 'Binance Coin' },
    { id: 'c4', ticker: 'USDT', name: 'Tether' }
  ]
};

const RESET_ROW = (): TransactionRow => ({
  id: Date.now().toString(),
  assetCategory: 'tradable',
  assetType: 'stock',
  ticker: '',
  name: '',
  type: 'BUY',
  date: new Date().toISOString().split('T')[0],
  shares: '',
  price: '',
  fee: '0.15',
});

export function AddTransactionWidget({ onSuccess }: { onSuccess?: () => void }) {
  const [activeTab, setActiveTab] = useState<'manual' | 'csv'>('manual');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [rows, setRows] = useState<TransactionRow[]>([
    {
      id: '1',
      assetCategory: 'tradable',
      assetType: 'stock',
      ticker: '',
      name: '',
      type: 'BUY',
      date: new Date().toISOString().split('T')[0],
      shares: '',
      price: '',
      fee: '0.15'
    }
  ]);
  const [activeSuggestionRow, setActiveSuggestionRow] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<Record<string, { ticker: string; name: string }[]>>({});

  const fetchSuggestions = useCallback(async (rowId: string, assetType: string, query: string) => {
    if (!query || query.length < 1) {
      setSuggestions(prev => ({ ...prev, [rowId]: [] }));
      return;
    }
    const lowerQuery = query.toLowerCase();
    try {
      if (assetType === 'stock' || assetType === 'fund') {
        const results = await searchStocks(query);
        setSuggestions(prev => ({
          ...prev,
          [rowId]: results.slice(0, 5).map(s => ({ ticker: s.ticker, name: s.name })),
        }));
      } else if (assetType === 'gold') {
        const { data } = await db
          .from('market_data_gold')
          .select('symbol, name')
          .or(`symbol.ilike.%${query}%,name.ilike.%${query}%`)
          .limit(5);
        setSuggestions(prev => ({
          ...prev,
          [rowId]: (data || []).map((r: any) => ({ ticker: r.symbol, name: r.name })),
        }));
      } else if (assetType === 'crypto') {
        const { data } = await db
          .from('market_data_crypto')
          .select('symbol, name')
          .or(`symbol.ilike.%${query}%,name.ilike.%${query}%`)
          .limit(5);
        setSuggestions(prev => ({
          ...prev,
          [rowId]: (data || []).map((r: any) => ({ ticker: r.symbol, name: r.name })),
        }));
      } else {
        // fallback: filter local list
        const local = otherAssets[assetType as keyof typeof otherAssets] || [];
        setSuggestions(prev => ({
          ...prev,
          [rowId]: local
            .filter(a =>
              a.ticker.toLowerCase().includes(lowerQuery) ||
              a.name.toLowerCase().includes(lowerQuery)
            )
            .slice(0, 5),
        }));
      }
    } catch {
      setSuggestions(prev => ({ ...prev, [rowId]: [] }));
    }
  }, []);

  const addNewRow = () => {
    setRows(prev => [...prev, RESET_ROW()]);
  };

  const updateRow = (id: string, field: keyof TransactionRow, value: any) => {
    setRows(rows.map(row => {
      if (row.id === id) {
        const updated = { ...row, [field]: value };
        
        // When category changes, reset fields
        if (field === 'assetCategory') {
          if (value === 'tradable') {
            return {
              id: row.id,
              assetCategory: 'tradable',
              assetType: 'stock',
              ticker: '',
              name: '',
              type: 'BUY',
              date: row.date,
              shares: '',
              price: '',
              fee: '0.15'
            };
          } else if (value === 'fixed-income') {
            return {
              id: row.id,
              assetCategory: 'fixed-income',
              assetType: 'deposit',
              date: row.date,
              issuer: '',
              assetCodeFI: '',
              faceValue: '',
              interestRate: '',
              maturityDate: ''
            };
          } else if (value === 'custom') {
            return {
              id: row.id,
              assetCategory: 'custom',
              assetType: 'custom',
              date: row.date,
              assetName: '',
              assetCode: '',
              principalValue: '',
              income: '',
              paymentFrequency: 'monthly',
              maturityDate: ''
            };
          }
        }
        
        // When asset type changes within tradable
        if (field === 'assetType' && row.assetCategory === 'tradable') {
          updated.ticker = '';
          updated.name = '';
          // Clear suggestions for this row
          setSuggestions(prev => ({ ...prev, [row.id]: [] }));
        }
        
        return updated;
      }
      return row;
    }));
  };

  const selectSuggestion = (id: string, ticker: string, name: string) => {
    updateRow(id, 'ticker', ticker);
    updateRow(id, 'name', name);
    setActiveSuggestionRow(null);
    setSuggestions(prev => ({ ...prev, [id]: [] }));
  };

  const calculateFee = (shares: string, price: string, feePercent: string) => {
    const s = parseFloat(shares) || 0;
    const p = parseFloat(price) || 0;
    const f = parseFloat(feePercent) || 0;
    return (s * p * f / 100);
  };

  const calculateTotal = (row: TransactionRow) => {
    if (row.assetCategory === 'tradable') {
      const shares = parseFloat(row.shares || '0') || 0;
      const price = parseFloat(row.price || '0') || 0;
      const fee = calculateFee(row.shares || '0', row.price || '0', row.fee || '0');
      const subtotal = shares * price;
      return row.type === 'BUY' ? subtotal + fee : subtotal - fee;
    }
    return 0;
  };

  const handleSubmit = async () => {
    const validRows = rows.filter(row => {
      if (row.assetCategory === 'tradable') {
        return row.ticker && row.shares && row.price && row.date;
      } else if (row.assetCategory === 'fixed-income') {
        return row.issuer && row.faceValue && row.interestRate && row.date && row.maturityDate;
      } else if (row.assetCategory === 'custom') {
        return row.assetName && row.principalValue && row.date;
      }
      return false;
    });

    if (validRows.length === 0) {
      alert('Vui lòng điền đầy đủ thông tin cho ít nhất 1 giao dịch');
      return;
    }

    try {
      setIsSubmitting(true);
      setSubmitError(null);

      // Get current user + default portfolio
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Chưa đăng nhập');

      const { data: portfolios, error: pErr } = await db
        .from('portfolios')
        .select('id')
        .eq('user_id', user.id)
        .order('is_default', { ascending: false })
        .order('created_at', { ascending: false })
        .limit(1);

      if (pErr) throw pErr;
      if (!portfolios || portfolios.length === 0) throw new Error('Chưa có danh mục. Hãy tạo danh mục trước.');

      const portfolioId = (portfolios[0] as any).id;

      for (const row of validRows) {
        if (row.assetCategory === 'tradable' && (row.assetType === 'stock' || row.assetType === 'fund')) {
          // ── STOCK / FUND ──────────────────────────────────────────
          const symbol = row.ticker!.toUpperCase();
          const qty = parseFloat(row.shares!);
          const price = parseFloat(row.price!);
          const feeAmt = calculateFee(row.shares!, row.price!, row.fee || '0');
          const txnType = (row.type === 'BUY' ? 'buy' : 'sell') as 'buy' | 'sell';

          // Upsert into stocks_assets (UNIQUE portfolio_id + symbol)
          const { data: existingAsset } = await db
            .from('stocks_assets')
            .select('id, quantity, average_cost')
            .eq('portfolio_id', portfolioId)
            .eq('symbol', symbol)
            .maybeSingle();

          let assetId: string;

          if (existingAsset) {
            // Update average cost & quantity
            const existingQty = Number((existingAsset as any).quantity);
            const existingAvg = Number((existingAsset as any).average_cost);
            let newQty: number;
            let newAvg: number;

            if (txnType === 'buy') {
              newQty = existingQty + qty;
              newAvg = ((existingAvg * existingQty) + (price * qty)) / newQty;
            } else {
              newQty = Math.max(0, existingQty - qty);
              newAvg = existingAvg; // avg cost unchanged on sell
            }

            const { error: uErr } = await db
              .from('stocks_assets')
              .update({ quantity: newQty, average_cost: newAvg, updated_at: new Date().toISOString() })
              .eq('id', (existingAsset as any).id);
            if (uErr) throw uErr;
            assetId = (existingAsset as any).id;
          } else {
            if (txnType === 'sell') throw new Error(`Không thể bán ${symbol} — chưa có trong danh mục`);
            const { data: newAsset, error: iErr } = await db
              .from('stocks_assets')
              .insert({ portfolio_id: portfolioId, user_id: user.id, symbol, quantity: qty, average_cost: price })
              .select('id')
              .single();
            if (iErr) throw iErr;
            assetId = (newAsset as any).id;
          }

          // Insert into stocks_transactions
          const { error: txnErr } = await db
            .from('stocks_transactions')
            .insert({
              asset_id: assetId,
              transaction_type: txnType,
              quantity: qty,
              price_per_unit: price,
              fee_percent: parseFloat(row.fee || '0') / 100,
              fee_amount: feeAmt,
              transaction_date: row.date,
            });
          if (txnErr) throw txnErr;

        } else if (row.assetCategory === 'tradable' && row.assetType === 'gold') {
          // ── GOLD ──────────────────────────────────────────────────
          const symbol = row.ticker!.toUpperCase();
          const qty = parseFloat(row.shares!);
          const price = parseFloat(row.price!);
          const feeAmt = calculateFee(row.shares!, row.price!, row.fee || '0');
          const txnType = (row.type === 'BUY' ? 'buy' : 'sell') as 'buy' | 'sell';

          // Đảm bảo row market_data_gold tồn tại (FK requirement).
          // Kiểm tra trước, chỉ insert nếu chưa có để tránh lỗi RLS update.
          const { data: existingGoldMkt } = await db
            .from('market_data_gold')
            .select('symbol')
            .eq('symbol', symbol)
            .maybeSingle();

          if (!existingGoldMkt) {
            const { error: mktErr } = await db.from('market_data_gold').insert({
              symbol,
              name: row.name || symbol,
              current_price_buy: price,
              current_price_sell: price,
            });
            if (mktErr) throw new Error(`Không thể tạo market data cho ${symbol}: ${mktErr.message}`);
          }

          const { data: existingAsset } = await db
            .from('gold_assets')
            .select('id, quantity, average_cost')
            .eq('portfolio_id', portfolioId)
            .eq('symbol', symbol)
            .maybeSingle();

          let assetId: string;

          if (existingAsset) {
            const existingQty = Number((existingAsset as any).quantity);
            const existingAvg = Number((existingAsset as any).average_cost);
            const newQty = txnType === 'buy' ? existingQty + qty : Math.max(0, existingQty - qty);
            const newAvg = txnType === 'buy'
              ? ((existingAvg * existingQty) + (price * qty)) / (existingQty + qty)
              : existingAvg;
            const { error: uErr } = await db.from('gold_assets')
              .update({ quantity: newQty, average_cost: newAvg, updated_at: new Date().toISOString() })
              .eq('id', (existingAsset as any).id);
            if (uErr) throw uErr;
            assetId = (existingAsset as any).id;
          } else {
            if (txnType === 'sell') throw new Error(`Không thể bán ${symbol} — chưa có trong danh mục`);
            const { data: newAsset, error: iErr } = await db
              .from('gold_assets')
              .insert({ portfolio_id: portfolioId, user_id: user.id, symbol, quantity: qty, average_cost: price })
              .select('id').single();
            if (iErr) throw iErr;
            assetId = (newAsset as any).id;
          }

          const { error: gtErr } = await db.from('gold_transactions').insert({
            asset_id: assetId, transaction_type: txnType,
            quantity: qty, price_per_unit: price,
            fee_percent: parseFloat(row.fee || '0') / 100,
            fee_amount: feeAmt, transaction_date: row.date,
          });
          if (gtErr) throw gtErr;

        } else if (row.assetCategory === 'tradable' && row.assetType === 'crypto') {
          // ── CRYPTO ────────────────────────────────────────────────
          const symbol = row.ticker!.toUpperCase();
          const qty = parseFloat(row.shares!);
          const price = parseFloat(row.price!);
          const feeAmt = calculateFee(row.shares!, row.price!, row.fee || '0');
          const txnType = (row.type === 'BUY' ? 'buy' : 'sell') as 'buy' | 'sell';

          // Đảm bảo row market_data_crypto tồn tại (FK requirement).
          const { data: existingCryptoMkt } = await db
            .from('market_data_crypto')
            .select('symbol')
            .eq('symbol', symbol)
            .maybeSingle();

          if (!existingCryptoMkt) {
            const { error: mktErr } = await db.from('market_data_crypto').insert({
              symbol,
              name: row.name || symbol,
              current_price: price,
            });
            if (mktErr) throw new Error(`Không thể tạo market data cho ${symbol}: ${mktErr.message}`);
          }

          // Query crypto_assets — storage_location is nullable, so NULL != NULL in UNIQUE constraint.
          // Always filter with IS NULL explicitly to avoid duplicate row issues.
          const { data: cryptoAssetRows } = await db
            .from('crypto_assets')
            .select('id, quantity, average_cost')
            .eq('portfolio_id', portfolioId)
            .eq('symbol', symbol)
            .is('storage_location', null)
            .limit(1);

          const existingAsset = cryptoAssetRows && cryptoAssetRows.length > 0 ? cryptoAssetRows[0] : null;

          let assetId: string;

          if (existingAsset) {
            const existingQty = Number((existingAsset as any).quantity);
            const existingAvg = Number((existingAsset as any).average_cost);
            const newQty = txnType === 'buy' ? existingQty + qty : Math.max(0, existingQty - qty);
            const newAvg = txnType === 'buy'
              ? ((existingAvg * existingQty) + (price * qty)) / (existingQty + qty)
              : existingAvg;
            await db.from('crypto_assets')
              .update({ quantity: newQty, average_cost: newAvg, updated_at: new Date().toISOString() })
              .eq('id', (existingAsset as any).id);
            assetId = (existingAsset as any).id;
          } else {
            if (txnType === 'sell') throw new Error(`Không thể bán ${symbol} — chưa có trong danh mục`);
            const { data: newAsset, error: iErr } = await db
              .from('crypto_assets')
              .insert({ portfolio_id: portfolioId, user_id: user.id, symbol, quantity: qty, average_cost: price })
              .select('id').single();
            if (iErr) throw iErr;
            assetId = (newAsset as any).id;
          }

          const { error: ctErr } = await db.from('crypto_transactions').insert({
            asset_id: assetId, transaction_type: txnType,
            quantity: qty, price_per_unit: price,
            fee_percent: parseFloat(row.fee || '0') / 100,
            fee_amount: feeAmt, transaction_date: row.date,
          });
          if (ctErr) throw ctErr;

        } else if (row.assetCategory === 'fixed-income') {
          // ── FIXED INCOME (deposit / bond) ─────────────────────────
          const { error: iErr } = await db.from('fixed_income_assets').insert({
            portfolio_id: portfolioId,
            user_id: user.id,
            issuer_name: row.issuer!,
            symbol: row.assetCodeFI || null,
            principal_amount: parseFloat(row.faceValue!),
            interest_rate: parseFloat(row.interestRate!),
            transaction_date: row.date,
            maturity_date: row.maturityDate || null,
            status: 'active',
          });
          if (iErr) throw iErr;

        } else if (row.assetCategory === 'custom') {
          // ── CUSTOM ASSET ──────────────────────────────────────────
          const { error: iErr } = await db.from('custom_assets').insert({
            portfolio_id: portfolioId,
            user_id: user.id,
            asset_name: row.assetName!,
            symbol: row.assetCode || null,
            principal_value: parseFloat(row.principalValue!),
            income_amount: row.income ? parseFloat(row.income) : 0,
            payment_frequency: row.income && parseFloat(row.income) > 0 ? row.paymentFrequency : null,
            transaction_date: row.date,
            maturity_date: row.maturityDate || null,
            status: 'active',
          });
          if (iErr) throw iErr;
        }
      }

      // Reset form
      setRows([RESET_ROW()]);
      onSuccess?.();
    } catch (err: any) {
      console.error('Submit error:', err);
      setSubmitError(err.message || 'Không thể lưu giao dịch. Vui lòng thử lại.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200">
      <div className="p-6 border-b border-gray-200">
        <h2 className="font-semibold mb-1">Thêm giao dịch</h2>
        <p className="text-sm text-gray-600">Nhập thông tin tài sản đầu tư của bạn</p>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <div className="flex gap-6 px-6">
          <button
            onClick={() => setActiveTab('manual')}
            className={`py-3 px-2 border-b-2 font-medium text-sm transition-colors ${
              activeTab === 'manual'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            Add manually
          </button>
          <button
            onClick={() => setActiveTab('csv')}
            className={`py-3 px-2 border-b-2 font-medium text-sm transition-colors ${
              activeTab === 'csv'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            Bulk upload (.CSV)
          </button>
        </div>
      </div>

      {activeTab === 'manual' ? (
        <div className="p-6">
          {/* Compact Table Layout */}
          <div className="space-y-3">
            {rows.map((row) => {
              const rowSuggestions = activeSuggestionRow === row.id && row.assetCategory === 'tradable'
                ? (suggestions[row.id] || [])
                : [];
              const fee = row.assetCategory === 'tradable' ? calculateFee(row.shares || '0', row.price || '0', row.fee || '0') : 0;
              const total = calculateTotal(row);

              return (
                <div key={row.id} className="border border-gray-200 rounded-lg p-4">
                  {/* Asset Category Selector */}
                  <div className="mb-4">
                    <label className="block text-xs font-medium text-gray-500 mb-1 uppercase">Loại tài sản</label>
                    <CustomDropdown
                      value={row.assetCategory}
                      onChange={(value) => updateRow(row.id, 'assetCategory', value)}
                      options={[
                        { 
                          value: 'tradable', 
                          label: 'Cổ phiếu/Quỹ/Vàng/Crypto',
                          icon: <TrendingUp className="size-5" />
                        },
                        { 
                          value: 'fixed-income', 
                          label: 'Tiền gửi/Trái phiếu',
                          icon: <Landmark className="size-5" />
                        },
                        { 
                          value: 'custom', 
                          label: 'Tài sản tùy chỉnh',
                          icon: <Boxes className="size-5" />
                        }
                      ]}
                      className="w-full md:w-1/2 lg:w-1/3"
                    />
                  </div>

                  {/* Tradable Assets Form */}
                  {row.assetCategory === 'tradable' && (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                      {/* Asset Sub-type Selector */}
                      <div>
                        <label className="block text-xs font-medium text-gray-500 mb-1 uppercase">Loại</label>
                        <div className="flex gap-1 flex-wrap">
                          {tradableAssetTypes.map(opt => (
                            <button
                              key={opt.value}
                              type="button"
                              onClick={() => updateRow(row.id, 'assetType', opt.value)}
                              className={`px-3 py-2 text-xs font-medium rounded-lg border transition-colors ${
                                row.assetType === opt.value
                                  ? 'bg-blue-600 text-white border-blue-600'
                                  : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'
                              }`}
                            >
                              {opt.label}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Ticker */}
                      <div className="relative">
                        <label className="block text-xs font-medium text-gray-500 mb-1 uppercase">Mã tài sản</label>
                        <input
                          type="text"
                          placeholder={
                            row.assetType === 'gold' ? 'SJC_BUY, SJC_SELL...' :
                            row.assetType === 'crypto' ? 'BTC, ETH, BNB...' :
                            row.assetType === 'fund' ? 'VCBF-BCF...' :
                            'VNM, FPT...'
                          }
                          value={row.ticker}
                          onChange={(e) => {
                            const upper = e.target.value.toUpperCase();
                            updateRow(row.id, 'ticker', upper);
                            setActiveSuggestionRow(row.id);
                            fetchSuggestions(row.id, row.assetType, upper);
                          }}
                          onFocus={() => {
                            setActiveSuggestionRow(row.id);
                            if (row.ticker) fetchSuggestions(row.id, row.assetType, row.ticker);
                          }}
                          onBlur={() => {
                            setTimeout(() => setActiveSuggestionRow(null), 200);
                          }}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                        
                        {rowSuggestions.length > 0 && (
                          <div className="absolute z-20 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                            {rowSuggestions.map((s, idx) => (
                              <button
                                key={idx}
                                onMouseDown={(e) => {
                                  e.preventDefault();
                                  selectSuggestion(row.id, s.ticker, s.name);
                                }}
                                className="w-full px-3 py-2 text-left hover:bg-gray-50 transition-colors border-b border-gray-100 last:border-b-0"
                              >
                                <div className="font-medium text-sm text-emerald-700">{s.ticker}</div>
                                <div className="text-xs text-gray-600">{s.name}</div>
                              </button>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Name */}
                      <div>
                        <label className="block text-xs font-medium text-gray-500 mb-1 uppercase">Tên tài sản</label>
                        <input
                          type="text"
                          placeholder="Tên tài sản"
                          value={row.name}
                          onChange={(e) => updateRow(row.id, 'name', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>

                      {/* Type (Buy/Sell) */}
                      <div>
                        <label className="block text-xs font-medium text-gray-500 mb-1 uppercase">Loại GD</label>
                        <div className="flex gap-2">
                          <button
                            onClick={() => updateRow(row.id, 'type', 'BUY')}
                            className={`flex-1 px-3 py-2 text-xs font-medium rounded-lg transition-colors ${
                              row.type === 'BUY'
                                ? 'bg-emerald-600 text-white'
                                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                            }`}
                          >
                            Mua
                          </button>
                          <button
                            onClick={() => updateRow(row.id, 'type', 'SELL')}
                            className={`flex-1 px-3 py-2 text-xs font-medium rounded-lg transition-colors ${
                              row.type === 'SELL'
                                ? 'bg-red-600 text-white'
                                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                            }`}
                          >
                            Bán
                          </button>
                        </div>
                      </div>

                      {/* Date */}
                      <div>
                        <label className="block text-xs font-medium text-gray-500 mb-1 uppercase">Ngày giao dịch</label>
                        <DatePicker
                          value={row.date}
                          onChange={(date) => updateRow(row.id, 'date', date)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>

                      {/* Shares */}
                      <div>
                        <label className="block text-xs font-medium text-gray-500 mb-1 uppercase">Khối lượng</label>
                        <input
                          type="number"
                          placeholder="100"
                          value={row.shares}
                          onChange={(e) => updateRow(row.id, 'shares', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>

                      {/* Price */}
                      <div>
                        <label className="block text-xs font-medium text-gray-500 mb-1 uppercase">Giá khớp</label>
                        <input
                          type="number"
                          placeholder="11000"
                          value={row.price}
                          onChange={(e) => updateRow(row.id, 'price', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>

                      {/* Fee */}
                      <div>
                        <label className="block text-xs font-medium text-gray-500 mb-1 uppercase">Phí (%)</label>
                        <input
                          type="number"
                          step="0.01"
                          value={row.fee}
                          onChange={(e) => updateRow(row.id, 'fee', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                    </div>
                  )}

                  {/* Fixed Income Form */}
                  {row.assetCategory === 'fixed-income' && (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {/* Asset Name (Issuer) */}
                      <div>
                        <label className="block text-xs font-medium text-gray-500 mb-1 uppercase">Tên tài sản (Tổ chức phát hành)</label>
                        <input
                          type="text"
                          placeholder="Vietcombank, Chính phủ..."
                          value={row.issuer}
                          onChange={(e) => updateRow(row.id, 'issuer', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>

                      {/* Asset Code */}
                      <div>
                        <label className="block text-xs font-medium text-gray-500 mb-1 uppercase">Mã tài sản</label>
                        <input
                          type="text"
                          placeholder="FI-001, FI-002..."
                          value={row.assetCodeFI}
                          onChange={(e) => updateRow(row.id, 'assetCodeFI', e.target.value.toUpperCase())}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>

                      {/* Face Value */}
                      <div>
                        <label className="block text-xs font-medium text-gray-500 mb-1 uppercase">Mệnh giá</label>
                        <input
                          type="number"
                          placeholder="100000000"
                          value={row.faceValue}
                          onChange={(e) => updateRow(row.id, 'faceValue', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>

                      {/* Interest Rate */}
                      <div>
                        <label className="block text-xs font-medium text-gray-500 mb-1 uppercase">Lãi suất (%/năm)</label>
                        <input
                          type="number"
                          step="0.01"
                          placeholder="6.5"
                          value={row.interestRate}
                          onChange={(e) => updateRow(row.id, 'interestRate', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>

                      {/* Transaction Date */}
                      <div>
                        <label className="block text-xs font-medium text-gray-500 mb-1 uppercase">Ngày giao dịch</label>
                        <DatePicker
                          value={row.date}
                          onChange={(date) => updateRow(row.id, 'date', date)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>

                      {/* Maturity Date */}
                      <div>
                        <label className="block text-xs font-medium text-gray-500 mb-1 uppercase">Ngày đáo hạn</label>
                        <DatePicker
                          value={row.maturityDate || ''}
                          onChange={(date) => updateRow(row.id, 'maturityDate', date)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                    </div>
                  )}

                  {/* Custom Assets Form */}
                  {row.assetCategory === 'custom' && (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {/* Asset Name */}
                      <div>
                        <label className="block text-xs font-medium text-gray-500 mb-1 uppercase">Tên tài sản</label>
                        <input
                          type="text"
                          placeholder="Bất động sản, Xe ô tô..."
                          value={row.assetName}
                          onChange={(e) => updateRow(row.id, 'assetName', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>

                      {/* Asset Code */}
                      <div>
                        <label className="block text-xs font-medium text-gray-500 mb-1 uppercase">Mã tài sản</label>
                        <input
                          type="text"
                          placeholder="BDS-001, XE-001..."
                          value={row.assetCode}
                          onChange={(e) => updateRow(row.id, 'assetCode', e.target.value.toUpperCase())}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>

                      {/* Principal Value */}
                      <div>
                        <label className="block text-xs font-medium text-gray-500 mb-1 uppercase">Giá trị gốc</label>
                        <input
                          type="number"
                          placeholder="2000000000"
                          value={row.principalValue}
                          onChange={(e) => updateRow(row.id, 'principalValue', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>

                      {/* Income */}
                      <div>
                        <label className="block text-xs font-medium text-gray-500 mb-1 uppercase">Thu nhập</label>
                        <input
                          type="number"
                          placeholder="10000000"
                          value={row.income}
                          onChange={(e) => updateRow(row.id, 'income', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>

                      {/* Payment Frequency */}
                      <div>
                        <label className="block text-xs font-medium text-gray-500 mb-1 uppercase">Tần suất thanh toán</label>
                        <CustomSelect
                          value={row.paymentFrequency || 'monthly'}
                          onChange={(value) => updateRow(row.id, 'paymentFrequency', value)}
                          options={paymentFrequencyOptions}
                        />
                      </div>

                      {/* Transaction Date */}
                      <div>
                        <label className="block text-xs font-medium text-gray-500 mb-1 uppercase">Ngày giao dịch</label>
                        <DatePicker
                          value={row.date}
                          onChange={(date) => updateRow(row.id, 'date', date)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>

                      {/* Maturity Date */}
                      <div>
                        <label className="block text-xs font-medium text-gray-500 mb-1 uppercase">Ngày đáo hạn</label>
                        <DatePicker
                          value={row.maturityDate || ''}
                          onChange={(date) => updateRow(row.id, 'maturityDate', date)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                    </div>
                  )}

                  {/* Summary for Tradable Assets */}
                  {row.assetCategory === 'tradable' && (row.shares && row.price) && (
                    <div className="mt-3 pt-3 border-t border-gray-100 text-sm text-gray-700">
                      Phí: {formatVND(fee)} đ | Tổng: <span className="font-semibold">{formatVND(total)} đ</span>
                    </div>
                  )}

                  {/* Summary for Fixed Income */}
                  {row.assetCategory === 'fixed-income' && row.faceValue && row.interestRate && (
                    <div className="mt-3 pt-3 border-t border-gray-100 text-sm text-gray-700">
                      Lãi hàng năm: <span className="font-semibold">{formatVND(parseFloat(row.faceValue) * parseFloat(row.interestRate) / 100)} đ</span>
                    </div>
                  )}

                  {/* Summary for Custom Assets */}
                  {row.assetCategory === 'custom' && row.principalValue && (
                    <div className="mt-3 pt-3 border-t border-gray-100 text-sm text-gray-700">
                      Giá trị gốc: <span className="font-semibold">{formatVND(parseFloat(row.principalValue))} đ</span>
                      {row.income && ` | Thu nhập: ${formatVND(parseFloat(row.income))} đ`}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Add New Line */}
          <button
            onClick={addNewRow}
            className="mt-4 px-4 py-2 text-sm text-blue-600 hover:text-blue-700 font-medium flex items-center gap-2"
          >
            <Plus className="size-4" />
            Add new line
          </button>

          {/* Footer */}
          <div className="mt-6 pt-4 border-t border-gray-200 space-y-3">
            {submitError && (
              <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-2 text-sm text-red-700">
                {submitError}
              </div>
            )}
            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-500">
                {rows.filter(r => {
                  if (r.assetCategory === 'tradable') return r.ticker && r.shares && r.price;
                  if (r.assetCategory === 'fixed-income') return r.issuer && r.faceValue && r.interestRate;
                  if (r.assetCategory === 'custom') return r.assetName && r.principalValue;
                  return false;
                }).length} / {rows.length} giao dịch với thông tin đầy đủ
              </div>
              <button
                onClick={handleSubmit}
                disabled={isSubmitting}
                className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-60 transition-colors font-medium text-sm"
              >
                {isSubmitting && <Loader2 className="size-4 animate-spin" />}
                {isSubmitting ? 'Đang lưu...' : 'Lưu giao dịch'}
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="p-12 text-center">
          <Upload className="size-12 text-gray-300 mx-auto mb-4" />
          <h3 className="font-semibold mb-2">Upload CSV File</h3>
          <p className="text-sm text-gray-600 mb-4">
            Tải lên file CSV chứa thông tin giao dịch của bạn
          </p>
          <input
            type="file"
            accept=".csv"
            className="hidden"
            id="csv-upload"
          />
          <label
            htmlFor="csv-upload"
            className="inline-block px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors cursor-pointer"
          >
            Chọn file CSV
          </label>
          <div className="mt-6 text-left max-w-md mx-auto">
            <p className="text-xs font-medium text-gray-700 mb-2">Format CSV mẫu:</p>
            <div className="bg-gray-50 p-3 rounded text-xs font-mono">
              Type,Ticker,Date,Shares,Price,Fee<br/>
              BUY,VNM,2024-01-15,100,71500,0.15<br/>
              BUY,BTC,2024-01-20,0.5,1200000000,0.20
            </div>
          </div>
        </div>
      )}
    </div>
  );
}