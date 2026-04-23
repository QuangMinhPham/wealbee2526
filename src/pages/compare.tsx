import { useState, useEffect } from 'react';
import { GitCompare, Plus, X, Loader2 } from 'lucide-react';
import { getAllStocks } from '../lib/services/stocks-service';
import { Stock } from '../lib/types';
import { formatVND, formatPercent, getSafetyColor, getSafetyLabel } from '../lib/utils';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

export function Compare() {
  const [allStocks, setAllStocks] = useState<Stock[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedStocks, setSelectedStocks] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    let cancelled = false;
    async function fetchStocks() {
      try {
        const data = await getAllStocks();
        if (!cancelled) {
          setAllStocks(data);
          // Auto-chọn 3 cổ phiếu đầu tiên có dividend
          const defaultPicks = data
            .filter(s => s.dividendYield > 0)
            .slice(0, 3)
            .map(s => s.id);
          setSelectedStocks(defaultPicks);
        }
      } catch (err) {
        console.error('[Compare] fetch error:', err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    fetchStocks();
    return () => { cancelled = true; };
  }, []);

  const addStock = (stockId: string) => {
    if (!selectedStocks.includes(stockId) && selectedStocks.length < 5) {
      setSelectedStocks([...selectedStocks, stockId]);
      setSearchQuery('');
    }
  };

  const removeStock = (stockId: string) => {
    setSelectedStocks(selectedStocks.filter(id => id !== stockId));
  };

  const stocks = selectedStocks.map(id => allStocks.find(s => s.id === id)!).filter(Boolean);

  const filteredStocks = allStocks.filter(stock =>
    !selectedStocks.includes(stock.id) &&
    (stock.ticker.toLowerCase().includes(searchQuery.toLowerCase()) ||
     stock.name.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  // Prepare comparison data for charts
  const yieldComparison = stocks.map(s => ({
    name: s.ticker,
    'Dividend Yield': s.dividendYield,
    'Avg 5Y': s.avgDividendYield5Y
  }));

  const growthComparison = stocks.map(s => ({
    name: s.ticker,
    '1Y': s.dividendGrowth1Y,
    '3Y': s.dividendGrowth3Y,
    '5Y': s.dividendGrowth5Y
  }));

  const payoutComparison = stocks.map(s => ({
    name: s.ticker,
    'Payout Ratio': s.payoutRatio
  }));

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="bg-white dark:bg-slate-800 rounded-lg p-6 shadow-sm border border-gray-200 dark:border-slate-700 dark:border-slate-700">
        <h2 className="font-semibold mb-4 flex items-center gap-2">
          <GitCompare className="size-5 text-emerald-600 dark:text-emerald-400" />
          So sánh cổ phiếu
        </h2>

        {/* Add Stock */}
        <div className="relative">
          <input
            type="text"
            placeholder="Tìm kiếm mã cổ phiếu để thêm vào so sánh..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 dark:focus:ring-emerald-400"
            disabled={selectedStocks.length >= 5}
          />
          {searchQuery && filteredStocks.length > 0 && (
            <div className="absolute z-10 w-full mt-1 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 dark:border-slate-700 dark:border-slate-700 rounded-lg shadow-lg max-h-60 overflow-y-auto">
              {filteredStocks.slice(0, 5).map(stock => (
                <button
                  key={stock.id}
                  onClick={() => addStock(stock.id)}
                  className="w-full px-4 py-2 text-left hover:bg-gray-50 dark:hover:bg-slate-800/50 transition-colors border-b border-gray-100 dark:border-slate-700/50 last:border-b-0"
                >
                  <div className="font-medium text-emerald-700 dark:text-emerald-400">{stock.ticker}</div>
                  <div className="text-sm text-gray-600 dark:text-slate-300">{stock.name}</div>
                </button>
              ))}
            </div>
          )}
        </div>

        {selectedStocks.length >= 5 && (
          <p className="text-sm text-amber-600 dark:text-amber-400 mt-2">Tối đa 5 mã cổ phiếu để so sánh</p>
        )}

        {/* Selected Stocks Pills */}
        <div className="flex flex-wrap gap-2 mt-4">
          {stocks.map(stock => (
            <div
              key={stock.id}
              className="flex items-center gap-2 px-3 py-1 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 rounded-full"
            >
              <span className="font-medium">{stock.ticker}</span>
              <button
                onClick={() => removeStock(stock.id)}
                className="hover:bg-emerald-200 rounded-full p-0.5 transition-colors"
              >
                <X className="size-3" />
              </button>
            </div>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="bg-white dark:bg-slate-800 rounded-lg p-12 shadow-sm border border-gray-200 dark:border-slate-700 dark:border-slate-700 text-center">
          <Loader2 className="size-12 text-gray-300 dark:text-slate-600 mx-auto mb-4 animate-spin" />
          <p className="text-gray-500 dark:text-slate-400">Đang tải dữ liệu...</p>
        </div>
      ) : stocks.length === 0 ? (
        <div className="bg-white dark:bg-slate-800 rounded-lg p-12 shadow-sm border border-gray-200 dark:border-slate-700 dark:border-slate-700 text-center">
          <GitCompare className="size-12 text-gray-300 dark:text-slate-600 mx-auto mb-4" />
          <p className="text-gray-500 dark:text-slate-400">Chọn ít nhất 1 mã cổ phiếu để bắt đầu so sánh</p>
        </div>
      ) : (
        <>
          {/* Comparison Table */}
          <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm dark:shadow-slate-900/40 border border-gray-200 dark:border-slate-700 dark:border-slate-700 overflow-hidden">
            <div className="p-6 border-b border-gray-200 dark:border-slate-700 dark:border-slate-700">
              <h3 className="font-semibold">So sánh chi tiết</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 dark:bg-slate-800/50 border-b border-gray-200 dark:border-slate-700 dark:border-slate-700">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-slate-400 uppercase tracking-wider sticky left-0 bg-gray-50 dark:bg-slate-950">
                      Chỉ số
                    </th>
                    {stocks.map(stock => (
                      <th key={stock.id} className="px-6 py-3 text-center text-xs font-medium text-gray-500 dark:text-slate-400 uppercase tracking-wider">
                        {stock.ticker}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200 dark:divide-slate-700">
                  <tr className="hover:bg-gray-50 dark:hover:bg-slate-800/50 dark:bg-slate-950">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white sticky left-0 bg-white">Tên công ty</td>
                    {stocks.map(stock => (
                      <td key={stock.id} className="px-6 py-4 text-sm text-center">{stock.name}</td>
                    ))}
                  </tr>
                  <tr className="hover:bg-gray-50 dark:hover:bg-slate-800/50 dark:bg-slate-950">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white sticky left-0 bg-white">Ngành</td>
                    {stocks.map(stock => (
                      <td key={stock.id} className="px-6 py-4 text-sm text-center">{stock.sector}</td>
                    ))}
                  </tr>
                  <tr className="hover:bg-gray-50 dark:hover:bg-slate-800/50 dark:bg-slate-950">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white sticky left-0 bg-white">Giá hiện tại</td>
                    {stocks.map(stock => (
                      <td key={stock.id} className="px-6 py-4 text-sm text-center font-medium">{formatVND(stock.price)}</td>
                    ))}
                  </tr>
                  <tr className="hover:bg-gray-50 dark:hover:bg-slate-800/50 bg-emerald-50 dark:bg-emerald-900/20">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white sticky left-0 bg-emerald-50 dark:bg-emerald-900/20">Dividend Yield</td>
                    {stocks.map(stock => (
                      <td key={stock.id} className="px-6 py-4 text-sm text-center font-bold text-emerald-700 dark:text-emerald-400">
                        {stock.dividendYield > 0 ? `${stock.dividendYield.toFixed(1)}%` : 'N/A'}
                      </td>
                    ))}
                  </tr>
                  <tr className="hover:bg-gray-50 dark:hover:bg-slate-800/50 dark:bg-slate-950">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white sticky left-0 bg-white">Cổ tức/CP</td>
                    {stocks.map(stock => (
                      <td key={stock.id} className="px-6 py-4 text-sm text-center">{stock.dividendPerShare > 0 ? formatVND(stock.dividendPerShare) : 'N/A'}</td>
                    ))}
                  </tr>
                  <tr className="hover:bg-gray-50 dark:hover:bg-slate-800/50 dark:bg-slate-950">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white sticky left-0 bg-white">Dividend Safety</td>
                    {stocks.map(stock => (
                      <td key={stock.id} className="px-6 py-4 text-center">
                        <span className={`inline-block px-2 py-1 text-xs font-medium rounded-full ${getSafetyColor(stock.dividendSafety)}`}>
                          {getSafetyLabel(stock.dividendSafety)}
                        </span>
                      </td>
                    ))}
                  </tr>
                  <tr className="hover:bg-gray-50 dark:hover:bg-slate-800/50 dark:bg-slate-950">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white sticky left-0 bg-white">Avg Yield 5Y</td>
                    {stocks.map(stock => (
                      <td key={stock.id} className="px-6 py-4 text-sm text-center">{stock.avgDividendYield5Y.toFixed(1)}%</td>
                    ))}
                  </tr>
                  <tr className="hover:bg-gray-50 dark:hover:bg-slate-800/50 dark:bg-slate-950">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white sticky left-0 bg-white">Tăng trưởng 5Y</td>
                    {stocks.map(stock => (
                      <td key={stock.id} className="px-6 py-4 text-sm text-center font-medium">
                        <span className={stock.dividendGrowth5Y > 0 ? 'text-emerald-600 dark:text-emerald-400' : stock.dividendGrowth5Y < 0 ? 'text-red-600 dark:text-red-400' : ''}>
                          {formatPercent(stock.dividendGrowth5Y)}
                        </span>
                      </td>
                    ))}
                  </tr>
                  <tr className="hover:bg-gray-50 dark:hover:bg-slate-800/50 dark:bg-slate-950">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white sticky left-0 bg-white">Chuỗi tăng trưởng</td>
                    {stocks.map(stock => (
                      <td key={stock.id} className="px-6 py-4 text-sm text-center">{stock.dividendStreak > 0 ? `${stock.dividendStreak} năm` : 'N/A'}</td>
                    ))}
                  </tr>
                  <tr className="hover:bg-gray-50 dark:hover:bg-slate-800/50 dark:bg-slate-950">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white sticky left-0 bg-white">Payout Ratio</td>
                    {stocks.map(stock => (
                      <td key={stock.id} className="px-6 py-4 text-sm text-center">{stock.payoutRatio > 0 ? `${stock.payoutRatio}%` : 'N/A'}</td>
                    ))}
                  </tr>
                  <tr className="hover:bg-gray-50 dark:hover:bg-slate-800/50 dark:bg-slate-950">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white sticky left-0 bg-white">Tần suất</td>
                    {stocks.map(stock => (
                      <td key={stock.id} className="px-6 py-4 text-sm text-center">{stock.frequency}</td>
                    ))}
                  </tr>
                  <tr className="hover:bg-gray-50 dark:hover:bg-slate-800/50 dark:bg-slate-950">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white sticky left-0 bg-white">Market Cap</td>
                    {stocks.map(stock => (
                      <td key={stock.id} className="px-6 py-4 text-sm text-center">{(stock.marketCap / 1000000000000).toFixed(1)}T VND</td>
                    ))}
                  </tr>
                  <tr className="hover:bg-gray-50 dark:hover:bg-slate-800/50 dark:bg-slate-950">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white sticky left-0 bg-white">Revenue YoY</td>
                    {stocks.map(stock => (
                      <td key={stock.id} className="px-6 py-4 text-sm text-center">
                        <span className={stock.revenueYoY > 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}>
                          {formatPercent(stock.revenueYoY)}
                        </span>
                      </td>
                    ))}
                  </tr>
                  <tr className="hover:bg-gray-50 dark:hover:bg-slate-800/50 dark:bg-slate-950">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white sticky left-0 bg-white">Net Income YoY</td>
                    {stocks.map(stock => (
                      <td key={stock.id} className="px-6 py-4 text-sm text-center">
                        <span className={stock.netIncomeYoY > 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}>
                          {formatPercent(stock.netIncomeYoY)}
                        </span>
                      </td>
                    ))}
                  </tr>
                  <tr className="hover:bg-gray-50 dark:hover:bg-slate-800/50 dark:bg-slate-950">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white sticky left-0 bg-white">Debt/Equity</td>
                    {stocks.map(stock => (
                      <td key={stock.id} className="px-6 py-4 text-sm text-center">{stock.debtToEquity.toFixed(2)}</td>
                    ))}
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Yield Comparison */}
            <div className="bg-white dark:bg-slate-800 rounded-lg p-6 shadow-sm border border-gray-200 dark:border-slate-700 dark:border-slate-700">
              <h3 className="font-semibold mb-4">So sánh tỷ suất cổ tức</h3>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={yieldComparison}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip formatter={(value: number) => `${value.toFixed(1)}%`} />
                  <Legend />
                  <Bar dataKey="Dividend Yield" fill="#10b981" />
                  <Bar dataKey="Avg 5Y" fill="#3b82f6" />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Growth Comparison */}
            <div className="bg-white dark:bg-slate-800 rounded-lg p-6 shadow-sm border border-gray-200 dark:border-slate-700 dark:border-slate-700">
              <h3 className="font-semibold mb-4">So sánh tăng trưởng cổ tức</h3>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={growthComparison}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip formatter={(value: number) => formatPercent(value)} />
                  <Legend />
                  <Bar dataKey="1Y" fill="#3b82f6" />
                  <Bar dataKey="3Y" fill="#8b5cf6" />
                  <Bar dataKey="5Y" fill="#10b981" />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Payout Ratio Comparison */}
            <div className="bg-white dark:bg-slate-800 rounded-lg p-6 shadow-sm border border-gray-200 dark:border-slate-700 dark:border-slate-700">
              <h3 className="font-semibold mb-4">So sánh Payout Ratio</h3>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={payoutComparison}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} domain={[0, 100]} />
                  <Tooltip formatter={(value: number) => `${value}%`} />
                  <Bar dataKey="Payout Ratio" fill="#f59e0b" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
