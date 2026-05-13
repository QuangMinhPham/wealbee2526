import { NavLink, Outlet } from "react-router";
import { Toaster } from "sonner";
import {
  LayoutDashboard, Newspaper,
  FileText, Bell, Settings,
  TrendingUp, ChevronLeft, ChevronRight, Bot,
  Star, Plus, Check, Search, X, Edit2, Trash2, FolderPlus, ChevronDown, LogOut,
} from "lucide-react";
import { useState } from "react";
import { AICopilot } from "./ai-copilot";
import { WealbeeIcon } from "./WealbeeIcon";
import { defaultPortfolios, type Portfolio, type WatchlistItem } from "../lib/mock-platform";
import { useAuth } from "../lib/auth-context";

const navItems = [
  { to: "/app",          icon: LayoutDashboard, label: "Tổng quan danh mục" },
  { to: "/app/feed",     icon: Newspaper,       label: "Luồng tin thông minh" },
  { to: "/app/research", icon: FileText,        label: "Trợ lý nghiên cứu" },
];

const popularStocks = [
  { ticker: "VIC", name: "Vingroup", price: 42100, sector: "Bất động sản" },
  { ticker: "VHM", name: "Vinhomes", price: 38700, sector: "Bất động sản" },
  { ticker: "HPG", name: "Hòa Phát", price: 27950, sector: "Thép" },
  { ticker: "VNM", name: "Vinamilk", price: 62400, sector: "Tiêu dùng" },
  { ticker: "FPT", name: "FPT Corporation", price: 125600, sector: "Công nghệ" },
  { ticker: "VCB", name: "Vietcombank", price: 95800, sector: "Ngân hàng" },
  { ticker: "BID", name: "BIDV", price: 48200, sector: "Ngân hàng" },
  { ticker: "CTG", name: "VietinBank", price: 36500, sector: "Ngân hàng" },
  { ticker: "MBB", name: "MB Bank", price: 28900, sector: "Ngân hàng" },
  { ticker: "TCB", name: "Techcombank", price: 22400, sector: "Ngân hàng" },
  { ticker: "ACB", name: "ACB", price: 23100, sector: "Ngân hàng" },
  { ticker: "MWG", name: "Mobile World", price: 58200, sector: "Bán lẻ" },
  { ticker: "VRE", name: "Vincom Retail", price: 31200, sector: "Bất động sản" },
  { ticker: "GAS", name: "PV Gas", price: 98400, sector: "Năng lượng" },
  { ticker: "PLX", name: "Petrolimex", price: 54300, sector: "Năng lượng" },
  { ticker: "MSN", name: "Masan Group", price: 67800, sector: "Tiêu dùng" },
  { ticker: "SSI", name: "SSI Securities", price: 31500, sector: "Chứng khoán" },
  { ticker: "VCI", name: "VCI", price: 42800, sector: "Chứng khoán" },
  { ticker: "HDB", name: "HDBank", price: 29300, sector: "Ngân hàng" },
  { ticker: "POW", name: "PetroVietnam Power", price: 13800, sector: "Năng lượng" },
];

const ACTIVE_STYLE: React.CSSProperties = {
  background: "#e8f0fe",
  color: "#0849ac",
};

export function Layout() {
  const { user, logout } = useAuth();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [copilotOpen, setCopilotOpen] = useState(true);
  const [watchlistModalOpen, setWatchlistModalOpen] = useState(false);
  const [portfolioModalOpen, setPortfolioModalOpen] = useState(false);
  const [editingPortfolio, setEditingPortfolio] = useState<Portfolio | null>(null);
  const [portfolios, setPortfolios] = useState<Portfolio[]>(defaultPortfolios);
  const [currentPortfolioId, setCurrentPortfolioId] = useState<string>(defaultPortfolios[0]?.id || "p1");
  const [expandedPortfolioId, setExpandedPortfolioId] = useState<string | null>(defaultPortfolios[0]?.id || null);
  const [portfolioToAddStock, setPortfolioToAddStock] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [portfolioNameInput, setPortfolioNameInput] = useState("");
  const [showUserMenu, setShowUserMenu] = useState(false);

  const currentPortfolio = portfolios.find(p => p.id === currentPortfolioId) || portfolios[0];
  const watchlistItems = currentPortfolio?.stocks || [];

  const userInitials = user?.name
    ? user.name.split(" ").map((n: string) => n[0]).join("").substring(0, 2).toUpperCase()
    : "U";

  const handleCreatePortfolio = () => {
    if (!portfolioNameInput.trim()) return;
    const newPortfolio: Portfolio = {
      id: `p${Date.now()}`,
      name: portfolioNameInput.trim(),
      stocks: [],
      createdAt: new Date(),
    };
    setPortfolios([...portfolios, newPortfolio]);
    setCurrentPortfolioId(newPortfolio.id);
    setExpandedPortfolioId(newPortfolio.id);
    setPortfolioNameInput("");
    setPortfolioModalOpen(false);
  };

  const handleRenamePortfolio = () => {
    if (!portfolioNameInput.trim() || !editingPortfolio) return;
    setPortfolios(portfolios.map(p =>
      p.id === editingPortfolio.id ? { ...p, name: portfolioNameInput.trim() } : p
    ));
    setPortfolioNameInput("");
    setEditingPortfolio(null);
    setPortfolioModalOpen(false);
  };

  const handleDeletePortfolio = (portfolioId: string) => {
    if (portfolios.length <= 1) { alert("Không thể xóa danh mục cuối cùng!"); return; }
    if (window.confirm("Xóa danh mục này? Tất cả cổ phiếu trong danh mục sẽ bị xóa.")) {
      const newPortfolios = portfolios.filter(p => p.id !== portfolioId);
      setPortfolios(newPortfolios);
      if (currentPortfolioId === portfolioId) {
        setCurrentPortfolioId(newPortfolios[0].id);
        setExpandedPortfolioId(newPortfolios[0].id);
      }
    }
  };

  const setWatchlistItems = (updater: React.SetStateAction<WatchlistItem[]>) => {
    const targetId = portfolioToAddStock || currentPortfolioId;
    setPortfolios(portfolios.map(p => {
      if (p.id === targetId) {
        const newStocks = typeof updater === "function" ? updater(p.stocks) : updater;
        return { ...p, stocks: newStocks };
      }
      return p;
    }));
  };

  const handleRemoveStockFromPortfolio = (portfolioId: string, ticker: string) => {
    setPortfolios(portfolios.map(p =>
      p.id === portfolioId ? { ...p, stocks: p.stocks.filter(s => s.ticker !== ticker) } : p
    ));
  };

  const handleOpenAddStockModal = (portfolioId: string) => {
    setPortfolioToAddStock(portfolioId);
    setCurrentPortfolioId(portfolioId);
    setWatchlistModalOpen(true);
  };

  const handleCloseWatchlistModal = () => {
    setWatchlistModalOpen(false);
    setPortfolioToAddStock(null);
  };

  const handleSelectPortfolio = (portfolioId: string) => {
    if (portfolioId === currentPortfolioId) {
      setExpandedPortfolioId(expandedPortfolioId === portfolioId ? null : portfolioId);
      return;
    }
    const selected = portfolios.find(p => p.id === portfolioId);
    if (!selected) return;
    const others = portfolios.filter(p => p.id !== portfolioId);
    setPortfolios([...others, selected]);
    setCurrentPortfolioId(portfolioId);
    setExpandedPortfolioId(portfolioId);
  };

  return (
    <div className="flex h-screen w-screen overflow-hidden" style={{ fontFamily: "'Inter', sans-serif", background: "#f5f8ff" }}>

      {/* ── Sidebar ── */}
      <aside style={{
        width: sidebarCollapsed ? 56 : 220,
        flexShrink: 0,
        background: "#ffffff",
        borderRight: "1px solid rgba(8,73,172,0.1)",
        display: "flex",
        flexDirection: "column",
        transition: "width 0.2s ease",
      }}>
        {/* Logo */}
        <div style={{
          height: 60, borderBottom: "1px solid rgba(8,73,172,0.08)",
          display: "flex", alignItems: "center", gap: 10, padding: "0 14px", flexShrink: 0,
        }}>
          <div style={{
            width: 34, height: 34, borderRadius: 10,
            background: "linear-gradient(135deg, #032d6b, #0849ac)",
            display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
          }}>
            <WealbeeIcon size={20} color="#fff" />
          </div>
          {!sidebarCollapsed && (
            <span style={{ fontFamily: "'Montserrat', sans-serif", fontSize: "0.9375rem", fontWeight: 700, color: "#1a1a2e" }}>
              Wealbee
            </span>
          )}
        </div>

        {/* Nav */}
        <nav style={{ flex: 1, padding: "12px 8px", display: "flex", flexDirection: "column", gap: 3 }}>
          {navItems.map(item => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === "/app"}
              style={({ isActive }) => ({
                display: "flex", alignItems: "center", gap: 10,
                padding: "9px 10px", borderRadius: 9,
                textDecoration: "none", fontSize: "0.8125rem", fontWeight: 500,
                transition: "all 0.15s",
                ...(isActive ? ACTIVE_STYLE : { color: "#6a7282", background: "transparent" }),
              })}
            >
              <item.icon style={{ width: 16, height: 16, flexShrink: 0 }} />
              {!sidebarCollapsed && <span>{item.label}</span>}
            </NavLink>
          ))}
        </nav>

        {/* Portfolios */}
        {!sidebarCollapsed && (
          <div style={{ padding: "0 8px 12px", borderTop: "1px solid rgba(8,73,172,0.08)", paddingTop: 12, maxHeight: 280, overflowY: "auto" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 10px 8px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <Star style={{ width: 13, height: 13, color: "#99a1af" }} />
                <span style={{ fontSize: "0.625rem", color: "#99a1af", fontWeight: 600, letterSpacing: "0.08em" }}>Danh mục của tôi</span>
              </div>
              <button onClick={() => { setEditingPortfolio(null); setPortfolioNameInput(""); setPortfolioModalOpen(true); }}
                style={{ width: 16, height: 16, borderRadius: 4, border: "1px solid rgba(8,73,172,0.15)", background: "transparent", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "#99a1af" }}>
                <FolderPlus style={{ width: 10, height: 10 }} />
              </button>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
              {portfolios.map((portfolio) => {
                const isExpanded = expandedPortfolioId === portfolio.id;
                return (
                  <div key={portfolio.id}>
                    <div
                      onClick={() => handleSelectPortfolio(portfolio.id)}
                      style={{
                        display: "flex", alignItems: "center", justifyContent: "space-between",
                        padding: "6px 8px", borderRadius: 7, cursor: "pointer", transition: "all 0.15s",
                        background: portfolio.id === currentPortfolioId ? "#e8f0fe" : "transparent",
                        border: portfolio.id === currentPortfolioId ? "1px solid rgba(8,73,172,0.15)" : "1px solid transparent",
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: 6, flex: 1, minWidth: 0 }}>
                        <div style={{ flexShrink: 0 }}>
                          {isExpanded
                            ? <ChevronDown style={{ width: 12, height: 12, color: "#99a1af" }} />
                            : <ChevronRight style={{ width: 12, height: 12, color: "#99a1af" }} />}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <span style={{ fontSize: "0.75rem", fontWeight: portfolio.id === currentPortfolioId ? 600 : 500, color: portfolio.id === currentPortfolioId ? "#0849ac" : "#1a1a2e", display: "block", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                            {portfolio.name}
                          </span>
                          <span style={{ fontSize: "0.625rem", color: "#99a1af", fontFamily: "'IBM Plex Mono', monospace" }}>
                            {portfolio.stocks.length} cổ phiếu
                          </span>
                        </div>
                      </div>
                      <div style={{ display: "flex", gap: 2 }}>
                        <button onClick={(e) => { e.stopPropagation(); setEditingPortfolio(portfolio); setPortfolioNameInput(portfolio.name); setPortfolioModalOpen(true); }}
                          style={{ width: 20, height: 20, borderRadius: 4, border: "none", background: "transparent", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "#99a1af" }}>
                          <Edit2 style={{ width: 11, height: 11 }} />
                        </button>
                        {portfolios.length > 1 && (
                          <button onClick={(e) => { e.stopPropagation(); handleDeletePortfolio(portfolio.id); }}
                            style={{ width: 20, height: 20, borderRadius: 4, border: "none", background: "transparent", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "#99a1af" }}>
                            <Trash2 style={{ width: 11, height: 11 }} />
                          </button>
                        )}
                      </div>
                    </div>
                    {isExpanded && (
                      <div style={{ paddingLeft: 26, marginTop: 2, display: "flex", flexDirection: "column", gap: 1 }}>
                        {portfolio.stocks.length === 0 ? (
                          <div style={{ padding: "8px 10px", fontSize: "0.6875rem", color: "#99a1af", textAlign: "center" }}>Chưa có cổ phiếu</div>
                        ) : (
                          portfolio.stocks.map((stock) => (
                            <div key={stock.ticker} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "5px 8px", borderRadius: 6 }}>
                              <div style={{ flex: 1 }}>
                                <span style={{ fontSize: "0.6875rem", fontWeight: 600, color: "#1a1a2e", fontFamily: "'IBM Plex Mono', monospace" }}>{stock.ticker}</span>
                                <div style={{ display: "flex", gap: 6 }}>
                                  <span style={{ fontSize: "0.625rem", color: "#6a7282", fontFamily: "'IBM Plex Mono', monospace" }}>{stock.price.toLocaleString()}</span>
                                  <span style={{ fontSize: "0.5625rem", color: stock.changePercent > 0 ? "#0ea5a0" : "#ef4444", fontFamily: "'IBM Plex Mono', monospace", fontWeight: 500 }}>
                                    {stock.changePercent > 0 ? "+" : ""}{stock.changePercent.toFixed(2)}%
                                  </span>
                                </div>
                              </div>
                              <button onClick={(e) => { e.stopPropagation(); if (window.confirm(`Xóa ${stock.ticker}?`)) handleRemoveStockFromPortfolio(portfolio.id, stock.ticker); }}
                                style={{ width: 18, height: 18, borderRadius: 4, border: "none", background: "transparent", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "#d1d5db" }}>
                                <X style={{ width: 11, height: 11 }} />
                              </button>
                            </div>
                          ))
                        )}
                        <button onClick={(e) => { e.stopPropagation(); handleOpenAddStockModal(portfolio.id); }}
                          style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: 4, padding: "5px 8px", borderRadius: 6, border: "1px dashed rgba(8,73,172,0.2)", background: "transparent", cursor: "pointer", fontSize: "0.6875rem", color: "#0849ac", fontWeight: 600, marginTop: 2 }}>
                          <Plus style={{ width: 11, height: 11 }} />
                          <span>Thêm mã</span>
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Collapse toggle */}
        <button
          onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
          style={{ margin: "0 8px 12px", padding: 8, borderRadius: 9, border: "none", background: "transparent", color: "#99a1af", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
          {sidebarCollapsed ? <ChevronRight style={{ width: 16, height: 16 }} /> : <ChevronLeft style={{ width: 16, height: 16 }} />}
        </button>
      </aside>

      {/* ── Main column ── */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", minWidth: 0 }}>

        {/* ── Topbar ── */}
        <header style={{
          height: 60, flexShrink: 0, background: "#ffffff",
          borderBottom: "1px solid rgba(8,73,172,0.1)",
          display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 20px",
        }}>
          {/* Market tickers */}
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            {[
              { label: "VN-Index", value: "1,747.68", change: "+0.82%", up: true },
              { label: "HNX",      value: "251.91",   change: "−0.34%", up: false },
              { label: "USD/VND",  value: "26,341",   change: "+0.11%", up: true },
            ].map(t => (
              <div key={t.label} style={{
                display: "flex", alignItems: "center", gap: 7, padding: "5px 11px", borderRadius: 8,
                background: "#f5f8ff", border: "1px solid rgba(8,73,172,0.08)", fontSize: "0.75rem",
              }}>
                {t.label === "VN-Index" && <TrendingUp style={{ width: 13, height: 13, color: "#0849ac" }} />}
                <span style={{ color: "#6a7282" }}>{t.label}</span>
                <span style={{ fontFamily: "'IBM Plex Mono', monospace", color: "#1a1a2e", fontWeight: 500 }}>{t.value}</span>
                <span style={{ color: t.up ? "#0ea5a0" : "#ef4444", fontWeight: 500 }}>{t.change}</span>
              </div>
            ))}
          </div>

          {/* Right actions */}
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <button style={{ position: "relative", width: 34, height: 34, borderRadius: 9, border: "1px solid rgba(8,73,172,0.1)", background: "transparent", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "#6a7282" }}>
              <Bell style={{ width: 15, height: 15 }} />
              <span style={{ position: "absolute", top: 7, right: 7, width: 6, height: 6, borderRadius: "50%", background: "#0849ac" }} />
            </button>
            <button style={{ width: 34, height: 34, borderRadius: 9, border: "1px solid rgba(8,73,172,0.1)", background: "transparent", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "#6a7282" }}>
              <Settings style={{ width: 15, height: 15 }} />
            </button>
            <div style={{ width: 1, height: 22, background: "rgba(8,73,172,0.1)", margin: "0 2px" }} />
            <button
              onClick={() => setCopilotOpen(!copilotOpen)}
              style={{
                display: "flex", alignItems: "center", gap: 7, padding: "6px 13px", borderRadius: 9,
                border: copilotOpen ? "1px solid rgba(8,73,172,0.3)" : "1px solid rgba(8,73,172,0.1)",
                background: copilotOpen ? "#e8f0fe" : "transparent",
                color: copilotOpen ? "#0849ac" : "#6a7282",
                cursor: "pointer", fontSize: "0.75rem", fontWeight: 500,
              }}>
              <Bot style={{ width: 14, height: 14 }} />
              <span>BeeAI</span>
              {copilotOpen && <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#0ea5a0", display: "inline-block" }} />}
            </button>
            {/* User avatar with logout */}
            <div style={{ position: "relative" }}>
              <div
                onClick={() => setShowUserMenu(!showUserMenu)}
                style={{
                  width: 32, height: 32, borderRadius: "50%",
                  background: "linear-gradient(135deg, #032d6b, #0849ac)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  marginLeft: 4, cursor: "pointer",
                }}>
                <span style={{ fontSize: "0.6875rem", fontWeight: 700, color: "#fff", fontFamily: "'Montserrat', sans-serif" }}>{userInitials}</span>
              </div>
              {showUserMenu && (
                <div style={{
                  position: "absolute", top: "calc(100% + 8px)", right: 0, minWidth: 180,
                  background: "#ffffff", border: "1px solid rgba(8,73,172,0.1)", borderRadius: 9,
                  boxShadow: "0 8px 24px rgba(8,73,172,0.15)", zIndex: 100, overflow: "hidden",
                }}>
                  <div style={{ padding: "10px 14px", borderBottom: "1px solid rgba(8,73,172,0.08)" }}>
                    <p style={{ fontSize: "0.8125rem", fontWeight: 600, color: "#1a1a2e" }}>{user?.name || "User"}</p>
                    <p style={{ fontSize: "0.6875rem", color: "#99a1af" }}>{user?.email || ""}</p>
                  </div>
                  <button
                    onClick={() => { setShowUserMenu(false); logout(); }}
                    style={{
                      width: "100%", display: "flex", alignItems: "center", gap: 8, padding: "10px 14px",
                      border: "none", background: "transparent", cursor: "pointer",
                      fontSize: "0.8125rem", color: "#ef4444",
                    }}>
                    <LogOut style={{ width: 14, height: 14 }} />
                    Đăng xuất
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* ── Content row ── */}
        <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>
          <main style={{ flex: 1, overflowY: "auto", padding: "24px" }}>
            <Outlet context={{
              watchlistItems,
              setWatchlistItems,
              setWatchlistModalOpen,
              currentPortfolio,
              portfolios,
              handleSelectPortfolio,
              setPortfolioModalOpen,
            }} />
          </main>
          <AICopilot isOpen={copilotOpen} onToggle={() => setCopilotOpen(!copilotOpen)} />
        </div>
      </div>

      <Toaster theme="light" position="bottom-right" richColors />

      {/* Watchlist Modal */}
      {watchlistModalOpen && (
        <div style={{ position: "fixed", inset: 0, zIndex: 1000, background: "rgba(0,0,0,0.4)", backdropFilter: "blur(4px)", display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}
          onClick={handleCloseWatchlistModal}>
          <div style={{ width: "100%", maxWidth: 480, background: "#ffffff", borderRadius: 16, boxShadow: "0 24px 60px rgba(8,73,172,0.2)", border: "1px solid rgba(8,73,172,0.1)", overflow: "hidden" }}
            onClick={(e) => e.stopPropagation()}>
            <div style={{ padding: "18px 20px", borderBottom: "1px solid rgba(8,73,172,0.08)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <h3 style={{ fontSize: "0.9375rem", fontWeight: 700, color: "#1a1a2e", fontFamily: "'Montserrat', sans-serif" }}>Thêm Cổ Phiếu Vào Danh Mục</h3>
              <button onClick={handleCloseWatchlistModal} style={{ width: 28, height: 28, borderRadius: 7, border: "1px solid rgba(8,73,172,0.1)", background: "transparent", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "#6a7282" }}>✕</button>
            </div>
            <div style={{ padding: "16px 20px", borderBottom: "1px solid rgba(8,73,172,0.08)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 12px", borderRadius: 9, border: "1px solid rgba(8,73,172,0.15)", background: "#f5f8ff" }}>
                <Search style={{ width: 16, height: 16, color: "#99a1af" }} />
                <input
                  type="text"
                  placeholder="Nhập mã cổ phiếu hoặc tìm kiếm..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value.toUpperCase())}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && searchQuery.trim()) {
                      const ticker = searchQuery.trim();
                      if (!watchlistItems.some(item => item.ticker === ticker)) {
                        setWatchlistItems([...watchlistItems, { ticker, price: 0, change: 0, changePercent: 0 }]);
                        setSearchQuery("");
                      }
                    }
                  }}
                  style={{ flex: 1, border: "none", background: "transparent", outline: "none", fontSize: "0.8125rem", color: "#1a1a2e" }}
                  autoFocus
                />
              </div>
            </div>
            <div style={{ maxHeight: 380, overflowY: "auto", padding: "8px" }}>
              {popularStocks.filter(s => {
                const q = searchQuery.toLowerCase();
                return s.ticker.toLowerCase().includes(q) || s.name.toLowerCase().includes(q);
              }).map((stock) => {
                const isIn = watchlistItems.some(item => item.ticker === stock.ticker);
                return (
                  <div key={stock.ticker}
                    style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 12px", borderRadius: 9, cursor: "pointer", background: isIn ? "#f0f4ff" : "transparent" }}
                    onClick={() => {
                      if (!isIn) setWatchlistItems([...watchlistItems, { ticker: stock.ticker, price: stock.price, change: Math.round((Math.random() * 2000 - 1000)), changePercent: Number((Math.random() * 4 - 2).toFixed(2)) }]);
                    }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                      <div style={{ width: 36, height: 36, borderRadius: 9, background: "linear-gradient(135deg, #032d6b, #0849ac)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                        <span style={{ fontSize: "0.625rem", fontWeight: 700, color: "#fff", fontFamily: "'IBM Plex Mono', monospace" }}>{stock.ticker.substring(0, 2)}</span>
                      </div>
                      <div>
                        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                          <span style={{ fontSize: "0.8125rem", fontWeight: 700, color: "#1a1a2e", fontFamily: "'IBM Plex Mono', monospace" }}>{stock.ticker}</span>
                          <span style={{ fontSize: "0.625rem", padding: "2px 6px", borderRadius: 4, background: "#e8f0fe", color: "#0849ac" }}>{stock.sector}</span>
                        </div>
                        <span style={{ fontSize: "0.6875rem", color: "#99a1af" }}>{stock.name}</span>
                      </div>
                    </div>
                    {isIn ? (
                      <span style={{ fontSize: "0.6875rem", color: "#0ea5a0", fontWeight: 600, display: "flex", alignItems: "center", gap: 4 }}>
                        <Check style={{ width: 14, height: 14 }} /> Đang theo dõi
                      </span>
                    ) : (
                      <button onClick={(e) => { e.stopPropagation(); setWatchlistItems([...watchlistItems, { ticker: stock.ticker, price: stock.price, change: Math.round((Math.random() * 2000 - 1000)), changePercent: Number((Math.random() * 4 - 2).toFixed(2)) }]); }}
                        style={{ padding: "5px 12px", borderRadius: 7, border: "1px solid rgba(8,73,172,0.2)", background: "transparent", color: "#0849ac", cursor: "pointer", fontSize: "0.6875rem", fontWeight: 600 }}>
                        Thêm
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Portfolio Modal */}
      {portfolioModalOpen && (
        <div style={{ position: "fixed", inset: 0, zIndex: 1000, background: "rgba(0,0,0,0.4)", backdropFilter: "blur(4px)", display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}
          onClick={() => { setPortfolioModalOpen(false); setEditingPortfolio(null); setPortfolioNameInput(""); }}>
          <div style={{ width: "100%", maxWidth: 400, background: "#ffffff", borderRadius: 16, boxShadow: "0 24px 60px rgba(8,73,172,0.2)", border: "1px solid rgba(8,73,172,0.1)", overflow: "hidden" }}
            onClick={(e) => e.stopPropagation()}>
            <div style={{ padding: "18px 20px", borderBottom: "1px solid rgba(8,73,172,0.08)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <h3 style={{ fontSize: "0.9375rem", fontWeight: 700, color: "#1a1a2e", fontFamily: "'Montserrat', sans-serif" }}>
                {editingPortfolio ? "Đổi Tên Danh Mục" : "Tạo Danh Mục Mới"}
              </h3>
              <button onClick={() => { setPortfolioModalOpen(false); setEditingPortfolio(null); setPortfolioNameInput(""); }}
                style={{ width: 28, height: 28, borderRadius: 7, border: "1px solid rgba(8,73,172,0.1)", background: "transparent", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "#6a7282" }}>✕</button>
            </div>
            <div style={{ padding: "20px" }}>
              <label style={{ fontSize: "0.8125rem", color: "#6a7282", fontWeight: 500, display: "block", marginBottom: 8 }}>Tên danh mục</label>
              <input
                type="text"
                value={portfolioNameInput}
                onChange={(e) => setPortfolioNameInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") editingPortfolio ? handleRenamePortfolio() : handleCreatePortfolio(); }}
                placeholder="Ví dụ: Danh mục tăng trưởng"
                style={{ width: "100%", padding: "10px 12px", borderRadius: 9, border: "1px solid rgba(8,73,172,0.15)", background: "#f5f8ff", outline: "none", fontSize: "0.8125rem", color: "#1a1a2e" }}
                autoFocus
              />
            </div>
            <div style={{ padding: "16px 20px", borderTop: "1px solid rgba(8,73,172,0.08)", display: "flex", justifyContent: "flex-end", gap: 8 }}>
              <button onClick={() => { setPortfolioModalOpen(false); setEditingPortfolio(null); setPortfolioNameInput(""); }}
                style={{ padding: "8px 16px", borderRadius: 9, border: "1px solid rgba(8,73,172,0.15)", background: "transparent", color: "#6a7282", cursor: "pointer", fontSize: "0.8125rem", fontWeight: 500 }}>
                Hủy
              </button>
              <button onClick={() => editingPortfolio ? handleRenamePortfolio() : handleCreatePortfolio()}
                disabled={!portfolioNameInput.trim()}
                style={{ padding: "8px 16px", borderRadius: 9, border: "none", background: portfolioNameInput.trim() ? "#0849ac" : "#d1d5db", color: "#fff", cursor: portfolioNameInput.trim() ? "pointer" : "not-allowed", fontSize: "0.8125rem", fontWeight: 600 }}>
                {editingPortfolio ? "Lưu" : "Tạo danh mục"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
