import { useState, useRef } from "react";
import { Navbar } from "../../components/landing/Navbar";
import { Footer } from "../../components/landing/Footer";
import svgPaths from "../../imports/svg-znrqqebbc3";
import { saveSubscriber, saveSurveyResponse, SurveyData } from "../../lib/landing/subscribe";

const MAX_SYMBOLS = 10;

const SAMPLE_PORTFOLIO = [
  { symbol: "VNM", quantity: 100 },
  { symbol: "VCB", quantity: 50 },
  { symbol: "HPG", quantity: 200 },
  { symbol: "FPT", quantity: 150 },
];

interface Holding {
  symbol: string;
  quantity: number;
}

// Icons
function IconPencil() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <path d="M11.333 2a1.886 1.886 0 0 1 2.667 2.667L4.667 14H2v-2.667L11.333 2Z" stroke="#6B7280" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

function IconX() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
      <path d="M10.5 3.5L3.5 10.5M3.5 3.5l7 7" stroke="#9CA3AF" strokeWidth="1.5" strokeLinecap="round"/>
    </svg>
  );
}

function IconCheck() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
      <path d="M2.5 7L5.5 10L11.5 4" stroke="#0849AC" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

function IconPlus() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
      <path d="M7 2.5V11.5M2.5 7H11.5" stroke="#2563EB" strokeWidth="1.8" strokeLinecap="round"/>
    </svg>
  );
}

function IconCircleCheck() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
      <path d="M9 1.5a7.5 7.5 0 1 0 0 15 7.5 7.5 0 0 0 0-15Z" stroke="#2563EB" strokeWidth="1.4"/>
      <path d="M5.5 9L7.5 11L12.5 6.5" stroke="#2563EB" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

const AGE_OPTIONS = [
  {
    value: "<20",
    label: "Dưới 20 tuổi",
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
        <path d="M12 12c2.7 0 4.8-2.1 4.8-4.8S14.7 2.4 12 2.4 7.2 4.5 7.2 7.2 9.3 12 12 12Z" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M4 21.6c0-4.4 3.6-8 8-8s8 3.6 8 8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    ),
  },
  {
    value: "20-35",
    label: "20 – 35 tuổi",
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
        <circle cx="9" cy="7" r="4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    ),
  },
  {
    value: ">35",
    label: "Trên 35 tuổi",
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
        <rect x="3" y="4" width="18" height="18" rx="2" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M16 2v4M8 2v4M3 10h18" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M8 14h.01M12 14h.01M16 14h.01M8 18h.01M12 18h.01M16 18h.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
      </svg>
    ),
  },
];

const EXP_OPTIONS = [
  {
    value: "<1y",
    label: "Dưới 1 năm",
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
        <path d="M12 20V10" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
        <path d="M18 20V4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
        <path d="M6 20v-4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
      </svg>
    ),
  },
  {
    value: "1-3y",
    label: "1 – 3 năm",
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
        <path d="M3 17l5-5 4 4 9-9" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M17 7h4v4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    ),
  },
  {
    value: ">3y",
    label: "Trên 3 năm",
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
        <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.6"/>
        <path d="M12 7v5l3.5 3.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M8.5 3.5l1 2M15.5 3.5l-1 2" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
      </svg>
    ),
  },
];

const REF_OPTIONS = [
  {
    value: "Facebook",
    label: "Facebook",
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
        <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    ),
  },
  {
    value: "TikTok",
    label: "TikTok",
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
        <path d="M9 12a4 4 0 1 0 4 4V4a5 5 0 0 0 5 5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    ),
  },
  {
    value: "LinkedIn",
    label: "LinkedIn",
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
        <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6zM2 9h4v12H2z" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
        <circle cx="4" cy="4" r="2" stroke="currentColor" strokeWidth="1.6"/>
      </svg>
    ),
  },
  {
    value: "Được giới thiệu",
    label: "Được giới thiệu",
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
        <circle cx="9" cy="7" r="4" stroke="currentColor" strokeWidth="1.6"/>
        <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    ),
  },
  {
    value: "Khác",
    label: "Khác",
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
        <circle cx="12" cy="12" r="1" fill="currentColor"/>
        <circle cx="19" cy="12" r="1" fill="currentColor"/>
        <circle cx="5" cy="12" r="1" fill="currentColor"/>
      </svg>
    ),
  },
];

function SurveyCard({
  label,
  icon,
  selected,
  onClick,
}: {
  label: string;
  icon: React.ReactNode;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex flex-col items-center justify-center gap-2.5 py-4 px-3 rounded-2xl border-2 transition-all cursor-pointer select-none ${
        selected
          ? "border-[#0849ac] bg-[#eff6ff] text-[#0849ac]"
          : "border-[#e5e7eb] bg-white text-[#6b7280] hover:border-[#bfdbfe] hover:bg-[#f8faff]"
      }`}
    >
      <span className={selected ? "text-[#0849ac]" : "text-[#9ca3af]"}>{icon}</span>
      <span className={`text-[13px] font-semibold leading-tight text-center ${selected ? "text-[#0849ac]" : "text-[#374151]"}`}>
        {label}
      </span>
    </button>
  );
}

export default function OnboardingPage() {
  const [email, setEmail] = useState("");
  const [fileName, setFileName] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  const [holdings, setHoldings] = useState<Holding[]>([]);
  const [showPortfolio, setShowPortfolio] = useState(false);
  const [showSurvey, setShowSurvey] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [fileObj, setFileObj] = useState<File | null>(null);
  const [parseLoading, setParseLoading] = useState(false);
  const [parseError, setParseError] = useState("");

  // Survey state
  const [ageGroup, setAgeGroup] = useState("");
  const [expLevel, setExpLevel] = useState("");
  const [referral, setReferral] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Edit state
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editSymbol, setEditSymbol] = useState("");
  const [editQuantity, setEditQuantity] = useState("");

  // Add form state
  const [showAddForm, setShowAddForm] = useState(false);
  const [newSymbol, setNewSymbol] = useState("");
  const [newQuantity, setNewQuantity] = useState("");

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFileName(e.target.files[0].name);
      setFileObj(e.target.files[0]);
      setShowPortfolio(false);
      setParseError("");
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      setFileName(e.dataTransfer.files[0].name);
      setFileObj(e.dataTransfer.files[0]);
      setShowPortfolio(false);
      setParseError("");
    }
  };

  const fileToBase64 = (file: File): Promise<string> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve((reader.result as string).split(",")[1]);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });

  const handleParseFile = async () => {
    if (!fileObj) return;
    if (fileObj.size > 1024 * 1024) {
      setParseError("File quá lớn. Vui lòng chọn file nhỏ hơn 1MB.");
      return;
    }
    setParseLoading(true);
    setParseError("");
    try {
      const fileBase64 = await fileToBase64(fileObj);
      const res = await fetch("/api/parse-portfolio", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fileBase64, mimeType: fileObj.type }),
      });
      const data = await res.json();
      if (!res.ok) {
        setParseError(data.error ?? "Không thể đọc file. Vui lòng thử lại.");
        return;
      }
      if (data.holdings && data.holdings.length > 0) {
        setHoldings(data.holdings);
        setShowPortfolio(true);
      } else {
        setParseError("AI không tìm thấy danh mục trong file. Vui lòng nhập tay.");
      }
    } catch {
      setParseError("Lỗi kết nối. Vui lòng thử lại.");
    } finally {
      setParseLoading(false);
    }
  };

  const handleUseSample = () => {
    setHoldings([...SAMPLE_PORTFOLIO]);
    setFileName("danh_muc_mau.pdf");
    setShowPortfolio(true);
    setEditingIndex(null);
    setShowAddForm(false);
  };

  const handleDelete = (index: number) => {
    setHoldings((prev) => prev.filter((_, i) => i !== index));
    if (editingIndex === index) setEditingIndex(null);
  };

  const handleStartEdit = (index: number) => {
    setEditingIndex(index);
    setEditSymbol(holdings[index].symbol);
    setEditQuantity(String(holdings[index].quantity));
    setShowAddForm(false);
  };

  const handleSaveEdit = () => {
    if (editingIndex === null) return;
    const sym = editSymbol.trim().toUpperCase();
    const qty = parseInt(editQuantity);
    if (!sym || isNaN(qty) || qty <= 0) return;
    setHoldings((prev) =>
      prev.map((h, i) => (i === editingIndex ? { symbol: sym, quantity: qty } : h))
    );
    setEditingIndex(null);
  };

  const handleAddSymbol = () => {
    const sym = newSymbol.trim().toUpperCase();
    const qty = parseInt(newQuantity);
    if (!sym || isNaN(qty) || qty <= 0) return;
    if (holdings.length >= MAX_SYMBOLS) return;
    setHoldings((prev) => [...prev, { symbol: sym, quantity: qty }]);
    setNewSymbol("");
    setNewQuantity("");
    setShowAddForm(false);
  };

  const canAdd = holdings.length < MAX_SYMBOLS;

  return (
    <div className="min-h-screen bg-white relative font-['Montserrat',sans-serif]">
      {/* Background blurs */}
      <div className="absolute top-[-120px] right-[-192px] w-[500px] h-[500px] bg-[rgba(232,240,255,0.5)] blur-[50px] rounded-full pointer-events-none" />
      <div className="absolute bottom-[-120px] left-[-192px] w-[400px] h-[400px] bg-[rgba(132,166,252,0.1)] blur-[40px] rounded-full pointer-events-none" />

      <Navbar />

      <main className="relative z-10 flex flex-col items-center justify-center px-6 pt-16 pb-16">
        <div className="w-full max-w-[500px]">

          {/* ── SUCCESS SCREEN ── */}
          {submitted ? (
            <div className="flex flex-col items-center text-center">
              {/* Animated checkmark circle */}
              <div className="relative mb-8">
                {/* Outer glow ring */}
                <div className="absolute inset-0 rounded-full bg-[rgba(37,99,235,0.12)] scale-[1.35] blur-[10px]" />
                {/* Middle ring */}
                <div className="absolute inset-0 rounded-full border-[2px] border-[rgba(37,99,235,0.2)] scale-[1.15]" />
                {/* Icon container */}
                <div className="relative w-[88px] h-[88px] rounded-full flex items-center justify-center" style={{ background: "linear-gradient(135deg, #0849ac 0%, #2563eb 100%)" }}>
                  <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
                    <path d="M8 21L16 29L32 13" stroke="white" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
              </div>

              {/* Heading */}
              <h1 className="text-[30px] font-bold text-[#111827] mb-3 leading-[1.2]">
                Đăng ký thành công!
              </h1>

              {/* Sub message */}
              <p className="text-[16px] text-[#4b5563] leading-[26px] max-w-[380px] mb-8">
                Chúng tôi đã nhận được yêu cầu của bạn và sẽ bắt đầu gửi thông báo trong thời gian sớm nhất.
              </p>

              {/* Info card */}
              <div className="w-full bg-[#f0f6ff] border border-[#bfdbfe] rounded-[16px] p-5 mb-8 text-left">
                {/* Email row */}
                <div className="flex items-start gap-3 mb-4 pb-4 border-b border-[#dbeafe]">
                  <div className="w-[36px] h-[36px] rounded-[10px] bg-white border border-[#dbeafe] flex items-center justify-center flex-shrink-0">
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                      <path d="M2 4a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v8a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V4Z" stroke="#2563EB" strokeWidth="1.3"/>
                      <path d="M2 4.5L8 9L14 4.5" stroke="#2563EB" strokeWidth="1.3" strokeLinecap="round"/>
                    </svg>
                  </div>
                  <div>
                    <p className="text-[12px] text-[#6b7280] mb-0.5">Báo cáo sẽ được gửi đến</p>
                    <p className="text-[14px] font-semibold text-[#111827]">{email}</p>
                  </div>
                </div>
                {/* Portfolio row */}
                <div className="flex items-start gap-3 mb-4 pb-4 border-b border-[#dbeafe]">
                  <div className="w-[36px] h-[36px] rounded-[10px] bg-white border border-[#dbeafe] flex items-center justify-center flex-shrink-0">
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                      <rect x="2" y="3" width="12" height="10" rx="1.5" stroke="#2563EB" strokeWidth="1.3"/>
                      <path d="M5 7H11M5 9.5H8.5" stroke="#2563EB" strokeWidth="1.3" strokeLinecap="round"/>
                    </svg>
                  </div>
                  <div>
                    <p className="text-[12px] text-[#6b7280] mb-1">Danh mục theo dõi</p>
                    <div className="flex flex-wrap gap-1.5">
                      {holdings.map((h) => (
                        <span key={h.symbol} className="bg-white border border-[#bfdbfe] text-[#0849ac] text-[12px] font-semibold px-2 py-0.5 rounded-md">
                          {h.symbol}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
                {/* Schedule row */}
                <div className="flex items-start gap-3 mb-4 pb-4 border-b border-[#dbeafe]">
                  <div className="w-[36px] h-[36px] rounded-[10px] bg-white border border-[#dbeafe] flex items-center justify-center flex-shrink-0">
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                      <circle cx="8" cy="8" r="5.5" stroke="#2563EB" strokeWidth="1.3"/>
                      <path d="M8 5V8.5L10.5 10" stroke="#2563EB" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </div>
                  <div>
                    <p className="text-[12px] text-[#6b7280] mb-0.5">Lịch gửi báo cáo</p>
                    <p className="text-[14px] font-semibold text-[#111827]">8:00 sáng &amp; 18:00 chiều mỗi ngày</p>
                  </div>
                </div>
                {/* Start date row */}
                <div className="flex items-start gap-3">
                  <div className="w-[36px] h-[36px] rounded-[10px] bg-white border border-[#dbeafe] flex items-center justify-center flex-shrink-0">
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                      <rect x="2" y="3" width="12" height="11" rx="1.5" stroke="#2563EB" strokeWidth="1.3"/>
                      <path d="M5 1.5V4M11 1.5V4" stroke="#2563EB" strokeWidth="1.3" strokeLinecap="round"/>
                      <path d="M2 6.5H14" stroke="#2563EB" strokeWidth="1.3"/>
                      <path d="M5.5 9.5H7M9 9.5H10.5" stroke="#2563EB" strokeWidth="1.3" strokeLinecap="round"/>
                    </svg>
                  </div>
                  <div>
                    <p className="text-[12px] text-[#6b7280] mb-0.5">Bắt đầu gửi tin từ ngày</p>
                    <p className="text-[14px] font-semibold text-[#0849ac]">2/5/2026</p>
                  </div>
                </div>
              </div>

              {/* Back button */}
              <button
                onClick={() => { setSubmitted(false); setEmail(""); setFileName(""); setHoldings([]); setShowPortfolio(false); }}
                className="text-[14px] text-[#6b7280] hover:text-[#374151] transition-colors underline underline-offset-2"
              >
                Quay lại trang chủ
              </button>
            </div>
          ) : showSurvey ? (
            /* ── SURVEY SCREEN ── */
            <>
              {/* Progress indicator */}
              <div className="flex items-center justify-center gap-2 mb-8">
                <div className="w-2 h-2 rounded-full bg-[#bfdbfe]" />
                <div className="w-8 h-1.5 rounded-full bg-[#0849ac]" />
                <div className="w-2 h-2 rounded-full bg-[#bfdbfe]" />
              </div>

              <h1 className="text-[28px] font-bold text-[#111827] text-center mb-2">
                Cho chúng tôi biết thêm về bạn
              </h1>
              <p className="text-[15px] text-[#6b7280] text-center mb-10">
                Giúp chúng tôi cá nhân hoá trải nghiệm cho bạn
              </p>

              {/* Q1: Age */}
              <div className="mb-8">
                <p className="text-[13px] font-semibold text-[#6b7280] uppercase tracking-wider mb-3">
                  Độ tuổi của bạn
                </p>
                <div className="grid grid-cols-3 gap-3">
                  {AGE_OPTIONS.map((opt) => (
                    <SurveyCard
                      key={opt.value}
                      label={opt.label}
                      icon={opt.icon}
                      selected={ageGroup === opt.value}
                      onClick={() => setAgeGroup(opt.value)}
                    />
                  ))}
                </div>
              </div>

              {/* Q2: Experience */}
              <div className="mb-8">
                <p className="text-[13px] font-semibold text-[#6b7280] uppercase tracking-wider mb-3">
                  Kinh nghiệm đầu tư
                </p>
                <div className="grid grid-cols-3 gap-3">
                  {EXP_OPTIONS.map((opt) => (
                    <SurveyCard
                      key={opt.value}
                      label={opt.label}
                      icon={opt.icon}
                      selected={expLevel === opt.value}
                      onClick={() => setExpLevel(opt.value)}
                    />
                  ))}
                </div>
              </div>

              {/* Q3: Referral */}
              <div className="mb-10">
                <p className="text-[13px] font-semibold text-[#6b7280] uppercase tracking-wider mb-3">
                  Bạn biết đến Wealbee qua đâu?
                </p>
                <div className="grid grid-cols-3 gap-3">
                  {REF_OPTIONS.slice(0, 3).map((opt) => (
                    <SurveyCard
                      key={opt.value}
                      label={opt.label}
                      icon={opt.icon}
                      selected={referral === opt.value}
                      onClick={() => setReferral(opt.value)}
                    />
                  ))}
                </div>
                <div className="grid grid-cols-2 gap-3 mt-3">
                  {REF_OPTIONS.slice(3).map((opt) => (
                    <SurveyCard
                      key={opt.value}
                      label={opt.label}
                      icon={opt.icon}
                      selected={referral === opt.value}
                      onClick={() => setReferral(opt.value)}
                    />
                  ))}
                </div>
              </div>

              {/* Error */}
              {errorMsg && (
                <p className="text-[13px] text-red-500 text-center mb-3">{errorMsg}</p>
              )}

              {/* Submit */}
              <button
                disabled={!ageGroup || !expLevel || !referral || loading}
                onClick={async () => {
                  setErrorMsg("");
                  setLoading(true);
                  const survey: SurveyData = { age: ageGroup, experience: expLevel, referral };
                  const result = await saveSubscriber(email, holdings);
                  if (result.success) {
                    saveSurveyResponse(email, survey); // fire-and-forget
                    setSubmitted(true);
                  } else {
                    setErrorMsg(result.message);
                  }
                  setLoading(false);
                }}
                className="w-full bg-gradient-to-r from-[#0849ac] to-[#2563eb] text-white py-4 rounded-xl text-[16px] font-semibold hover:opacity-90 transition-opacity shadow-[0px_4px_20px_rgba(8,73,172,0.25)] disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {loading ? (
                  <svg className="animate-spin w-5 h-5" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="white" strokeWidth="3"/>
                    <path className="opacity-75" fill="white" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"/>
                  </svg>
                ) : (
                  <IconCircleCheck />
                )}
                {loading ? "Đang xử lý..." : "Gửi và bắt đầu"}
              </button>

              <button
                onClick={() => setShowSurvey(false)}
                className="w-full text-[13px] text-[#6b7280] hover:text-[#374151] transition-colors mt-4 underline underline-offset-2"
              >
                Quay lại
              </button>
            </>
          ) : (
            <>
              <h1 className="text-[32px] font-bold text-[#111827] text-center mb-3">
                Bắt đầu miễn phí
              </h1>
              <p className="text-[16px] text-[#4b5563] text-center mb-10 leading-[24px]">
                Tải lên danh mục của bạn để bắt đầu nhận insights hàng ngày (huỷ bất cứ lúc nào)
              </p>

              {/* Email */}
              <div className="mb-6">
                <label className="block text-[14px] text-[#374151] mb-2">Email</label>
                <input
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full border border-[#d1d5db] rounded-lg px-4 py-3 text-[16px] text-[#111827] placeholder-[#9ca3af] focus:outline-none focus:border-[#2563eb] focus:ring-1 focus:ring-[#2563eb] transition-colors"
                />
              </div>

              {/* ── Portfolio review panel (after loading sample) ── */}
              {showPortfolio ? (
                <>
                  {/* Selected label */}
                  <p className="text-[13px] text-[#6b7280] mb-3">
                    Đã tải:{" "}
                    <span className="text-[#111827] font-medium">{fileName}</span>
                  </p>

                  {/* Review card */}
                  <div className="border border-[#e5e7eb] rounded-[16px] p-5 bg-white shadow-[0px_1px_4px_rgba(0,0,0,0.06)] mb-4">
                    <p className="text-[17px] font-bold text-[#111827] mb-1">
                      Kiểm tra danh mục của bạn
                    </p>
                    <p className="text-[13px] text-[#6b7280] mb-4">
                      Xem lại và chỉnh sửa nếu cần.
                    </p>

                    {/* Table header */}
                    <div className="grid grid-cols-[1fr_100px_44px_44px] gap-x-2 pb-2 mb-1">
                      <span className="text-[12px] font-semibold text-[#374151]">Mã CP</span>
                      <span className="text-[12px] font-semibold text-[#374151]">Số lượng</span>
                      <span className="text-[12px] font-semibold text-[#374151] text-center">Sửa</span>
                      <span className="text-[12px] font-semibold text-[#374151] text-center">Xoá</span>
                    </div>

                    {/* Rows */}
                    <div className="flex flex-col divide-y divide-[#f3f4f6]">
                      {holdings.map((h, i) => (
                        <div key={i} className="grid grid-cols-[1fr_100px_44px_44px] gap-x-2 items-center py-2.5">
                          {editingIndex === i ? (
                            <>
                              {/* Editing row */}
                              <input
                                autoFocus
                                value={editSymbol}
                                onChange={(e) => setEditSymbol(e.target.value.toUpperCase())}
                                className="border border-[#2563eb] rounded-md px-2 py-1 text-[13px] font-semibold text-[#111827] focus:outline-none w-full"
                                maxLength={10}
                                onKeyDown={(e) => e.key === "Enter" && handleSaveEdit()}
                              />
                              <input
                                value={editQuantity}
                                onChange={(e) => setEditQuantity(e.target.value)}
                                type="number"
                                min={1}
                                className="border border-[#2563eb] rounded-md px-2 py-1 text-[13px] text-[#111827] focus:outline-none w-full"
                                onKeyDown={(e) => e.key === "Enter" && handleSaveEdit()}
                              />
                              <button
                                onClick={handleSaveEdit}
                                className="flex items-center justify-center hover:opacity-70 transition-opacity"
                              >
                                <IconCheck />
                              </button>
                              <button
                                onClick={() => setEditingIndex(null)}
                                className="flex items-center justify-center hover:opacity-70 transition-opacity"
                              >
                                <IconX />
                              </button>
                            </>
                          ) : (
                            <>
                              <span className="text-[14px] font-semibold text-[#111827]">{h.symbol}</span>
                              <span className="text-[14px] text-[#374151]">{h.quantity.toLocaleString()}</span>
                              <button
                                onClick={() => handleStartEdit(i)}
                                className="flex items-center justify-center hover:opacity-60 transition-opacity"
                              >
                                <IconPencil />
                              </button>
                              <button
                                onClick={() => handleDelete(i)}
                                className="flex items-center justify-center hover:opacity-60 transition-opacity"
                              >
                                <IconX />
                              </button>
                            </>
                          )}
                        </div>
                      ))}
                    </div>

                    {/* Add symbol form */}
                    {showAddForm && canAdd && (
                      <div className="grid grid-cols-[1fr_100px_44px_44px] gap-x-2 items-center pt-3 border-t border-[#f3f4f6] mt-1">
                        <input
                          autoFocus
                          value={newSymbol}
                          onChange={(e) => setNewSymbol(e.target.value.toUpperCase())}
                          placeholder="VD: VIC"
                          maxLength={10}
                          className="border border-[#2563eb] rounded-md px-2 py-1 text-[13px] font-semibold text-[#111827] focus:outline-none w-full placeholder-[#c0c5ce]"
                          onKeyDown={(e) => e.key === "Enter" && handleAddSymbol()}
                        />
                        <input
                          value={newQuantity}
                          onChange={(e) => setNewQuantity(e.target.value)}
                          type="number"
                          min={1}
                          placeholder="SL"
                          className="border border-[#2563eb] rounded-md px-2 py-1 text-[13px] text-[#111827] focus:outline-none w-full placeholder-[#c0c5ce]"
                          onKeyDown={(e) => e.key === "Enter" && handleAddSymbol()}
                        />
                        <button
                          onClick={handleAddSymbol}
                          className="flex items-center justify-center hover:opacity-70 transition-opacity"
                        >
                          <IconCheck />
                        </button>
                        <button
                          onClick={() => { setShowAddForm(false); setNewSymbol(""); setNewQuantity(""); }}
                          className="flex items-center justify-center hover:opacity-70 transition-opacity"
                        >
                          <IconX />
                        </button>
                      </div>
                    )}

                    {/* Footer: add button + counter */}
                    <div className="flex items-center justify-between mt-4 pt-3 border-t border-[#f3f4f6]">
                      <button
                        onClick={() => { setShowAddForm(true); setEditingIndex(null); }}
                        disabled={!canAdd || showAddForm}
                        className="flex items-center gap-1.5 text-[13px] font-semibold text-[#2563eb] hover:opacity-70 transition-opacity disabled:opacity-30 disabled:cursor-not-allowed"
                      >
                        <IconPlus />
                        Thêm mã cổ phiếu
                      </button>
                      <span className="text-[13px] text-[#6b7280]">
                        <span className="font-semibold text-[#111827]">{holdings.length}</span>
                        {" / "}
                        {MAX_SYMBOLS} mã
                      </span>
                    </div>
                  </div>

                  {/* Use another portfolio link */}
                  <button
                    onClick={() => { setShowPortfolio(false); setFileName(""); setHoldings([]); }}
                    className="text-[13px] text-[#6b7280] underline underline-offset-2 hover:text-[#374151] transition-colors mb-6 block"
                  >
                    Dùng file khác
                  </button>

                  {/* Error message */}
                  {errorMsg && (
                    <p className="text-[13px] text-red-500 text-center mb-3">{errorMsg}</p>
                  )}

                  {/* Next → Survey */}
                  <button
                    disabled={!email || holdings.length === 0}
                    onClick={() => { setErrorMsg(""); setShowSurvey(true); }}
                    className="w-full bg-gradient-to-r from-[#0849ac] to-[#2563eb] text-white py-4 rounded-xl text-[16px] font-semibold hover:opacity-90 transition-opacity shadow-[0px_4px_20px_rgba(8,73,172,0.25)] disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    <IconCircleCheck />
                    Tiếp theo
                  </button>
                </>
              ) : (
                <>
                  {/* ── Upload area ── */}
                  <div className="flex items-center gap-2 mb-3">
                    <label className="text-[14px] text-[#374151]">Tải tài liệu danh mục</label>
                    <button className="text-[#9ca3af] hover:text-[#6b7280]">
                      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                        <path d={svgPaths.p10a54480} fill="currentColor" fillRule="evenodd" clipRule="evenodd" />
                        <path d={svgPaths.p24817d00} fill="currentColor" />
                      </svg>
                    </button>
                  </div>

                  <div
                    className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors mb-4 ${
                      isDragging ? "border-[#2563eb] bg-[#eff6ff]" : "border-[#d1d5db] hover:border-[#93c5fd]"
                    }`}
                    onClick={() => fileInputRef.current?.click()}
                    onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                    onDragLeave={() => setIsDragging(false)}
                    onDrop={handleDrop}
                  >
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".pdf,.png,.jpg,.jpeg"
                      onChange={handleFileChange}
                      className="hidden"
                    />
                    <div className="flex flex-col items-center gap-2">
                      <svg width="48" height="48" viewBox="0 0 48 48" fill="none" className="text-[#9ca3af]">
                        <path d={svgPaths.p27e55b60} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                      {fileName ? (
                        <p className="text-[14px] text-[#111827] font-semibold">{fileName}</p>
                      ) : (
                        <>
                          <p className="text-[14px] text-[#2563eb] font-semibold">Nhấn để tải file</p>
                          <p className="text-[12px] text-[#9ca3af]">PDF, PNG, JPG · Tối đa 1MB</p>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Divider */}
                  <div className="flex items-center gap-4 my-4">
                    <div className="flex-1 border-t border-dashed border-[#d1d5db]" />
                    <span className="text-[14px] text-[#9ca3af]">hoặc</span>
                    <div className="flex-1 border-t border-dashed border-[#d1d5db]" />
                  </div>

                  {/* Sample portfolio button */}
                  <div className="flex items-center gap-2 mb-6">
                    <button
                      onClick={handleUseSample}
                      className="flex-1 border border-[#bfdbfe] rounded-xl py-3 px-4 flex items-center justify-center gap-2 text-[14px] text-[#2563eb] font-semibold hover:bg-[#eff6ff] transition-colors"
                    >
                      <IconCircleCheck />
                      Sử dụng danh mục mẫu
                    </button>
                    <button className="border border-[#d1d5db] rounded-xl p-3 hover:bg-[#f9fafb] transition-colors">
                      <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                        <path d={svgPaths.p158f80} stroke="#6B7280" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
                        <path d={svgPaths.p1b796400} stroke="#6B7280" strokeWidth="1.5" fill="none" />
                      </svg>
                    </button>
                  </div>

                  {/* Parse error */}
                  {parseError && (
                    <p className="text-[13px] text-red-500 text-center mb-3">{parseError}</p>
                  )}

                  {/* Hint khi chưa điền email */}
                  {fileObj && !email && (
                    <p className="text-[12px] text-[#f59e0b] text-center mb-2">Vui lòng điền email ở trên trước.</p>
                  )}

                  {/* Parse with AI button */}
                  <button
                    disabled={!email || !fileObj || parseLoading}
                    onClick={handleParseFile}
                    className="w-full bg-gradient-to-r from-[#0849ac] to-[#2563eb] text-white py-4 rounded-xl text-[16px] font-semibold hover:opacity-90 transition-opacity shadow-[0px_4px_20px_rgba(8,73,172,0.25)] disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {parseLoading ? (
                      <>
                        <svg className="animate-spin w-5 h-5" viewBox="0 0 24 24" fill="none">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="white" strokeWidth="3"/>
                          <path className="opacity-75" fill="white" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"/>
                        </svg>
                        AI đang đọc file...
                      </>
                    ) : (
                      <>
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                          <path d="M12 2L13.09 8.26L19 6L15.45 11.09L22 12L15.45 12.91L19 18L13.09 15.74L12 22L10.91 15.74L5 18L8.55 12.91L2 12L8.55 11.09L5 6L10.91 8.26L12 2Z" stroke="white" strokeWidth="1.5" strokeLinejoin="round"/>
                        </svg>
                        Phân tích với AI
                      </>
                    )}
                  </button>
                  <p className="text-[11px] text-[#9ca3af] text-center mt-2">
                    Powered by Gemini · Bạn có thể chỉnh sửa kết quả trước khi gửi
                  </p>
                </>
              )}
            </>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
}