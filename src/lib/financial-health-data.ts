// Mock Financial Health Data for 5 years (2021-2025)
// Based on a healthy growing company like Vinamilk (VNM)

export const financialHealthData = {
  // EPS (Earnings Per Share) - Growing steadily
  eps: [
    { year: '2021', value: 4900, yoyGrowth: 8.9 },
    { year: '2022', value: 5300, yoyGrowth: 8.2 },
    { year: '2023', value: 5800, yoyGrowth: 9.4 },
    { year: '2024', value: 6200, yoyGrowth: 6.9 },
    { year: '2025E', value: 6900, yoyGrowth: 11.3, isForecast: true }
  ],

  // Dividend Payout Ratio (%) - Should be below 60% for safety
  payoutRatio: [
    { year: '2021', value: 59, yoyGrowth: -4.8 },
    { year: '2022', value: 56, yoyGrowth: -5.1 },
    { year: '2023', value: 54, yoyGrowth: -3.6 },
    { year: '2024', value: 52, yoyGrowth: -3.7 },
    { year: '2025E', value: 55, yoyGrowth: 5.8, isForecast: true }
  ],

  // Shares Outstanding (millions) - Declining = buybacks = good
  sharesOutstanding: [
    { year: '2021', value: 1710, yoyGrowth: -1.2 },
    { year: '2022', value: 1685, yoyGrowth: -1.5 },
    { year: '2023', value: 1665, yoyGrowth: -1.2 },
    { year: '2024', value: 1640, yoyGrowth: -1.5 },
    { year: '2025E', value: 1620, yoyGrowth: -1.2, isForecast: true }
  ],

  // Free Cash Flow (VND billions) - Most important for dividend safety
  fcf: [
    { year: '2021', value: 7800, yoyGrowth: 8.3 },
    { year: '2022', value: 8400, yoyGrowth: 7.7 },
    { year: '2023', value: 9100, yoyGrowth: 8.3 },
    { year: '2024', value: 9800, yoyGrowth: 7.7 },
    { year: '2025E', value: 10900, yoyGrowth: 11.2, isForecast: true }
  ],

  // Revenue (VND billions)
  revenue: [
    { year: '2021', value: 45000, yoyGrowth: 12.5 },
    { year: '2022', value: 49500, yoyGrowth: 10.0 },
    { year: '2023', value: 54000, yoyGrowth: 9.1 },
    { year: '2024', value: 58500, yoyGrowth: 8.3 },
    { year: '2025E', value: 63000, yoyGrowth: 7.7, isForecast: true }
  ],

  // Net Income (VND billions)
  netIncome: [
    { year: '2021', value: 8400, yoyGrowth: 11.3 },
    { year: '2022', value: 9000, yoyGrowth: 7.1 },
    { year: '2023', value: 9700, yoyGrowth: 7.8 },
    { year: '2024', value: 10200, yoyGrowth: 5.2 },
    { year: '2025E', value: 11400, yoyGrowth: 11.8, isForecast: true }
  ]
};

// Color Logic Functions (Can be customized)
export const payoutRatioColorLogic = (value: number, dataPoint: any) => {
  // Forecast gets lighter shade
  if (dataPoint.isForecast) {
    if (value < 60) return '#93c5fd'; // Light blue
    if (value < 90) return '#fcd34d'; // Light yellow
    return '#fca5a5'; // Light red
  }
  
  // Normal coloring
  if (value < 60) return '#3b82f6'; // Blue (Safe)
  if (value < 90) return '#f59e0b'; // Yellow (Caution)
  return '#ef4444'; // Red (Danger)
};

export const sharesOutstandingColorLogic = (value: number, dataPoint: any) => {
  // Declining shares = Green (good for shareholders)
  // Increasing shares = Red (dilution)
  const yoyGrowth = dataPoint.yoyGrowth || 0;
  
  if (dataPoint.isForecast) {
    return yoyGrowth < 0 ? '#86efac' : '#fca5a5'; // Light shades
  }
  
  return yoyGrowth < 0 ? '#10b981' : '#ef4444'; // Normal
};

export const fcfColorLogic = (value: number, dataPoint: any) => {
  if (dataPoint.isForecast) return '#a78bfa'; // Light purple
  return '#8b5cf6'; // Purple
};

export const epsColorLogic = (value: number, dataPoint: any) => {
  if (dataPoint.isForecast) return '#93c5fd'; // Light blue
  return '#3b82f6'; // Blue
};

export const revenueColorLogic = (value: number, dataPoint: any) => {
  if (dataPoint.isForecast) return '#93c5fd'; // Light blue
  return '#3b82f6'; // Blue
};

export const netIncomeColorLogic = (value: number, dataPoint: any) => {
  if (dataPoint.isForecast) return '#86efac'; // Light emerald
  return '#10b981'; // Emerald
};