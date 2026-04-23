// ========================================
// PIFIN.AI - SUPABASE CONNECTION TEST
// Run this to verify database setup
// ========================================

import { supabase } from "./client";

/**
 * Test database connection and schema
 */
export async function testDatabaseConnection() {
  console.log("🔍 Testing Supabase connection...\n");

  const results = {
    connection: false,
    tables: false,
    views: false,
    functions: false,
    data: false,
    rls: false,
  };

  try {
    // Test 1: Basic connection
    console.log("1️⃣ Testing connection...");
    const { error: connError } = await supabase
      .from("stocks")
      .select("count")
      .single();
    if (!connError || connError.code === "PGRST116") {
      results.connection = true;
      console.log("   ✅ Connection successful\n");
    } else {
      throw connError;
    }

    // Test 2: Check tables exist
    console.log("2️⃣ Checking tables...");
    const { data: stocks, error: stocksError } = await supabase
      .from("stocks")
      .select("ticker")
      .limit(1);

    if (!stocksError && stocks) {
      results.tables = true;
      console.log("   ✅ Tables exist and accessible\n");
    }

    // Test 3: Check views
    console.log("3️⃣ Checking views...");
    const { data: summary, error: summaryError } =
      await supabase
        .from("v_stock_summary")
        .select("*")
        .limit(1);

    if (!summaryError && summary) {
      results.views = true;
      console.log("   ✅ Views working\n");
    }

    // Test 4: Check functions
    console.log("4️⃣ Checking functions...");
    const { data: stockWithId } = await supabase
      .from("stocks")
      .select("id")
      .eq("ticker", "VNM")
      .single();

    if (stockWithId) {
      const { data: streak, error: funcError } =
        await supabase.rpc("get_dividend_streak", {
          p_stock_id: stockWithId.id,
        });

      if (!funcError) {
        results.functions = true;
        console.log("   ✅ Functions working\n");
      }
    }

    // Test 5: Check data exists
    console.log("5️⃣ Checking sample data...");
    const { count } = await supabase
      .from("stocks")
      .select("*", { count: "exact", head: true });

    if (count && count > 0) {
      results.data = true;
      console.log(`   ✅ Found ${count} stocks in database\n`);
    }

    // Test 6: Check RLS
    console.log("6️⃣ Checking RLS policies...");
    // Try to read public data (should work)
    const { error: publicReadError } = await supabase
      .from("stocks")
      .select("ticker")
      .limit(1);

    if (!publicReadError) {
      results.rls = true;
      console.log("   ✅ RLS policies active\n");
    }
  } catch (error: any) {
    console.error("❌ Test failed:", error.message);
    return results;
  }

  // Print summary
  console.log("\n" + "=".repeat(50));
  console.log("📊 TEST RESULTS SUMMARY");
  console.log("=".repeat(50));

  const allPassed = Object.values(results).every((v) => v);

  Object.entries(results).forEach(([key, passed]) => {
    console.log(
      `${passed ? "✅" : "❌"} ${key.padEnd(15)} ${passed ? "PASS" : "FAIL"}`,
    );
  });

  console.log("=".repeat(50));

  if (allPassed) {
    console.log("\n🎉 All tests passed! Database is ready.\n");
  } else {
    console.log("\n⚠️  Some tests failed. Check migrations.\n");
  }

  return results;
}

/**
 * Get database statistics
 */
export async function getDatabaseStats() {
  console.log("📊 Fetching database statistics...\n");

  try {
    // Count stocks
    const { count: stockCount } = await supabase
      .from("stocks")
      .select("*", { count: "exact", head: true });

    // Count prices
    const { count: priceCount } = await supabase
      .from("stock_prices")
      .select("*", { count: "exact", head: true });

    // Count dividends
    const { count: dividendCount } = await supabase
      .from("dividends")
      .select("*", { count: "exact", head: true });

    // Count financials
    const { count: financialCount } = await supabase
      .from("financials")
      .select("*", { count: "exact", head: true });

    // Get date range of prices
    const { data: priceRange } = await supabase
      .from("stock_prices")
      .select("date")
      .order("date", { ascending: true })
      .limit(1)
      .single();

    const { data: latestPrice } = await supabase
      .from("stock_prices")
      .select("date")
      .order("date", { ascending: false })
      .limit(1)
      .single();

    console.log("Database Statistics:");
    console.log("─".repeat(50));
    console.log(`Stocks:           ${stockCount || 0}`);
    console.log(`Price Records:    ${priceCount || 0}`);
    console.log(`Dividends:        ${dividendCount || 0}`);
    console.log(`Financials:       ${financialCount || 0}`);

    if (priceRange && latestPrice) {
      console.log(
        `Price Date Range: ${priceRange.date} to ${latestPrice.date}`,
      );
    }

    console.log("─".repeat(50) + "\n");

    return {
      stocks: stockCount,
      prices: priceCount,
      dividends: dividendCount,
      financials: financialCount,
      priceRange: priceRange
        ? {
            from: priceRange.date,
            to: latestPrice?.date,
          }
        : null,
    };
  } catch (error: any) {
    console.error("❌ Failed to fetch stats:", error.message);
    return null;
  }
}

/**
 * Show sample data
 */
export async function showSampleData() {
  console.log("📋 Sample Data:\n");

  try {
    // Show stocks
    const { data: stocks } = await supabase
      .from("v_stock_summary")
      .select(
        "ticker, name, sector, current_price, latest_dividend, dividend_yield",
      )
      .limit(5);

    console.log("Top 5 Stocks:");
    console.log("─".repeat(80));
    console.log(
      "Ticker".padEnd(8) +
        "Name".padEnd(25) +
        "Price".padEnd(12) +
        "Dividend".padEnd(12) +
        "Yield",
    );
    console.log("─".repeat(80));

    stocks?.forEach((s) => {
      console.log(
        s.ticker.padEnd(8) +
          (s.name || "").substring(0, 24).padEnd(25) +
          (
            s.current_price?.toLocaleString("vi-VN") || "N/A"
          ).padEnd(12) +
          (
            s.latest_dividend?.toLocaleString("vi-VN") || "N/A"
          ).padEnd(12) +
          (s.dividend_yield
            ? `${s.dividend_yield.toFixed(2)}%`
            : "N/A"),
      );
    });

    console.log("─".repeat(80) + "\n");

    // Show recent prices for VNM
    const { data: vnmStock } = await supabase
      .from("stocks")
      .select("id")
      .eq("ticker", "VNM")
      .single();

    if (vnmStock) {
      const { data: prices } = await supabase
        .from("stock_prices")
        .select("date, close, volume, change_percent")
        .eq("stock_id", vnmStock.id)
        .order("date", { ascending: false })
        .limit(5);

      console.log("VNM Recent Prices:");
      console.log("─".repeat(60));
      console.log(
        "Date".padEnd(15) +
          "Close".padEnd(15) +
          "Volume".padEnd(15) +
          "Change %",
      );
      console.log("─".repeat(60));

      prices?.forEach((p) => {
        const changeColor =
          p.change_percent && p.change_percent > 0 ? "+" : "";
        console.log(
          p.date.padEnd(15) +
            p.close.toLocaleString("vi-VN").padEnd(15) +
            (p.volume?.toLocaleString("vi-VN") || "N/A").padEnd(
              15,
            ) +
            `${changeColor}${p.change_percent?.toFixed(2)}%`,
        );
      });

      console.log("─".repeat(60) + "\n");
    }
  } catch (error: any) {
    console.error(
      "❌ Failed to fetch sample data:",
      error.message,
    );
  }
}

/**
 * Run all tests
 */
export async function runAllTests() {
  console.log("\n" + "=".repeat(50));
  console.log("🧪 PIFIN.AI - SUPABASE DATABASE TEST SUITE");
  console.log("=".repeat(50) + "\n");

  const testResults = await testDatabaseConnection();

  if (testResults.connection && testResults.data) {
    await getDatabaseStats();
    await showSampleData();
  }

  console.log("✨ Test suite completed!\n");

  return testResults;
}

// Export for use in other files
export default {
  testDatabaseConnection,
  getDatabaseStats,
  showSampleData,
  runAllTests,
};