import { useMemo, useState } from 'react';
import { PieChart as RechartsPie, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { formatVND } from '../lib/utils';

// Modern Financial Palette — Indigo · Teal · Amber · Emerald accents
const ASSET_COLORS = [
  '#6366f1', // indigo-500
  '#14b8a6', // teal-500
  '#f59e0b', // amber-500
  '#10b981', // emerald-500
  '#8b5cf6', // violet-500
  '#06b6d4', // cyan-500
];
const SECTOR_COLORS = [
  '#6366f1', // indigo-500
  '#14b8a6', // teal-500
  '#f59e0b', // amber-500
  '#10b981', // emerald-500
  '#8b5cf6', // violet-500
  '#06b6d4', // cyan-500
  '#f97316', // orange-500
  '#84cc16', // lime-500
  '#ec4899', // pink-500
  '#0ea5e9', // sky-500
];
// HOSE → Indigo, HNX → Teal, UPCOM → Amber, Khác → gray
const EXCHANGE_COLOR_MAP: Record<string, string> = {
  HOSE:  '#6366f1', // indigo-500
  HNX:   '#14b8a6', // teal-500
  UPCOM: '#f59e0b', // amber-500
};
const EXCHANGE_FALLBACK_COLOR = '#9ca3af'; // gray-400

// Minimal shape required by this component
interface HoldingForDiversification {
  currentValue: number;
  assetType?: string;
  sector: string;
  exchange?: string;
}

interface DiversificationTabProps {
  holdings: HoldingForDiversification[];
}

export function DiversificationTab({ holdings }: DiversificationTabProps) {
  const [activeSubTab, setActiveSubTab] = useState<'sectors' | 'classes' | 'exchanges'>('sectors');

  // Calculate total portfolio value
  const portfolioValue = useMemo(() => 
    holdings.reduce((sum, h) => sum + h.currentValue, 0), 
    [holdings]
  );

  // Normalise assetType: accept both 'STOCK' and 'stock', etc.
  const normalizeType = (t?: string) => (t || '').toLowerCase();

  // Calculate total stock value for sectors and exchanges
  const stockPortfolioValue = useMemo(() => 
    holdings.filter(h => ['stock', 'etf', 'fund'].includes(normalizeType(h.assetType))).reduce((sum, h) => sum + h.currentValue, 0), 
    [holdings]
  );

  // Asset type allocation
  const assetData = useMemo(() => {
    const distribution = holdings.reduce((acc, h) => {
      const t = normalizeType(h.assetType);
      const type = t === 'stock' || t === 'etf' ? 'Cổ phiếu' :
                   t === 'fund' ? 'Quỹ đầu tư' :
                   t === 'gold' ? 'Vàng' :
                   t === 'crypto' ? 'Crypto' :
                   t === 'bond' ? 'Trái phiếu' :
                   t === 'real-estate' || t === 'real_estate' ? 'Bất động sản' : 'Khác';
      acc[type] = (acc[type] || 0) + h.currentValue;
      return acc;
    }, {} as Record<string, number>);

    return Object.entries(distribution)
      .map(([name, value], idx) => ({
        name,
        value,
        percentage: portfolioValue > 0 ? (value / portfolioValue) * 100 : 0,
        color: ASSET_COLORS[idx % ASSET_COLORS.length]
      }))
      .sort((a, b) => b.value - a.value);
  }, [holdings, portfolioValue]);

  // Sector allocation - Top 5 + Others (only for stocks)
  // Percentage calculated based on total stock value
  const sectorData = useMemo(() => {
    // Filter only stock/ETF/fund holdings
    const stockHoldings = holdings.filter(h => ['stock', 'etf', 'fund'].includes(normalizeType(h.assetType)));
    
    const distribution = stockHoldings.reduce((acc, h) => {
      acc[h.sector] = (acc[h.sector] || 0) + h.currentValue;
      return acc;
    }, {} as Record<string, number>);

    // Sort by value descending
    const sorted = Object.entries(distribution)
      .sort(([, a], [, b]) => b - a);
    
    // Take top 5 and group others
    const top5 = sorted.slice(0, 5);
    const others = sorted.slice(5);
    
    const result = top5.map(([name, value], idx) => ({
      name,
      value,
      percentage: stockPortfolioValue > 0 ? (value / stockPortfolioValue) * 100 : 0,
      color: SECTOR_COLORS[idx % SECTOR_COLORS.length]
    }));
    
    // Add "Others" if there are more than 5 sectors
    if (others.length > 0) {
      const othersValue = others.reduce((sum, [, val]) => sum + val, 0);
      result.push({
        name: 'Khác',
        value: othersValue,
        percentage: stockPortfolioValue > 0 ? (othersValue / stockPortfolioValue) * 100 : 0,
        color: '#9ca3af' // gray-400
      });
    }
    
    return result;
  }, [holdings, stockPortfolioValue]);

  // Exchange allocation
  // Percentage calculated based on total stock value
  const exchangeData = useMemo(() => {
    const distribution = holdings
      .filter(h => ['stock', 'etf', 'fund'].includes(normalizeType(h.assetType))) // Only stocks have exchanges
      .reduce((acc, h) => {
        // Normalise: 'HOSE', 'HNX', 'UPCOM' (uppercase, trim)
        const raw = (h.exchange || '').toUpperCase().trim();
        const exch = raw === 'HOSE' || raw === 'HNX' || raw === 'UPCOM' ? raw : 'Khác';
        acc[exch] = (acc[exch] || 0) + h.currentValue;
        return acc;
      }, {} as Record<string, number>);

    const result = Object.entries(distribution)
      .map(([name, value]) => ({
        name,
        value,
        percentage: stockPortfolioValue > 0 ? (value / stockPortfolioValue) * 100 : 0,
        color: EXCHANGE_COLOR_MAP[name] ?? EXCHANGE_FALLBACK_COLOR,
      }))
      .sort((a, b) => b.value - a.value);

    // Show placeholder rows if no stock data yet
    if (result.length === 0) {
      return [
        { name: 'HOSE',  value: 0, percentage: 0, color: EXCHANGE_COLOR_MAP['HOSE'] },
        { name: 'HNX',   value: 0, percentage: 0, color: EXCHANGE_COLOR_MAP['HNX'] },
        { name: 'UPCOM', value: 0, percentage: 0, color: EXCHANGE_COLOR_MAP['UPCOM'] },
      ];
    }

    return result;
  }, [holdings, stockPortfolioValue]);

  // Get active data based on sub-tab
  const activeData = activeSubTab === 'sectors' ? sectorData : 
                      activeSubTab === 'classes' ? assetData : 
                      exchangeData;

  const activeTitle = activeSubTab === 'sectors' ? 'Phân bổ theo ngành' :
                      activeSubTab === 'classes' ? 'Phân bổ theo loại tài sản' :
                      'Phân bổ theo sàn giao dịch';

  return (
    <div className="space-y-6">
      {/* Sub-tab Navigation */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="flex border-b border-gray-200">
          <button
            onClick={() => setActiveSubTab('sectors')}
            className={`flex-1 px-6 py-4 font-medium text-sm transition-colors border-b-2 ${
              activeSubTab === 'sectors'
                ? 'border-purple-600 text-purple-600 bg-purple-50'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'
            }`}
          >
            Phân bổ theo ngành
          </button>
          <button
            onClick={() => setActiveSubTab('classes')}
            className={`flex-1 px-6 py-4 font-medium text-sm transition-colors border-b-2 ${
              activeSubTab === 'classes'
                ? 'border-purple-600 text-purple-600 bg-purple-50'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'
            }`}
          >
            Phân bổ theo loại tài sản
          </button>
          <button
            onClick={() => setActiveSubTab('exchanges')}
            className={`flex-1 px-6 py-4 font-medium text-sm transition-colors border-b-2 ${
              activeSubTab === 'exchanges'
                ? 'border-purple-600 text-purple-600 bg-purple-50'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'
            }`}
          >
            Phân bổ theo sàn
          </button>
        </div>
      </div>

      {/* Chart Display */}
      <div className="bg-white rounded-lg p-8 shadow-sm border border-gray-200">
        <h2 className="text-xl font-semibold mb-8 text-gray-900">{activeTitle}</h2>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          {/* Donut Chart */}
          <div className="flex items-center justify-center">
            <ResponsiveContainer width="100%" height={320}>
              <RechartsPie>
                <Pie
                  data={activeData}
                  cx="50%"
                  cy="50%"
                  innerRadius={80}
                  outerRadius={140}
                  paddingAngle={2}
                  dataKey="value"
                >
                  {activeData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip 
                  formatter={(value: number) => formatVND(value)}
                  contentStyle={{ 
                    backgroundColor: 'rgba(255, 255, 255, 0.98)',
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                    fontSize: '12px',
                    boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
                  }}
                />
              </RechartsPie>
            </ResponsiveContainer>
          </div>

          {/* Horizontal Bar Chart */}
          <div className="space-y-4">
            {activeData.map((item, idx) => (
              <div key={idx} className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-3">
                    <div className="w-3 h-3 rounded" style={{ backgroundColor: item.color }}></div>
                    <span className="text-gray-700 font-medium">{item.name}</span>
                  </div>
                  <span className="text-gray-900 font-semibold">{item.percentage.toFixed(1)}%</span>
                </div>
                <div className="relative w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div 
                    className="absolute left-0 top-0 h-full rounded-full transition-all duration-500"
                    style={{ 
                      width: `${item.percentage}%`,
                      backgroundColor: item.color
                    }}
                  ></div>
                </div>
                <div className="text-right text-xs text-gray-500">
                  {formatVND(item.value)}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}