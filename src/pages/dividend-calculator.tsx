import { useState, useMemo } from 'react';
import { TrendingUp, Zap, PiggyBank, Wallet, AlertTriangle, Info, ChevronRight } from 'lucide-react';
import { formatVND } from '../lib/utils';
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

interface YearlyData {
  year: number;
  label: string;
  totalInvested: number;
  portfolioValue: number;
  dividendIncome: number;
  cumulativeDividend: number;
  profit: number;
  profitPercent: number;
}

interface Scenario {
  name: string;
  returnRate: number;
  dividendYield: number;
  description: string;
  color: string;
  bgColor: string;
  borderColor: string;
}

const SCENARIOS: Scenario[] = [
  {
    name: 'An toàn',
    returnRate: 8,
    dividendYield: 4,
    description: 'Cổ phiếu blue-chip + trái phiếu',
    color: '#10b981',
    bgColor: 'bg-emerald-50 dark:bg-emerald-900/20',
    borderColor: 'border-emerald-200 dark:border-emerald-800',
  },
  {
    name: 'Cân bằng',
    returnRate: 12,
    dividendYield: 3,
    description: 'Kết hợp tăng trưởng & cổ tức',
    color: '#3b82f6',
    bgColor: 'bg-blue-50 dark:bg-blue-900/20',
    borderColor: 'border-blue-200',
  },
  {
    name: 'Tăng trưởng',
    returnRate: 18,
    dividendYield: 1.5,
    description: 'Cổ phiếu tăng trưởng cao',
    color: '#8b5cf6',
    bgColor: 'bg-purple-50 dark:bg-purple-900/20',
    borderColor: 'border-purple-200',
  },
];

const PRESET_AMOUNTS = [
  { label: '3 triệu', value: 3_000_000 },
  { label: '5 triệu', value: 5_000_000 },
  { label: '10 triệu', value: 10_000_000 },
  { label: '20 triệu', value: 20_000_000 },
];

const PRESET_INITIALS = [
  { label: '0', value: 0 },
  { label: '50 triệu', value: 50_000_000 },
  { label: '100 triệu', value: 100_000_000 },
  { label: '500 triệu', value: 500_000_000 },
];

function calculateProjection(
  initialAmount: number,
  monthlyContribution: number,
  annualReturn: number,
  dividendYield: number,
  years: number,
  reinvestDividend: boolean
): YearlyData[] {
  const data: YearlyData[] = [];
  let portfolioValue = initialAmount;
  let totalInvested = initialAmount;
  let cumulativeDividend = 0;

  for (let year = 1; year <= years; year++) {
    for (let month = 1; month <= 12; month++) {
      // Monthly contribution
      portfolioValue += monthlyContribution;
      totalInvested += monthlyContribution;

      // Monthly capital appreciation (return minus dividend yield, as dividend is paid separately)
      const capitalGrowthRate = (annualReturn - dividendYield) / 100 / 12;
      portfolioValue *= (1 + capitalGrowthRate);

      // Monthly dividend
      const monthlyDividend = portfolioValue * (dividendYield / 100 / 12);
      cumulativeDividend += monthlyDividend;

      if (reinvestDividend) {
        portfolioValue += monthlyDividend;
      }
    }

    const annualDividendIncome = portfolioValue * (dividendYield / 100);
    const profit = portfolioValue + (reinvestDividend ? 0 : cumulativeDividend) - totalInvested;

    data.push({
      year,
      label: `Năm ${year}`,
      totalInvested,
      portfolioValue: portfolioValue + (reinvestDividend ? 0 : cumulativeDividend),
      dividendIncome: annualDividendIncome,
      cumulativeDividend,
      profit,
      profitPercent: totalInvested > 0 ? (profit / totalInvested) * 100 : 0,
    });
  }

  return data;
}

function SliderInput({
  label, value, onChange, min, max, step, formatValue, presets
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  min: number;
  max: number;
  step: number;
  formatValue: (v: number) => string;
  presets?: { label: string; value: number }[];
}) {
  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <label className="text-sm font-medium text-gray-700 dark:text-slate-300">{label}</label>
        <span className="text-sm font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20 px-3 py-1 rounded-full">
          {formatValue(value)}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-emerald-600"
      />
      {presets && (
        <div className="flex gap-2 mt-2">
          {presets.map((p) => (
            <button
              key={p.value}
              onClick={() => onChange(p.value)}
              className={`text-xs px-3 py-1.5 rounded-full border transition-all ${
                value === p.value
                  ? 'bg-emerald-600 text-white border-emerald-600'
                  : 'bg-white text-gray-600 dark:text-slate-300 border-gray-200 dark:border-slate-700 hover:border-emerald-300 hover:text-emerald-700 dark:text-emerald-400'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function SummaryCard({
  icon: Icon, title, value, subtitle, bgColor, textColor, iconColor
}: {
  icon: any; title: string; value: string; subtitle?: string;
  bgColor: string; textColor: string; iconColor: string;
}) {
  return (
    <div className={`${bgColor} rounded-xl p-5 border`}>
      <div className="flex items-center gap-2 mb-2">
        <Icon className={`size-4 ${iconColor}`} />
        <p className={`text-xs font-medium ${iconColor}`}>{title}</p>
      </div>
      <p className={`text-2xl font-bold ${textColor}`}>{value}</p>
      {subtitle && <p className={`text-xs mt-1 ${iconColor}`}>{subtitle}</p>}
    </div>
  );
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg border border-gray-200 dark:border-slate-700 dark:border-slate-700 p-4 text-sm">
      <p className="font-semibold text-gray-900 dark:text-white mb-2">{label}</p>
      {payload.map((entry: any, i: number) => (
        <div key={i} className="flex items-center gap-2 mb-1">
          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: entry.color }} />
          <span className="text-gray-600 dark:text-slate-300">{entry.name}:</span>
          <span className="font-medium text-gray-900 dark:text-white">{formatVND(entry.value)}</span>
        </div>
      ))}
    </div>
  );
};

export function DividendCalculator() {
  const [initialAmount, setInitialAmount] = useState(50_000_000);
  const [monthlyContribution, setMonthlyContribution] = useState(5_000_000);
  const [years, setYears] = useState(15);
  const [selectedScenario, setSelectedScenario] = useState(1); // Balanced
  const [reinvestDividend, setReinvestDividend] = useState(true);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [customReturn, setCustomReturn] = useState(12);
  const [customDividendYield, setCustomDividendYield] = useState(3);

  const scenario = SCENARIOS[selectedScenario];
  const returnRate = showAdvanced ? customReturn : scenario.returnRate;
  const dividendYield = showAdvanced ? customDividendYield : scenario.dividendYield;

  const projection = useMemo(
    () => calculateProjection(initialAmount, monthlyContribution, returnRate, dividendYield, years, reinvestDividend),
    [initialAmount, monthlyContribution, returnRate, dividendYield, years, reinvestDividend]
  );

  // Delay cost: what if you wait 3 years?
  const delayProjection = useMemo(
    () => calculateProjection(initialAmount, monthlyContribution, returnRate, dividendYield, Math.max(1, years - 3), reinvestDividend),
    [initialAmount, monthlyContribution, returnRate, dividendYield, years, reinvestDividend]
  );

  // No invest scenario (just saving)
  const savingOnly = useMemo(() => {
    const data: { year: number; label: string; saving: number; investing: number }[] = [];
    for (let y = 1; y <= years; y++) {
      data.push({
        year: y,
        label: `Năm ${y}`,
        saving: initialAmount + monthlyContribution * 12 * y,
        investing: projection[y - 1]?.portfolioValue || 0,
      });
    }
    return data;
  }, [projection, initialAmount, monthlyContribution, years]);

  const finalData = projection[projection.length - 1];
  const totalInvested = finalData?.totalInvested || 0;
  const finalValue = finalData?.portfolioValue || 0;
  const totalProfit = finalData?.profit || 0;
  const monthlyPassiveIncome = (finalData?.dividendIncome || 0) / 12;
  const delayCost = finalValue - (delayProjection[delayProjection.length - 1]?.portfolioValue || 0);

  return (
    <div className="p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="bg-gradient-to-r from-emerald-600 to-teal-600 rounded-2xl p-6 text-white">
          <div className="flex items-center gap-3 mb-2">
            <div className="bg-white/20 rounded-xl p-2">
              <TrendingUp className="size-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold">Máy Tính Tăng Trưởng Đầu Tư</h2>
              <p className="text-emerald-100 text-sm">Xem tiền của bạn tăng trưởng như thế nào theo thời gian</p>
            </div>
          </div>
        </div>

        {/* Input Section */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-sm border border-gray-200 dark:border-slate-700 dark:border-slate-700">
          <div className="space-y-6">
            {/* Initial & Monthly */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <SliderInput
                label="Vốn ban đầu"
                value={initialAmount}
                onChange={setInitialAmount}
                min={0}
                max={2_000_000_000}
                step={10_000_000}
                formatValue={(v) => formatVND(v)}
                presets={PRESET_INITIALS}
              />
              <SliderInput
                label="Đầu tư hàng tháng"
                value={monthlyContribution}
                onChange={setMonthlyContribution}
                min={0}
                max={100_000_000}
                step={1_000_000}
                formatValue={(v) => formatVND(v)}
                presets={PRESET_AMOUNTS}
              />
            </div>

            {/* Years */}
            <SliderInput
              label="Thời gian đầu tư"
              value={years}
              onChange={setYears}
              min={1}
              max={30}
              step={1}
              formatValue={(v) => `${v} năm`}
            />

            {/* Scenario Selection */}
            <div>
              <label className="text-sm font-medium text-gray-700 dark:text-slate-300 mb-3 block">Chiến lược đầu tư</label>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {SCENARIOS.map((s, i) => (
                  <button
                    key={s.name}
                    onClick={() => { setSelectedScenario(i); setShowAdvanced(false); }}
                    className={`text-left p-4 rounded-xl border-2 transition-all ${
                      selectedScenario === i && !showAdvanced
                        ? `${s.bgColor} ${s.borderColor} ring-1`
                        : 'bg-white border-gray-200 dark:border-slate-700 hover:border-gray-300'
                    }`}
                    style={selectedScenario === i && !showAdvanced ? { borderColor: s.color } : {}}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-semibold text-gray-900 dark:text-white">{s.name}</span>
                      <span className="text-xs font-bold px-2 py-0.5 rounded-full" style={{ backgroundColor: s.color + '20', color: s.color }}>
                        {s.returnRate}%/năm
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 dark:text-slate-400">{s.description}</p>
                    <div className="flex gap-3 mt-2 text-xs text-gray-500 dark:text-slate-400">
                      <span>Tổng lãi: {s.returnRate}%</span>
                      <span>Cổ tức: {s.dividendYield}%</span>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Advanced toggle */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="reinvest"
                  checked={reinvestDividend}
                  onChange={(e) => setReinvestDividend(e.target.checked)}
                  className="size-4 text-emerald-600 dark:text-emerald-400 rounded focus:ring-emerald-500 dark:focus:ring-emerald-400"
                />
                <label htmlFor="reinvest" className="text-sm font-medium text-gray-700 dark:text-slate-300">
                  Tái đầu tư cổ tức (DRIP)
                </label>
              </div>
              <button
                onClick={() => setShowAdvanced(!showAdvanced)}
                className="text-sm text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:text-emerald-400 font-medium flex items-center gap-1"
              >
                Tùy chỉnh nâng cao
                <ChevronRight className={`size-4 transition-transform ${showAdvanced ? 'rotate-90' : ''}`} />
              </button>
            </div>

            {/* Advanced Options */}
            {showAdvanced && (
              <div className="bg-gray-50 dark:bg-slate-800/50 rounded-xl p-4 space-y-4 border border-gray-200 dark:border-slate-700 dark:border-slate-700">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <SliderInput
                    label="Lợi nhuận kỳ vọng (%/năm)"
                    value={customReturn}
                    onChange={setCustomReturn}
                    min={1}
                    max={30}
                    step={0.5}
                    formatValue={(v) => `${v}%`}
                  />
                  <SliderInput
                    label="Tỷ suất cổ tức (%/năm)"
                    value={customDividendYield}
                    onChange={setCustomDividendYield}
                    min={0}
                    max={10}
                    step={0.5}
                    formatValue={(v) => `${v}%`}
                  />
                </div>
                <div className="flex items-start gap-2 text-xs text-gray-500 dark:text-slate-400">
                  <Info className="size-4 mt-0.5 flex-shrink-0" />
                  <span>
                    VN-Index trung bình ~12%/năm trong 10 năm qua. Cổ phiếu blue-chip có cổ tức 3-7%/năm.
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <SummaryCard
            icon={Wallet}
            title="Tổng đã đầu tư"
            value={formatVND(totalInvested)}
            subtitle={`${formatVND(monthlyContribution)}/tháng × ${years} năm`}
            bgColor="bg-gray-50 border-gray-200 dark:border-slate-700"
            textColor="text-gray-900 dark:text-white"
            iconColor="text-gray-500 dark:text-slate-400"
          />
          <SummaryCard
            icon={TrendingUp}
            title="Giá trị danh mục"
            value={formatVND(finalValue)}
            subtitle={`Lợi nhuận: ${finalData?.profitPercent.toFixed(0)}%`}
            bgColor="bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800"
            textColor="text-emerald-900"
            iconColor="text-emerald-600 dark:text-emerald-400"
          />
          <SummaryCard
            icon={Zap}
            title="Tổng lợi nhuận"
            value={formatVND(totalProfit)}
            subtitle={`Gấp ${((finalValue / totalInvested) || 0).toFixed(1)}x vốn`}
            bgColor="bg-blue-50 dark:bg-blue-900/20 border-blue-200"
            textColor="text-blue-900"
            iconColor="text-blue-600 dark:text-blue-400"
          />
          <SummaryCard
            icon={PiggyBank}
            title="Thu nhập thụ động/tháng"
            value={formatVND(monthlyPassiveIncome)}
            subtitle={`${formatVND(finalData?.dividendIncome || 0)}/năm`}
            bgColor="bg-amber-50 dark:bg-amber-900/20 border-amber-200"
            textColor="text-amber-900"
            iconColor="text-amber-600 dark:text-amber-400"
          />
        </div>

        {/* Delay Cost Alert */}
        {delayCost > 0 && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 rounded-xl p-4 flex items-start gap-3">
            <AlertTriangle className="size-5 text-red-500 dark:text-red-400 mt-0.5 flex-shrink-0" />
            <div>
              <p className="font-semibold text-red-800">Chi phí chần chừ</p>
              <p className="text-sm text-red-700 mt-0.5">
                Nếu bạn trì hoãn 3 năm mới bắt đầu, bạn sẽ mất <span className="font-bold">{formatVND(delayCost)}</span> so với bắt đầu ngay hôm nay.
                Thời gian là tài sản quý giá nhất của nhà đầu tư!
              </p>
            </div>
          </div>
        )}

        {/* Main Chart - Portfolio Growth */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-sm border border-gray-200 dark:border-slate-700 dark:border-slate-700">
          <h3 className="font-semibold mb-1 text-gray-900 dark:text-white">Dự báo tăng trưởng danh mục</h3>
          <p className="text-sm text-gray-500 dark:text-slate-400 mb-4">So sánh đầu tư vs. chỉ tiết kiệm</p>
          <ResponsiveContainer width="100%" height={400}>
            <AreaChart data={savingOnly}>
              <defs>
                <linearGradient id="investGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#10b981" stopOpacity={0.3} />
                  <stop offset="100%" stopColor="#10b981" stopOpacity={0.05} />
                </linearGradient>
                <linearGradient id="saveGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#94a3b8" stopOpacity={0.2} />
                  <stop offset="100%" stopColor="#94a3b8" stopOpacity={0.05} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="label" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => v >= 1_000_000_000 ? `${(v / 1_000_000_000).toFixed(1)} tỷ` : `${(v / 1_000_000).toFixed(0)} tr`} />
              <Tooltip content={<CustomTooltip />} />
              <Legend />
              <Area type="monotone" dataKey="investing" name="Đầu tư" stroke="#10b981" strokeWidth={2.5} fill="url(#investGrad)" />
              <Area type="monotone" dataKey="saving" name="Chỉ tiết kiệm" stroke="#94a3b8" strokeWidth={2} strokeDasharray="5 5" fill="url(#saveGrad)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Dividend Income Chart */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-sm border border-gray-200 dark:border-slate-700 dark:border-slate-700">
          <h3 className="font-semibold mb-1 text-gray-900 dark:text-white">Thu nhập cổ tức hàng năm</h3>
          <p className="text-sm text-gray-500 dark:text-slate-400 mb-4">Dòng tiền thụ động tăng dần mỗi năm</p>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={projection}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="label" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => v >= 1_000_000_000 ? `${(v / 1_000_000_000).toFixed(1)} tỷ` : `${(v / 1_000_000).toFixed(0)} tr`} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="dividendIncome" name="Thu nhập cổ tức/năm" fill="#f59e0b" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Detail Table */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-gray-200 dark:border-slate-700 dark:border-slate-700">
          <div className="p-6 border-b border-gray-200 dark:border-slate-700 dark:border-slate-700">
            <h3 className="font-semibold text-gray-900 dark:text-white">Chi tiết dự báo theo năm</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-slate-800/50 border-b border-gray-200 dark:border-slate-700 dark:border-slate-700">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-slate-400 uppercase">Năm</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-slate-400 uppercase">Đã đầu tư</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-slate-400 uppercase">Giá trị DM</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-slate-400 uppercase">Cổ tức/năm</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-slate-400 uppercase">Lợi nhuận</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-slate-400 uppercase">% Lợi nhuận</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {projection.map((item) => (
                  <tr key={item.year} className="hover:bg-gray-50 dark:hover:bg-slate-800/50 transition-colors">
                    <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">Năm {item.year}</td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-right text-gray-600 dark:text-slate-300">
                      {formatVND(item.totalInvested)}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-right font-medium text-emerald-700 dark:text-emerald-400">
                      {formatVND(item.portfolioValue)}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-right text-amber-700 dark:text-amber-400">
                      {formatVND(item.dividendIncome)}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-right font-medium text-blue-700">
                      {formatVND(item.profit)}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-right">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                        item.profitPercent >= 100 ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400' :
                        item.profitPercent >= 50 ? 'bg-blue-100 text-blue-700' :
                        item.profitPercent >= 0 ? 'bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-slate-300 dark:text-slate-300' :
                        'bg-red-100 text-red-700'
                      }`}>
                        +{item.profitPercent.toFixed(1)}%
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Insights */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-sm border border-gray-200 dark:border-slate-700 dark:border-slate-700">
          <h3 className="font-semibold mb-4 text-gray-900 dark:text-white flex items-center gap-2">
            <Zap className="size-5 text-amber-500" />
            Insights cho bạn
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-emerald-50 dark:bg-emerald-900/20 rounded-xl p-4 border border-emerald-100">
              <p className="text-sm font-medium text-emerald-800 mb-1">Sức mạnh lãi kép</p>
              <p className="text-xs text-emerald-700 dark:text-emerald-400">
                Lợi nhuận từ đầu tư ({formatVND(totalProfit)})
                {totalInvested > 0 && totalProfit > totalInvested
                  ? ` lớn hơn số tiền bạn bỏ ra (${formatVND(totalInvested)}). Tiền đẻ ra tiền!`
                  : ` sẽ tiếp tục tăng theo thời gian nhờ lãi kép.`
                }
              </p>
            </div>
            <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-4 border border-blue-100">
              <p className="text-sm font-medium text-blue-800 mb-1">Thu nhập thụ động</p>
              <p className="text-xs text-blue-700">
                Sau {years} năm, mỗi tháng bạn nhận được {formatVND(monthlyPassiveIncome)} từ cổ tức
                — {monthlyContribution > 0 ? `gấp ${(monthlyPassiveIncome / monthlyContribution).toFixed(1)}x khoản đầu tư hàng tháng.` : 'không cần làm gì thêm.'}
              </p>
            </div>
            <div className="bg-amber-50 dark:bg-amber-900/20 rounded-xl p-4 border border-amber-100">
              <p className="text-sm font-medium text-amber-800 mb-1">So với gửi tiết kiệm</p>
              <p className="text-xs text-amber-700 dark:text-amber-400">
                Nếu chỉ bỏ ống heo, bạn có {formatVND(initialAmount + monthlyContribution * 12 * years)}.
                Đầu tư giúp bạn có thêm {formatVND(finalValue - (initialAmount + monthlyContribution * 12 * years))}.
              </p>
            </div>
            <div className="bg-purple-50 dark:bg-purple-900/20 rounded-xl p-4 border border-purple-100">
              <p className="text-sm font-medium text-purple-800 mb-1">Bước tiếp theo</p>
              <p className="text-xs text-purple-700">
                Khám phá tab "Thị trường" để tìm cổ phiếu phù hợp, hoặc hỏi Bee AI để được tư vấn chiến lược đầu tư phù hợp với mục tiêu của bạn.
              </p>
            </div>
          </div>
        </div>

        {/* Disclaimer */}
        <div className="text-center text-xs text-gray-400 dark:text-slate-500 pb-4">
          * Kết quả mang tính tham khảo dựa trên giả định tỷ suất lợi nhuận không đổi.
          Đầu tư thực tế có rủi ro và lợi nhuận có thể thay đổi. VN-Index CAGR 10 năm ≈ 12%.
        </div>
      </div>
    </div>
  );
}
