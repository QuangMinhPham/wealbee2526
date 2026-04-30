import { useState } from "react";
import { useNavigate } from "react-router";
import { Menu, X, Settings } from "lucide-react";
import svgPaths from "../../imports/svg-vhxiijub25";
import wealbeeLogoPaths from "../../imports/Link/svg-brxci4i2gg";

export function Navbar() {
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleNavigate = (path: string) => {
    setMobileOpen(false);
    navigate(path);
  };

  return (
    <>
      <nav className="w-full h-[60px] sm:h-[76px] flex items-center justify-between px-4 sm:px-6 lg:px-8 xl:px-[352px] relative z-50 bg-white/90 backdrop-blur-sm">
        {/* Logo */}
        <div
          className="flex items-center gap-2 sm:gap-3 cursor-pointer flex-shrink-0"
          onClick={() => handleNavigate("/")}
        >
          {/* Wealbee icon */}
          <div className="relative size-[32px] sm:size-[44px] flex-shrink-0">
            <svg
              className="absolute block size-full"
              fill="none"
              preserveAspectRatio="none"
              viewBox="0 0 36.6667 36.6667"
            >
              <g>
                <path d={wealbeeLogoPaths.p2a75dcf0} fill="#0849AC" />
                <path d={wealbeeLogoPaths.p8351900} fill="#0849AC" />
              </g>
            </svg>
            <div className="absolute inset-[27.08%_31.25%_27.08%_27.08%]">
              <div className="absolute inset-[-2.48%_-2.73%]">
                <svg
                  className="block size-full"
                  fill="none"
                  preserveAspectRatio="none"
                  viewBox="0 0 19.3333 21.1667"
                >
                  <g>
                    <path
                      d={wealbeeLogoPaths.p2206f980}
                      fill="#0849AC"
                      stroke="#0849AC"
                    />
                    <path
                      d={wealbeeLogoPaths.p1f348500}
                      fill="#0849AC"
                      stroke="#0849AC"
                    />
                    <path
                      d={wealbeeLogoPaths.p14867f00}
                      fill="#0849AC"
                      stroke="#0849AC"
                    />
                  </g>
                </svg>
              </div>
            </div>
          </div>
          {/* Wealbee wordmark */}
          <span className="text-[16px] sm:text-[20px] font-bold text-[#0849ac]">Wealbee</span>
        </div>

        {/* ── Desktop nav (md and above) ── */}
        <div className="hidden md:flex items-center gap-6">
          <span
            className="text-[16px] font-bold text-[#4b5563] cursor-pointer hover:text-[#111827] transition-colors"
            onClick={() => handleNavigate("/blog")}
          >
            Blog
          </span>
          <span
            className="text-[16px] font-bold text-[#4b5563] cursor-pointer hover:text-[#111827] transition-colors"
            onClick={() => handleNavigate("/feedback")}
          >
            Phản hồi
          </span>
          <span
            onClick={() => handleNavigate("/pricing")}
            className="text-[16px] font-bold text-[#4b5563] cursor-pointer hover:text-[#111827] transition-colors"
          >
            Nâng cấp
          </span>
          <div className="w-px h-6 bg-[#90bcf5]" />
          <button
            className="p-1 hover:bg-gray-100 rounded-lg transition-colors"
            onClick={() => handleNavigate("/unsubscribe")}
          >
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <g clipPath="url(#settings-clip)">
                <path d={svgPaths.p39ddbc00} fill="#6B7280" />
                <path d={svgPaths.p8e1980} fill="#6B7280" />
              </g>
              <defs>
                <clipPath id="settings-clip">
                  <rect width="20" height="20" fill="white" />
                </clipPath>
              </defs>
            </svg>
          </button>
          <button
            onClick={() => handleNavigate("/login")}
            className="bg-[#0849ac] text-white px-6 py-2.5 rounded-xl text-[16px] font-semibold hover:bg-[#063d8f] transition-colors"
          >
            Đăng nhập
          </button>
        </div>

        {/* ── Mobile right side: CTA + Hamburger ── */}
        <div className="flex md:hidden items-center gap-2">
          <button
            onClick={() => handleNavigate("/login")}
            className="bg-[#0849ac] text-white px-3 py-1.5 rounded-lg text-[13px] font-semibold hover:bg-[#063d8f] transition-colors whitespace-nowrap"
          >
            Đăng nhập
          </button>
          <button
            onClick={() => setMobileOpen((prev) => !prev)}
            className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors"
            aria-label={mobileOpen ? "Đóng menu" : "Mở menu"}
          >
            {mobileOpen ? (
              <X size={20} className="text-[#374151]" />
            ) : (
              <Menu size={20} className="text-[#374151]" />
            )}
          </button>
        </div>
      </nav>

      {/* ── Mobile backdrop ── */}
      {mobileOpen && (
        <div
          className="md:hidden fixed inset-0 top-[60px] z-30 bg-black/20"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* ── Mobile dropdown menu ── */}
      {mobileOpen && (
        <div className="md:hidden fixed top-[60px] inset-x-0 z-40 bg-white shadow-2xl border-t border-[#e8f2ff]">
          <div className="flex flex-col p-4 gap-1">
            <button
              onClick={() => handleNavigate("/blog")}
              className="w-full text-left px-4 py-3.5 rounded-xl text-[16px] font-bold text-[#4b5563] hover:bg-[#f0f6ff] transition-colors"
            >
              Blog
            </button>
            <button
              onClick={() => handleNavigate("/feedback")}
              className="w-full text-left px-4 py-3.5 rounded-xl text-[16px] font-bold text-[#4b5563] hover:bg-[#f0f6ff] transition-colors"
            >
              Phản hồi
            </button>
            <button
              onClick={() => handleNavigate("/pricing")}
              className="w-full text-left px-4 py-3.5 rounded-xl text-[16px] font-bold text-[#4b5563] hover:bg-[#f0f6ff] transition-colors flex items-center justify-between"
            >
              <span>Nâng cấp</span>
              <span className="text-[11px] bg-gradient-to-r from-[#fbbf24] to-[#f97316] text-white px-2 py-0.5 rounded-full font-bold">
                PRO
              </span>
            </button>
            <div className="w-full h-px bg-[#e8f2ff] my-1" />
            <button
              onClick={() => handleNavigate("/unsubscribe")}
              className="w-full text-left px-4 py-3.5 rounded-xl text-[16px] text-[#4b5563] hover:bg-[#f0f6ff] transition-colors flex items-center gap-3"
            >
              <Settings size={18} className="text-[#6b7280]" />
              <span>Cài đặt</span>
            </button>
          </div>
          {/* Bottom safe area */}
          <div className="h-2" />
        </div>
      )}
    </>
  );
}