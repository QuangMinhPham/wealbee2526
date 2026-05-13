import { createBrowserRouter, Navigate } from "react-router";
import { Layout } from "./components/layout";
import { ProtectedRoute } from "./components/protected-route";
import { Landing } from "./pages/landing";
import { Login } from "./pages/login";
import LandingPage from "./pages/landing/LandingPage";
import OnboardingPage from "./pages/landing/OnboardingPage";
import PricingPage from "./pages/landing/PricingPage";
import FeedbackPage from "./pages/landing/FeedbackPage";
import UnsubscribePage from "./pages/landing/UnsubscribePage";
import BlogListPage from "./pages/landing/blog/BlogListPage";
import BlogPostPage from "./pages/landing/blog/BlogPostPage";
import { UserDashboard } from "./pages/user-dashboard";
import { IntelligenceFeed } from "./pages/intelligence-feed";
import { ResearchDesk } from "./pages/research-desk";
import { AdminDailyReview } from "./pages/admin-daily-review";
import { NotFound } from "./pages/not-found";

export const router = createBrowserRouter([
  // Public routes
  {
    path: "/",
    Component: LandingPage,
  },
  {
    path: "/start",
    Component: OnboardingPage,
  },
  {
    path: "/pricing",
    Component: PricingPage,
  },
  {
    path: "/feedback",
    Component: FeedbackPage,
  },
  {
    path: "/unsubscribe",
    Component: UnsubscribePage,
  },
  {
    path: "/blog",
    Component: BlogListPage,
  },
  {
    path: "/blog/:slug",
    Component: BlogPostPage,
  },
  {
    path: "/landing-old",
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
      { path: "feed", Component: IntelligenceFeed },
      { path: "research", Component: ResearchDesk },
      { path: "admin/daily-review", Component: AdminDailyReview },
    ],
  },
  // 404 Not Found
  {
    path: "*",
    Component: NotFound,
  },
]);