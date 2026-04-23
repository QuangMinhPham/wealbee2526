export interface Stock {
  id: string;
  ticker: string;
  name: string;
  sector: string;
  exchange: 'HOSE' | 'HNX' | 'UPCOM';
  price: number;
  currency: string;
  dividendYield: number;
  dividendPerShare: number;
  annualPayout: number;
  exDividendDate: string;
  paymentDate: string;
  frequency: 'Annual' | 'Semi-Annual' | 'Quarterly';
  
  // Safety & Growth
  dividendSafety: 'Safe' | 'Unrated' | 'Risky';
  avgDividendYield5Y: number;
  dividendGrowth1Y: number;
  dividendGrowth3Y: number;
  dividendGrowth5Y: number;
  dividendStreak: number;
  payoutRatio: number;
  
  // Financial Metrics
  marketCap: number;
  beta: number;
  revenueYoY: number;
  netIncomeYoY: number;
  fcfYoY: number;
  ebitdaYoY: number;
  debtToEquity: number;
  priceToSMA200: number;
  
  // Historical Data (up to 10 years)
  dividendHistory: DividendHistoryItem[];
  financialHistory: FinancialHistoryItem[];
}

export interface DividendHistoryItem {
  year: number;
  amount: number;
  exDate: string;
  payDate: string;
  yield: number;
}

export interface FinancialHistoryItem {
  year: number;
  revenue: number;
  netIncome: number;
  fcf: number;
  ebitda: number;
  eps: number;
}

export interface PortfolioHolding {
  stockId: string;
  assetType?: 'stock' | 'gold' | 'crypto' | 'bond' | 'real-estate' | 'custom';
  shares: number;
  avgBuyPrice: number;
  totalCost: number;
  currentValue: number;
  totalDividend: number;
  profitLoss: number;
  profitLossPercent: number;
  transactions: Transaction[];
}

export interface Transaction {
  id: string;
  type: 'BUY' | 'SELL';
  stockId: string;
  date: string;
  shares: number;
  price: number;
  fee: number;
  total: number;
}

export interface PortfolioSummary {
  totalValue: number;
  annualIncome: number;
  dividendYield: number;
  irr: number;
  totalPL: number;
  totalPLPercent: number;
  yieldOnCost: number;
}