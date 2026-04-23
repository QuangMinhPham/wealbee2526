import { useState, useEffect } from 'react';
import { Link } from 'react-router';
import { Trophy, TrendingUp, Shield, DollarSign, Loader2 } from 'lucide-react';
import { getAllStocks } from '../lib/services/stocks-service';
import { Stock } from '../lib/types';
import { formatVND, formatPercent, getSafetyColor, getSafetyLabel } from '../lib/utils';

type Category = 'highest-yield' | 'safest' | 'fastest-growth' | 'longest-streak';

const categories = [
  {
    id: 'highest-yield' as Category,
    title: 'Tỷ suất cổ tức cao nhất',
    description: 'Cổ phiếu có dividend yield cao nhất hiện nay',
    icon: DollarSign,
    color: 'emerald'
  },
  {
    id: 'safest' as Category,
    title: 'An toàn nhất',
    description: 'Cổ phiếu có mức độ an toàn cổ tức cao',
    icon: Shield,
    color: 'blue'
  },
  {
    id: 'fastest-growth' as Category,
    title: 'Tăng trưởng nhanh nhất',
    description: 'Cổ phiếu có tốc độ tăng trưởng cổ tức 5 năm cao nhất',
    icon: TrendingUp,
    color: 'purple'
  },
  {
    id: 'longest-streak' as Category,
    title: 'Chuỗi tăng trưởng dài nhất',
    description: 'Cổ phiếu duy trì tăng cổ tức liên tục nhiều năm',
    icon: Trophy,
    color: 'amber'
  }
];

export function TopStocks() {
  const [activeCategory, setActiveCategory] = useState<Category>('highest-yield');
  const [allStocks, setAllStocks] = useState<Stock[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function fetchStocks() {
      try {
        setLoading(true);
        setError(null);
        const data = await getAllStocks();
        if (!cancelled) setAllStocks(data);
      } catch (err) {
        console.error('[TopStocks] fetch error:', err);
        if (!cancelled) setError('Không thể tải dữ liệu cổ phiếu.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    fetchStocks();
    return () => { cancelled = true; };
  }, []);

  const getTopStocks = (category: Category) => {
    let sorted = [...allStocks];

    switch (category) {
      case 'highest-yield':
        sorted = sorted.filter(s => s.dividendYield > 0).sort((a, b) => b.dividendYield - a.dividendYield);
        break;
      case 'safest':
        sorted = sorted.filter(s => s.dividendSafety === 'Safe').sort((a, b) => b.dividendYield - a.dividendYield);
        break;
      case 'fastest-growth':
        sorted = sorted.filter(s => s.dividendGrowth5Y > 0).sort((a, b) => b.dividendGrowth5Y - a.dividendGrowth5Y);
        break;
      case 'longest-streak':
        sorted = sorted.filter(s => s.dividendStreak > 0).sort((a, b) => b.dividendStreak - a.dividendStreak);
        break;
    }

    return sorted.slice(0, 10);
  };

  const topStocks = getTopStocks(activeCategory);
  const activeInfo = categories.find(c => c.id === activeCategory)!;
  const ActiveIcon = activeInfo.icon;

  return (
    <div className="p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="bg-white dark:bg-slate-800 rounded-lg p-6 shadow-sm border border-gray-200 dark:border-slate-700 dark:border-slate-700">
          <h2 className="font-semibold mb-2 flex items-center gap-2">
            <Trophy className="size-6 text-amber-600 dark:text-amber-400" />
            Cổ phiếu hàng đầu
          </h2>
          <p className="text-gray-600 dark:text-slate-300">
            Danh sách các cổ phiếu trả cổ tức tốt nhất theo từng tiêu chí
          </p>
        </div>

        {/* Category Tabs */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {categories.map((category) => {
            const Icon = category.icon;
            const isActive = activeCategory === category.id;
            const colorClasses = {
              emerald: isActive ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20' : 'border-gray-200 dark:border-slate-700 hover:border-emerald-300',
              blue: isActive ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' : 'border-gray-200 dark:border-slate-700 hover:border-blue-300',
              purple: isActive ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/20' : 'border-gray-200 dark:border-slate-700 hover:border-purple-300',
              amber: isActive ? 'border-amber-500 bg-amber-50 dark:bg-amber-900/20' : 'border-gray-200 dark:border-slate-700 hover:border-amber-300'
            };

            return (
              <button
                key={category.id}
                onClick={() => setActiveCategory(category.id)}
                className={`bg-white dark:bg-slate-800 rounded-lg p-4 border-2 transition-all ${colorClasses[category.color as keyof typeof colorClasses]}`}
              >
                <Icon className={`size-6 mb-2 ${isActive ? `text-${category.color}-600` : 'text-gray-400 dark:text-slate-500'}`} />
                <h3 className={`text-sm font-semibold mb-1 ${isActive ? 'text-gray-900 dark:text-white' : 'text-gray-600 dark:text-slate-300'}`}>
                  {category.title}
                </h3>
                <p className="text-xs text-gray-500 dark:text-slate-400">{category.description}</p>
              </button>
            );
          })}
        </div>

        {/* Top Stocks List */}
        <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm dark:shadow-slate-900/40 border border-gray-200 dark:border-slate-700 dark:border-slate-700">
          <div className="p-6 border-b border-gray-200 dark:border-slate-700 dark:border-slate-700">
            <div className="flex items-center gap-3">
              <ActiveIcon className={`size-6 text-${activeInfo.color}-600`} />
              <div>
                <h3 className="font-semibold">{activeInfo.title}</h3>
                <p className="text-sm text-gray-600 dark:text-slate-300">{activeInfo.description}</p>
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            {loading ? (
              <div className="flex justify-center items-center p-6">
                <Loader2 className="animate-spin size-6 text-gray-500 dark:text-slate-400" />
              </div>
            ) : error ? (
              <div className="p-6 text-center text-red-500 dark:text-red-400">{error}</div>
            ) : (
              <table className="w-full">
                <thead className="bg-gray-50 dark:bg-slate-800/50 border-b border-gray-200 dark:border-slate-700 dark:border-slate-700">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-slate-400 uppercase tracking-wider">
                      Hạng
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-slate-400 uppercase tracking-wider">
                      Mã CK
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-slate-400 uppercase tracking-wider">
                      Tên công ty
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-slate-400 uppercase tracking-wider">
                      Ngành
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-slate-400 uppercase tracking-wider">
                      Giá
                    </th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 dark:text-slate-400 uppercase tracking-wider">
                      Safety
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-slate-400 uppercase tracking-wider">
                      Yield
                    </th>
                    {activeCategory === 'fastest-growth' && (
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-slate-400 uppercase tracking-wider">
                        Growth 5Y
                      </th>
                    )}
                    {activeCategory === 'longest-streak' && (
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-slate-400 uppercase tracking-wider">
                        Streak
                      </th>
                    )}
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-slate-400 uppercase tracking-wider">
                      Payout
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200 dark:divide-slate-700">
                  {loading ? (
                    <tr><td colSpan={8} className="px-6 py-16 text-center">
                      <div className="flex flex-col items-center gap-3">
                        <Loader2 className="size-8 text-emerald-600 dark:text-emerald-400 animate-spin" />
                        <p className="text-gray-500 dark:text-slate-400 text-sm">Đang tải dữ liệu...</p>
                      </div>
                    </td></tr>
                  ) : error ? (
                    <tr><td colSpan={8} className="px-6 py-16 text-center">
                      <p className="text-red-500 dark:text-red-400 text-sm">{error}</p>
                    </td></tr>
                  ) : topStocks.length === 0 ? (
                    <tr><td colSpan={8} className="px-6 py-16 text-center">
                      <p className="text-gray-500 dark:text-slate-400 text-sm">Chưa có dữ liệu cổ phiếu.</p>
                    </td></tr>
                  ) : topStocks.map((stock, index) => (
                    <tr key={stock.id} className="hover:bg-gray-50 dark:hover:bg-slate-800/50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className={`size-8 rounded-full flex items-center justify-center font-bold text-sm ${
                          index === 0 ? 'bg-amber-100 text-amber-700 dark:text-amber-400' :
                          index === 1 ? 'bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-slate-300 dark:text-slate-300' :
                          index === 2 ? 'bg-orange-100 text-orange-700' :
                          'bg-gray-50 text-gray-600 dark:text-slate-300'
                        }`}>
                          {index + 1}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <Link to={`/app/stock/${stock.ticker}`} className="font-medium text-emerald-700 dark:text-emerald-400 hover:text-emerald-800">
                          {stock.ticker}
                        </Link>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">{stock.name}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-slate-300">{stock.sector}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-medium">
                        {formatVND(stock.price)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${getSafetyColor(stock.dividendSafety)}`}>
                          {getSafetyLabel(stock.dividendSafety)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-bold text-emerald-600 dark:text-emerald-400">
                        {stock.dividendYield > 0 ? `${stock.dividendYield.toFixed(1)}%` : 'N/A'}
                      </td>
                      {activeCategory === 'fastest-growth' && (
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-bold text-purple-600 dark:text-purple-400">
                          {formatPercent(stock.dividendGrowth5Y)}
                        </td>
                      )}
                      {activeCategory === 'longest-streak' && (
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-bold text-amber-600 dark:text-amber-400">
                          {stock.dividendStreak} năm
                        </td>
                      )}
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-right">
                        {stock.payoutRatio > 0 ? `${stock.payoutRatio}%` : 'N/A'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Insights */}
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-6 border border-blue-200">
          <h3 className="font-semibold mb-3 text-blue-900">💡 Lưu ý khi chọn cổ phiếu</h3>
          <div className="space-y-2 text-sm text-blue-800">
            {activeCategory === 'highest-yield' && (
              <>
                <p>• Tỷ suất cổ tức cao không phải lúc nào cũng tốt - cần kiểm tra tính bền vững</p>
                <p>• Đảm bảo Payout Ratio ở mức hợp lý (thường {'<'} 70%)</p>
                <p>• Xem xét lịch sử chi trả và triển vọng ngành</p>
              </>
            )}
            {activeCategory === 'safest' && (
              <>
                <p>• Cổ phiếu an toàn thường có dòng tiền ổn định và nợ thấp</p>
                <p>• Lịch sử chi trả cổ tức liên tục là dấu hiệu tích cực</p>
                <p>• Phù hợp cho nhà đầu tư ưu tiên tính ổn định</p>
              </>
            )}
            {activeCategory === 'fastest-growth' && (
              <>
                <p>• Tăng trưởng cổ tức nhanh giúp tăng thu nhập thụ động theo thời gian</p>
                <p>• Cần xem xét khả năng duy trì tốc độ tăng trưởng</p>
                <p>• Kết hợp với Dividend Safety để đảm bảo tính bền vững</p>
              </>
            )}
            {activeCategory === 'longest-streak' && (
              <>
                <p>• Chuỗi tăng trưởng dài chứng tỏ cam kết mạnh mẽ với cổ đông</p>
                <p>• Thường là dấu hiệu của doanh nghiệp có nền tảng vững chắc</p>
                <p>• Phù hợp cho chiến lược đầu tư dài hạn</p>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
