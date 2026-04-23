import { createBrowserRouter } from "react-router";
import { Navigate } from "react-router";
import { Layout } from "./components/layout";
import { ProtectedRoute } from "./components/protected-route";
import { Landing } from "./pages/landing";
import { Login } from "./pages/login";
import { UserDashboard } from "./pages/user-dashboard";
import { MarketsDashboard } from "./pages/markets-dashboard";
import { StockDetail } from "./pages/stock-detail";
import { DividendCalculator } from "./pages/dividend-calculator";
import { Compare } from "./pages/compare";
import { MyGoal } from "./pages/my-goal";
import { InvestingGuides } from "./pages/investing-guides";
import { TopStocks } from "./pages/top-stocks";
import { DatabaseTest } from "./pages/database-test";
import { PiAI } from "./pages/bee-ai";
import { createElement } from "react";

export const router = createBrowserRouter([
  // Public routes
  {
    path: "/",
    element: createElement(Navigate, { to: "/landing", replace: true }),
  },
  {
    path: "/landing",
    Component: Landing,
  },
  {
    path: "/login",
    Component: Login,
  },
  // Protected app routes (with layout)
  {
    path: "/app",
    element: (
      <ProtectedRoute>
        <Layout />
      </ProtectedRoute>
    ),
    children: [
      { index: true, Component: UserDashboard },
      { path: "markets", Component: MarketsDashboard },
      { path: "pi-ai", Component: PiAI },
      { path: "stock/:ticker", Component: StockDetail },
      { path: "calculator", Component: DividendCalculator },
      { path: "compare", Component: Compare },
      { path: "my-goal", Component: MyGoal },
      { path: "guides", Component: InvestingGuides },
      { path: "top-stocks", Component: TopStocks },
      { path: "database-test", Component: DatabaseTest },
    ],
  },
]);