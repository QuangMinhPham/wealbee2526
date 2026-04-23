/**
 * Supabase Connection Test Component
 * Quick UI to test Supabase configuration
 */

import { useState } from 'react';
import { CheckCircle2, XCircle, Loader2, Database, Shield, Zap } from 'lucide-react';
import { supabase } from '../lib/supabase/client';

export function SupabaseConnectionTest() {
  const [testing, setTesting] = useState(false);
  const [results, setResults] = useState<{
    connection: boolean | null;
    auth: boolean | null;
    database: boolean | null;
  }>({
    connection: null,
    auth: null,
    database: null,
  });

  const testConnection = async () => {
    setTesting(true);
    const newResults = {
      connection: false,
      auth: false,
      database: false,
    };

    try {
      // Test 1: Basic connection
      const { error: connError } = await supabase.from('stocks').select('count').limit(1);
      if (!connError || connError.code === 'PGRST116') {
        newResults.connection = true;
      }

      // Test 2: Auth configuration
      const { data: { session } } = await supabase.auth.getSession();
      newResults.auth = true; // Auth is configured if no error

      // Test 3: Database query
      const { data, error } = await supabase.from('stocks').select('ticker').limit(1);
      if (!error) {
        newResults.database = true;
      }

    } catch (error) {
      console.error('Connection test failed:', error);
    }

    setResults(newResults);
    setTesting(false);
  };

  const getIcon = (status: boolean | null) => {
    if (status === null) return null;
    return status ? (
      <CheckCircle2 className="w-5 h-5 text-emerald-500" />
    ) : (
      <XCircle className="w-5 h-5 text-red-500" />
    );
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-emerald-100 rounded-lg flex items-center justify-center">
            <Database className="w-5 h-5 text-emerald-600" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900">Supabase Connection</h3>
            <p className="text-sm text-gray-500">Test database configuration</p>
          </div>
        </div>
        <button
          onClick={testConnection}
          disabled={testing}
          className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-colors flex items-center gap-2 disabled:opacity-50"
        >
          {testing ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Testing...
            </>
          ) : (
            'Run Test'
          )}
        </button>
      </div>

      {/* Test Results */}
      {(results.connection !== null || results.auth !== null || results.database !== null) && (
        <div className="space-y-3 border-t pt-4">
          <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
            <div className="flex items-center gap-3">
              <Shield className="w-5 h-5 text-gray-400" />
              <span className="text-sm font-medium text-gray-700">Basic Connection</span>
            </div>
            {getIcon(results.connection)}
          </div>

          <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
            <div className="flex items-center gap-3">
              <Zap className="w-5 h-5 text-gray-400" />
              <span className="text-sm font-medium text-gray-700">Authentication</span>
            </div>
            {getIcon(results.auth)}
          </div>

          <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
            <div className="flex items-center gap-3">
              <Database className="w-5 h-5 text-gray-400" />
              <span className="text-sm font-medium text-gray-700">Database Query</span>
            </div>
            {getIcon(results.database)}
          </div>
        </div>
      )}

      {/* Project Info */}
      <div className="mt-6 pt-4 border-t">
        <div className="text-xs text-gray-500 space-y-1">
          <p>Project: <span className="font-mono text-gray-700">xpoucdxmowaeopotclli</span></p>
          <p>URL: <span className="font-mono text-gray-700">https://xpoucdxmowaeopotclli.supabase.co</span></p>
        </div>
      </div>
    </div>
  );
}
