// ========================================
// WEALBEE - SUPABASE CLIENT
// Singleton Supabase client instance
// ========================================

import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { Database } from './types';
import { projectId, publicAnonKey } from '../../utils/supabase/info';

// Create Supabase client with TypeScript types
export const supabase = createSupabaseClient<Database>(
  `https://${projectId}.supabase.co`,
  publicAnonKey,
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
    },
  }
);

// ========================================
// AUTHENTICATION HELPERS
// ========================================

/**
 * Get authenticated user
 */
export async function getCurrentUser() {
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error) throw error;
  return user;
}

/**
 * Check if user is authenticated
 */
export async function isAuthenticated(): Promise<boolean> {
  const { data: { session } } = await supabase.auth.getSession();
  return !!session;
}

/**
 * Sign out user
 */
export async function signOut() {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

// ========================================
// USER PROFILE HELPERS
// ========================================

/**
 * Get complete user profile (uses RPC function)
 */
export async function getUserProfile() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { data, error } = await supabase.rpc('get_user_complete_profile', {
    user_uuid: user.id
  });

  if (error) throw error;
  return data;
}

/**
 * Update user profile
 */
export async function updateUserProfile(updates: {
  display_name?: string;
  phone_number?: string;
  date_of_birth?: string;
  address?: string;
}) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { data, error } = await supabase
    .from('user_profiles')
    .update(updates)
    .eq('user_id', user.id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

// ========================================
// PORTFOLIO HELPERS
// ========================================

/**
 * Get user's portfolios
 */
export async function getUserPortfolios() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { data, error } = await supabase
    .from('portfolios')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data;
}

/**
 * Create a new portfolio
 */
export async function createPortfolio(portfolio: {
  name: string;
  description?: string;
  visibility?: 'private' | 'public' | 'shared';
  target_amount?: number;
}) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { data, error } = await supabase
    .from('portfolios')
    .insert({
      user_id: user.id,
      ...portfolio
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
  updates: {
    name?: string;
    description?: string;
    visibility?: 'private' | 'public' | 'shared';
    target_amount?: number;
  }
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

// ========================================
// ASSET HELPERS
// ========================================

/**
 * Get portfolio assets with holdings
 */
export async function getPortfolioAssets(portfolioId: string) {
  const { data, error } = await supabase
    .from('holdings')
    .select(`
      *,
      assets (
        id,
        symbol,
        name,
        current_price,
        currency,
        asset_types (
          code,
          name_en,
          name_vi,
          category,
          icon
        )
      )
    `)
    .eq('portfolio_id', portfolioId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data;
}

/**
 * Create a new asset
 */
export async function createAsset(asset: {
  asset_type_id: string;
  symbol: string;
  name: string;
  exchange?: string;
  currency?: string;
}) {
  const { data, error } = await supabase
    .from('assets')
    .insert(asset)
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Create a holding (link asset to portfolio)
 */
export async function createHolding(holding: {
  portfolio_id: string;
  asset_id: string;
  total_shares?: number;
  average_price?: number;
  principal_amount?: number;
  interest_rate?: number;
  maturity_date?: string;
}) {
  const { data, error } = await supabase
    .from('holdings')
    .insert(holding)
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
  updates: {
    name?: string;
    symbol?: string;
    exchange?: string;
    current_price?: number;
  }
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

// ========================================
// TRANSACTION HELPERS
// ========================================

/**
 * Get transactions for an asset
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
 * Get all transactions for a portfolio
 */
export async function getPortfolioTransactions(portfolioId: string) {
  const { data, error } = await supabase
    .from('transactions')
    .select(`
      *,
      assets (
        name,
        symbol,
        asset_type_code
      )
    `)
    .eq('portfolio_id', portfolioId)
    .order('transaction_date', { ascending: false });

  if (error) throw error;
  return data;
}

/**
 * Create a new transaction
 */
export async function createTransaction(transaction: {
  portfolio_id: string;
  asset_id: string;
  transaction_type: 'BUY' | 'SELL' | 'DEPOSIT' | 'WITHDRAW' | 'DIVIDEND' | 'INTEREST';
  quantity?: number;
  price?: number;
  total_amount: number;
  fee?: number;
  tax?: number;
  transaction_date: string;
  notes?: string;
}) {
  const { data, error } = await supabase
    .from('transactions')
    .insert(transaction)
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Update transaction
 */
export async function updateTransaction(
  transactionId: string,
  updates: {
    quantity?: number;
    price?: number;
    total_amount?: number;
    fee?: number;
    tax?: number;
    transaction_date?: string;
    notes?: string;
  }
) {
  const { data, error } = await supabase
    .from('transactions')
    .update(updates)
    .eq('id', transactionId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Delete transaction
 */
export async function deleteTransaction(transactionId: string) {
  const { error } = await supabase
    .from('transactions')
    .delete()
    .eq('id', transactionId);

  if (error) throw error;
}

// ========================================
// ASSET TYPES HELPERS
// ========================================

/**
 * Get all asset types
 */
export async function getAssetTypes() {
  const { data, error } = await supabase
    .from('asset_types')
    .select('*')
    .order('sort_order', { ascending: true });

  if (error) throw error;
  return data;
}

/**
 * Get asset types by category
 */
export async function getAssetTypesByCategory(category: string) {
  const { data, error } = await supabase
    .from('asset_types')
    .select('*')
    .eq('category', category)
    .order('sort_order', { ascending: true });

  if (error) throw error;
  return data;
}

// ========================================
// INCOME & NOTIFICATIONS
// ========================================

/**
 * Get income receipts for a portfolio
 */
export async function getIncomeReceipts(portfolioId: string) {
  const { data, error } = await supabase
    .from('income_receipts')
    .select(`
      *,
      assets (
        name,
        symbol
      )
    `)
    .eq('portfolio_id', portfolioId)
    .order('payment_date', { ascending: false });

  if (error) throw error;
  return data;
}

/**
 * Get user notifications
 */
export async function getUserNotifications(limit?: number) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  let query = supabase
    .from('notifications')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  if (limit) query = query.limit(limit);

  const { data, error } = await query;
  if (error) throw error;
  return data;
}

/**
 * Mark notification as read
 */
export async function markNotificationRead(notificationId: string) {
  const { data, error } = await supabase.rpc('mark_notification_read', {
    p_notification_id: notificationId
  });

  if (error) throw error;
  return data;
}

/**
 * Mark all notifications as read
 */
export async function markAllNotificationsRead() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { data, error } = await supabase.rpc('mark_all_notifications_read', {
    p_user_id: user.id
  });

  if (error) throw error;
  return data;
}
