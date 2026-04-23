import React, { useState } from "react";
import { useNavigate } from "react-router";
import { Navbar } from "../../components/landing/Navbar";
import { Footer } from "../../components/landing/Footer";
import { saveFeedback } from "../../lib/landing/subscribe";

// ─── Types ───────────────────────────────────────────────────────────────────
type FeedbackType = "bug" | "feature" | "ui" | "general" | "other";
type StarValue = 1 | 2 | 3 | 4 | 5;

interface FeedbackCategory {
  id: FeedbackType;
  label: string;
  icon: React.ReactNode;
  color: string;
  bg: string;
  border: string;
}

// ─── Category icons ───────────────────────────────────────────────────────────
function IconBug() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
      <path d="M9 13.5V9M9 6.75h.007" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
      <path d="M3.75 6.75H2.25M3.75 11.25H2.25M15.75 6.75h-1.5M15.75 11.25h-1.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
      <path d="M5.25 5.25A3.75 3.75 0 0 1 12.75 5.25L13.5 6.75A4.5 4.5 0 0 1 14.25 9v2.25A5.25 5.25 0 0 1 3.75 11.25V9A4.5 4.5 0 0 1 4.5 6.75L5.25 5.25Z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round"/>
      <path d="M6.75 3.75a2.25 2.25 0 0 1 4.5 0" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
    </svg>
  );
}

function IconFeature() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
      <path d="M9 2.25L11.163 6.638L16 7.35L12.5 10.763L13.326 15.6L9 13.325L4.674 15.6L5.5 10.763L2 7.35L6.837 6.638L9 2.25Z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round"/>
    </svg>
  );
}

function IconUI() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
      <rect x="2.25" y="3" width="13.5" height="12" rx="1.5" stroke="currentColor" strokeWidth="1.4"/>
      <path d="M5.25 7.5H12.75M5.25 10.5H9.75" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
      <path d="M2.25 6H15.75" stroke="currentColor" strokeWidth="1.4"/>
    </svg>
  );
}

function IconGeneral() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
      <path d="M9 15.75C12.728 15.75 15.75 12.728 15.75 9C15.75 5.272 12.728 2.25 9 2.25C5.272 2.25 2.25 5.272 2.25 9C2.25 10.363 2.648 11.633 3.333 12.7L2.25 15.75L5.3 14.667C6.367 15.352 7.637 15.75 9 15.75Z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round"/>
      <path d="M6.75 9h.007M9 9h.007M11.25 9h.007" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
    </svg>
  );
}

function IconOther() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
      <circle cx="9" cy="9" r="6.75" stroke="currentColor" strokeWidth="1.4"/>
      <path d="M7 7.25C7 6.145 7.895 5.25 9 5.25C10.105 5.25 11 6.145 11 7.25C11 8.12 10.455 8.858 9.69 9.153C9.28 9.31 9 9.698 9 10.135V10.75" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
      <path d="M9 12.75h.007" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
    </svg>
  );
}

function IconStar({ filled }: { filled: boolean; half?: boolean }) {
  return (
    <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
      {filled ? (
        <path d="M14 3L17.09 9.26L24 10.27L19 15.14L20.18 22.02L14 18.77L7.82 22.02L9 15.14L4 10.27L10.91 9.26L14 3Z"
          fill="#FBBF24" stroke="#FBBF24" strokeWidth="1.5" strokeLinejoin="round"/>
      ) : (
        <path d="M14 3L17.09 9.26L24 10.27L19 15.14L20.18 22.02L14 18.77L7.82 22.02L9 15.14L4 10.27L10.91 9.26L14 3Z"
          stroke="#D1D5DB" strokeWidth="1.5" strokeLinejoin="round"/>
      )}
    </svg>
  );
}

function IconSend() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
      <path d="M15.75 2.25L8.25 9.75M15.75 2.25L10.5 15.75L8.25 9.75M15.75 2.25L2.25 7.5L8.25 9.75"
        stroke="white" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

// ─── Constants ────────────────────────────────────────────────────────────────
const CATEGORIES: FeedbackCategory[] = [
  { id: "bug",     label: "Báo lỗi",           icon: <IconBug />,     color: "text-[#dc2626]", bg: "bg-[#fef2f2]", border: "border-[#fca5a5]" },
  { id: "feature", label: "Đề xuất tính năng", icon: <IconFeature />, color: "text-[#d97706]", bg: "bg-[#fffbeb]", border: "border-[#fcd34d]" },
  { id: "ui",      label: "Giao diện / UX",    icon: <IconUI />,      color: "text-[#7c3aed]", bg: "bg-[#f5f3ff]", border: "border-[#c4b5fd]" },
  { id: "general", label: "Góp ý chung",       icon: <IconGeneral />, color: "text-[#0849ac]", bg: "bg-[#eff6ff]", border: "border-[#bfdbfe]" },
  { id: "other",   label: "Khác",              icon: <IconOther />,   color: "text-[#374151]", bg: "bg-[#f9fafb]", border: "border-[#d1d5db]" },
];

const STAR_LABELS: Record<StarValue, string> = {
  1: "Rất không hài lòng",
  2: "Không hài lòng",
  3: "Bình thường",
  4: "Hài lòng",
  5: "Rất hài lòng",
};

const MAIL_TO = "contact@wealbee.com";

// ─── Component ────────────────────────────────────────────────────────────────
export default function FeedbackPage() {
  const navigate = useNavigate();

  // Form state
  const [type, setType]         = useState<FeedbackType | null>(null);
  const [rating, setRating]     = useState<StarValue | null>(null);
  const [hoverRating, setHoverRating] = useState<StarValue | null>(null);
  const [name, setName]         = useState("");
  const [email, setEmail]       = useState("");
  const [subject, setSubject]   = useState("");
  const [message, setMessage]   = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [errors, setErrors]     = useState<Record<string, string>>({});

  const activeRating = hoverRating ?? rating;

  const validate = () => {
    const e: Record<string, string> = {};
    if (!type)    e.type    = "Vui lòng chọn loại phản hồi.";
    if (!name.trim())    e.name    = "Vui lòng nhập tên của bạn.";
    if (!email.trim())   e.email   = "Vui lòng nhập email.";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) e.email = "Email không hợp lệ.";
    if (!subject.trim()) e.subject = "Vui lòng nhập tiêu đề.";
    if (!message.trim()) e.message = "Vui lòng nhập nội dung phản hồi.";
    return e;
  };

  const handleSubmit = async () => {
    const e = validate();
    if (Object.keys(e).length > 0) { setErrors(e); return; }
    setErrors({});
    setSubmitError("");
    setSubmitting(true);

    const result = await saveFeedback({ type: type!, rating, name, email, subject, message });
    setSubmitting(false);

    if (!result.success) {
      setSubmitError(result.message);
      return;
    }
    setSubmitted(true);
  };

  const err = (field: string) =>
    errors[field] ? (
      <p className="text-[12px] text-[#dc2626] mt-1">{errors[field]}</p>
    ) : null;

  // ── Success screen ─────────────────────��────────────────────────────────────
  if (submitted) {
    const cat = CATEGORIES.find((c) => c.id === type);
    return (
      <div className="min-h-screen bg-white relative font-['Montserrat',sans-serif]">
        <BgBlurs />
        <Navbar />
        <main className="relative z-10 flex flex-col items-center justify-center px-6 py-20 min-h-[calc(100vh-76px)]">
          <div className="w-full max-w-[520px] flex flex-col items-center text-center">
            {/* Icon */}
            <div className="relative mb-8">
              <div className="absolute inset-0 rounded-full bg-[rgba(37,99,235,0.1)] scale-[1.4] blur-[14px]" />
              <div className="absolute inset-0 rounded-full border-[1.5px] border-[rgba(37,99,235,0.18)] scale-[1.18]" />
              <div
                className="relative w-[92px] h-[92px] rounded-full flex items-center justify-center"
                style={{ background: "linear-gradient(135deg, #0849ac 0%, #2563eb 100%)" }}
              >
                <svg width="42" height="42" viewBox="0 0 42 42" fill="none">
                  <path d="M8 22L17 31L34 14" stroke="white" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
            </div>

            <h1 className="text-[30px] font-bold text-[#111827] mb-3">Cảm ơn phản hồi của bạn!</h1>
            <p className="text-[16px] text-[#4b5563] leading-[27px] max-w-[390px] mb-8">
              Chúng tôi đã nhận được ý kiến của bạn. Đội ngũ Wealbee sẽ xem xét và phản hồi trong thời gian sớm nhất.
            </p>

            {/* Summary card */}
            <div className="w-full bg-[#f0f6ff] border border-[#bfdbfe] rounded-[18px] p-5 mb-8 text-left space-y-4">
              {/* Type */}
              {cat && (
                <div className="flex items-center gap-3">
                  <div className={`w-[38px] h-[38px] rounded-[10px] flex items-center justify-center flex-shrink-0 border ${cat.bg} ${cat.border} ${cat.color}`}>
                    {cat.icon}
                  </div>
                  <div>
                    <p className="text-[12px] text-[#6b7280]">Loại phản hồi</p>
                    <p className="text-[14px] font-semibold text-[#111827]">{cat.label}</p>
                  </div>
                </div>
              )}
              {/* Rating */}
              {rating && (
                <div className="flex items-center gap-3 pt-4 border-t border-[#dbeafe]">
                  <div className="w-[38px] h-[38px] rounded-[10px] flex items-center justify-center flex-shrink-0 bg-[#fffbeb] border border-[#fcd34d]">
                    <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                      <path d="M9 2L10.854 5.757L15 6.364L12 9.28L12.708 13.41L9 11.46L5.292 13.41L6 9.28L3 6.364L7.146 5.757L9 2Z" fill="#FBBF24" stroke="#FBBF24" strokeWidth="1.2" strokeLinejoin="round"/>
                    </svg>
                  </div>
                  <div>
                    <p className="text-[12px] text-[#6b7280]">Đánh giá trải nghiệm</p>
                    <p className="text-[14px] font-semibold text-[#111827]">{rating}/5 — {STAR_LABELS[rating]}</p>
                  </div>
                </div>
              )}
              {/* Email */}
              <div className="flex items-center gap-3 pt-4 border-t border-[#dbeafe]">
                <div className="w-[38px] h-[38px] rounded-[10px] flex items-center justify-center flex-shrink-0 bg-white border border-[#dbeafe]">
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                    <path d="M2 4a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v8a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V4Z" stroke="#2563EB" strokeWidth="1.3"/>
                    <path d="M2 4.5L8 9L14 4.5" stroke="#2563EB" strokeWidth="1.3" strokeLinecap="round"/>
                  </svg>
                </div>
                <div>
                  <p className="text-[12px] text-[#6b7280]">Phản hồi sẽ được gửi tới</p>
                  <p className="text-[14px] font-semibold text-[#111827]">{MAIL_TO}</p>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex flex-col gap-3 w-full">
              <button
                onClick={() => navigate("/")}
                className="w-full bg-gradient-to-r from-[#0849ac] to-[#2563eb] text-white py-3.5 rounded-xl text-[15px] font-semibold hover:opacity-90 transition-opacity shadow-[0px_4px_20px_rgba(8,73,172,0.22)]"
              >
                Về trang chủ
              </button>
              <button
                onClick={() => {
                  setSubmitted(false); setType(null); setRating(null);
                  setName(""); setEmail(""); setSubject(""); setMessage(""); setErrors({});
                }}
                className="text-[14px] text-[#6b7280] hover:text-[#374151] transition-colors underline underline-offset-2"
              >
                Gửi thêm phản hồi
              </button>
            </div>
          </div>
        </main>
      </div>
    );
  }

  // ── Main form ───────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-white relative overflow-hidden font-['Montserrat',sans-serif]">
      <BgBlurs />
      <Navbar />

      <main className="relative z-10 px-6 pt-14 pb-24">
        <div className="w-full max-w-[600px] mx-auto">

          {/* ── Header ── */}
          <div className="flex flex-col items-center text-center mb-10">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 bg-[#eff6ff] border border-[#bfdbfe] rounded-full px-4 py-1.5 mb-5">
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <path d="M7 1.5C3.962 1.5 1.5 3.962 1.5 7C1.5 10.038 3.962 12.5 7 12.5C10.038 12.5 12.5 10.038 12.5 7C12.5 3.962 10.038 1.5 7 1.5ZM7 9.5V7M7 5h.007" stroke="#2563EB" strokeWidth="1.2" strokeLinecap="round"/>
              </svg>
              <span className="text-[12px] font-semibold text-[#2563eb] tracking-wide uppercase">Trung tâm phản hồi</span>
            </div>
            <h1 className="text-[34px] font-bold text-[#111827] mb-3 leading-[1.2]">
              Ý kiến của bạn quan trọng với<br/>
              <span style={{ background: "linear-gradient(90deg, #0849ac, #2563eb)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
                chúng tôi
              </span>
            </h1>
            <p className="text-[16px] text-[#4b5563] leading-[26px] max-w-[440px]">
              Hãy cho chúng tôi biết trải nghiệm của bạn — mọi phản hồi đều giúp Wealbee trở nên tốt hơn.
            </p>
          </div>

          {/* ── Gradient divider ── */}
          <div className="w-16 h-[3px] rounded-full mx-auto mb-10" style={{ background: "linear-gradient(90deg, #0849ac, #2563eb)" }} />

          {/* ── Step 1: Category ── */}
          <Section
            number={1}
            title="Loại phản hồi"
            subtitle="Chọn chủ đề phù hợp nhất với nội dung bạn muốn chia sẻ."
          >
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {CATEGORIES.map((cat) => {
                const active = type === cat.id;
                return (
                  <button
                    key={cat.id}
                    onClick={() => { setType(cat.id); setErrors((e) => ({ ...e, type: "" })); }}
                    className={`relative flex flex-col items-center gap-2 py-4 px-3 rounded-[14px] border-[1.5px] transition-all text-center
                      ${active
                        ? `${cat.bg} ${cat.border} ${cat.color} shadow-[0px_2px_10px_rgba(0,0,0,0.07)]`
                        : "bg-white border-[#e5e7eb] text-[#6b7280] hover:border-[#93c5fd] hover:bg-[#f8fbff]"
                      }`}
                  >
                    {active && (
                      <span className="absolute top-2 right-2">
                        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                          <circle cx="7" cy="7" r="7" fill="#0849AC"/>
                          <path d="M4 7L6 9L10 5" stroke="white" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      </span>
                    )}
                    <span className={active ? cat.color : "text-[#9ca3af]"}>{cat.icon}</span>
                    <span className="text-[12px] font-semibold leading-tight">{cat.label}</span>
                  </button>
                );
              })}
            </div>
            {err("type")}
          </Section>

          {/* ── Step 2: Rating ── */}
          <Section
            number={2}
            title="Mức độ hài lòng"
            subtitle="Trải nghiệm hiện tại của bạn với Wealbee thế nào? (không bắt buộc)"
          >
            <div className="flex flex-col items-center gap-3">
              <div className="flex items-center gap-1">
                {([1, 2, 3, 4, 5] as StarValue[]).map((s) => (
                  <button
                    key={s}
                    onMouseEnter={() => setHoverRating(s)}
                    onMouseLeave={() => setHoverRating(null)}
                    onClick={() => setRating(rating === s ? null : s)}
                    className="transition-transform hover:scale-110 active:scale-95"
                  >
                    <IconStar filled={(activeRating ?? 0) >= s} />
                  </button>
                ))}
              </div>
              {activeRating && (
                <p className="text-[13px] font-semibold text-[#0849ac] transition-all">
                  {STAR_LABELS[activeRating]}
                </p>
              )}
            </div>
          </Section>

          {/* ── Step 3: Contact info ── */}
          <Section
            number={3}
            title="Thông tin liên hệ"
            subtitle="Để chúng tôi có thể phản hồi lại với bạn nếu cần."
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Họ và tên" required error={errors.name}>
                <input
                  type="text"
                  placeholder="Nguyễn Văn A"
                  value={name}
                  onChange={(e) => { setName(e.target.value); setErrors((er) => ({ ...er, name: "" })); }}
                  className={inputCls(!!errors.name)}
                />
              </Field>
              <Field label="Email" required error={errors.email}>
                <input
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => { setEmail(e.target.value); setErrors((er) => ({ ...er, email: "" })); }}
                  className={inputCls(!!errors.email)}
                />
              </Field>
            </div>
          </Section>

          {/* ── Step 4: Message ── */}
          <Section
            number={4}
            title="Nội dung phản hồi"
            subtitle="Mô tả chi tiết vấn đề, đề xuất hoặc ý kiến của bạn."
          >
            <Field label="Tiêu đề" required error={errors.subject}>
              <input
                type="text"
                placeholder="VD: Tính năng tìm kiếm chưa hoạt động đúng..."
                value={subject}
                onChange={(e) => { setSubject(e.target.value); setErrors((er) => ({ ...er, subject: "" })); }}
                className={inputCls(!!errors.subject)}
              />
            </Field>
            <div className="mt-4">
              <Field label="Nội dung chi tiết" required error={errors.message}>
                <textarea
                  rows={6}
                  placeholder="Hãy mô tả chi tiết phản hồi của bạn tại đây..."
                  value={message}
                  onChange={(e) => { setMessage(e.target.value); setErrors((er) => ({ ...er, message: "" })); }}
                  className={`${inputCls(!!errors.message)} resize-none`}
                />
                <p className="text-[12px] text-[#9ca3af] mt-1 text-right">{message.length}/1000</p>
              </Field>
            </div>
          </Section>

          {/* ── Privacy note ── */}
          <div className="flex items-start gap-3 bg-[#f8fbff] border border-[#dbeafe] rounded-[12px] px-4 py-3.5 mb-6">
            <svg className="flex-shrink-0 mt-0.5" width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M8 1.5L2.5 4V8.5C2.5 11.5 5 14 8 14.5C11 14 13.5 11.5 13.5 8.5V4L8 1.5Z" stroke="#2563EB" strokeWidth="1.3" strokeLinejoin="round"/>
              <path d="M5.5 8L7 9.5L10.5 6" stroke="#2563EB" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            <p className="text-[12px] text-[#4b5563] leading-[20px]">
              Thông tin của bạn sẽ được gửi bảo mật đến{" "}
              <span className="font-semibold text-[#0849ac]">{MAIL_TO}</span>.
              Chúng tôi không chia sẻ dữ liệu cá nhân với bên thứ ba.
            </p>
          </div>

          {/* ── Submit error ── */}
          {submitError && (
            <p className="text-[13px] text-[#dc2626] text-center mb-3">{submitError}</p>
          )}

          {/* ── Submit ── */}
          <button
            onClick={handleSubmit}
            disabled={submitting}
            className="w-full flex items-center justify-center gap-2.5 bg-gradient-to-r from-[#0849ac] to-[#2563eb] text-white py-4 rounded-xl text-[16px] font-semibold hover:opacity-90 active:scale-[0.99] transition-all shadow-[0px_4px_20px_rgba(8,73,172,0.25)] disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {submitting ? (
              <>
                <svg className="animate-spin w-5 h-5" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="white" strokeWidth="3"/>
                  <path className="opacity-75" fill="white" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"/>
                </svg>
                Đang gửi...
              </>
            ) : (
              <>
                <IconSend />
                Gửi phản hồi
              </>
            )}
          </button>

          {/* ── Contact directly ── */}
          <p className="text-center text-[13px] text-[#9ca3af] mt-5">
            Hoặc liên hệ trực tiếp qua{" "}
            <a href={`mailto:${MAIL_TO}`} className="text-[#2563eb] font-semibold hover:underline">
              {MAIL_TO}
            </a>
          </p>
        </div>
      </main>

      <Footer />
    </div>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function BgBlurs() {
  return (
    <>
      <div className="absolute top-[-100px] right-[-160px] w-[480px] h-[480px] bg-[rgba(232,240,255,0.5)] blur-[60px] rounded-full pointer-events-none" />
      <div className="absolute bottom-[-80px] left-[-140px] w-[380px] h-[380px] bg-[rgba(132,166,252,0.08)] blur-[50px] rounded-full pointer-events-none" />
    </>
  );
}

function Section({
  number, title, subtitle, children,
}: {
  number: number;
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mb-8">
      {/* Section header */}
      <div className="flex items-start gap-3 mb-4">
        <div
          className="w-[28px] h-[28px] rounded-full flex items-center justify-center flex-shrink-0 mt-0.5"
          style={{ background: "linear-gradient(135deg, #0849ac 0%, #2563eb 100%)" }}
        >
          <span className="text-[12px] font-bold text-white">{number}</span>
        </div>
        <div>
          <p className="text-[16px] font-bold text-[#111827]">{title}</p>
          <p className="text-[13px] text-[#6b7280] mt-0.5">{subtitle}</p>
        </div>
      </div>
      <div className="pl-[40px]">{children}</div>
    </div>
  );
}

function Field({
  label, required, error, children,
}: {
  label: string;
  required?: boolean;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="block text-[13px] font-semibold text-[#374151] mb-1.5">
        {label}
        {required && <span className="text-[#dc2626] ml-0.5">*</span>}
      </label>
      {children}
      {error && <p className="text-[12px] text-[#dc2626] mt-1">{error}</p>}
    </div>
  );
}

function inputCls(hasError: boolean) {
  return `w-full border rounded-lg px-4 py-3 text-[14px] text-[#111827] placeholder-[#9ca3af] focus:outline-none transition-colors ${
    hasError
      ? "border-[#fca5a5] focus:border-[#dc2626] focus:ring-1 focus:ring-[#dc2626]"
      : "border-[#d1d5db] focus:border-[#2563eb] focus:ring-1 focus:ring-[#2563eb]"
  }`;
}
