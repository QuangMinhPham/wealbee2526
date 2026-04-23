import { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Shield, TrendingUp, AlertTriangle, CheckCircle, XCircle, Info,
  PieChart, BarChart3, Loader2, RefreshCw, ArrowRight, Zap,
  Target, DollarSign, AlertCircle
} from 'lucide-react';
import { formatVND, getSafetyLabelByScore } from '../lib/utils';
import { supabase } from '../lib/supabase/client';
import { Link } from 'react-router';

const db = supabase as any;

// ────────────────────────────────────────────────────────────────
// Types
// ────────────────────────────────────────────────────────────────
interface Holding {
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
  sector: string;
  exchange: string;
  dividendYield: number;
  annualIncome: number;
  dividendSafetyScore: number | null;
}

interface HealthDimension {
  name: string;
  score: number; // 0–100
  grade: string;
  color: string;
  icon: any;
  details: string;
  warnings: string[];
  tips: string[];
}

interface Warning {
  type: 'danger' | 'warning' | 'info';
  title: string;
  message: string;
  ticker?: string;
}

// ────────────────────────────────────────────────────────────────
// Scoring functions
// ────────────────────────────────────────────────────────────────
function getGrade(score: number): string {
  if (score >= 90) return 'A+';
  if (score >= 80) return 'A';
  if (score >= 70) return 'B+';
  if (score >= 60) return 'B';
  if (score >= 50) return 'C';
  if (score >= 40) return 'D';
  return 'F';
}

function getGradeColor(score: number): string {
  if (score >= 80) return '#10b981';
  if (score >= 60) return '#3b82f6';
  if (score >= 40) return '#f59e0b';
  return '#ef4444';
}

function analyzePortfolio(holdings: Holding[]): {
  overallScore: number;
  dimensions: HealthDimension[];
  warnings: Warning[];
  totalValue: number;
  totalCost: number;
  totalIncome: number;
} {
  if (holdings.length === 0) {
    return {
      overallScore: 0,
      dimensions: [],
      warnings: [],
      totalValue: 0,
      totalCost: 0,
      totalIncome: 0,
    };
  }

  const totalValue = holdings.reduce((s, h) => s + h.currentValue, 0);
  const totalCost = holdings.reduce((s, h) => s + h.totalCost, 0);
  const totalIncome = holdings.reduce((s, h) => s + h.annualIncome, 0);
  const stockHoldings = holdings.filter(h => h.assetType === 'STOCK');
  const warnings: Warning[] = [];

  // ── 1. Diversification Score ──
  const divWarnings: string[] = [];
  const divTips: string[] = [];
  let diversificationScore = 50;

  // Number of holdings
  const holdingCount = holdings.length;
  if (holdingCount >= 10) diversificationScore += 15;
  else if (holdingCount >= 5) diversificationScore += 10;
  else if (holdingCount >= 3) diversificationScore += 5;
  else {
    divWarnings.push(`Chỉ có ${holdingCount} tài sản — quá ít để đa dạng hóa`);
    diversificationScore -= 15;
  }

  // Concentration risk — top holding %
  const sortedByValue = [...holdings].sort((a, b) => b.currentValue - a.currentValue);
  const topHoldingPct = totalValue > 0 ? (sortedByValue[0].currentValue / totalValue) * 100 : 0;
  if (topHoldingPct > 40) {
    diversificationScore -= 20;
    divWarnings.push(`${sortedByValue[0].ticker} chiếm ${topHoldingPct.toFixed(1)}% danh mục — rủi ro tập trung rất cao`);
    warnings.push({
      type: 'danger',
      title: 'Rủi ro tập trung cao',
      message: `${sortedByValue[0].ticker} chiếm ${topHoldingPct.toFixed(1)}% danh mục. Nên giảm xuống dưới 20%.`,
      ticker: sortedByValue[0].ticker,
    });
  } else if (topHoldingPct > 25) {
    diversificationScore -= 10;
    divWarnings.push(`${sortedByValue[0].ticker} chiếm ${topHoldingPct.toFixed(1)}% — nên dưới 20%`);
    warnings.push({
      type: 'warning',
      title: 'Tập trung khá cao',
      message: `${sortedByValue[0].ticker} chiếm ${topHoldingPct.toFixed(1)}% danh mục.`,
      ticker: sortedByValue[0].ticker,
    });
  } else {
    diversificationScore += 10;
  }

  // Sector concentration (stocks only)
  if (stockHoldings.length > 0) {
    const sectorMap = new Map<string, number>();
    for (const h of stockHoldings) {
      sectorMap.set(h.sector, (sectorMap.get(h.sector) || 0) + h.currentValue);
    }
    const stockTotal = stockHoldings.reduce((s, h) => s + h.currentValue, 0);
    const topSectorPct = stockTotal > 0 ? (Math.max(...sectorMap.values()) / stockTotal) * 100 : 0;
    const topSector = [...sectorMap.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] || '';

    if (sectorMap.size >= 4) diversificationScore += 10;
    else if (sectorMap.size <= 1) {
      diversificationScore -= 15;
      divWarnings.push('Chỉ đầu tư 1 ngành — rủi ro ngành cao');
    }

    if (topSectorPct > 60) {
      diversificationScore -= 10;
      divWarnings.push(`Ngành "${topSector}" chiếm ${topSectorPct.toFixed(0)}% cổ phiếu`);
      warnings.push({
        type: 'warning',
        title: 'Thiếu đa dạng ngành',
        message: `Ngành "${topSector}" chiếm ${topSectorPct.toFixed(0)}% danh mục cổ phiếu. Cân nhắc thêm ngành khác.`,
      });
    }
  }

  // Asset type diversity
  const assetTypes = new Set(holdings.map(h => h.assetType));
  if (assetTypes.size >= 3) {
    diversificationScore += 15;
    divTips.push('Tốt! Danh mục có nhiều loại tài sản khác nhau');
  } else if (assetTypes.size === 1) {
    divWarnings.push('Chỉ có 1 loại tài sản — nên thêm vàng, trái phiếu hoặc crypto');
  }

  diversificationScore = Math.max(0, Math.min(100, diversificationScore));

  // ── 2. Dividend Safety Score ──
  const safetyWarnings: string[] = [];
  const safetyTips: string[] = [];
  let safetyScore = 50;

  const scoredStocks = stockHoldings.filter(h => h.dividendSafetyScore !== null);
  if (scoredStocks.length > 0) {
    const weightedSafety = scoredStocks.reduce((s, h) => {
      const weight = totalValue > 0 ? h.currentValue / totalValue : 1 / scoredStocks.length;
      return s + (h.dividendSafetyScore || 0) * weight;
    }, 0);

    safetyScore = Math.round(weightedSafety);

    const riskyStocks = scoredStocks.filter(h => (h.dividendSafetyScore || 0) < 40);
    const safeStocks = scoredStocks.filter(h => (h.dividendSafetyScore || 0) >= 60);

    if (riskyStocks.length > 0) {
      for (const r of riskyStocks) {
        safetyWarnings.push(`${r.ticker} (${getSafetyLabelByScore(r.dividendSafetyScore)}) — cổ tức có thể bị cắt giảm`);
        warnings.push({
          type: 'danger',
          title: `${r.ticker} — Cổ tức rủi ro`,
          message: `Điểm an toàn chỉ ${r.dividendSafetyScore}/100. Cổ tức có thể bị cắt giảm bất cứ lúc nào.`,
          ticker: r.ticker,
        });
      }
    }
    if (safeStocks.length === scoredStocks.length) {
      safetyTips.push('Tuyệt vời! Tất cả cổ phiếu đều có cổ tức an toàn');
    }
  } else if (stockHoldings.length > 0) {
    safetyScore = 50; // neutral
    safetyWarnings.push('Chưa có dữ liệu đánh giá an toàn cổ tức');
  } else {
    safetyScore = 70; // no stocks = neutral-good
    safetyTips.push('Không có cổ phiếu nên không có rủi ro cổ tức');
  }
  safetyScore = Math.max(0, Math.min(100, safetyScore));

  // ── 3. Passive Income Score ──
  const incomeWarnings: string[] = [];
  const incomeTips: string[] = [];
  let incomeScore = 50;

  const overallYield = totalValue > 0 ? (totalIncome / totalValue) * 100 : 0;

  if (overallYield >= 5) {
    incomeScore = 90;
    incomeTips.push(`Tỷ suất ${overallYield.toFixed(1)}% — xuất sắc!`);
  } else if (overallYield >= 3) {
    incomeScore = 75;
    incomeTips.push(`Tỷ suất ${overallYield.toFixed(1)}% — khá tốt`);
  } else if (overallYield >= 1) {
    incomeScore = 55;
    incomeWarnings.push(`Tỷ suất chỉ ${overallYield.toFixed(1)}% — có thể cải thiện`);
  } else {
    incomeScore = 30;
    incomeWarnings.push('Thu nhập thụ động rất thấp hoặc không có');
    warnings.push({
      type: 'info',
      title: 'Thu nhập thụ động thấp',
      message: 'Danh mục gần như không tạo thu nhập thụ động. Cân nhắc thêm cổ phiếu cổ tức hoặc trái phiếu.',
    });
  }

  // Count income-producing assets
  const incomeAssets = holdings.filter(h => h.annualIncome > 0);
  if (incomeAssets.length >= 5) incomeScore += 10;
  if (totalIncome > 0) {
    const monthlyIncome = totalIncome / 12;
    incomeTips.push(`Thu nhập thụ động: ${formatVND(monthlyIncome)}/tháng`);
  }
  incomeScore = Math.max(0, Math.min(100, incomeScore));

  // ── 4. Performance Score ──
  const perfWarnings: string[] = [];
  const perfTips: string[] = [];
  let performanceScore = 50;

  const totalPL = totalValue - totalCost;
  const totalPLPct = totalCost > 0 ? (totalPL / totalCost) * 100 : 0;

  if (totalPLPct >= 20) {
    performanceScore = 90;
    perfTips.push(`Lợi nhuận ${totalPLPct.toFixed(1)}% — tuyệt vời!`);
  } else if (totalPLPct >= 10) {
    performanceScore = 75;
    perfTips.push(`Lợi nhuận ${totalPLPct.toFixed(1)}% — tốt`);
  } else if (totalPLPct >= 0) {
    performanceScore = 60;
    perfTips.push(`Lợi nhuận ${totalPLPct.toFixed(1)}% — ổn định`);
  } else if (totalPLPct >= -10) {
    performanceScore = 40;
    perfWarnings.push(`Đang lỗ ${totalPLPct.toFixed(1)}%`);
  } else {
    performanceScore = 20;
    perfWarnings.push(`Lỗ nặng ${totalPLPct.toFixed(1)}% — cần xem xét lại chiến lược`);
    warnings.push({
      type: 'danger',
      title: 'Danh mục đang lỗ nặng',
      message: `Tổng lỗ ${formatVND(Math.abs(totalPL))} (${totalPLPct.toFixed(1)}%). Cân nhắc cắt lỗ các vị thế yếu.`,
    });
  }

  // Check individual losers
  const bigLosers = holdings.filter(h => h.profitLossPercent < -20);
  for (const loser of bigLosers) {
    perfWarnings.push(`${loser.ticker} đang lỗ ${loser.profitLossPercent.toFixed(1)}%`);
    warnings.push({
      type: 'warning',
      title: `${loser.ticker} lỗ ${loser.profitLossPercent.toFixed(1)}%`,
      message: `Cân nhắc cắt lỗ hoặc mua thêm để hạ giá vốn bình quân.`,
      ticker: loser.ticker,
    });
  }

  // Check big winners
  const bigWinners = holdings.filter(h => h.profitLossPercent > 50);
  for (const winner of bigWinners) {
    perfTips.push(`${winner.ticker} đã tăng ${winner.profitLossPercent.toFixed(0)}%`);
  }
  performanceScore = Math.max(0, Math.min(100, performanceScore));

  // ── 5. Asset Allocation Score ──
  const allocWarnings: string[] = [];
  const allocTips: string[] = [];
  let allocationScore = 50;

  const typeMap = new Map<string, number>();
  for (const h of holdings) {
    typeMap.set(h.assetType, (typeMap.get(h.assetType) || 0) + h.currentValue);
  }

  const stockPct = ((typeMap.get('STOCK') || 0) / totalValue) * 100;
  const goldPct = ((typeMap.get('GOLD') || 0) / totalValue) * 100;
  const cryptoPct = ((typeMap.get('CRYPTO') || 0) / totalValue) * 100;
  const bondPct = (((typeMap.get('BOND') || 0) + (typeMap.get('FIXED_INCOME') || 0)) / totalValue) * 100;

  if (assetTypes.size >= 3) {
    allocationScore += 20;
    allocTips.push('Phân bổ đa dạng qua nhiều loại tài sản');
  } else if (assetTypes.size === 2) {
    allocationScore += 10;
  } else {
    allocWarnings.push('Chỉ đầu tư 1 loại tài sản — thiếu đa dạng');
  }

  if (stockPct > 90) {
    allocationScore -= 10;
    allocWarnings.push('Quá tập trung vào cổ phiếu (>90%)');
    warnings.push({
      type: 'info',
      title: 'Quá tập trung cổ phiếu',
      message: 'Cổ phiếu chiếm hơn 90% danh mục. Cân nhắc thêm vàng hoặc trái phiếu để giảm rủi ro.',
    });
  }

  if (cryptoPct > 30) {
    allocationScore -= 15;
    allocWarnings.push(`Crypto chiếm ${cryptoPct.toFixed(0)}% — rủi ro biến động rất cao`);
    warnings.push({
      type: 'warning',
      title: 'Crypto chiếm tỷ trọng lớn',
      message: `Crypto chiếm ${cryptoPct.toFixed(0)}% danh mục. Khuyến nghị không quá 10-15%.`,
    });
  }

  if (goldPct >= 5 && goldPct <= 20) {
    allocationScore += 10;
    allocTips.push(`Vàng chiếm ${goldPct.toFixed(0)}% — tốt cho phòng thủ`);
  }
  if (bondPct >= 10 && bondPct <= 40) {
    allocationScore += 10;
    allocTips.push(`Trái phiếu chiếm ${bondPct.toFixed(0)}% — tốt cho thu nhập ổn định`);
  }

  allocationScore = Math.max(0, Math.min(100, allocationScore));

  // ── Build dimensions ──
  const dimensions: HealthDimension[] = [
    {
      name: 'Đa dạng hóa',
      score: diversificationScore,
      grade: getGrade(diversificationScore),
      color: getGradeColor(diversificationScore),
      icon: PieChart,
      details: `${holdingCount} tài sản, ${assetTypes.size} loại, top holding ${topHoldingPct.toFixed(0)}%`,
      warnings: divWarnings,
      tips: divTips,
    },
    {
      name: 'An toàn cổ tức',
      score: safetyScore,
      grade: getGrade(safetyScore),
      color: getGradeColor(safetyScore),
      icon: Shield,
      details: scoredStocks.length > 0
        ? `${scoredStocks.filter(s => (s.dividendSafetyScore || 0) >= 60).length}/${scoredStocks.length} cổ phiếu an toàn`
        : 'Chưa có dữ liệu',
      warnings: safetyWarnings,
      tips: safetyTips,
    },
    {
      name: 'Thu nhập thụ động',
      score: incomeScore,
      grade: getGrade(incomeScore),
      color: getGradeColor(incomeScore),
      icon: DollarSign,
      details: `Yield: ${overallYield.toFixed(1)}%, ${formatVND(totalIncome)}/năm`,
      warnings: incomeWarnings,
      tips: incomeTips,
    },
    {
      name: 'Hiệu suất đầu tư',
      score: performanceScore,
      grade: getGrade(performanceScore),
      color: getGradeColor(performanceScore),
      icon: TrendingUp,
      details: `P/L: ${formatVND(totalPL)} (${totalPLPct >= 0 ? '+' : ''}${totalPLPct.toFixed(1)}%)`,
      warnings: perfWarnings,
      tips: perfTips,
    },
    {
      name: 'Phân bổ tài sản',
      score: allocationScore,
      grade: getGrade(allocationScore),
      color: getGradeColor(allocationScore),
      icon: BarChart3,
      details: [
        stockPct > 0 && `CP ${stockPct.toFixed(0)}%`,
        goldPct > 0 && `Vàng ${goldPct.toFixed(0)}%`,
        cryptoPct > 0 && `Crypto ${cryptoPct.toFixed(0)}%`,
        bondPct > 0 && `TP ${bondPct.toFixed(0)}%`,
      ].filter(Boolean).join(' · ') || 'Chưa có dữ liệu',
      warnings: allocWarnings,
      tips: allocTips,
    },
  ];

  const overallScore = Math.round(
    dimensions.reduce((s, d) => s + d.score, 0) / dimensions.length
  );

  return { overallScore, dimensions, warnings, totalValue, totalCost, totalIncome };
}

// ────────────────────��───────────────────────────────────────────
// Components
// ────────────────────────────────────────────────────────────────
function ScoreRing({ score, size = 160 }: { score: number; size?: number }) {
  const radius = (size - 16) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (score / 100) * circumference;
  const color = getGradeColor(score);

  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="#f1f5f9" strokeWidth={12} />
        <circle
          cx={size / 2} cy={size / 2} r={radius} fill="none"
          stroke={color} strokeWidth={12}
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          className="transition-all duration-1000 ease-out"
        />
      </svg>
      <div className="absolute flex flex-col items-center">
        <span className="text-4xl font-bold" style={{ color }}>{score}</span>
        <span className="text-xs text-gray-500 dark:text-slate-400 font-medium">/100</span>
      </div>
    </div>
  );
}

function DimensionCard({ dim, expanded, onToggle }: { dim: HealthDimension; expanded: boolean; onToggle: () => void }) {
  const Icon = dim.icon;
  return (
    <div
      className={`bg-white dark:bg-slate-800 rounded-xl border-2 transition-all cursor-pointer ${
        expanded ? 'border-gray-300 shadow-md' : 'border-gray-100 hover:border-gray-200 dark:border-slate-700'
      }`}
      onClick={onToggle}
    >
      <div className="p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg" style={{ backgroundColor: dim.color + '15' }}>
              <Icon className="size-4" style={{ color: dim.color }} />
            </div>
            <span className="font-semibold text-sm text-gray-900 dark:text-white">{dim.name}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-lg font-bold" style={{ color: dim.color }}>{dim.grade}</span>
            <span className="text-xs text-gray-400 dark:text-slate-500">{dim.score}/100</span>
          </div>
        </div>

        {/* Progress bar */}
        <div className="h-2 bg-gray-100 dark:bg-slate-700 rounded-full overflow-hidden mb-2">
          <div
            className="h-full rounded-full transition-all duration-700 ease-out"
            style={{ width: `${dim.score}%`, backgroundColor: dim.color }}
          />
        </div>
        <p className="text-xs text-gray-500 dark:text-slate-400">{dim.details}</p>
      </div>

      {/* Expanded details */}
      {expanded && (dim.warnings.length > 0 || dim.tips.length > 0) && (
        <div className="border-t border-gray-100 p-4 space-y-2">
          {dim.warnings.map((w, i) => (
            <div key={`w${i}`} className="flex items-start gap-2 text-xs">
              <AlertTriangle className="size-3.5 text-amber-500 mt-0.5 flex-shrink-0" />
              <span className="text-amber-800">{w}</span>
            </div>
          ))}
          {dim.tips.map((t, i) => (
            <div key={`t${i}`} className="flex items-start gap-2 text-xs">
              <CheckCircle className="size-3.5 text-emerald-500 mt-0.5 flex-shrink-0" />
              <span className="text-emerald-800">{t}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function WarningCard({ warning }: { warning: Warning }) {
  const styles = {
    danger: { bg: 'bg-red-50 dark:bg-red-900/20', border: 'border-red-200', icon: XCircle, iconColor: 'text-red-500 dark:text-red-400', titleColor: 'text-red-800', textColor: 'text-red-700' },
    warning: { bg: 'bg-amber-50 dark:bg-amber-900/20', border: 'border-amber-200', icon: AlertTriangle, iconColor: 'text-amber-500', titleColor: 'text-amber-800', textColor: 'text-amber-700 dark:text-amber-400' },
    info: { bg: 'bg-blue-50 dark:bg-blue-900/20', border: 'border-blue-200', icon: Info, iconColor: 'text-blue-500 dark:text-blue-400', titleColor: 'text-blue-800', textColor: 'text-blue-700' },
  };
  const s = styles[warning.type];
  const Icon = s.icon;

  return (
    <div className={`${s.bg} ${s.border} border rounded-xl p-4 flex items-start gap-3`}>
      <Icon className={`size-5 ${s.iconColor} mt-0.5 flex-shrink-0`} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between">
          <p className={`font-semibold text-sm ${s.titleColor}`}>{warning.title}</p>
          {warning.ticker && (
            <Link
              to={`/app/stock/${warning.ticker}`}
              className="text-xs text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
              onClick={(e) => e.stopPropagation()}
            >
              Xem chi tiết <ArrowRight className="size-3" />
            </Link>
          )}
        </div>
        <p className={`text-xs mt-0.5 ${s.textColor}`}>{warning.message}</p>
      </div>
    </div>
  );
}

// ────────────────────────────────────────────────────────────────
// Holdings table for the health check
// ────────────────────────────────────────────────────────────────
function HoldingsHealthTable({ holdings, totalValue }: { holdings: Holding[]; totalValue: number }) {
  const sorted = [...holdings].sort((a, b) => b.currentValue - a.currentValue);

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead className="bg-gray-50 dark:bg-slate-800/50 border-b border-gray-200 dark:border-slate-700 dark:border-slate-700">
          <tr>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-slate-400 uppercase">Tài sản</th>
            <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-slate-400 uppercase">Tỷ trọng</th>
            <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-slate-400 uppercase">Giá trị</th>
            <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-slate-400 uppercase">Lãi/Lỗ</th>
            <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-slate-400 uppercase">Cổ tức</th>
            <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 dark:text-slate-400 uppercase">Sức khỏe</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {sorted.map((h) => {
            const weight = totalValue > 0 ? (h.currentValue / totalValue) * 100 : 0;
            const healthStatus = getHoldingHealth(h, weight);
            return (
              <tr key={h.id} className="hover:bg-gray-50 dark:hover:bg-slate-800/50 transition-colors">
                <td className="px-4 py-3">
                  <Link to={h.assetType === 'STOCK' ? `/app/stock/${h.ticker}` : '#'} className="hover:underline">
                    <span className="font-semibold text-sm text-gray-900 dark:text-white">{h.ticker}</span>
                    <span className="text-xs text-gray-500 dark:text-slate-400 ml-2">{h.name}</span>
                  </Link>
                </td>
                <td className="px-4 py-3 text-right">
                  <div className="flex items-center justify-end gap-2">
                    <div className="w-16 h-1.5 bg-gray-100 dark:bg-slate-700 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${Math.min(100, weight)}%`,
                          backgroundColor: weight > 30 ? '#ef4444' : weight > 20 ? '#f59e0b' : '#10b981'
                        }}
                      />
                    </div>
                    <span className="text-xs font-medium text-gray-700 dark:text-slate-300 w-10 text-right">{weight.toFixed(1)}%</span>
                  </div>
                </td>
                <td className="px-4 py-3 text-right text-sm font-medium text-gray-900 dark:text-white">{formatVND(h.currentValue)}</td>
                <td className="px-4 py-3 text-right">
                  <span className={`text-sm font-medium ${h.profitLoss >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
                    {h.profitLoss >= 0 ? '+' : ''}{h.profitLossPercent.toFixed(1)}%
                  </span>
                </td>
                <td className="px-4 py-3 text-right text-sm text-amber-700 dark:text-amber-400">
                  {h.annualIncome > 0 ? formatVND(h.annualIncome) : '—'}
                </td>
                <td className="px-4 py-3 text-center">
                  <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full ${healthStatus.className}`}>
                    <healthStatus.icon className="size-3" />
                    {healthStatus.label}
                  </span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function getHoldingHealth(h: Holding, weight: number): { label: string; className: string; icon: any } {
  // Multiple factors
  let issues = 0;
  if (weight > 30) issues += 2;
  else if (weight > 20) issues += 1;
  if (h.profitLossPercent < -20) issues += 2;
  else if (h.profitLossPercent < -10) issues += 1;
  if (h.dividendSafetyScore !== null && h.dividendSafetyScore < 40) issues += 1;

  if (issues >= 3) return { label: 'Cần xem xét', className: 'bg-red-100 text-red-700', icon: XCircle };
  if (issues >= 1) return { label: 'Lưu ý', className: 'bg-amber-100 text-amber-700 dark:text-amber-400', icon: AlertCircle };
  return { label: 'Tốt', className: 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400', icon: CheckCircle };
}

// ────────────────────────────────────────────────────────────────
// Main Page
// ────────────────────────────────────────────────────────────────
export function MyGoal() {
  const [holdings, setHoldings] = useState<Holding[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedDim, setExpandedDim] = useState<number | null>(null);

  const fetchPortfolio = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Get user's default portfolio
      const { data: portfolios, error: pErr } = await db
        .from('portfolios')
        .select('*')
        .order('is_default', { ascending: false })
        .order('created_at', { ascending: false });

      if (pErr) throw pErr;
      if (!portfolios || portfolios.length === 0) {
        setHoldings([]);
        setIsLoading(false);
        return;
      }

      const pid = portfolios[0].id;

      // Fetch all asset types + dividend summary
      const [
        { data: stocksData, error: sErr },
        { data: goldData, error: gErr },
        { data: cryptoData, error: cErr },
        { data: fixedData, error: fErr },
        { data: customData, error: cuErr },
        { data: dividendSummary },
      ] = await Promise.all([
        db.from('stocks_assets')
          .select('id, symbol, quantity, average_cost, market_data_stocks(company_name, current_price, industry, exchange)')
          .eq('portfolio_id', pid),
        db.from('gold_assets')
          .select('id, symbol, quantity, average_cost, market_data_gold(name, current_price_buy, current_price_sell)')
          .eq('portfolio_id', pid),
        db.from('crypto_assets')
          .select('id, symbol, quantity, average_cost, market_data_crypto(name, current_price)')
          .eq('portfolio_id', pid),
        db.from('fixed_income_assets')
          .select('id, issuer_name, symbol, principal_amount, interest_rate, status')
          .eq('portfolio_id', pid).eq('status', 'active'),
        db.from('custom_assets')
          .select('id, asset_name, symbol, principal_value, income_amount, payment_frequency, status')
          .eq('portfolio_id', pid).eq('status', 'active'),
        db.from('user_dividend_summary')
          .select('symbol, annual_income, current_yield')
          .eq('portfolio_id', pid),
      ]);

      if (sErr) throw sErr;
      if (gErr) throw gErr;
      if (cErr) throw cErr;
      if (fErr) throw fErr;
      if (cuErr) throw cuErr;

      // Dividend summary map
      const divMap: Record<string, { annual_income: number; current_yield: number }> = {};
      for (const d of dividendSummary || []) {
        divMap[(d as any).symbol] = {
          annual_income: Number((d as any).annual_income) || 0,
          current_yield: Number((d as any).current_yield) || 0,
        };
      }

      // Fetch safety scores
      const stockSymbols = (stocksData || []).map((r: any) => r.symbol).filter(Boolean);
      const safetyMap: Record<string, number | null> = {};
      if (stockSymbols.length > 0) {
        const { data: fundData } = await db
          .from('market_stocks_fundamentals')
          .select('symbol, dividend_safety_score')
          .in('symbol', stockSymbols);
        for (const f of fundData || []) {
          safetyMap[(f as any).symbol] = (f as any).dividend_safety_score != null
            ? Number((f as any).dividend_safety_score) : null;
        }
      }

      const result: Holding[] = [];

      // Map stocks
      for (const row of stocksData || []) {
        const r = row as any;
        const mkt = r.market_data_stocks;
        const qty = Number(r.quantity) || 0;
        const avg = Number(r.average_cost) || 0;
        const price = Number(mkt?.current_price) || avg;
        const cost = qty * avg;
        const value = qty * price;
        const div = divMap[r.symbol] || { annual_income: 0, current_yield: 0 };
        result.push({
          id: r.id, ticker: r.symbol, name: mkt?.company_name || r.symbol,
          assetType: 'STOCK', shares: qty, avgBuyPrice: avg, currentPrice: price,
          totalCost: cost, currentValue: value, profitLoss: value - cost,
          profitLossPercent: cost > 0 ? ((value - cost) / cost) * 100 : 0,
          sector: mkt?.industry || 'Chưa phân loại', exchange: mkt?.exchange || '',
          dividendYield: div.current_yield, annualIncome: div.annual_income,
          dividendSafetyScore: safetyMap[r.symbol] ?? null,
        });
      }

      // Map gold
      for (const row of goldData || []) {
        const r = row as any;
        const mkt = r.market_data_gold;
        const qty = Number(r.quantity) || 0;
        const avg = Number(r.average_cost) || 0;
        const price = (mkt?.current_price_sell != null ? Number(mkt.current_price_sell) : null) ??
          (mkt?.current_price_buy != null ? Number(mkt.current_price_buy) : null) ?? avg;
        const cost = qty * avg;
        const value = qty * price;
        result.push({
          id: r.id, ticker: r.symbol, name: mkt?.name || r.symbol,
          assetType: 'GOLD', shares: qty, avgBuyPrice: avg, currentPrice: price,
          totalCost: cost, currentValue: value, profitLoss: value - cost,
          profitLossPercent: cost > 0 ? ((value - cost) / cost) * 100 : 0,
          sector: 'Vàng', exchange: '', dividendYield: 0, annualIncome: 0,
          dividendSafetyScore: null,
        });
      }

      // Map crypto
      for (const row of cryptoData || []) {
        const r = row as any;
        const mkt = r.market_data_crypto;
        const qty = Number(r.quantity) || 0;
        const avg = Number(r.average_cost) || 0;
        const price = Number(mkt?.current_price) || avg;
        const cost = qty * avg;
        const value = qty * price;
        result.push({
          id: r.id, ticker: r.symbol, name: mkt?.name || r.symbol,
          assetType: 'CRYPTO', shares: qty, avgBuyPrice: avg, currentPrice: price,
          totalCost: cost, currentValue: value, profitLoss: value - cost,
          profitLossPercent: cost > 0 ? ((value - cost) / cost) * 100 : 0,
          sector: 'Crypto', exchange: '', dividendYield: 0, annualIncome: 0,
          dividendSafetyScore: null,
        });
      }

      // Map fixed income
      for (const row of fixedData || []) {
        const r = row as any;
        const principal = Number(r.principal_amount) || 0;
        const rate = Number(r.interest_rate) || 0;
        const income = principal * (rate / 100);
        result.push({
          id: r.id, ticker: r.symbol || 'BOND', name: r.issuer_name || 'Trái phiếu',
          assetType: 'BOND', shares: 1, avgBuyPrice: principal, currentPrice: principal,
          totalCost: principal, currentValue: principal, profitLoss: 0, profitLossPercent: 0,
          sector: 'Trái phiếu', exchange: '', dividendYield: rate, annualIncome: income,
          dividendSafetyScore: null,
        });
      }

      // Map custom assets
      const freqMultiplier: Record<string, number> = { daily: 365, weekly: 52, monthly: 12, quarterly: 4, yearly: 1 };
      for (const row of customData || []) {
        const r = row as any;
        const principal = Number(r.principal_value) || 0;
        const incomePerPeriod = Number(r.income_amount) || 0;
        const mult = freqMultiplier[r.payment_frequency] || 1;
        const income = incomePerPeriod * mult;
        result.push({
          id: r.id, ticker: r.symbol || 'OTHER', name: r.asset_name || 'Tài sản khác',
          assetType: 'OTHER', shares: 1, avgBuyPrice: principal, currentPrice: principal,
          totalCost: principal, currentValue: principal, profitLoss: 0, profitLossPercent: 0,
          sector: 'Khác', exchange: '', dividendYield: principal > 0 ? (income / principal) * 100 : 0,
          annualIncome: income, dividendSafetyScore: null,
        });
      }

      setHoldings(result);
    } catch (err: any) {
      console.error('Portfolio health fetch error:', err);
      setError(err.message || 'Không thể tải dữ liệu');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { fetchPortfolio(); }, [fetchPortfolio]);

  const analysis = useMemo(() => analyzePortfolio(holdings), [holdings]);

  // ── Loading state ──
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="text-center">
          <Loader2 className="size-8 text-emerald-600 dark:text-emerald-400 animate-spin mx-auto mb-3" />
          <p className="text-gray-500 dark:text-slate-400 text-sm">Đang phân tích danh mục...</p>
        </div>
      </div>
    );
  }

  // ── Error state ──
  if (error) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="text-center max-w-md">
          <AlertTriangle className="size-12 text-amber-500 mx-auto mb-4" />
          <h3 className="font-semibold text-lg mb-2">Không thể tải dữ liệu</h3>
          <p className="text-gray-500 dark:text-slate-400 text-sm mb-4">{error}</p>
          <button onClick={fetchPortfolio} className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700">
            Thử lại
          </button>
        </div>
      </div>
    );
  }

  // ── Empty portfolio ──
  if (holdings.length === 0) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="text-center max-w-md">
          <Target className="size-12 text-gray-300 dark:text-slate-600 mx-auto mb-4" />
          <h3 className="font-semibold text-lg mb-2">Chưa có tài sản nào</h3>
          <p className="text-gray-500 dark:text-slate-400 text-sm mb-4">
            Thêm cổ phiếu, vàng, crypto hoặc trái phiếu vào danh mục để Wealbee phân tích sức khỏe đầu tư của bạn.
          </p>
          <Link to="/app" className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 text-sm">
            Đi đến Dashboard <ArrowRight className="size-4" />
          </Link>
        </div>
      </div>
    );
  }

  // ── Main content ──
  return (
    <div className="p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="bg-gradient-to-r from-indigo-600 to-purple-600 rounded-2xl p-6 text-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="bg-white/20 rounded-xl p-2">
                <Shield className="size-6" />
              </div>
              <div>
                <h2 className="text-xl font-bold">Sức Khỏe Danh Mục</h2>
                <p className="text-indigo-200 text-sm">Phân tích chuyên sâu từ dữ liệu thật của bạn</p>
              </div>
            </div>
            <button
              onClick={fetchPortfolio}
              className="p-2 bg-white/20 rounded-lg hover:bg-white/30 transition-colors"
              title="Phân tích lại"
            >
              <RefreshCw className="size-5" />
            </button>
          </div>
        </div>

        {/* Overall Score + Summary */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-sm border border-gray-200 dark:border-slate-700 dark:border-slate-700">
          <div className="flex flex-col md:flex-row items-center gap-8">
            <div className="flex-shrink-0 text-center">
              <ScoreRing score={analysis.overallScore} />
              <p className="mt-2 font-bold text-lg text-gray-900 dark:text-white">
                Điểm: {getGrade(analysis.overallScore)}
              </p>
              <p className="text-xs text-gray-500 dark:text-slate-400">Sức khỏe tổng thể</p>
            </div>

            <div className="flex-1 w-full">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-gray-50 dark:bg-slate-800/50 rounded-xl p-4 border border-gray-100">
                  <p className="text-xs text-gray-500 dark:text-slate-400 mb-1">Tổng giá trị</p>
                  <p className="text-lg font-bold text-gray-900 dark:text-white">{formatVND(analysis.totalValue)}</p>
                </div>
                <div className="bg-gray-50 dark:bg-slate-800/50 rounded-xl p-4 border border-gray-100">
                  <p className="text-xs text-gray-500 dark:text-slate-400 mb-1">Tổng lãi/lỗ</p>
                  <p className={`text-lg font-bold ${analysis.totalValue - analysis.totalCost >= 0 ? 'text-emerald-700 dark:text-emerald-400' : 'text-red-700'}`}>
                    {formatVND(analysis.totalValue - analysis.totalCost)}
                  </p>
                </div>
                <div className="bg-gray-50 dark:bg-slate-800/50 rounded-xl p-4 border border-gray-100">
                  <p className="text-xs text-gray-500 dark:text-slate-400 mb-1">Thu nhập/năm</p>
                  <p className="text-lg font-bold text-amber-700 dark:text-amber-400">{formatVND(analysis.totalIncome)}</p>
                </div>
                <div className="bg-gray-50 dark:bg-slate-800/50 rounded-xl p-4 border border-gray-100">
                  <p className="text-xs text-gray-500 dark:text-slate-400 mb-1">Số tài sản</p>
                  <p className="text-lg font-bold text-blue-700">{holdings.length}</p>
                </div>
              </div>

              {/* Quick message based on score */}
              <div className={`mt-4 p-3 rounded-xl text-sm ${
                analysis.overallScore >= 70
                  ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-800 border border-emerald-100'
                  : analysis.overallScore >= 50
                  ? 'bg-amber-50 dark:bg-amber-900/20 text-amber-800 border border-amber-100'
                  : 'bg-red-50 dark:bg-red-900/20 text-red-800 border border-red-100'
              }`}>
                {analysis.overallScore >= 80 && 'Danh mục rất khỏe mạnh! Tiếp tục duy trì chiến lược hiện tại.'}
                {analysis.overallScore >= 60 && analysis.overallScore < 80 && 'Danh mục khá tốt, nhưng còn một số điểm có thể cải thiện. Xem chi tiết bên dưới.'}
                {analysis.overallScore >= 40 && analysis.overallScore < 60 && 'Danh mục cần cải thiện. Hãy xem các cảnh báo và thực hiện điều chỉnh.'}
                {analysis.overallScore < 40 && 'Danh mục có nhiều vấn đề cần giải quyết ngay. Xem cảnh báo bên dưới.'}
              </div>
            </div>
          </div>
        </div>

        {/* 5 Dimension Cards */}
        <div>
          <h3 className="font-semibold text-gray-900 dark:text-white mb-3">Phân tích 5 chiều</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {analysis.dimensions.map((dim, i) => (
              <DimensionCard
                key={dim.name}
                dim={dim}
                expanded={expandedDim === i}
                onToggle={() => setExpandedDim(expandedDim === i ? null : i)}
              />
            ))}
          </div>
        </div>

        {/* Warnings */}
        {analysis.warnings.length > 0 && (
          <div>
            <h3 className="font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
              <AlertTriangle className="size-5 text-amber-500" />
              Cảnh báo & Đề xuất ({analysis.warnings.length})
            </h3>
            <div className="space-y-3">
              {analysis.warnings.map((w, i) => (
                <WarningCard key={i} warning={w} />
              ))}
            </div>
          </div>
        )}

        {/* Holdings Health Table */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-gray-200 dark:border-slate-700 dark:border-slate-700">
          <div className="p-6 border-b border-gray-200 dark:border-slate-700 dark:border-slate-700">
            <h3 className="font-semibold text-gray-900 dark:text-white">Chi tiết từng tài sản</h3>
            <p className="text-xs text-gray-500 dark:text-slate-400 mt-1">Click vào mã chứng khoán để xem chi tiết</p>
          </div>
          <HoldingsHealthTable holdings={holdings} totalValue={analysis.totalValue} />
        </div>

        {/* Action items */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-sm border border-gray-200 dark:border-slate-700 dark:border-slate-700">
          <h3 className="font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <Zap className="size-5 text-amber-500" />
            Tiếp theo nên làm gì?
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Link
              to="/app/markets"
              className="bg-emerald-50 dark:bg-emerald-900/20 rounded-xl p-4 border border-emerald-100 hover:border-emerald-300 transition-all group"
            >
              <p className="font-medium text-emerald-800 text-sm mb-1 flex items-center gap-2">
                Khám phá thị trường
                <ArrowRight className="size-4 opacity-0 group-hover:opacity-100 transition-opacity" />
              </p>
              <p className="text-xs text-emerald-700 dark:text-emerald-400">Tìm cổ phiếu mới để đa dạng hóa danh mục</p>
            </Link>
            <Link
              to="/app/calculator"
              className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-4 border border-blue-100 hover:border-blue-300 transition-all group"
            >
              <p className="font-medium text-blue-800 text-sm mb-1 flex items-center gap-2">
                Máy tính đầu tư
                <ArrowRight className="size-4 opacity-0 group-hover:opacity-100 transition-opacity" />
              </p>
              <p className="text-xs text-blue-700">Dự báo tăng trưởng danh mục trong tương lai</p>
            </Link>
            <Link
              to="/app/pi-ai"
              className="bg-purple-50 dark:bg-purple-900/20 rounded-xl p-4 border border-purple-100 hover:border-purple-300 transition-all group"
            >
              <p className="font-medium text-purple-800 text-sm mb-1 flex items-center gap-2">
                Hỏi Bee AI
                <ArrowRight className="size-4 opacity-0 group-hover:opacity-100 transition-opacity" />
              </p>
              <p className="text-xs text-purple-700">Nhờ AI tư vấn chiến lược cải thiện danh mục</p>
            </Link>
          </div>
        </div>

        <div className="text-center text-xs text-gray-400 dark:text-slate-500 pb-4">
          * Phân tích dựa trên dữ liệu thời gian thực từ danh mục của bạn.
          Điểm số mang tính tham khảo, không phải lời khuyên đầu tư.
        </div>
      </div>
    </div>
  );
}
