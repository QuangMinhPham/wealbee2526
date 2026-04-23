// ========================================
// PIFIN.AI - DATABASE TEST PAGE
// Page to verify Supabase setup
// ========================================

import { Link } from 'react-router';
import { ArrowLeft, Database } from 'lucide-react';
import { SupabaseTestPanel } from '../components/SupabaseTestPanel';
import { SupabaseConnectionTest } from '../components/supabase-connection-test';

export function DatabaseTest() {
  return (
    <div className="p-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <Link 
          to="/app" 
          className="inline-flex items-center gap-2 text-slate-600 hover:text-slate-900 mb-4 transition-colors"
        >
          <ArrowLeft className="size-4" />
          Back to Home
        </Link>
        
        <div className="flex items-center gap-3 mb-2">
          <Database className="size-8 text-blue-600" />
          <h1 className="text-3xl font-bold text-slate-900">Database Setup Test</h1>
        </div>
        <p className="text-slate-600">
          Verify your Supabase database is properly configured before proceeding with data migration.
        </p>
      </div>

      {/* Quick Connection Test */}
      <div className="mb-6">
        <SupabaseConnectionTest />
      </div>

      {/* Full Test Panel */}
      <SupabaseTestPanel />

      {/* Instructions */}
      <div className="mt-8 space-y-6">
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-6">
          <h2 className="text-lg font-semibold text-blue-900 mb-3">
            📋 Setup Checklist
          </h2>
          <ol className="space-y-2 text-sm text-blue-800">
            <li className="flex items-start gap-2">
              <span className="font-semibold">1.</span>
              <span>
                Open Supabase Dashboard → SQL Editor
              </span>
            </li>
            <li className="flex items-start gap-2">
              <span className="font-semibold">2.</span>
              <span>
                Run <code className="px-1 py-0.5 bg-blue-100 rounded text-xs">001_initial_schema.sql</code>
              </span>
            </li>
            <li className="flex items-start gap-2">
              <span className="font-semibold">3.</span>
              <span>
                Run <code className="px-1 py-0.5 bg-blue-100 rounded text-xs">002_rls_policies.sql</code>
              </span>
            </li>
            <li className="flex items-start gap-2">
              <span className="font-semibold">4.</span>
              <span>
                Run <code className="px-1 py-0.5 bg-blue-100 rounded text-xs">003_seed_test_data.sql</code>
              </span>
            </li>
            <li className="flex items-start gap-2">
              <span className="font-semibold">5.</span>
              <span>
                Click "Run Tests" above to verify everything works
              </span>
            </li>
          </ol>
        </div>

        <div className="bg-slate-50 border border-slate-200 rounded-xl p-6">
          <h2 className="text-lg font-semibold text-slate-900 mb-3">
            🗄️ Database Schema
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <h3 className="font-semibold text-slate-700 mb-2">Core Tables</h3>
              <ul className="space-y-1 text-slate-600">
                <li>• <code>stocks</code> - Master stock data</li>
                <li>• <code>stock_prices</code> - Daily OHLC</li>
                <li>• <code>dividends</code> - Dividend history</li>
                <li>• <code>financials</code> - Financial statements</li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold text-slate-700 mb-2">User Tables</h3>
              <ul className="space-y-1 text-slate-600">
                <li>• <code>user_portfolios</code> - Holdings</li>
                <li>• <code>user_transactions</code> - Trade history</li>
                <li>• <code>data_sync_log</code> - ETL logs</li>
              </ul>
            </div>
          </div>
        </div>

        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-6">
          <h2 className="text-lg font-semibold text-emerald-900 mb-3">
            🚀 Next Steps
          </h2>
          <ol className="space-y-2 text-sm text-emerald-800">
            <li className="flex items-start gap-2">
              <span className="font-semibold">1.</span>
              <span>
                Build ETL scripts to fetch data from Vietnamese stock APIs
              </span>
            </li>
            <li className="flex items-start gap-2">
              <span className="font-semibold">2.</span>
              <span>
                Setup GitHub Actions for automated daily sync
              </span>
            </li>
            <li className="flex items-start gap-2">
              <span className="font-semibold">3.</span>
              <span>
                Replace mock data in frontend with Supabase queries
              </span>
            </li>
            <li className="flex items-start gap-2">
              <span className="font-semibold">4.</span>
              <span>
                Test with real users and iterate based on feedback
              </span>
            </li>
          </ol>
        </div>
      </div>
    </div>
  );
}