import { useState, useMemo, useEffect, useCallback } from 'react';
import { Info } from 'lucide-react';
import { formatVND } from '../lib/utils';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { supabase } from '../lib/supabase/client';

const db = supabase as any;

interface DividendPayout {
  ticker: string;
  name: string;
  year: number;
  amount: number;
  shares: number;
  exDate: string;
  payDate: string;
  status: 'confirmed' | 'estimated';
  perShare: number;
}

interface DividendTabProps {
  portfolioCurrentValue: number;
  portfolioCost: number;
}

export function DividendTab({ portfolioCurrentValue, portfolioCost }: DividendTabProps) {
  const [selectedYear, setSelectedYear] = useState<number | 'all'>('all');
  const [highlightedItem, setHighlightedItem] = useState<number | null>(null);
  const [payouts, setPayouts] = useState<DividendPayout[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchPayouts = useCallback(async () => {
    try {
      setIsLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await db
        .from('user_dividend_payouts_history')
        .select('name, symbol, status, ex_date, pay_date, shares, per_share, total_payout')
        .eq('user_id', user.id)
        .order('ex_date', { ascending: false });

      if (error) { console.error('DividendTab fetch error:', error); return; }

      const mapped: DividendPayout[] = (data || []).map((r: any) => {
        const exDate = r.ex_date || '';
        const year = exDate ? new Date(exDate).getFullYear() : new Date().getFullYear();
        return {
          ticker: r.symbol,
          name: r.name || r.symbol,
          year,
          amount: Number(r.total_payout) || 0,
          shares: Number(r.shares) || 0,
          exDate,
          payDate: r.pay_date || exDate,
          status: (r.status || 'Confirmed').toLowerCase() === 'confirmed' ? 'confirmed' : 'estimated',
          perShare: Number(r.per_share) || 0,
        };
      });
      setPayouts(mapped);
    } catch (err) {
      console.error('DividendTab error:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { fetchPayouts(); }, [fetchPayouts]);

  const dividendData = useMemo(() => {
    const yearlyData: Record<number, { confirmed: number; estimated: number; payouts: DividendPayout[] }> = {};
    for (const p of payouts) {
      if (!yearlyData[p.year]) yearlyData[p.year] = { confirmed: 0, estimated: 0, payouts: [] };
      if (p.status === 'confirmed') yearlyData[p.year].confirmed += p.amount;
      else yearlyData[p.year].estimated += p.amount;
      yearlyData[p.year].payouts.push(p);
    }
    return yearlyData;
  }, [payouts]);

  const monthlyData = useMemo(() => {
    if (selectedYear === 'all') return null;
    const mb: Record<number, { confirmed: number; estimated: number; payouts: DividendPayout[] }> = {};
    for (let m = 1; m <= 12; m++) mb[m] = { confirmed: 0, estimated: 0, payouts: [] };
    for (const p of dividendData[selectedYear as number]?.payouts || []) {
      const month = new Date(p.payDate).getMonth() + 1;
      if (mb[month]) {
        if (p.status === 'confirmed') mb[month].confirmed += p.amount;
        else mb[month].estimated += p.amount;
        mb[month].payouts.push(p);
      }
    }
    return mb;
  }, [selectedYear, dividendData]);

  const monthlyChartData = useMemo(() => {
    if (!monthlyData) return [];
    return Object.entries(monthlyData).map(([month, data]) => ({
      month: parseInt(month),
      monthName: new Date(2024, parseInt(month) - 1, 1).toLocaleString('vi-VN', { month: 'short' }),
      confirmed: data.confirmed || 0,
      estimated: data.estimated || 0,
    }));
  }, [monthlyData]);

  const chartData = useMemo(() =>
    Object.entries(dividendData)
      .map(([year, data]) => ({ year: parseInt(year), confirmed: data.confirmed, estimated: data.estimated }))
      .sort((a, b) => a.year - b.year),
    [dividendData]
  );

  const metrics = useMemo(() => {
    const currentYear = new Date().getFullYear();
    const cy = dividendData[currentYear];
    const income = cy ? cy.confirmed + cy.estimated : payouts.reduce((s, p) => s + p.amount, 0);
    const portfolioYield = portfolioCurrentValue > 0 ? (income / portfolioCurrentValue) * 100 : null;
    const yieldOnCost = portfolioCost > 0 ? (income / portfolioCost) * 100 : null;
    return { annualIncome: income, monthlyIncome: income / 12, dailyIncome: income / 365, portfolioYield, yieldOnCost };
  }, [payouts, dividendData, portfolioCurrentValue, portfolioCost]);

  const filteredPayouts = useMemo(() => {
    if (selectedYear === 'all') {
      if (highlightedItem !== null) return dividendData[highlightedItem]?.payouts || [];
      return payouts;
    }
    return dividendData[selectedYear as number]?.payouts || [];
  }, [selectedYear, highlightedItem, dividendData, payouts]);

  const years = useMemo(() =>
    ['all' as const, ...Object.keys(dividendData).map(Number).sort((a, b) => b - a)],
    [dividendData]
  );

  const selectedYearTotal = useMemo(() => {
    if (selectedYear === 'all' && highlightedItem !== null) return dividendData[highlightedItem];
    if (selectedYear !== 'all') return dividendData[selectedYear as number];
    return null;
  }, [selectedYear, highlightedItem, dividendData]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[300px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600 mx-auto mb-3"></div>
          <p className="text-gray-500 text-sm">Đang tải dữ liệu cổ tức...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-lg p-5 shadow-sm border border-gray-200">
          <div className="flex items-center gap-2 mb-3">
            <h3 className="text-sm font-medium text-gray-600">Annual income</h3>
            <Info className="size-4 text-gray-400" />
          </div>
          <p className="text-2xl font-bold text-gray-900">{formatVND(metrics.annualIncome)}</p>
          <div className="mt-2 space-y-1">
            <p className="text-sm text-gray-500">{formatVND(metrics.monthlyIncome)} / tháng</p>
            <p className="text-sm text-gray-500">{formatVND(metrics.dailyIncome)} / ngày</p>
          </div>
        </div>
        <div className="bg-white rounded-lg p-5 shadow-sm border border-gray-200">
          <div className="flex items-center gap-2 mb-3">
            <h3 className="text-sm font-medium text-gray-600">Portfolio yield</h3>
            <Info className="size-4 text-gray-400" />
          </div>
          <p className="text-2xl font-bold text-gray-900">
            {metrics.portfolioYield !== null ? `${metrics.portfolioYield.toFixed(2)}%` : '—'}
          </p>
          <p className="text-xs text-gray-400 mt-2">Thu nhập / Giá trị hiện tại</p>
        </div>
        <div className="bg-white rounded-lg p-5 shadow-sm border border-gray-200">
          <div className="flex items-center gap-2 mb-3">
            <h3 className="text-sm font-medium text-gray-600">Yield on cost</h3>
            <Info className="size-4 text-gray-400" />
          </div>
          <p className="text-2xl font-bold text-gray-900">
            {metrics.yieldOnCost !== null ? `${metrics.yieldOnCost.toFixed(2)}%` : '—'}
          </p>
          <p className="text-xs text-gray-400 mt-2">Thu nhập / Giá vốn</p>
        </div>
      </div>

      {/* Chart */}
      <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
        <div className="flex gap-2 mb-6 flex-wrap">
          {years.map(year => (
            <button
              key={year}
              onClick={() => { setSelectedYear(year === 'all' ? 'all' : year as number); setHighlightedItem(null); }}
              className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                selectedYear === year
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
              }`}
            >
              {year === 'all' ? 'All years' : year}
            </button>
          ))}
        </div>

        {payouts.length === 0 ? (
          <div className="h-[200px] flex items-center justify-center text-gray-400 text-sm">
            Chưa có dữ liệu cổ tức. Cổ phiếu trong danh mục cần có bản ghi cổ tức trong hệ thống.
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={300}>
            {selectedYear === 'all' ? (
              <BarChart data={chartData} barCategoryGap="20%" margin={{ top: 5, right: 5, bottom: 5, left: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
                <XAxis dataKey="year" tick={{ fontSize: 13, fill: '#6b7280' }} axisLine={{ stroke: '#e5e7eb' }} tickLine={false} />
                <YAxis tick={{ fontSize: 12, fill: '#6b7280' }} axisLine={false} tickLine={false} tickFormatter={(v) => `${(v / 1000000).toFixed(1)}M`} />
                <Tooltip formatter={(v: number, n: string) => [formatVND(v), n === 'confirmed' ? 'Đã xác nhận' : 'Ước tính']}
                  contentStyle={{ fontSize: '13px', borderRadius: '8px', border: '1px solid #e5e7eb' }} cursor={{ fill: '#f9fafb' }} />
                <Bar dataKey="confirmed" stackId="d" fill="#0ea5e9" radius={[0, 0, 4, 4]} onClick={(d) => d?.year && setHighlightedItem(d.year)} cursor="pointer" />
                <Bar dataKey="estimated" stackId="d" fill="#93c5fd" radius={[4, 4, 0, 0]} onClick={(d) => d?.year && setHighlightedItem(d.year)} cursor="pointer" />
              </BarChart>
            ) : (
              <BarChart data={monthlyChartData} barCategoryGap="15%" margin={{ top: 5, right: 5, bottom: 5, left: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
                <XAxis dataKey="monthName" tick={{ fontSize: 12, fill: '#6b7280' }} axisLine={{ stroke: '#e5e7eb' }} tickLine={false} />
                <YAxis tick={{ fontSize: 12, fill: '#6b7280' }} axisLine={false} tickLine={false} tickFormatter={(v) => `${(v / 1000000).toFixed(1)}M`} />
                <Tooltip formatter={(v: number, n: string) => [formatVND(v), n === 'confirmed' ? 'Đã xác nhận' : 'Ước tính']}
                  labelFormatter={(l) => `Tháng ${l}`} contentStyle={{ fontSize: '13px', borderRadius: '8px', border: '1px solid #e5e7eb' }} cursor={{ fill: '#f9fafb' }} />
                <Bar dataKey="confirmed" stackId="d" fill="#0ea5e9" radius={[0, 0, 4, 4]} onClick={(d) => d?.month && setHighlightedItem(d.month)} cursor="pointer" />
                <Bar dataKey="estimated" stackId="d" fill="#93c5fd" radius={[4, 4, 0, 0]} onClick={(d) => d?.month && setHighlightedItem(d.month)} cursor="pointer" />
              </BarChart>
            )}
          </ResponsiveContainer>
        )}

        <div className="flex items-center gap-6 mt-4 text-xs justify-center">
          <div className="flex items-center gap-2"><div className="w-3 h-3 rounded bg-sky-500"></div><span className="text-gray-600">Đã xác nhận</span></div>
          <div className="flex items-center gap-2"><div className="w-3 h-3 rounded bg-blue-300"></div><span className="text-gray-600">Ước tính</span></div>
        </div>
      </div>

      {/* Payouts Table */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">
            {selectedYear === 'all' ? (highlightedItem !== null ? `${highlightedItem} payouts` : 'All payouts') : `${selectedYear} payouts`}
          </h3>
          {selectedYearTotal && (
            <div className="flex gap-6 mt-3 text-sm">
              <div className="flex items-center gap-2"><div className="w-3 h-3 bg-sky-500 rounded"></div>
                <span className="text-gray-600">{formatVND(selectedYearTotal?.confirmed ?? 0)} confirmed</span></div>
              <div className="flex items-center gap-2"><div className="w-3 h-3 border-2 border-sky-400 rounded"></div>
                <span className="text-gray-600">{formatVND(selectedYearTotal?.estimated ?? 0)} estimated</span></div>
            </div>
          )}
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ex-date</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Pay date</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Shares</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Per share</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Payout</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredPayouts.length === 0 ? (
                <tr><td colSpan={7} className="px-6 py-12 text-center text-gray-400 text-sm">Chưa có dữ liệu cổ tức cho kỳ này.</td></tr>
              ) : (
                filteredPayouts
                  .sort((a, b) => new Date(b.exDate).getTime() - new Date(a.exDate).getTime())
                  .map((payout, idx) => (
                    <tr key={idx} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-3">
                          <div className="size-8 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white font-bold text-xs">
                            {payout.ticker[0]}
                          </div>
                          <div>
                            <div className="font-medium text-sm text-gray-900">{payout.name}</div>
                            <div className="text-xs text-gray-500">{payout.ticker}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {payout.status === 'confirmed' ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-emerald-50 text-emerald-700 rounded-md text-xs font-medium">
                            <svg className="size-3.5" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                            </svg>
                            Confirmed
                          </span>
                        ) : (
                          <span className="px-2.5 py-1 bg-gray-100 text-gray-600 rounded-md text-xs font-medium">Estimated</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        {payout.exDate ? new Date(payout.exDate).toLocaleDateString('vi-VN') : '—'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        {payout.payDate ? new Date(payout.payDate).toLocaleDateString('vi-VN') : '—'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-900">
                        {payout.shares.toLocaleString('vi-VN')}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-900">
                        {formatVND(payout.perShare)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-medium text-gray-900">
                        {formatVND(payout.amount)}
                      </td>
                    </tr>
                  ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}