/**
 * Database Utility Functions
 * Centralized functions for interacting with Supabase database
 * 
 * Note: Type checking temporarily disabled while database schema is being developed.
 * This will be re-enabled once the schema stabilizes.
 */

// @ts-nocheck - Temporarily disable type checking for active development

import { supabase } from './client';

// =====================================================================================
// TYPE DEFINITIONS (Flexible for active development)
// =====================================================================================

// Use 'any' temporarily for rapid development
// TODO: Replace with proper Database types after schema stabilizes
export type User = any;
export type UserProfile = any;
export type UserSettings = any;
export type Portfolio = any;
export type Asset = any;
export type Transaction = any;

export type AssetType = string;
export type TransactionType = string;
export type TransactionStatus = string;
export type RiskToleranceLevel = string;
export type UserStatus = string;
export type CurrencyCode = string;

// =====================================================================================
// USER MANAGEMENT
// =====================================================================================

/**
 * Get complete user profile including settings and user data
 */
export async function getUserCompleteProfile(userId: string) {
  const { data, error } = await supabase
    .rpc('get_user_complete_profile', { user_uuid: userId });
  
  if (error) throw error;
  return data;
}

/**
 * Update user's last login timestamp
 */
export async function updateLastLogin(userId: string) {
  const { data, error } = await supabase
    .rpc('update_last_login', { user_uuid: userId });
  
  if (error) throw error;
  return data;
}

/**
 * Complete user onboarding
 */
export async function completeOnboarding(userId: string) {
  const { data, error } = await supabase
    .rpc('complete_onboarding', { user_uuid: userId });
  
  if (error) throw error;
  return data;
}

/**
 * Update user profile
 */
export async function updateUserProfile(
  userId: string, 
  updates: Partial<UserProfile>
) {
  const { data, error } = await supabase
    .from('user_profiles')
    .update(updates)
    .eq('user_id', userId)
    .select()
    .single();
  
  if (error) throw error;
  return data;
}

/**
 * Update user settings
 */
export async function updateUserSettings(
  userId: string, 
  updates: Partial<UserSettings>
) {
  const { data, error } = await supabase
    .from('user_settings')
    .update(updates)
    .eq('user_id', userId)
    .select()
    .single();
  
  if (error) throw error;
  return data;
}

// =====================================================================================
// PORTFOLIO MANAGEMENT
// =====================================================================================

/**
 * Get all portfolios for a user
 */
export async function getUserPortfolios(userId: string) {
  const { data, error } = await supabase
    .from('portfolios')
    .select('*')
    .eq('user_id', userId)
    .order('is_default', { ascending: false })
    .order('created_at', { ascending: false });
  
  if (error) throw error;
  return data;
}

/**
 * Get default portfolio for a user
 */
export async function getDefaultPortfolio(userId: string) {
  const { data, error } = await supabase
    .from('portfolios')
    .select('*')
    .eq('user_id', userId)
    .eq('is_default', true)
    .single();
  
  if (error) throw error;
  return data;
}

/**
 * Create a new portfolio
 */
export async function createPortfolio(
  userId: string,
  portfolio: {
    name: string;
    description?: string;
    currency?: string;
    is_default?: boolean;
  }
) {
  const { data, error } = await supabase
    .from('portfolios')
    .insert({
      user_id: userId,
      ...portfolio,
    })
    .select()
    .single();
  
  if (error) throw error;
  return data;
}

/**
 * Update portfolio
 */
export async function updatePortfolio(
  portfolioId: string,
  updates: Partial<Portfolio>
) {
  const { data, error } = await supabase
    .from('portfolios')
    .update(updates)
    .eq('id', portfolioId)
    .select()
    .single();
  
  if (error) throw error;
  return data;
}

/**
 * Delete portfolio
 */
export async function deletePortfolio(portfolioId: string) {
  const { error } = await supabase
    .from('portfolios')
    .delete()
    .eq('id', portfolioId);
  
  if (error) throw error;
}

/**
 * Get complete portfolio summary with assets, allocation, and transactions
 */
export async function getPortfolioSummary(portfolioId: string) {
  const { data, error } = await supabase
    .rpc('get_portfolio_summary', { portfolio_uuid: portfolioId });
  
  if (error) throw error;
  return data;
}

/**
 * Recalculate portfolio metrics
 */
export async function recalculatePortfolioMetrics(portfolioId: string) {
  const { data, error } = await supabase
    .rpc('recalculate_portfolio_metrics', { portfolio_uuid: portfolioId });
  
  if (error) throw error;
  return data;
}

// =====================================================================================
// ASSET MANAGEMENT
// =====================================================================================

/**
 * Get all assets in a portfolio
 */
export async function getPortfolioAssets(portfolioId: string) {
  const { data, error } = await supabase
    .from('assets')
    .select('*')
    .eq('portfolio_id', portfolioId)
    .order('current_value', { ascending: false, nullsFirst: false });
  
  if (error) throw error;
  return data;
}

/**
 * Get single asset
 */
export async function getAsset(assetId: string) {
  const { data, error } = await supabase
    .from('assets')
    .select('*')
    .eq('id', assetId)
    .single();
  
  if (error) throw error;
  return data;
}

/**
 * Create a new asset
 */
export async function createAsset(
  portfolioId: string,
  userId: string,
  asset: {
    symbol: string;
    name: string;
    asset_type: string;
    quantity?: number;
    average_cost?: number;
    total_cost?: number;
    current_price?: number;
    notes?: string;
  }
) {
  const { data, error } = await supabase
    .from('assets')
    .insert({
      portfolio_id: portfolioId,
      user_id: userId,
      ...asset,
    })
    .select()
    .single();
  
  if (error) throw error;
  return data;
}

/**
 * Update asset
 */
export async function updateAsset(
  assetId: string,
  updates: Partial<Asset>
) {
  const { data, error } = await supabase
    .from('assets')
    .update(updates)
    .eq('id', assetId)
    .select()
    .single();
  
  if (error) throw error;
  return data;
}

/**
 * Delete asset
 */
export async function deleteAsset(assetId: string) {
  const { error } = await supabase
    .from('assets')
    .delete()
    .eq('id', assetId);
  
  if (error) throw error;
}

/**
 * Update asset current price
 */
export async function updateAssetPrice(assetId: string, price: number) {
  const { data, error } = await supabase
    .from('assets')
    .update({
      current_price: price,
      last_price_update: new Date().toISOString(),
    })
    .eq('id', assetId)
    .select()
    .single();
  
  if (error) throw error;
  return data;
}

/**
 * Recalculate asset metrics after transaction changes
 */
export async function recalculateAssetMetrics(assetId: string) {
  const { data, error } = await supabase
    .rpc('recalculate_asset_metrics', { asset_uuid: assetId });
  
  if (error) throw error;
  return data;
}

// =====================================================================================
// TRANSACTION MANAGEMENT
// =====================================================================================

/**
 * Get all transactions for a portfolio
 */
export async function getPortfolioTransactions(
  portfolioId: string,
  limit?: number
) {
  let query = supabase
    .from('transactions')
    .select('*, assets(symbol, name)')
    .eq('portfolio_id', portfolioId)
    .order('transaction_date', { ascending: false });
  
  if (limit) {
    query = query.limit(limit);
  }
  
  const { data, error } = await query;
  
  if (error) throw error;
  return data;
}

/**
 * Get transactions for a specific asset
 */
export async function getAssetTransactions(assetId: string) {
  const { data, error } = await supabase
    .from('transactions')
    .select('*')
    .eq('asset_id', assetId)
    .order('transaction_date', { ascending: false });
  
  if (error) throw error;
  return data;
}

/**
 * Create a new transaction
 */
export async function createTransaction(
  assetId: string,
  portfolioId: string,
  userId: string,
  transaction: {
    transaction_type: string;
    transaction_date: string;
    quantity: number;
    price_per_unit: number;
    total_amount: number;
    fee?: number;
    tax?: number;
    currency?: string;
    notes?: string;
  }
) {
  const { data, error } = await supabase
    .from('transactions')
    .insert({
      asset_id: assetId,
      portfolio_id: portfolioId,
      user_id: userId,
      ...transaction,
    })
    .select()
    .single();
  
  if (error) throw error;
  
  // Recalculate asset metrics after transaction
  await recalculateAssetMetrics(assetId);
  await recalculatePortfolioMetrics(portfolioId);
  
  return data;
}

/**
 * Update transaction
 */
export async function updateTransaction(
  transactionId: string,
  updates: Partial<Transaction>
) {
  // Get current transaction to know which asset/portfolio to recalculate
  const { data: currentTx } = await supabase
    .from('transactions')
    .select('asset_id, portfolio_id')
    .eq('id', transactionId)
    .single();

  const { data, error } = await supabase
    .from('transactions')
    .update(updates)
    .eq('id', transactionId)
    .select()
    .single();
  
  if (error) throw error;
  
  // Recalculate metrics if financial data changed
  if (currentTx && (updates.quantity || updates.price_per_unit || updates.total_amount)) {
    await recalculateAssetMetrics(currentTx.asset_id);
    await recalculatePortfolioMetrics(currentTx.portfolio_id);
  }
  
  return data;
}

/**
 * Delete transaction
 */
export async function deleteTransaction(transactionId: string) {
  // Get transaction details before deleting
  const { data: transaction } = await supabase
    .from('transactions')
    .select('asset_id, portfolio_id')
    .eq('id', transactionId)
    .single();
  
  const { error } = await supabase
    .from('transactions')
    .delete()
    .eq('id', transactionId);
  
  if (error) throw error;
  
  // Recalculate metrics after deletion
  if (transaction) {
    await recalculateAssetMetrics(transaction.asset_id);
    await recalculatePortfolioMetrics(transaction.portfolio_id);
  }
}

// =====================================================================================
// ANALYTICS & INSIGHTS
// =====================================================================================

/**
 * Get asset allocation for a portfolio
 */
export async function getAssetAllocation(portfolioId: string) {
  const { data, error } = await supabase
    .from('assets')
    .select('asset_type, current_value')
    .eq('portfolio_id', portfolioId);
  
  if (error) throw error;
  
  // Group by asset type
  const allocation = data.reduce((acc: any, asset: any) => {
    const type = asset.asset_type;
    if (!acc[type]) {
      acc[type] = { count: 0, total_value: 0 };
    }
    acc[type].count++;
    acc[type].total_value += asset.current_value || 0;
    return acc;
  }, {});
  
  // Calculate percentages
  const totalValue = Object.values(allocation).reduce(
    (sum: number, item: any) => sum + item.total_value, 
    0
  );
  
  return Object.entries(allocation).map(([type, data]: [string, any]) => ({
    asset_type: type,
    count: data.count,
    total_value: data.total_value,
    percentage: totalValue > 0 ? (data.total_value / totalValue) * 100 : 0,
  }));
}

/**
 * Get top performing assets
 */
export async function getTopPerformers(portfolioId: string, limit = 5) {
  const { data, error } = await supabase
    .from('assets')
    .select('*')
    .eq('portfolio_id', portfolioId)
    .not('unrealized_gain_loss_percentage', 'is', null)
    .order('unrealized_gain_loss_percentage', { ascending: false })
    .limit(limit);
  
  if (error) throw error;
  return data;
}

/**
 * Get total dividends for a portfolio
 */
export async function getTotalDividends(portfolioId: string) {
  const { data, error } = await supabase
    .from('transactions')
    .select('total_amount')
    .eq('portfolio_id', portfolioId)
    .in('transaction_type', ['dividend', 'interest']);
  
  if (error) throw error;
  
  const total = data.reduce((sum, t) => sum + (t.total_amount || 0), 0);
  return total;
}

// =====================================================================================
// REALTIME SUBSCRIPTIONS
// =====================================================================================

/**
 * Subscribe to portfolio changes
 */
export function subscribeToPortfolio(
  portfolioId: string,
  callback: (payload: any) => void
) {
  return supabase
    .channel(`portfolio:${portfolioId}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'portfolios',
        filter: `id=eq.${portfolioId}`,
      },
      callback
    )
    .subscribe();
}

/**
 * Subscribe to asset changes in a portfolio
 */
export function subscribeToAssets(
  portfolioId: string,
  callback: (payload: any) => void
) {
  return supabase
    .channel(`assets:${portfolioId}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'assets',
        filter: `portfolio_id=eq.${portfolioId}`,
      },
      callback
    )
    .subscribe();
}

/**
 * Subscribe to transactions in a portfolio
 */
export function subscribeToTransactions(
  portfolioId: string,
  callback: (payload: any) => void
) {
  return supabase
    .channel(`transactions:${portfolioId}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'transactions',
        filter: `portfolio_id=eq.${portfolioId}`,
      },
      callback
    )
    .subscribe();
}
