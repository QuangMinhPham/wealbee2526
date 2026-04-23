import { useState, useMemo, useEffect, useCallback } from 'react';
import { Download, Search, Trash2, Edit2 } from 'lucide-react';
import { formatVND, formatDate } from '../lib/utils';
import { supabase } from '../lib/supabase/client';

// Cast to any to bypass outdated generated types (real schema has stocks_transactions etc.)
const db = supabase as any;

interface Transaction {
  id: string;
  type: 'BUY' | 'SELL' | 'DEPOSIT';
  ticker: string;
  assetName: string;
  assetCategory: string;
  date: string;
  shares: number;
  price: number;
  fee: number;
  total: number;
  assetTable: 'stocks_transactions' | 'gold_transactions' | 'crypto_transactions' | 'fixed_income_assets' | 'custom_assets';
}

interface EditModalProps {
  transaction: Transaction | null;
  onClose: () => void;
  onSave: (transaction: Transaction) => void;
}

function EditModal({ transaction, onClose, onSave }: EditModalProps) {
  const [formData, setFormData] = useState<Transaction | null>(transaction);

  if (!transaction || !formData) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (formData) {
      // Recalculate total
      const newTotal = formData.type === 'BUY' 
        ? formData.shares * formData.price + formData.fee
        : formData.shares * formData.price - formData.fee;
      
      onSave({ ...formData, total: newTotal });
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md">
        <div className="p-6 border-b border-gray-200">
          <h3 className="text-xl font-bold text-gray-900">Chỉnh sửa giao dịch</h3>
          <p className="text-sm text-gray-500 mt-1">Cập nhật thông tin giao dịch</p>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Loại giao dịch</label>
            <select
              value={formData.type}
              onChange={(e) => setFormData({ ...formData, type: e.target.value as 'BUY' | 'SELL' })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="BUY">Mua (BUY)</option>
              <option value="SELL">Bán (SELL)</option>
            </select>
          </div>

          {/* Date */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Ngày giao dịch</label>
            <input
              type="date"
              value={formData.date}
              onChange={(e) => setFormData({ ...formData, date: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          {/* Shares */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Khối lượng</label>
            <input
              type="number"
              step="0.01"
              value={formData.shares}
              onChange={(e) => setFormData({ ...formData, shares: parseFloat(e.target.value) || 0 })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          {/* Price */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Giá khớp</label>
            <input
              type="number"
              step="1000"
              value={formData.price}
              onChange={(e) => setFormData({ ...formData, price: parseFloat(e.target.value) || 0 })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
            >
              Hủy
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
            >
              Lưu thay đổi
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export function TransactionsTab() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);

  const fetchTransactions = useCallback(async () => {
    try {
      setIsLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Get the user's portfolios
      const { data: portfolios } = await db
        .from('portfolios')
        .select('id')
        .eq('user_id', user.id)
        .order('is_default', { ascending: false })
        .limit(1);

      if (!portfolios || portfolios.length === 0) {
        setTransactions([]);
        return;
      }
      const portfolioId = (portfolios[0] as any).id;

      // Fetch asset IDs for the portfolio first (needed to filter transactions correctly,
      // because PostgREST embedded-resource .eq() filtering is not reliable in supabase-js)
      const [stocksAssets, goldAssets, cryptoAssets, fixedIncomeAssets, customAssets] = await Promise.all([
        db.from('stocks_assets').select('id, symbol, market_data_stocks(company_name)').eq('portfolio_id', portfolioId),
        db.from('gold_assets').select('id, symbol, market_data_gold(name)').eq('portfolio_id', portfolioId),
        db.from('crypto_assets').select('id, symbol, market_data_crypto(name)').eq('portfolio_id', portfolioId),
        db.from('fixed_income_assets').select('id, symbol, issuer_name, principal_amount, interest_rate, transaction_date').eq('portfolio_id', portfolioId),
        db.from('custom_assets').select('id, symbol, asset_name, principal_value, income_amount, payment_frequency, transaction_date').eq('portfolio_id', portfolioId),
      ]);

      const stocksAssetIds: string[] = (stocksAssets.data || []).map((a: any) => a.id);
      const goldAssetIds: string[] = (goldAssets.data || []).map((a: any) => a.id);
      const cryptoAssetIds: string[] = (cryptoAssets.data || []).map((a: any) => a.id);

      // Build lookup maps: asset_id -> { symbol, assetName }
      const stocksMap: Record<string, { symbol: string; assetName: string }> = {};
      for (const a of stocksAssets.data || []) {
        stocksMap[a.id] = { symbol: a.symbol, assetName: (a.market_data_stocks as any)?.company_name || a.symbol };
      }
      const goldMap: Record<string, { symbol: string; assetName: string }> = {};
      for (const a of goldAssets.data || []) {
        goldMap[a.id] = { symbol: a.symbol, assetName: (a.market_data_gold as any)?.name || a.symbol };
      }
      const cryptoMap: Record<string, { symbol: string; assetName: string }> = {};
      for (const a of cryptoAssets.data || []) {
        cryptoMap[a.id] = { symbol: a.symbol, assetName: (a.market_data_crypto as any)?.name || a.symbol };
      }

      // Fetch transactions filtered by the known asset IDs
      const [stocksResult, goldResult, cryptoResult] = await Promise.all([
        stocksAssetIds.length > 0
          ? db.from('stocks_transactions')
              .select('id, asset_id, transaction_type, quantity, price_per_unit, fee_amount, transaction_date')
              .in('asset_id', stocksAssetIds)
              .order('transaction_date', { ascending: false })
          : Promise.resolve({ data: [], error: null }),
        goldAssetIds.length > 0
          ? db.from('gold_transactions')
              .select('id, asset_id, transaction_type, quantity, price_per_unit, fee_amount, transaction_date')
              .in('asset_id', goldAssetIds)
              .order('transaction_date', { ascending: false })
          : Promise.resolve({ data: [], error: null }),
        cryptoAssetIds.length > 0
          ? db.from('crypto_transactions')
              .select('id, asset_id, transaction_type, quantity, price_per_unit, fee_amount, transaction_date')
              .in('asset_id', cryptoAssetIds)
              .order('transaction_date', { ascending: false })
          : Promise.resolve({ data: [], error: null }),
      ]);

      if (stocksResult.error) console.error('stocks_transactions error:', stocksResult.error);
      if (goldResult.error) console.error('gold_transactions error:', goldResult.error);
      if (cryptoResult.error) console.error('crypto_transactions error:', cryptoResult.error);

      const makeRow = (
        t: any,
        assetLookup: Record<string, { symbol: string; assetName: string }>,
        assetTable: Transaction['assetTable'],
        category: string,
      ): Transaction => {
        const info = assetLookup[t.asset_id] || { symbol: '???', assetName: '???' };
        const qty = Number(t.quantity);
        const price = Number(t.price_per_unit);
        const fee = Number(t.fee_amount) || 0;
        const isBuy = ['buy', 'transfer_in', 'staking_reward', 'airdrop'].includes(t.transaction_type);
        return {
          id: t.id,
          type: isBuy ? 'BUY' : 'SELL',
          ticker: info.symbol,
          assetName: info.assetName,
          assetCategory: category,
          date: t.transaction_date,
          shares: qty,
          price,
          fee,
          total: isBuy ? qty * price + fee : qty * price - fee,
          assetTable,
        };
      };

      // Map fixed_income_assets rows thành Transaction (không có bảng transactions riêng)
      const fixedIncomeRows: Transaction[] = (fixedIncomeAssets.data || []).map((r: any) => ({
        id: r.id,
        type: 'DEPOSIT' as const,
        ticker: r.symbol || r.issuer_name?.substring(0, 8).toUpperCase() || 'BOND',
        assetName: r.issuer_name,
        assetCategory: 'Trái phiếu/Tiền gửi',
        date: r.transaction_date || '',
        shares: 1,
        price: Number(r.principal_amount) || 0,
        fee: 0,
        total: Number(r.principal_amount) || 0,
        assetTable: 'fixed_income_assets' as const,
      }));

      // Map custom_assets rows thành Transaction
      const customRows: Transaction[] = (customAssets.data || []).map((r: any) => ({
        id: r.id,
        type: 'DEPOSIT' as const,
        ticker: r.symbol || 'CUSTOM',
        assetName: r.asset_name,
        assetCategory: 'Tài sản khác',
        date: r.transaction_date || '',
        shares: 1,
        price: Number(r.principal_value) || 0,
        fee: 0,
        total: Number(r.principal_value) || 0,
        assetTable: 'custom_assets' as const,
      }));

      const mapped: Transaction[] = [
        ...(stocksResult.data || []).map((t: any) => makeRow(t, stocksMap, 'stocks_transactions', 'Cổ phiếu')),
        ...(goldResult.data || []).map((t: any) => makeRow(t, goldMap, 'gold_transactions', 'Vàng')),
        ...(cryptoResult.data || []).map((t: any) => makeRow(t, cryptoMap, 'crypto_transactions', 'Crypto')),
        ...fixedIncomeRows,
        ...customRows,
      ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

      setTransactions(mapped);
    } catch (err) {
      console.error('fetchTransactions error:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { fetchTransactions(); }, [fetchTransactions]);

  const filteredTransactions = useMemo(() => {
    if (!searchQuery.trim()) return transactions;
    const query = searchQuery.toLowerCase();
    return transactions.filter(t =>
      t.ticker.toLowerCase().includes(query) ||
      t.assetName.toLowerCase().includes(query)
    );
  }, [transactions, searchQuery]);

  const toggleSelection = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === filteredTransactions.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredTransactions.map(t => t.id)));
    }
  };

  const deleteSelected = async () => {
    if (selectedIds.size === 0) return;
    if (!confirm(`Bạn có chắc muốn xóa ${selectedIds.size} giao dịch đã chọn?`)) return;

    try {
      // Group selected IDs by their assetTable so we delete from the right table
      const byTable: Record<string, string[]> = {};
      for (const id of selectedIds) {
        const t = transactions.find(tx => tx.id === id);
        if (!t) continue;
        if (!byTable[t.assetTable]) byTable[t.assetTable] = [];
        byTable[t.assetTable].push(id);
      }

      for (const [table, ids] of Object.entries(byTable)) {
        const { error } = await db.from(table).delete().in('id', ids);
        if (error) throw error;
      }

      setSelectedIds(new Set());
      await fetchTransactions();
    } catch (err: any) {
      alert('Lỗi khi xóa: ' + (err.message || 'Không thể xóa giao dịch'));
    }
  };

  const exportTransactions = () => {
    const headers = ['Loại', 'Ngày', 'Mã tài sản', 'Tên tài sản', 'Khối lượng', 'Giá khớp', 'Phí', 'Tổng giá trị'];
    const csvRows = transactions.map(t => [t.type, t.date, t.ticker, `"${t.assetName}"`, t.shares, t.price, t.fee, t.total]);
    const csvContent = [headers.join(','), ...csvRows.map(r => r.join(','))].join('\n');
    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `transactions-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  // Save edited transaction
  const handleSaveEdit = (updatedTransaction: Transaction) => {
    setTransactions(prev => 
      prev.map(t => t.id === updatedTransaction.id ? updatedTransaction : t)
    );
    setEditingTransaction(null);
  };

  return (
    <div className="bg-white rounded-xl shadow-md border border-gray-200">
      {/* Toolbar */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between gap-4">
          {/* Left side - Selected count */}
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-gray-700">
              Đã chọn: <span className="font-bold text-blue-600">{selectedIds.size}</span>
            </span>
          </div>

          {/* Right side - Action buttons and search */}
          <div className="flex items-center gap-3">
            {/* Delete button */}
            <button
              onClick={deleteSelected}
              disabled={selectedIds.size === 0}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                selectedIds.size > 0
                  ? 'bg-red-50 text-red-600 hover:bg-red-100 border border-red-200'
                  : 'bg-gray-100 text-gray-400 cursor-not-allowed border border-gray-200'
              }`}
            >
              <Trash2 className="size-4" />
              Xóa
            </button>

            {/* Export CSV button */}
            <button
              onClick={exportTransactions}
              disabled={transactions.length === 0}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg text-sm font-medium transition-colors"
            >
              <Download className="size-4" />
              Xuất file .CSV
            </button>

            {/* Search box */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-gray-400" />
              <input
                type="text"
                placeholder="Mã tài sản, Tên tài sản"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 w-64"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Data Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gradient-to-r from-gray-50 to-gray-100 border-b-2 border-gray-200">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                Loại GD
              </th>
              <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                Ngày
              </th>
              <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                Mã
              </th>
              <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                Tên tài sản
              </th>
              <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                Loại TS
              </th>
              <th className="px-4 py-3 text-right text-xs font-bold text-gray-700 uppercase tracking-wider">
                Khối lượng
              </th>
              <th className="px-4 py-3 text-right text-xs font-bold text-gray-700 uppercase tracking-wider">
                Giá khớp
              </th>
              <th className="px-4 py-3 text-right text-xs font-bold text-gray-700 uppercase tracking-wider">
                Tổng giá trị
              </th>
              <th className="px-4 py-3 text-center text-xs font-bold text-gray-700 uppercase tracking-wider">
                Thao tác
              </th>
              <th className="px-4 py-3 text-center text-xs font-bold text-gray-700 uppercase tracking-wider">
                <input
                  type="checkbox"
                  checked={filteredTransactions.length > 0 && selectedIds.size === filteredTransactions.length}
                  onChange={toggleSelectAll}
                  className="size-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                />
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {isLoading ? (
              <tr>
                <td colSpan={10} className="px-4 py-12 text-center text-gray-500">
                  <div className="flex flex-col items-center gap-2">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                    <span className="text-sm">Đang tải lịch sử giao dịch...</span>
                  </div>
                </td>
              </tr>
            ) : filteredTransactions.length === 0 ? (
              <tr>
                <td colSpan={10} className="px-4 py-12 text-center text-gray-500">
                  {searchQuery ? 'Không tìm thấy giao dịch phù hợp' : 'Chưa có giao dịch nào. Hãy thêm tài sản đầu tiên!'}
                </td>
              </tr>
            ) : (
              filteredTransactions.map(transaction => (
                <tr
                  key={transaction.id}
                  className={`hover:bg-blue-50 transition-colors ${
                    selectedIds.has(transaction.id) ? 'bg-blue-50' : ''
                  }`}
                >
                  {/* BUY/SELL/DEPOSIT */}
                  <td className="px-4 py-3 whitespace-nowrap">
                    <span className={`px-2.5 py-1 text-xs font-semibold rounded-md ${
                      transaction.type === 'BUY'
                        ? 'bg-emerald-100 text-emerald-700'
                        : transaction.type === 'SELL'
                        ? 'bg-red-100 text-red-700'
                        : 'bg-blue-100 text-blue-700'
                    }`}>
                      {transaction.type === 'BUY' ? 'MUA' : transaction.type === 'SELL' ? 'BÁN' : 'GỬI/ĐẦU TƯ'}
                    </span>
                  </td>

                  {/* Date */}
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700">
                    {formatDate(transaction.date)}
                  </td>

                  {/* Ticker */}
                  <td className="px-4 py-3 whitespace-nowrap text-sm font-bold text-gray-900">
                    {transaction.ticker}
                  </td>

                  {/* Asset Name */}
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">
                    {transaction.assetName}
                  </td>

                  {/* Asset Category badge */}
                  <td className="px-4 py-3 whitespace-nowrap">
                    <span className="px-2 py-0.5 text-xs rounded-full bg-gray-100 text-gray-600 font-medium">
                      {transaction.assetCategory}
                    </span>
                  </td>

                  {/* Shares */}
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-right font-medium text-gray-900">
                    {transaction.shares.toLocaleString('vi-VN')}
                  </td>

                  {/* Price */}
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-right text-gray-700">
                    {formatVND(transaction.price)}
                  </td>

                  {/* Total */}
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-right font-bold text-gray-900">
                    {formatVND(transaction.total)}
                  </td>

                  {/* Actions */}
                  <td className="px-4 py-3 whitespace-nowrap text-center">
                    <button
                      onClick={() => setEditingTransaction(transaction)}
                      className="inline-flex items-center justify-center p-2 text-blue-600 hover:bg-blue-100 rounded-lg transition-colors"
                      title="Chỉnh sửa"
                    >
                      <Edit2 className="size-4" />
                    </button>
                  </td>

                  {/* Checkbox */}
                  <td className="px-4 py-3 whitespace-nowrap text-center">
                    <input
                      type="checkbox"
                      checked={selectedIds.has(transaction.id)}
                      onChange={() => toggleSelection(transaction.id)}
                      className="size-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                    />
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Summary */}
      {!isLoading && transactions.length > 0 && (
        <div className="p-6 border-t border-gray-200 bg-gradient-to-r from-gray-50 to-gray-100">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-200">
              <div className="text-sm text-gray-600 mb-1 font-medium">Tổng giao dịch</div>
              <div className="text-2xl font-bold text-gray-900">{transactions.length}</div>
            </div>
            <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-200">
              <div className="text-sm text-gray-600 mb-1 font-medium">Tổng mua</div>
              <div className="text-2xl font-bold text-emerald-600">
                {transactions.filter(t => t.type === 'BUY').length}
              </div>
            </div>
            <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-200">
              <div className="text-sm text-gray-600 mb-1 font-medium">Tổng bán</div>
              <div className="text-2xl font-bold text-red-600">
                {transactions.filter(t => t.type === 'SELL').length}
              </div>
            </div>
            <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-200">
              <div className="text-sm text-gray-600 mb-1 font-medium">Tổng phí</div>
              <div className="text-2xl font-bold text-gray-900">
                {formatVND(transactions.reduce((sum, t) => sum + t.fee, 0))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {editingTransaction && (
        <EditModal
          transaction={editingTransaction}
          onClose={() => setEditingTransaction(null)}
          onSave={handleSaveEdit}
        />
      )}
    </div>
  );
}
