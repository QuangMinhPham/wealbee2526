// ========================================
// PIFIN.AI - SUPABASE TYPE DEFINITIONS
// Auto-generated types for database schema
// ========================================

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

// ========================================
// TABLE TYPES
// ========================================

export interface Stock {
  id: string;
  ticker: string;
  name: string;
  name_en?: string;
  sector?: string;
  industry?: string;
  exchange?: 'HOSE' | 'HNX' | 'UPCOM';
  market_cap?: number;
  outstanding_shares?: number;
  current_price?: number;
  logo_url?: string;
  website?: string;
  description?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface StockPrice {
  id: number;
  stock_id: string;
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  value?: number;
  change_amount?: number;
  change_percent?: number;
  foreign_buy?: number;
  foreign_sell?: number;
  created_at: string;
}

export interface Dividend {
  id: string;
  stock_id: string;
  year: number;
  period?: string;
  dividend_per_share: number;
  dividend_type: 'cash' | 'stock' | 'both';
  stock_dividend_ratio?: number;
  dividend_yield?: number;
  payout_ratio?: number;
  announcement_date?: string;
  ex_dividend_date?: string;
  record_date?: string;
  payment_date?: string;
  status: 'announced' | 'confirmed' | 'paid';
  note?: string;
  source_url?: string;
  created_at: string;
  updated_at: string;
}

export interface Financial {
  id: string;
  stock_id: string;
  year: number;
  quarter?: number;
  period_type: 'yearly' | 'quarterly';
  
  // Income Statement
  revenue?: number;
  cost_of_revenue?: number;
  gross_profit?: number;
  operating_expenses?: number;
  operating_income?: number;
  interest_expense?: number;
  pre_tax_income?: number;
  tax_expense?: number;
  net_income?: number;
  ebitda?: number;
  ebit?: number;
  
  // Balance Sheet
  total_assets?: number;
  current_assets?: number;
  non_current_assets?: number;
  cash_and_equivalents?: number;
  inventory?: number;
  accounts_receivable?: number;
  total_liabilities?: number;
  current_liabilities?: number;
  long_term_debt?: number;
  total_equity?: number;
  retained_earnings?: number;
  
  // Cash Flow
  operating_cash_flow?: number;
  investing_cash_flow?: number;
  financing_cash_flow?: number;
  free_cash_flow?: number;
  capital_expenditure?: number;
  
  // Per Share Metrics
  eps?: number;
  book_value_per_share?: number;
  revenue_per_share?: number;
  
  // Ratios
  pe_ratio?: number;
  pb_ratio?: number;
  ps_ratio?: number;
  gross_margin?: number;
  operating_margin?: number;
  net_margin?: number;
  roe?: number;
  roa?: number;
  roic?: number;
  asset_turnover?: number;
  inventory_turnover?: number;
  debt_to_equity?: number;
  debt_to_assets?: number;
  current_ratio?: number;
  quick_ratio?: number;
  
  // Growth Rates
  revenue_growth?: number;
  net_income_growth?: number;
  eps_growth?: number;
  
  created_at: string;
  updated_at: string;
}

export interface DataSyncLog {
  id: string;
  data_type: string;
  sync_type: 'scheduled' | 'manual' | 'backfill';
  status: 'running' | 'success' | 'failed' | 'partial';
  records_processed: number;
  records_success: number;
  records_failed: number;
  started_at: string;
  completed_at?: string;
  duration_seconds?: number;
  error_message?: string;
  error_details?: Json;
  metadata?: Json;
  created_at: string;
}

export interface UserPortfolio {
  id: string;
  user_id: string;
  stock_id: string;
  quantity: number;
  average_price: number;
  first_purchase_date?: string;
  last_transaction_date?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface UserTransaction {
  id: string;
  user_id: string;
  stock_id: string;
  transaction_type: 'buy' | 'sell' | 'dividend';
  quantity: number;
  price: number;
  fee: number;
  fee_percent: number;
  total_amount: number;
  total_with_fee: number;
  transaction_date: string;
  notes?: string;
  broker?: string;
  created_at: string;
  updated_at: string;
}

// ========================================
// VIEW TYPES
// ========================================

export interface LatestStockPrice {
  stock_id: string;
  ticker: string;
  name: string;
  sector: string;
  exchange: string;
  price_date: string;
  current_price: number;
  daily_change: number;
  volume: number;
}

export interface StockSummary {
  id: string;
  ticker: string;
  name: string;
  sector: string;
  exchange: string;
  current_price: number;
  market_cap: number;
  latest_dividend: number;
  dividend_yield: number;
  latest_ex_date: string;
  total_dividends_paid: number;
  price_history_days: number;
}

// ========================================
// JOINED DATA TYPES (for frontend use)
// ========================================

export interface StockWithPrice extends Stock {
  latest_price?: StockPrice;
  price_change_1d?: number;
  price_change_1w?: number;
  price_change_1m?: number;
}

export interface StockWithDividend extends Stock {
  dividends?: Dividend[];
  latest_dividend?: Dividend;
  dividend_streak?: number;
  dividend_growth_5y?: number;
}

export interface StockWithFinancials extends Stock {
  financials?: Financial[];
  latest_financials?: Financial;
}

export interface StockDetail extends Stock {
  latest_price?: StockPrice;
  price_history?: StockPrice[];
  dividends?: Dividend[];
  financials?: Financial[];
}

export interface PortfolioWithStock extends UserPortfolio {
  stock?: Stock;
  current_price?: number;
  total_value?: number;
  unrealized_gain?: number;
  unrealized_gain_percent?: number;
}

export interface TransactionWithStock extends UserTransaction {
  stock?: Stock;
}

// ========================================
// API RESPONSE TYPES
// ========================================

export interface ApiResponse<T> {
  data?: T;
  error?: {
    message: string;
    code?: string;
    details?: any;
  };
}

export interface PaginatedResponse<T> {
  data: T[];
  count: number;
  page: number;
  page_size: number;
  total_pages: number;
}

// ========================================
// DATABASE ENUMS
// ========================================

export enum Exchange {
  HOSE = 'HOSE',
  HNX = 'HNX',
  UPCOM = 'UPCOM'
}

export enum DividendType {
  Cash = 'cash',
  Stock = 'stock',
  Both = 'both'
}

export enum DividendStatus {
  Announced = 'announced',
  Confirmed = 'confirmed',
  Paid = 'paid'
}

export enum TransactionType {
  Buy = 'buy',
  Sell = 'sell',
  Dividend = 'dividend'
}

export enum SyncStatus {
  Running = 'running',
  Success = 'success',
  Failed = 'failed',
  Partial = 'partial'
}

// ========================================
// FILTER & SORT TYPES
// ========================================

export interface StockFilter {
  exchange?: Exchange[];
  sector?: string[];
  min_market_cap?: number;
  max_market_cap?: number;
  min_dividend_yield?: number;
  has_dividend?: boolean;
  is_active?: boolean;
}

export interface StockSort {
  field: 'ticker' | 'market_cap' | 'current_price' | 'dividend_yield';
  direction: 'asc' | 'desc';
}

export interface DateRange {
  from: string;
  to: string;
}

// ========================================
// CHART DATA TYPES
// ========================================

export interface ChartDataPoint {
  date: string;
  value: number;
  label?: string;
}

export interface DividendHistoryChart {
  year: number;
  dividend_per_share: number;
  dividend_yield: number;
  payout_ratio: number;
}

export interface FinancialChart {
  year: number;
  quarter?: number;
  value: number;
  yoyGrowth?: number;
  isForecast?: boolean;
}

// ========================================
// UTILITY TYPES
// ========================================

export type DatabaseTable = 
  | 'stocks'
  | 'stock_prices'
  | 'dividends'
  | 'financials'
  | 'data_sync_log'
  | 'user_portfolios'
  | 'user_transactions';

export type DatabaseView = 
  | 'v_latest_stock_prices'
  | 'v_stock_summary';

// ========================================
// SUPABASE CLIENT TYPES
// ========================================

export interface Database {
  public: {
    Tables: {
      stocks: {
        Row: Stock;
        Insert: Omit<Stock, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<Stock, 'id' | 'created_at'>>;
      };
      stock_prices: {
        Row: StockPrice;
        Insert: Omit<StockPrice, 'id' | 'created_at'>;
        Update: Partial<Omit<StockPrice, 'id' | 'created_at'>>;
      };
      dividends: {
        Row: Dividend;
        Insert: Omit<Dividend, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<Dividend, 'id' | 'created_at'>>;
      };
      financials: {
        Row: Financial;
        Insert: Omit<Financial, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<Financial, 'id' | 'created_at'>>;
      };
      data_sync_log: {
        Row: DataSyncLog;
        Insert: Omit<DataSyncLog, 'id' | 'created_at'>;
        Update: Partial<Omit<DataSyncLog, 'id'>>;
      };
      user_portfolios: {
        Row: UserPortfolio;
        Insert: Omit<UserPortfolio, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<UserPortfolio, 'id' | 'created_at'>>;
      };
      user_transactions: {
        Row: UserTransaction;
        Insert: Omit<UserTransaction, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<UserTransaction, 'id' | 'created_at'>>;
      };
    };
    Views: {
      v_latest_stock_prices: {
        Row: LatestStockPrice;
      };
      v_stock_summary: {
        Row: StockSummary;
      };
    };
    Functions: {
      get_dividend_streak: {
        Args: { p_stock_id: string };
        Returns: number;
      };
      get_dividend_growth_5y: {
        Args: { p_stock_id: string };
        Returns: number;
      };
    };
  };
}
